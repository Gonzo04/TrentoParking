require('dotenv').config({ path: '../.env' });

const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const pulisciUserNonVerificati = require('./utils/pulisciUserNonVerificati'); //per pulire le mail non confermate

const authRoutes = require('./routes/auth');

const app = express();

app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/auth', authRoutes);
app.use('/api/bookings', require('./routes/booking'));

// Routes da aggiungere nei prossimi step:
// app.use('/api/host', require('./routes/host'));
// app.use('/api/admin', require('./routes/admin'));

app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error'
  });
});

const PORT = process.env.PORT || 8080;

connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Backend listening on :${PORT}`);
  });
});

pulisciUserNonVerificati();

// pulisce le mail sbagliate o non confermate ogni ora dopo 24 ore da quando non sono state inviate
setInterval(() => {
  pulisciUserNonVerificati();
}, 60 * 60 * 1000);
