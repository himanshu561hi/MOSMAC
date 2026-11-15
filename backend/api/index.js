import app from '../src/app.js';
import { connectDB } from '../src/config/database.js';

export default async function handler(req, res) {
  try {
    // Ensure database connection is established or retrieved from cache
    await connectDB();
  } catch (error) {
    console.error('Serverless invocation DB connection failure:', error);
    // Proceed to app anyway so health/error endpoints can return structured JSON
  }

  return app(req, res);
}

