import { Router, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import db from '../db/connection';
import { handleChatMessage, applyFinancialUpdate } from '../services/chat';

const router = Router();

// ── Get Conversations ──────────────────────────────────────────
router.get('/conversations', async (req: AuthRequest, res: Response) => {
  try {
    const conversations = await db('chat_conversations')
      .where({ user_id: req.userId })
      .orderBy('last_message_at', 'desc');
    res.json({ success: true, data: conversations });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to get conversations' });
  }
});

// ── Create Conversation ────────────────────────────────────────
router.post('/conversations', async (req: AuthRequest, res: Response) => {
  try {
    const { title } = req.body;
    const [id] = await db('chat_conversations').insert({
      user_id: req.userId,
      title: title || 'New Conversation',
    });
    const conversation = await db('chat_conversations').where({ id }).first();
    res.status(201).json({ success: true, data: conversation });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to create conversation' });
  }
});

// ── Delete Conversation ────────────────────────────────────────
router.delete('/conversations/:id', async (req: AuthRequest, res: Response) => {
  try {
    await db('chat_conversations').where({ id: req.params.id, user_id: req.userId }).delete();
    res.json({ success: true, message: 'Conversation deleted' });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to delete conversation' });
  }
});

// ── Get Messages ───────────────────────────────────────────────
router.get('/conversations/:id/messages', async (req: AuthRequest, res: Response) => {
  try {
    // Verify ownership
    const conv = await db('chat_conversations').where({ id: req.params.id, user_id: req.userId }).first();
    if (!conv) {
      res.status(404).json({ success: false, error: 'Conversation not found' });
      return;
    }
    const messages = await db('chat_messages')
      .where({ conversation_id: req.params.id })
      .orderBy('created_at', 'asc');
    const parsed = messages.map((m: any) => ({
      ...m,
      metadata: m.metadata ? JSON.parse(m.metadata) : null,
    }));
    res.json({ success: true, data: parsed });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to get messages' });
  }
});

// ── Send Message ───────────────────────────────────────────────
router.post('/conversations/:id/messages', async (req: AuthRequest, res: Response) => {
  try {
    const convId = parseInt(String(req.params.id), 10);
    const { content } = req.body;

    // Verify ownership
    const conv = await db('chat_conversations').where({ id: convId, user_id: req.userId }).first();
    if (!conv) {
      res.status(404).json({ success: false, error: 'Conversation not found' });
      return;
    }

    // Save user message
    await db('chat_messages').insert({
      conversation_id: convId,
      role: 'user',
      content,
    });

    // Process with chat engine
    const result = await handleChatMessage(req.userId!, convId, content);

    // Save assistant reply
    const [replyId] = await db('chat_messages').insert({
      conversation_id: convId,
      role: 'assistant',
      content: result.reply,
      metadata: Object.keys(result.metadata).length > 0 ? JSON.stringify(result.metadata) : null,
    });

    // Update conversation title (use first user message as title)
    if (conv.title === 'New Conversation') {
      const title = content.length > 50 ? content.substring(0, 50) + '...' : content;
      await db('chat_conversations').where({ id: convId }).update({ title });
    }

    // Update last_message_at
    await db('chat_conversations').where({ id: convId }).update({
      last_message_at: new Date().toISOString(),
    });

    const reply = await db('chat_messages').where({ id: replyId }).first();

    res.json({
      success: true,
      data: {
        ...reply,
        metadata: reply.metadata ? JSON.parse(reply.metadata) : null,
      },
    });
  } catch (err) {
    console.error('Chat message error:', err);
    res.status(500).json({ success: false, error: 'Failed to process message' });
  }
});

// ── Confirm Financial Update ───────────────────────────────────
router.post('/confirm-update', async (req: AuthRequest, res: Response) => {
  try {
    const { updateData, messageId } = req.body;
    const result = await applyFinancialUpdate(req.userId!, updateData);

    // Update message metadata to mark as confirmed
    if (messageId) {
      const msg = await db('chat_messages').where({ id: messageId }).first();
      if (msg && msg.metadata) {
        const metadata = JSON.parse(msg.metadata);
        metadata.confirmed = true;
        await db('chat_messages').where({ id: messageId }).update({
          metadata: JSON.stringify(metadata),
        });
      }
    }

    // Fetch post-update snapshot for before/after comparison
    const { getFinancialSnapshot } = await import('../services/financial-engine');
    const postSnapshot = await getFinancialSnapshot(req.userId!);
    const postData = {
      totalMonthlyIncome: postSnapshot.totalMonthlyIncome,
      totalMonthlyExpenses: postSnapshot.totalMonthlyExpenses,
      monthlySurplus: postSnapshot.monthlySurplus,
      savingsRate: postSnapshot.savingsRate,
      emergencyFundMonths: postSnapshot.emergencyFundMonths,
      investmentCapacity: postSnapshot.investmentCapacity,
      debtToIncomeRatio: postSnapshot.debtToIncomeRatio,
      totalSavings: postSnapshot.totalSavings,
      netWorth: postSnapshot.netWorth,
    };

    res.json({ success: true, data: { ...result, postSnapshot: postData } });
  } catch (err) {
    console.error('Confirm update error:', err);
    res.status(500).json({ success: false, error: 'Failed to apply update' });
  }
});

export default router;
