import app from '../src/app.js';
import { connectDB } from '../src/config/database.js';

export default async function handler(req, res) {
  try {
    await connectDB();
  } catch (err) {
    console.error('MongoDB serverless connection error:', err.message);
  }
  return app(req, res);
}
