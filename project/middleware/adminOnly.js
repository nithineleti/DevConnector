const User = require('../models/user');

module.exports = async function adminOnly(req, res, next) {
    try {
        const user = await User.findById(req.userId);
        if (!user || user.role !== 'admin') {
            return res.status(403).json({ message: 'Access denied. Admins only.' });
        }
        next();
    } catch (err) {
        console.error('Admin check failed:', err);
        res.status(500).json({ message: 'Server error' });
    }
};