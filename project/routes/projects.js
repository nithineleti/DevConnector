const express = require('express');
const { body, validationResult } = require('express-validator');
const authMiddleware = require('../middleware/authMiddleware');
const Project = require('../models/project');


const upload = require('../middleware/upload');


const adminOnly = require('../middleware/adminOnly');


const router = express.Router();

// @route   POST /api/projects
// @desc    Create a new project
// @access  Private
router.post(
    '/',
    authMiddleware,
    [
        body('title').trim().notEmpty().withMessage('Project title is required'),
        body('repoLink')
            .optional({ checkFalsy: true })
            .isURL().withMessage('Repository link must be a valid URL')
    ],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

    const { title, description, techStack, repoLink } = req.body;

    try {
        const project = new Project({
            owner: req.userId,
            title,
            description,
            techStack,
            repoLink
         });

        await project.save();
        res.status(201).json(project);
    } catch (err) {
        console.error('Error creating project:', err);
        res.status(500).json({ message: 'Server error' });
    }
  }
);


// @route   GET /api/projects
// @desc    Get all projects
// @access  Public
router.get('/', async (req, res) => {
    try {
        const projects = await Project.find().populate('owner', 'name email');
        res.json(projects);
    } catch (err) {
        console.error('Error fetching projects:', err);
        res.status(500).json({ message: 'Server error' });
    }
});


// @route   GET /api/projects/:id
// @desc    Get a project by ID
// @access  Public
router.get('/:id', async (req, res) => {
    try {
        const project = await Project.findById(req.params.id).populate('owner', 'name email');

        if (!project) {
            return res.status(404).json({ message: 'Project not found' });
        }

        res.json(project);
    } catch (err) {
        console.error('Error fetching project:', err);
        res.status(500).json({ message: 'Server error' });
    }
});


// @route   PUT /api/projects/:id
// @desc    Update a project (must be owner)
// @access  Private
router.put(
    '/:id',
    authMiddleware,
    [
      body('repoLink')
          .optional({ checkFalsy: true })
          .isURL().withMessage('Repository link must be a valid URL')
    ],
    async (req, res) => {
        const { title, description, techStack, repoLink } = req.body;

        try {
            const project = await Project.findById(req.params.id);

            if (!project) {
                return res.status(404).json({ message: 'Project not found' });
            }

            if (project.owner.toString() !== req.userId) {
                return res.status(403).json({ message: 'Not authorized to update this project' });
            }

            // Only update if the value is non-empty, not null, and not just whitespace
            if (title?.trim()) project.title = title;
            if (description?.trim()) project.description = description;
            if (Array.isArray(techStack) && techStack.length > 0) project.techStack = techStack;
            if (repoLink?.trim()) project.repoLink = repoLink;

            await project.save();
            res.json(project);
        } catch (err) {
            console.error('Error updating project:', err);
            res.status(500).json({ message: 'Server error' });
        }
    }
);


// @route   DELETE /api/projects/:id
// @desc    Delete a project (must be owner)
// @access  Private
router.delete('/:id', authMiddleware, async (req, res) => {
    try {
        const project = await Project.findById(req.params.id);

        if (!project) {
            return res.status(404).json({ message: 'Project not found' });
        }

        if (project.owner.toString() !== req.userId) {
            return res.status(403).json({ message: 'Not authorized to delete this project' });
        }

        await project.deleteOne();
        res.json({ message: 'Project deleted successfully' });
    } catch (err) {
        console.error('Error deleting project:', err);
        res.status(500).json({ message: 'Server error' });
    }
});


// @route   POST /api/projects/:id/screenshot
// @desc    Upload a screenshot for a project
// @access  Private
router.post('/:id/screenshot', authMiddleware, upload.single('screenshot'), async (req, res) => {
    try {
        const project = await Project.findById(req.params.id);

        if (!project) {
            return res.status(404).json({ message: 'Project not found' });
        }

        if (project.owner.toString() !== req.userId) {
            return res.status(403).json({ message: 'Not authorized to upload for this project' });
        }

        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }

        project.screenshot = req.file.filename;
        await project.save();

        res.json(project);
    } catch (err) {
        console.error('Error uploading screenshot:', err);
        res.status(500).json({ message: 'Server error' });
    }
});


// @route   PUT /api/projects/:id/like
// @desc    Like or unlike a project (toggle)
// @access  Private
router.put('/:id/like', authMiddleware, async (req, res) => {
    try {
        const project = await Project.findById(req.params.id);
        if (!project) return res.status(404).json({ message: 'Project not found' });

        const userId = req.userId;
        const liked = project.likes.includes(userId);

        if (liked) {
            // Unlike (remove user ID)
            project.likes = project.likes.filter(id => id.toString() !== userId);
        } else {
            // Like (add user ID)
            project.likes.push(userId);
        }

        await project.save();
        res.json({ likes: project.likes.length });
    } catch (err) {
        console.error('Error liking project:', err);
        res.status(500).json({ message: 'Server error' });
    }
});


// @route   POST /api/projects/:id/comments
// @desc    Add a comment to a project
// @access  Private
router.post('/:id/comments', authMiddleware, async (req, res) => {
    const { text } = req.body;

    if (!text || text.trim() === '') {
        return res.status(400).json({ message: 'Comment text is required' });
    }

    try {
        const project = await Project.findById(req.params.id);
        if (!project) return res.status(404).json({ message: 'Project not found' });

        const newComment = {
            user: req.userId,
            text: text.trim(),
            createdAt: new Date()
        };

        project.comments.push(newComment);
        await project.save();

        res.json(project.comments);
    } catch (err) {
        console.error('Error adding comment:', err);
        res.status(500).json({ message: 'Server error' });
    }
});


// @route   DELETE /api/projects/:id/admin
// @desc    Admin: Delete any project by ID
// @access  Private (admin only)
router.delete('/:id/admin', authMiddleware, adminOnly, async (req, res) => {
    try {
        const project = await Project.findByIdAndDelete(req.params.id);
        if (!project) {
            return res.status(404).json({ message: 'Project not found' });
        }
        res.json({ message: 'Project deleted by admin.' });
    } catch (err) {
        console.error('Admin project delete error:', err);
        res.status(500).json({ message: 'Server error' });
    }
});


module.exports = router;