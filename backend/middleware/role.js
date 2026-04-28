function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Non autenticato' });
    }

    if (!allowedRoles.includes(req.user.ruolo)) {
      return res.status(403).json({ error: 'Permesso negato' });
    }

    next();
  };
}

module.exports = requireRole;
