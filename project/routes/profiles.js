const express = require('express');
const { body, validationResult } = require('express-validator');
const authMiddleware = require('../middleware/authMiddleware');
const Profile = require('../models/profile');


const User = require('../models/user');


const adminOnly = require('../middleware/adminOnly');


const router = express.Router();

// @route   POST /api/profiles
// @desc    Create or update the current user's profile
// @access  Private
router.post(
    '/',
    authMiddleware,
    [
        body('bio')
            .optional({ checkFalsy: true })
            .trim()
            .isLength({ max: 500 }).withMessage('Bio must be 500 characters or less'),

        body('skills')
            .optional({ checkFalsy: true })
            .trim(),

        body('location')
            .optional({ checkFalsy: true })
            .trim(),

        body('social.github')
            .optional({ checkFalsy: true })
            .isURL().withMessage('GitHub must be a valid URL'),

        body('social.linkedin')
            .optional({ checkFalsy: true })
            .isURL().withMessage('LinkedIn must be a valid URL')
    ],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }

        const { bio, location, skills, social } = req.body;

        // Normalize skills if provided
        const normalizedSkills =
            skills && typeof skills === 'string'
                ? skills.split(',').map(skill => skill.trim()).filter(Boolean)
                : Array.isArray(skills)
                    ? skills.map(skill => skill.trim()).filter(Boolean)
                    : undefined;

        try {
            let profile = await Profile.findOne({ user: req.userId });
    
            // Require bio only when creating a new profile
            if (!profile && (!bio || !bio.trim())) {
                return res.status(400).json({ message: 'Bio is required when creating a profile' });
            }

            const profileData = {
                user: req.userId
            };

            // Only include fields that were actually provided in the request
            if (bio !== undefined) profileData.bio = bio.trim();
            if (location !== undefined) profileData.location = location;
            if (social !== undefined) profileData.social = social;
            if (normalizedSkills !== undefined) profileData.skills = normalizedSkills;

            // Update the current user's profile if it exists, or create one if it doesn't
            // - new: return the updated profile
            // - upsert: create the profile if it doesn't exist
            // - runValidators: ensure schema validation is applied
            profile = await Profile.findOneAndUpdate(
                { user: req.userId },
                profileData,
                { new: true, upsert: true, runValidators: true });

            res.status(200).json(profile);

        } catch (err) {
            console.error('Error creating/updating profile:', err);
            res.status(500).json({ message: 'Server error' });
        }
    }
);


// --- GET /api/profiles ---
// Get all profiles (public)
router.get('/', async (req, res) => {
    try {
        const profiles = await Profile.find().populate('user', 'name email role');
        res.json(profiles);
    } catch (err) {
        console.error('Error fetching profiles:', err);
        res.status(500).json({ message: 'Server error' });
    }
});


// --- GET /api/profiles/:userId ---
// Get profile by user ID (public)
router.get('/:userId', async (req, res) => {
    try {
        const profile = await Profile.findOne({ user: req.params.userId }).populate('user', 'name email role');
    
        if (!profile) {
            return res.status(404).json({ message: 'Profile not found' });
        }
    
        res.json(profile);
    } catch (err) {
        console.error('Error fetching profile:', err);
        res.status(500).json({ message: 'Server error' });
    }
    });


// --- DELETE /api/profiles ---
// Delete current user's profile 
router.delete('/', authMiddleware, async (req, res) => {
    try {
        await Profile.findOneAndDelete({ user: req.userId });

        res.json({ message: 'Profile deleted successfully' });
    } catch (err) {
        console.error('Error deleting profile:', err);
        res.status(500).json({ message: 'Server error' });
    }
});

// @route   DELETE /api/profiles/:userId/admin
// @desc    Admin: Delete any user's profile by user ID
// @access  Private (admin only)
router.delete('/:userId/admin', authMiddleware, adminOnly, async (req, res) => {
    try {
        const profile = await Profile.findOneAndDelete({ user: req.params.userId });
        if (!profile) {
            return res.status(404).json({ message: 'Profile not found' });
        }
        res.json({ message: 'Profile deleted by admin.' });
    } catch (err) {
        console.error('Admin profile delete error:', err);
        res.status(500).json({ message: 'Server error' });
    }
});


module.exports = router;