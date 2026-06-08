const router = require('express').Router();
const { auth }   = require('../middleware/auth');

// Check membership helper
async function canAccess(Project, userId, userRole, projectId) {
  if (userRole === 'admin') return true;
  const p = await Project.findById(projectId);
  if (!p) return false;
  const managerId = p.manager?.toString();
  const memberIds = p.members.map(m => m.toString());
  return managerId === userId || memberIds.includes(userId);
}

// GET doc for a project (creates empty one if none)
router.get('/:projectId', auth, async (req, res) => {
  try {
    const { ProjectDoc, Project } = req.models;
    if (!await canAccess(Project, req.user.id, req.user.role, req.params.projectId))
      return res.status(403).json({ message: 'Access denied' });

    let doc = await ProjectDoc.findOne({ project: req.params.projectId })
      .populate('lastEditedBy', 'username');
    if (!doc) {
      doc = await ProjectDoc.create({
        project: req.params.projectId,
        sections: [
          { title: 'Overview',      content: '' },
          { title: 'Architecture',  content: '' },
          { title: 'Discussion',    content: '' },
        ],
      });
    }
    res.json(doc);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT — full save (used on blur / explicit save)
router.put('/:projectId', auth, async (req, res) => {
  try {
    const { ProjectDoc, Project } = req.models;
    if (!await canAccess(Project, req.user.id, req.user.role, req.params.projectId))
      return res.status(403).json({ message: 'Access denied' });

    const { sections } = req.body;
    const doc = await ProjectDoc.findOneAndUpdate(
      { project: req.params.projectId },
      { sections, lastEditedBy: req.user.id },
      { new: true, upsert: true }
    ).populate('lastEditedBy', 'username');
    res.json(doc);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
