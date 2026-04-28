const mongoose = require('mongoose');

async function connectDB() {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/trentoparking';

  await mongoose.connect(uri);

  const dbName = mongoose.connection.name;
  const host = mongoose.connection.host;

  console.log(`MongoDB connected: ${dbName}@${host}`);
}

module.exports = connectDB;