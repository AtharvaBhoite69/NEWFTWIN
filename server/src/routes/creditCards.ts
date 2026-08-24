import { Router, Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import db from '../db/connection';
import { calculateMonthlyExpenses } from '../services/financial-engine';
import path from 'path';
import fs from 'fs';
import { seedCreditCards, scanAndLinkAssetImages } from '../db/seedCards';

const router = Router();

let lastScanTime = 0;

// ── Credit Card Catalog (All Real Indian Credit Cards) ────────
router.get('/catalog', async (req: AuthRequest, res: Response) => {
  try {
    const now = Date.now();
    if (now - lastScanTime > 30000) {
      lastScanTime = now;
      scanAndLinkAssetImages().catch(() => {});
    }

    const { bank, network, search, sort, withImage } = req.query;

    let query = db('credit_cards').select('*');

    if (bank && typeof bank === 'string' && bank !== 'all') {
      query = query.where('bank', bank);
    }

    if (network && typeof network === 'string' && network !== 'all') {
      query = query.where('network', 'like', `%${network}%`);
    }

    if (search && typeof search === 'string') {
      const s = search.toLowerCase();
      query = query.whereRaw('(LOWER(card_name) LIKE ? OR LOWER(bank) LIKE ? OR LOWER(best_for) LIKE ?)', [
        `%${s}%`,
        `%${s}%`,
        `%${s}%`,
      ]);
    }

    if (withImage === 'true') {
      query = query.whereNotNull('image_url').where('image_url', '!=', '');
    } else if (withImage === 'false') {
      query = query.where(function() {
        this.whereNull('image_url').orWhere('image_url', '=', '');
      });
    }

    if (sort === 'score_desc') {
      query = query.orderBy('cardcheck_score', 'desc');
    } else if (sort === 'name_asc') {
      query = query.orderBy('card_name', 'asc');
    } else if (sort === 'bank_asc') {
      query = query.orderBy('bank', 'asc').orderBy('card_name', 'asc');
    } else {
      query = query.orderBy('cardcheck_score', 'desc').orderBy('bank', 'asc');
    }

    const cards = await query;
    res.json({ success: true, data: cards, total: cards.length });
  } catch (err) {
    console.error('Catalog fetch error:', err);
    res.status(500).json({ success: false, error: 'Failed to get credit cards catalog' });
  }
});

// ── Admin Status / Image Audit ────────────────────────────────
router.get('/admin/status', async (req: AuthRequest, res: Response) => {
  try {
    const total = await db('credit_cards').count('id as count').first();
    const withImage = await db('credit_cards')
      .whereNotNull('image_url')
      .where('image_url', '!=', '')
      .count('id as count')
      .first();

    const totalCount = Number(total?.count || 0);
    const withImageCount = Number(withImage?.count || 0);

    const banks = await db('credit_cards')
      .select('bank')
      .count('id as total')
      .groupBy('bank')
      .orderBy('bank');

    res.json({
      success: true,
      data: {
        totalCards: totalCount,
        cardsWithImages: withImageCount,
        cardsWithoutImages: totalCount - withImageCount,
        completionPercentage: totalCount > 0 ? Math.round((withImageCount / totalCount) * 100) : 0,
        banks,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to get admin status' });
  }
});

// ── Single Card Details ───────────────────────────────────────
router.get('/detail/:id', async (req: AuthRequest, res: Response) => {
  try {
    const card = await db('credit_cards').where({ id: req.params.id }).first();
    if (!card) {
      return res.status(404).json({ success: false, error: 'Credit card not found' });
    }
    res.json({ success: true, data: card });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to get credit card' });
  }
});

// ── Upload / Associate Real Card Image ────────────────────────
router.post('/:id/image', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { imageBase64, imageUrl, fileName } = req.body;

    const card = await db('credit_cards').where({ id }).first();
    if (!card) {
      return res.status(404).json({ success: false, error: 'Credit card not found' });
    }

    let finalImageUrl = '';

    if (imageBase64) {
      // Save base64 image to server/uploads/cards/
      const matches = imageBase64.match(/^data:image\/([A-Za-z-+\/]+);base64,(.+)$/);
      let ext = 'png';
      let buffer: Buffer;

      if (matches && matches.length === 3) {
        ext = matches[1] === 'jpeg' ? 'jpg' : matches[1];
        buffer = Buffer.from(matches[2], 'base64');
      } else {
        buffer = Buffer.from(imageBase64, 'base64');
      }

      const uploadsDir = path.resolve(__dirname, '../../uploads/cards');
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }

      const safeName = card.card_name.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
      const savedFileName = `card_${id}_${safeName}_${Date.now()}.${ext}`;
      const filePath = path.join(uploadsDir, savedFileName);

      fs.writeFileSync(filePath, buffer);
      finalImageUrl = `/uploads/cards/${savedFileName}`;
    } else if (imageUrl) {
      finalImageUrl = imageUrl;
    } else {
      return res.status(400).json({ success: false, error: 'Please provide imageBase64 or imageUrl' });
    }

    await db('credit_cards').where({ id }).update({
      image_url: finalImageUrl,
      image_source: fileName || 'manual_upload',
      image_verified: true,
      updated_at: new Date().toISOString(),
    });

    const updatedCard = await db('credit_cards').where({ id }).first();
    res.json({ success: true, data: updatedCard, message: `Image updated for ${card.card_name}` });
  } catch (err) {
    console.error('Image upload error:', err);
    res.status(500).json({ success: false, error: 'Failed to upload card image' });
  }
});

// ── Remove Card Image ─────────────────────────────────────────
router.delete('/:id/image', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const card = await db('credit_cards').where({ id }).first();
    if (!card) {
      return res.status(404).json({ success: false, error: 'Credit card not found' });
    }

    // If local file, delete it
    if (card.image_url && card.image_url.startsWith('/uploads/cards/')) {
      const filename = path.basename(card.image_url);
      const filePath = path.resolve(__dirname, '../../uploads/cards', filename);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    await db('credit_cards').where({ id }).update({
      image_url: null,
      image_source: null,
      image_verified: false,
      updated_at: new Date().toISOString(),
    });

    res.json({ success: true, message: `Image removed for ${card.card_name}` });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to delete card image' });
  }
});

// ── Smart Batch Image Matching & Upload ───────────────────────
router.post('/batch-image-upload', async (req: AuthRequest, res: Response) => {
  try {
    const { files } = req.body; // Array of { fileName, imageBase64, cardId?: number }
    if (!Array.isArray(files) || files.length === 0) {
      return res.status(400).json({ success: false, error: 'No files provided' });
    }

    const allCards = await db('credit_cards').select('id', 'card_name', 'bank');
    const uploadsDir = path.resolve(__dirname, '../../uploads/cards');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    const matched: any[] = [];
    const unmatched: any[] = [];

    for (const file of files) {
      const { fileName, imageBase64, cardId } = file;
      if (!fileName || !imageBase64) continue;

      let targetCardId = cardId;

      // If cardId not specified, attempt smart matching by filename
      if (!targetCardId) {
        const cleanFileName = fileName.toLowerCase().replace(/[-_]/g, ' ').replace(/\.[^/.]+$/, '');

        // Score each card based on token overlaps
        let bestMatch: any = null;
        let highestScore = 0;

        for (const card of allCards) {
          const cardNameClean = card.card_name.toLowerCase();
          const bankClean = card.bank.toLowerCase();

          let score = 0;
          const tokens = cleanFileName.split(/\s+/).filter(Boolean);

          for (const token of tokens) {
            if (token.length > 2) {
              if (cardNameClean.includes(token)) score += 2;
              if (bankClean.includes(token)) score += 1;
            }
          }

          if (score > highestScore) {
            highestScore = score;
            bestMatch = card;
          }
        }

        // Only auto-assign if confidence is sufficiently high (>= 4 points)
        if (highestScore >= 4 && bestMatch) {
          targetCardId = bestMatch.id;
        }
      }

      if (targetCardId) {
        // Save image and attach
        const matches = imageBase64.match(/^data:image\/([A-Za-z-+\/]+);base64,(.+)$/);
        const ext = matches && matches[1] ? (matches[1] === 'jpeg' ? 'jpg' : matches[1]) : 'png';
        const buffer = matches ? Buffer.from(matches[2], 'base64') : Buffer.from(imageBase64, 'base64');

        const savedFileName = `card_${targetCardId}_${Date.now()}.${ext}`;
        const filePath = path.join(uploadsDir, savedFileName);
        fs.writeFileSync(filePath, buffer);

        const finalImageUrl = `/uploads/cards/${savedFileName}`;

        await db('credit_cards').where({ id: targetCardId }).update({
          image_url: finalImageUrl,
          image_source: fileName,
          image_verified: true,
          updated_at: new Date().toISOString(),
        });

        const targetCard = allCards.find(c => c.id === targetCardId);
        matched.push({
          fileName,
          cardId: targetCardId,
          cardName: targetCard?.card_name,
          bank: targetCard?.bank,
          imageUrl: finalImageUrl,
        });
      } else {
        // Unmatched, return to admin for manual mapping
        unmatched.push({
          fileName,
          imageBase64,
          suggestedCards: allCards.slice(0, 10),
        });
      }
    }

    res.json({
      success: true,
      data: {
        matchedCount: matched.length,
        unmatchedCount: unmatched.length,
        matched,
        unmatched,
      },
    });
  } catch (err) {
    console.error('Batch upload error:', err);
    res.status(500).json({ success: false, error: 'Batch image upload failed' });
  }
});

// ── Re-import CSV Endpoint (Preserving images & IDs) ───────────
router.post('/reimport-csv', async (req: AuthRequest, res: Response) => {
  try {
    const result = await seedCreditCards();
    res.json({
      success: true,
      message: `Database synced from CSV: ${result.inserted} new cards, ${result.updated} existing cards updated.`,
      data: result,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to re-import CSV' });
  }
});

// ── Personalized Recommendations (Based on real Financial Twin data) ──
router.get('/recommend', async (req: AuthRequest, res: Response) => {
  try {
    const expenses = await calculateMonthlyExpenses(req.userId!);
    const allCards = await db('credit_cards').select('*');
    const income = await db('income_sources').where({ user_id: req.userId });
    const totalMonthlyIncome = income.reduce((sum: number, s: any) => sum + s.amount, 0);

    // Build spending breakdown map
    const spendingMap: Record<string, number> = {};
    for (const cat of expenses.breakdown) {
      spendingMap[cat.category.toLowerCase()] = cat.amount;
    }

    const fuelSpend = spendingMap['transport'] || 0;
    const foodSpend = spendingMap['food & dining'] || 0;
    const shoppingSpend = spendingMap['shopping'] || 0;
    const billsSpend = spendingMap['bills & utilities'] || 0;
    const entertainmentSpend = spendingMap['entertainment'] || 0;

    const scoredCards = allCards.map((card: any) => {
      let score = card.cardcheck_score || 50;
      const matchReasons: string[] = [];
      const bestFor = (card.best_for || '').toLowerCase();

      // Spending alignment bonuses based on real data
      if ((bestFor.includes('fuel') || bestFor.includes('petrol') || bestFor.includes('iocl') || bestFor.includes('bpcl') || bestFor.includes('hpcl')) && fuelSpend > 2000) {
        score += 15;
        matchReasons.push(`Optimized for fuel spends (₹${fuelSpend.toLocaleString('en-IN')}/mo)`);
      }

      if ((bestFor.includes('food') || bestFor.includes('swiggy') || bestFor.includes('zomato') || bestFor.includes('dining')) && foodSpend > 3000) {
        score += 15;
        matchReasons.push(`High cashback on food & dining (₹${foodSpend.toLocaleString('en-IN')}/mo)`);
      }

      if ((bestFor.includes('online') || bestFor.includes('amazon') || bestFor.includes('flipkart') || bestFor.includes('shopping')) && shoppingSpend > 5000) {
        score += 15;
        matchReasons.push('Top rewards for your online shopping habits');
      }

      if (bestFor.includes('upi') && (billsSpend > 2000 || expenses.total > 15000)) {
        score += 10;
        matchReasons.push('RuPay UPI-linked card for everyday merchant payments');
      }

      if (bestFor.includes('lounge') || bestFor.includes('travel') || bestFor.includes('miles') || bestFor.includes('forex')) {
        if (totalMonthlyIncome > 80000) {
          score += 12;
          matchReasons.push('Premium travel benefits & lounge access');
        }
      }

      // No annual fee bonus
      const annualFeeStr = (card.annual_fee_inr || '').toLowerCase();
      if (annualFeeStr === 'free' || annualFeeStr === '₹0' || annualFeeStr === '0') {
        score += 10;
        matchReasons.push('Zero annual fee / Lifetime Free');
      }

      if (matchReasons.length === 0 && card.best_for) {
        matchReasons.push(card.best_for);
      }

      return {
        ...card,
        recommendationScore: score,
        matchReasons,
      };
    });

    const topCards = scoredCards
      .sort((a: any, b: any) => b.recommendationScore - a.recommendationScore)
      .slice(0, 10);

    res.json({ success: true, data: topCards });
  } catch (err) {
    console.error('Card recommendation error:', err);
    res.status(500).json({ success: false, error: 'Failed to get recommendations' });
  }
});

// ── User's Own Cards (Wallet) ─────────────────────────────────
router.get('/user', async (req: AuthRequest, res: Response) => {
  try {
    const userCards = await db('user_credit_cards')
      .join('credit_cards', 'user_credit_cards.credit_card_id', 'credit_cards.id')
      .where({ 'user_credit_cards.user_id': req.userId })
      .select(
        'user_credit_cards.id as user_card_id',
        'user_credit_cards.user_id',
        'user_credit_cards.credit_card_id',
        'user_credit_cards.last_four_digits',
        'user_credit_cards.credit_limit',
        'user_credit_cards.available_limit',
        'user_credit_cards.is_primary',
        'user_credit_cards.created_at as added_at',
        'credit_cards.*'
      );

    res.json({ success: true, data: userCards });
  } catch (err) {
    console.error('Get user cards error:', err);
    res.status(500).json({ success: false, error: 'Failed to get user cards' });
  }
});

router.post('/user', async (req: AuthRequest, res: Response) => {
  try {
    const { creditCardId, lastFourDigits, creditLimit, availableLimit, isPrimary } = req.body;

    if (!creditCardId) {
      return res.status(400).json({ success: false, error: 'Please select a credit card' });
    }

    // If marked as primary, unmark existing primary
    if (isPrimary) {
      await db('user_credit_cards').where({ user_id: req.userId }).update({ is_primary: false });
    }

    const [id] = await db('user_credit_cards').insert({
      user_id: req.userId,
      credit_card_id: creditCardId,
      last_four_digits: lastFourDigits ? String(lastFourDigits).slice(-4) : null,
      credit_limit: creditLimit || 0,
      available_limit: availableLimit || creditLimit || 0,
      is_primary: isPrimary ? true : false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    const userCard = await db('user_credit_cards')
      .join('credit_cards', 'user_credit_cards.credit_card_id', 'credit_cards.id')
      .where({ 'user_credit_cards.id': id })
      .select('user_credit_cards.*', 'credit_cards.*')
      .first();

    res.status(201).json({ success: true, data: userCard, message: 'Card added to your wallet' });
  } catch (err) {
    console.error('Add user card error:', err);
    res.status(500).json({ success: false, error: 'Failed to add card to wallet' });
  }
});

router.delete('/user/:id', async (req: AuthRequest, res: Response) => {
  try {
    await db('user_credit_cards').where({ id: req.params.id, user_id: req.userId }).delete();
    res.json({ success: true, message: 'Card removed from wallet' });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Failed to remove card' });
  }
});

export default router;
