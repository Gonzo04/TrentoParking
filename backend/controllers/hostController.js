const PostoPrivato = require('../models/PostoPrivato');

// GET /api/host/posti
async function listPosti(req, res, next) {
  // TODO: PostoPrivato.find({ hostId: req.user.userId })
  res.status(501).json({ error: 'Not implemented' });
}

// POST /api/host/posti
async function createPosto(req, res, next) {
  // TODO: validate body (posizione, tariffaOraria)
  // TODO: PostoPrivato.create({ ...body, hostId: req.user.userId })
  res.status(501).json({ error: 'Not implemented' });
}

// PUT /api/host/posti/:id
async function updatePosto(req, res, next) {
  // TODO: find posto by id
  // TODO: 404 if not found, 403 if posto.hostId !== req.user.userId
  // TODO: update fields and save
  res.status(501).json({ error: 'Not implemented' });
}

// DELETE /api/host/posti/:id
async function deletePosto(req, res, next) {
  // TODO: same ownership check as update, then delete
  res.status(501).json({ error: 'Not implemented' });
}

module.exports = { listPosti, createPosto, updatePosto, deletePosto };
