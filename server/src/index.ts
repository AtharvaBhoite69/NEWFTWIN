import express from 'express';
import cors from 'cors';
import { config } from './config';
import { authMiddleware } from './middleware/auth';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { runMigrations } from './db/migrate';

// Routes
import authRoutes from './routes/auth';
import profileRoutes from './routes/profile';
import incomeRoutes from './routes/income';
import expenseRoutes from './routes/expenses';
import financialRoutes from './routes/financial';
import goalsRoutes from './routes/goals';
import investmentRoutes from './routes/investments';
import creditCardRoutes from './routes/creditCards';
import chatRoutes from './routes/chat';
import loanRoutes from './routes/loans';
import bankAccountRoutes from './routes/bankAccounts';
import notificationRoutes from './routes/notifications';

import path from 'path';
import fs from 'fs';

const app = express();

// Ensure uploads directory exists
const uploadsDir = path.resolve(__dirname, '../uploads/cards');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// ── Middleware ──────────────────────────────────────────────────
app.use(cors(config.cors));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// ── Static Files (Uploaded Real Card Images) ─────────────────────
app.use('/uploads', express.static(path.resolve(__dirname, '../uploads')));

// ── Static Files (Admin-dropped Card Images from assets folder) ──
app.use('/assets', express.static(path.resolve(__dirname, '../assets')));

// ── Public Routes ──────────────────────────────────────────────
app.use('/api/auth', authRoutes);

// ── Health Check ───────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ── Protected Routes ───────────────────────────────────────────
app.use('/api/auth/me', authMiddleware);
app.use('/api/profile', authMiddleware, profileRoutes);
app.use('/api/income', authMiddleware, incomeRoutes);
app.use('/api/expenses', authMiddleware, expenseRoutes);
app.use('/api/financial', authMiddleware, financialRoutes);
app.use('/api/goals', authMiddleware, goalsRoutes);
app.use('/api/investments', authMiddleware, investmentRoutes);
app.use('/api/credit-cards', authMiddleware, creditCardRoutes);
app.use('/api/chat', authMiddleware, chatRoutes);
app.use('/api/loans', authMiddleware, loanRoutes);
app.use('/api/bank-accounts', authMiddleware, bankAccountRoutes);
app.use('/api/notifications', authMiddleware, notificationRoutes);

// ── Error Handling ─────────────────────────────────────────────
app.use(notFoundHandler);
app.use(errorHandler);

// ── Start Server ───────────────────────────────────────────────
async function start() {
  try {
    // Run migrations on startup
    await runMigrations();
    
    // Seed check — run seed if needed
    const { default: db } = await import('./db/connection');
    const catCount = await db('expense_categories').count('id as count').first();
    if (!catCount || catCount.count === 0) {
      console.log('🌱 Running initial seed...');
      const { seed } = await import('./db/seed');
      await seed();
    }

    // Always ensure credit card database is synced with uploaded CSV
    const { seedCreditCards } = await import('./db/seedCards');
    await seedCreditCards();

    app.listen(config.port, () => {
      console.log(`\n🚀 FTWIN Server running on http://localhost:${config.port}`);
      console.log(`📊 API: http://localhost:${config.port}/api`);
      console.log(`💾 Database: ${config.db.filename}`);
      if (config.groqApiKey) {
        console.log(`🤖 Groq AI: Connected (${config.groqModel})`);
      } else {
        console.log(`🤖 Chat: Rule-based mode (set GROQ_API_KEY for AI responses)`);
      }
      console.log('');
    });
  } catch (err) {
    console.error('❌ Failed to start server:', err);
    process.exit(1);
  }
}

start();
