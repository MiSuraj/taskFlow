const router = require('express').Router();
const { auth, requireRole } = require('../middleware/auth');

const populateProject = (p) => p.populate([
  { path: 'manager', select: 'username role' },
  { path: 'members', select: 'username role' },
  { path: 'createdBy', select: 'username role' },
]);

// Get projects scoped by role
router.get('/', auth, async (req, res) => {
  try {
    const { Project } = req.models;
    let query = {};
    if (req.user.role === 'manager') query = { manager: req.user.id };
    else if (req.user.role !== 'admin') query = { members: req.user.id };
    // admin gets all
    const projects = await Project.find(query)
      .populate('manager', 'username role')
      .populate('members', 'username role')
      .populate('createdBy', 'username role');
    res.json(projects);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Admin creates project
router.post('/', auth, requireRole('admin'), async (req, res) => {
  try {
    const { Project } = req.models;
    const { name, description } = req.body;
    if (!name) return res.status(400).json({ message: 'Project name required' });
    const project = await Project.create({ name, description, createdBy: req.user.id });
    res.status(201).json(await populateProject(project));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Admin assigns a manager to a project
router.patch('/:id/assign-manager', auth, requireRole('admin'), async (req, res) => {
  try {
    const { Project } = req.models;
    const { managerId } = req.body;
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ message: 'Project not found' });
    project.manager = managerId || null;
    await project.save();
    res.json(await populateProject(project));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Manager adds member
router.patch('/:id/members', auth, requireRole('manager'), async (req, res) => {
  try {
    const { Project } = req.models;
    const { userId } = req.body;
    const project = await Project.findOne({ _id: req.params.id, manager: req.user.id });
    if (!project) return res.status(404).json({ message: 'Project not found' });
    if (project.members.map(m => m.toString()).includes(userId))
      return res.status(400).json({ message: 'User already in project' });
    project.members.push(userId);
    await project.save();
    res.json(await populateProject(project));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Manager removes member
router.delete('/:id/members/:userId', auth, requireRole('manager'), async (req, res) => {
  try {
    const { Project } = req.models;
    const project = await Project.findOne({ _id: req.params.id, manager: req.user.id });
    if (!project) return res.status(404).json({ message: 'Project not found' });
    project.members = project.members.filter(m => m.toString() !== req.params.userId);
    await project.save();
    res.json(await populateProject(project));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
