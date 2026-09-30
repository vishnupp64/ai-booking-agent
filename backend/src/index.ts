import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
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

// Serve static frontend when built
const frontendDistPath = path.resolve(process.cwd(), 'frontend/dist');
const altFrontendDistPath = path.resolve(process.cwd(), '../frontend/dist');
const staticPath = fs.existsSync(frontendDistPath) 
  ? frontendDistPath 
  : fs.existsSync(altFrontendDistPath) 
  ? altFrontendDistPath 
  : null;

if (staticPath) {
  console.log(`📁 Serving static frontend from: ${staticPath}`);
  app.use(express.static(staticPath));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.join(staticPath, 'index.html'));
  });
}

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
