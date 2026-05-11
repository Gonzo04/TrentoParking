const express = require('express');
const { register, login, me, logout, resendVerificationEmail, richiediResetPassword, resetPassword } = require('../controllers/authController');
const requireAuth = require('../middleware/auth');
const { confermaMail } = require('../utils/verificaMail');

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.get('/me', requireAuth, me);
router.post('/logout', requireAuth, logout);
router.get('/conferma/:token', confermaMail);
router.post('/resend-verification', resendVerificationEmail);
router.post('/forgot-password', richiediResetPassword);
router.post('/reset-password/:token', resetPassword);

module.exports = router;