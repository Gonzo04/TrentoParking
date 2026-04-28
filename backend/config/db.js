const mongoose = require('mongoose');

async function connectDB() {
  const user = process.env.MONGO_APP_USER || '';
  const pass = process.env.MONGO_APP_PASS || '';
  const host = process.env.MONGO_HOST || 'localhost';
  const port = process.env.MONGO_PORT || '27017';
  const db = process.env.MONGO_DB || 'trentoparking';
  const authDb = process.env.MONGO_AUTH_DB || db;

  const auth = user && pass ? `${encodeURIComponent(user)}:${encodeURIComponent(pass)}@` : '';
  const authQuery = user && pass ? `?authSource=${authDb}` : '';
  const uri = `mongodb://${auth}${host}:${port}/${db}${authQuery}`;

  await mongoose.connect(uri);
  console.log(`MongoDB connected: ${db}@${host}:${port}`);
}

module.exports = connectDB;
