import app from './backend/src/app.js';
import { connectDB } from './backend/src/config/database.js';

export default async function handler(req, res) {
  try {
    await connectDB();
  } catch (err) {
    console.error('MongoDB serverless connection error:', err.message);
  }
  return app(req, res);
}
