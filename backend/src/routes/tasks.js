const router = require('express').Router();
const { auth, requireRole } = require('../middleware/auth');

const populate = (task) => task.populate([
  { path: 'createdBy',    select: 'username role' },
  { path: 'assignedTo',   select: 'username role' },
  { path: 'qaAssignedTo', select: 'username role' },
  { path: 'project',      select: 'name' },
  { path: 'comments.author', select: 'username role' },
]);

// Get tasks — scoped by project membership or manager
router.get('/', auth, async (req, res) => {
  try {
    const { Task, Project } = req.models;
    const { projectId } = req.query;
    let filter = {};
    if (projectId) {
      filter.project = projectId;
    } else if (req.user.role !== 'manager') {
      // Non-managers see tasks from their projects only
      const projects = await Project.find({ members: req.user.id }, '_id');
      filter.project = { $in: projects.map(p => p._id) };
    }
    const tasks = await Task.find(filter)
      .populate('createdBy', 'username role')
      .populate('assignedTo', 'username role')
      .populate('qaAssignedTo', 'username role')
      .populate('project', 'name')
      .sort({ queuePosition: 1, createdAt: 1 });
    res.json(tasks);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Create task (developer or manager)
router.post('/', auth, requireRole('developer', 'manager'), async (req, res) => {
  try {
    const { Task } = req.models;
    const { title, description, type, projectId } = req.body;
    if (!projectId) return res.status(400).json({ message: 'projectId required' });
    const count = await Task.countDocuments({ project: projectId, status: 'todo', assignedTo: null });
    const task = await Task.create({
      title, description, type,
      project: projectId,
      createdBy: req.user.id,
      queuePosition: count,
    });
    res.status(201).json(await populate(task));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Pick task — developer picks for themselves (in-progress)
router.patch('/:id/pick', auth, requireRole('developer', 'manager'), async (req, res) => {
  try {
    const { Task } = req.models;
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ message: 'Task not found' });
    if (task.assignedTo) return res.status(400).json({ message: 'Task already picked' });
    task.assignedTo = req.user.id;
    task.status = 'in-progress';
    task.timeLogs.push({ startedAt: new Date() });
    await task.save();
    res.json(await populate(task));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// QA picks a task that is in-qa
router.patch('/:id/qa-pick', auth, requireRole('qa', 'manager'), async (req, res) => {
  try {
    const { Task } = req.models;
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ message: 'Task not found' });
    if (task.status !== 'in-qa') return res.status(400).json({ message: 'Task is not in QA' });
    if (task.qaAssignedTo) return res.status(400).json({ message: 'Task already picked by QA' });
    task.qaAssignedTo = req.user.id;
    await task.save();
    res.json(await populate(task));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Assign to specific user (manager only)
router.patch('/:id/assign', auth, requireRole('manager'), async (req, res) => {
  try {
    const { Task } = req.models;
    const { userId } = req.body;
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ message: 'Task not found' });
    if (task.assignedTo) return res.status(400).json({ message: 'Task already assigned' });
    task.assignedTo = userId;
    task.status = 'in-progress';
    task.timeLogs.push({ startedAt: new Date() });
    await task.save();
    res.json(await populate(task));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Move status
router.patch('/:id/status', auth, async (req, res) => {
  try {
    const { Task } = req.models;
    const { status } = req.body;
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ message: 'Task not found' });

    const isDevOwner = task.assignedTo?.toString() === req.user.id;
    const isQAOwner = task.qaAssignedTo?.toString() === req.user.id;
    const isManager = req.user.role === 'manager';

    if (!isDevOwner && !isQAOwner && !isManager)
      return res.status(403).json({ message: 'Not authorized to move this task' });

    // QA can only mark done or send back to in-progress
    if (req.user.role === 'qa' && !['done', 'in-progress'].includes(status))
      return res.status(403).json({ message: 'QA can only mark done or send back to in-progress' });

    if (task.status === 'in-progress' && status !== 'in-progress') {
      const lastLog = task.timeLogs[task.timeLogs.length - 1];
      if (lastLog && !lastLog.endedAt) {
        lastLog.endedAt = new Date();
        lastLog.duration = Math.floor((lastLog.endedAt - lastLog.startedAt) / 1000);
        task.totalTime += lastLog.duration;
      }
    }
    if (status === 'in-progress' && task.status !== 'in-progress') {
      task.timeLogs.push({ startedAt: new Date() });
    }
    // Reset qa assignment if sending back to in-progress
    if (status === 'in-progress') task.qaAssignedTo = null;

    task.status = status;
    await task.save();
    res.json(await populate(task));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Add comment (any project member); isRejection bumps rejectionCount and sends task back to in-progress
router.post('/:id/comments', auth, async (req, res) => {
  try {
    const { Task } = req.models;
    const { text, isRejection } = req.body;
    if (!text?.trim()) return res.status(400).json({ message: 'Comment text required' });
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ message: 'Task not found' });

    task.comments.push({ text: text.trim(), author: req.user.id, isRejection: !!isRejection });

    if (isRejection) {
      task.rejectionCount += 1;
      // stop timer if running
      if (task.status === 'in-progress') {
        const lastLog = task.timeLogs[task.timeLogs.length - 1];
        if (lastLog && !lastLog.endedAt) {
          lastLog.endedAt = new Date();
          lastLog.duration = Math.floor((lastLog.endedAt - lastLog.startedAt) / 1000);
          task.totalTime += lastLog.duration;
        }
      }
      task.status = 'in-progress';
      task.qaAssignedTo = null;
      task.timeLogs.push({ startedAt: new Date() });
    }

    await task.save();
    res.json(await populate(task));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Delete — manager or QA only
router.delete('/:id', auth, requireRole('manager', 'qa'), async (req, res) => {
  try {
    const { Task } = req.models;
    await Task.findByIdAndDelete(req.params.id);
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
