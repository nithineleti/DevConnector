const jwt = require('jsonwebtoken');

function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'No token, authorization denied' });
  }

  const token = authHeader.split(' ')[1];

  try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.userId = decoded.userId; // Attach user ID to request
      next();
  } catch (err) {
      console.error('JWT verification failed:', err);
      res.status(401).json({ message: 'Token is not valid' });
  }
}

module.exports = authMiddleware;