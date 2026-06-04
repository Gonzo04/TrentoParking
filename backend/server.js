require('dotenv').config({ path: '../.env' });

const path = require('path');
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const pulisciUserNonVerificati = require('./utils/pulisciUserNonVerificati'); // per pulire le mail non confermate

const authRoutes = require('./routes/auth');
const postiPrivatiRoutes = require('./routes/postiPrivati');

const app = express();

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/auth', authRoutes);
app.use('/api/posti-privati', postiPrivatiRoutes);
app.use('/api/bookings', require('./routes/booking'));
app.use('/api/recensioni', require('./routes/recensioni'));
app.use('/api/chat', require('./routes/chat'));
app.use('/api/admin', require('./routes/admin'));

app.use((err, req, res, next) => {
  console.error(err);

  res.status(err.status || 500).json({
    error: err.message || 'Internal server error'
  });
});

const PORT = process.env.PORT || 8080;

connectDB()
    .then(() => {
      app.listen(PORT, () => {
        console.log(`Backend listening on :${PORT}`);
      });

      // Avviamo la pulizia solo dopo la connessione al database
      // In questo modo evitiamo query Mongoose mentre MongoDB non e ancora pronto
      pulisciUserNonVerificati();

      // Pulisce le mail sbagliate o non confermate ogni ora
      // Dopo 24 ore da quando sono state create
      setInterval(() => {
        pulisciUserNonVerificati();
      }, 60 * 60 * 1000);
    })
    .catch((error) => {
      console.error('Errore durante la connessione a MongoDB:', error);
      process.exit(1);
    });