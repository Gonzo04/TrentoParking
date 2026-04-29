const express = require('express');
const requireAuth = require('../middleware/auth');
const requireRole = require('../middleware/role');
const { listPosti, createPosto, updatePosto, deletePosto } = require('../controllers/hostController');

const router = express.Router();

router.use(requireAuth);
router.use(requireRole('HOST'));

router.get('/posti', listPosti);
router.post('/posti', createPosto);
router.put('/posti/:id', updatePosto);
router.delete('/posti/:id', deletePosto);

module.exports = router;
