require('dotenv').config({ path: '../.env' });
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');

const app = express();
app.use(cors());
app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Routes are added on feature branches:
// app.use('/api/auth', require('./routes/auth'));     // feature/auth
// app.use('/api/host', require('./routes/host'));     // feature/host
// app.use('/api/bookings', require('./routes/booking')); // feature/booking
// app.use('/api/admin', require('./routes/admin'));   // feature/admin

app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

const PORT = process.env.PORT || 8080;

connectDB().then(() => {
  app.listen(PORT, () => console.log(`Backend listening on :${PORT}`));
});
