import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import apiRoutes from './routes/api.js';
import { initDb } from './db/index.js';
import { seedDatabase } from './db/seed.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// API Routes
app.use('/api', apiRoutes);

async function startServer() {
  try {
    // 1. Initialize PostgreSQL Engine (PGlite or native PG)
    await initDb();
    
    // 2. Seed default data if empty
    await seedDatabase();

    // 3. Start Express HTTP Server
    app.listen(PORT, () => {
      console.log(`
  🚀 AI Booking Agent Server is live!
  ==================================
  📡 Server URL: http://localhost:${PORT}
  🤖 Gemini API Key: ${process.env.GEMINI_API_KEY ? 'Configured ✅' : 'Not set (Fallback router active) ⚠️'}
  🗄️ Database: PostgreSQL (Active)
      `);
    });
  } catch (err) {
    console.error('❌ Server startup error:', err);
    process.exit(1);
  }
}

startServer();
