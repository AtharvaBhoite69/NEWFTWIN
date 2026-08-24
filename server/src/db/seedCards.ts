import fs from 'fs';
import path from 'path';
import db from './connection';

export interface RawCreditCardCSV {
  card_name: string;
  bank: string;
  network: string;
  cardcheck_score_100: string;
  rating_verdict: string;
  best_for: string;
  joining_fee_inr: string;
  annual_fee_inr: string;
  reward_rate_pct: string;
  apr_pct_annual: string;
  source_url: string;
}

/**
 * Robust CSV Line Parser that properly handles quotes with commas inside
 */
export function parseCSV(csvContent: string): Record<string, string>[] {
  const lines = csvContent.split(/\r?\n/).filter(line => line.trim().length > 0);
  if (lines.length === 0) return [];

  const rawHeaders = parseCSVLine(lines[0]);
  const headers = rawHeaders.map(h => h.trim().replace(/^\ufeff/, '').replace(/^"|"$/g, ''));
  const results: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    if (values.length === 0) continue;
    const row: Record<string, string> = {};
    for (let j = 0; j < headers.length; j++) {
      let val = values[j] !== undefined ? values[j].trim() : '';
      if (val.startsWith('"') && val.endsWith('"') && val.length >= 2) {
        val = val.slice(1, -1).trim();
      }
      row[headers[j]] = val;
    }
    results.push(row);
  }

  return results;
}

function parseCSVLine(line: string): string[] {
  const values: string[] = [];
  let current = '';
  let insideQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      if (insideQuotes && line[i + 1] === '"') {
        current += '"';
        i++; // skip escaped quote
      } else {
        insideQuotes = !insideQuotes;
      }
    } else if (char === ',' && !insideQuotes) {
      values.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  values.push(current);
  return values;
}

/**
 * Ensure all necessary columns exist on credit_cards and user_credit_cards
 */
export async function ensureCreditCardSchema(): Promise<void> {
  const hasCreditCards = await db.schema.hasTable('credit_cards');
  if (!hasCreditCards) {
    await db.schema.createTable('credit_cards', (table) => {
      table.increments('id').primary();
      table.string('card_name').notNullable();
      table.string('bank').notNullable();
      table.string('network');
      table.integer('cardcheck_score');
      table.string('rating_verdict');
      table.text('best_for');
      table.string('joining_fee_inr');
      table.string('annual_fee_inr');
      table.string('reward_rate_pct');
      table.string('apr_pct_annual');
      table.text('source_url');
      table.text('image_url');
      table.string('image_source');
      table.boolean('image_verified').defaultTo(false);
      table.string('last_verified_at');
      table.timestamp('created_at').defaultTo(db.fn.now());
      table.timestamp('updated_at').defaultTo(db.fn.now());
    });
  } else {
    // Add any missing columns to existing table
    const columns = [
      { name: 'network', type: 'string' },
      { name: 'cardcheck_score', type: 'integer' },
      { name: 'rating_verdict', type: 'string' },
      { name: 'best_for', type: 'text' },
      { name: 'joining_fee_inr', type: 'string' },
      { name: 'annual_fee_inr', type: 'string' },
      { name: 'reward_rate_pct', type: 'string' },
      { name: 'apr_pct_annual', type: 'string' },
      { name: 'source_url', type: 'text' },
      { name: 'image_url', type: 'text' },
      { name: 'image_source', type: 'string' },
      { name: 'image_verified', type: 'boolean' },
      { name: 'last_verified_at', type: 'string' },
      { name: 'created_at', type: 'timestamp' },
      { name: 'updated_at', type: 'timestamp' },
    ];

    for (const col of columns) {
      const hasCol = await db.schema.hasColumn('credit_cards', col.name);
      if (!hasCol) {
        await db.schema.alterTable('credit_cards', (table) => {
          if (col.type === 'string') table.string(col.name);
          else if (col.type === 'integer') table.integer(col.name);
          else if (col.type === 'text') table.text(col.name);
          else if (col.type === 'boolean') table.boolean(col.name).defaultTo(false);
          else if (col.type === 'timestamp') table.string(col.name);
        });
      }
    }
  }

  // Ensure user_credit_cards schema
  const hasUserCreditCards = await db.schema.hasTable('user_credit_cards');
  if (!hasUserCreditCards) {
    await db.schema.createTable('user_credit_cards', (table) => {
      table.increments('id').primary();
      table.integer('user_id').unsigned().notNullable()
        .references('id').inTable('users').onDelete('CASCADE');
      table.integer('credit_card_id').unsigned().notNullable()
        .references('id').inTable('credit_cards').onDelete('CASCADE');
      table.string('last_four_digits');
      table.decimal('credit_limit', 15, 2).defaultTo(0);
      table.decimal('available_limit', 15, 2).defaultTo(0);
      table.boolean('is_primary').defaultTo(false);
      table.timestamp('created_at').defaultTo(db.fn.now());
      table.timestamp('updated_at').defaultTo(db.fn.now());
    });
  } else {
    const userCols = [
      { name: 'last_four_digits', type: 'string' },
      { name: 'available_limit', type: 'decimal' },
      { name: 'is_primary', type: 'boolean' },
    ];
    for (const col of userCols) {
      const hasCol = await db.schema.hasColumn('user_credit_cards', col.name);
      if (!hasCol) {
        await db.schema.alterTable('user_credit_cards', (table) => {
          if (col.type === 'string') table.string(col.name);
          else if (col.type === 'decimal') table.decimal(col.name, 15, 2).defaultTo(0);
          else if (col.type === 'boolean') table.boolean(col.name).defaultTo(false);
        });
      }
    }
  }
}

/**
 * Import credit cards from india_credit_cards.csv
 * Preserves existing images and card IDs.
 */
export async function seedCreditCards(): Promise<{ inserted: number; updated: number; total: number }> {
  await ensureCreditCardSchema();

  const csvPath = path.resolve(__dirname, '../../data/india_credit_cards.csv');
  const fallbackCsvPath = path.resolve(__dirname, '../../../india_credit_cards.csv');

  let filePath = csvPath;
  if (!fs.existsSync(filePath)) {
    filePath = fallbackCsvPath;
  }

  if (!fs.existsSync(filePath)) {
    console.warn(`[seedCreditCards] CSV file not found at ${csvPath}`);
    return { inserted: 0, updated: 0, total: 0 };
  }

  const fileContent = fs.readFileSync(filePath, 'utf-8');
  const parsedRows = parseCSV(fileContent);

  let inserted = 0;
  let updated = 0;

  for (const row of parsedRows) {
    const cardName = row.card_name?.trim();
    const bank = row.bank?.trim();
    if (!cardName || !bank) continue;

    const scoreNum = row.cardcheck_score_100 ? parseInt(row.cardcheck_score_100, 10) : null;
    const cardcheckScore = isNaN(scoreNum as any) ? null : scoreNum;

    // Check if card already exists (by name and bank)
    const existing = await db('credit_cards')
      .whereRaw('LOWER(card_name) = ? AND LOWER(bank) = ?', [cardName.toLowerCase(), bank.toLowerCase()])
      .first();

    const cardData: any = {
      card_name: cardName,
      bank: bank,
      network: row.network?.trim() || null,
      card_network: row.network?.trim() || 'Standard',
      card_type: 'rewards',
      cardcheck_score: cardcheckScore,
      rating_verdict: row.rating_verdict?.trim() || null,
      best_for: row.best_for?.trim() || null,
      joining_fee_inr: row.joining_fee_inr?.trim() || null,
      annual_fee_inr: row.annual_fee_inr?.trim() || null,
      reward_rate_pct: row.reward_rate_pct?.trim() || null,
      apr_pct_annual: row.apr_pct_annual?.trim() || null,
      source_url: row.source_url?.trim() || null,
      last_verified_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

      const csvImgUrl = row.image_url?.trim() || null;
      const csvImgSource = csvImgUrl ? 'asset' : (existing ? existing.image_source : null);
      const csvImgVerified = csvImgUrl ? true : (existing ? Boolean(existing.image_verified) : false);

      if (existing) {
        await db('credit_cards').where({ id: existing.id }).update({
          ...cardData,
          image_url: csvImgUrl || existing.image_url,
          image_source: csvImgSource,
          image_verified: csvImgVerified,
        });
        updated++;
      } else {
        await db('credit_cards').insert({
          ...cardData,
          image_url: csvImgUrl,
          image_source: csvImgSource,
          image_verified: csvImgVerified,
          created_at: new Date().toISOString(),
        });
        inserted++;
      }
  }

  const total = await db('credit_cards').count('id as count').first();
  console.log(`💳 Credit cards catalog initialized: ${inserted} inserted, ${updated} updated. Total: ${total?.count || 0}`);

  // Auto-link any images dropped in server/assets/cards/
  await scanAndLinkAssetImages();

  return { inserted, updated, total: Number(total?.count || 0) };
}

/**
 * Scans server/assets/cards/ for image files and matches them to credit cards.
 * Matching is done by fuzzy comparison of the filename against card_name + bank.
 * Writes image_url = '/assets/cards/<filename>' into the DB for matched cards.
 */
export async function scanAndLinkAssetImages(): Promise<{ linked: number }> {
  const assetsDir = path.resolve(__dirname, '../../assets/cards');
  if (!fs.existsSync(assetsDir)) return { linked: 0 };

  const imageExts = ['.jpg', '.jpeg', '.png', '.webp'];
  const files = fs.readdirSync(assetsDir).filter(f => {
    const ext = path.extname(f).toLowerCase();
    return imageExts.includes(ext) && f !== 'README.md';
  });

  if (files.length === 0) return { linked: 0 };

  const allCards = await db('credit_cards').select('id', 'card_name', 'bank', 'image_url');
  let linked = 0;

  for (const file of files) {
    const fileUrl = `/assets/cards/${file}`;

    // Skip if this file is already the image_url for some card
    const alreadyLinked = allCards.some(c => c.image_url === fileUrl);
    if (alreadyLinked) continue;

    // Build a clean searchable string from the filename (strip extension, replace separators)
    const cleanName = path.basename(file, path.extname(file))
      .toLowerCase()
      .replace(/[-_]/g, ' ')
      .trim();

    const tokens = cleanName.split(/\s+/).filter(t => t.length > 1);

    let bestCard: any = null;
    let bestScore = 0;

    for (const card of allCards) {
      const cardStr = `${card.bank} ${card.card_name}`.toLowerCase();
      let score = 0;
      for (const tok of tokens) {
        if (cardStr.includes(tok)) score += tok.length; // longer token = higher weight
      }
      if (score > bestScore) {
        bestScore = score;
        bestCard = card;
      }
    }

    // Require a minimum confidence score (at least 4 chars worth of matching tokens)
    if (bestCard && bestScore >= 4) {
      await db('credit_cards').where({ id: bestCard.id }).update({
        image_url: fileUrl,
        image_source: 'asset',
        image_verified: true,
        updated_at: new Date().toISOString(),
      });
      // Update our in-memory list so next file doesn't overwrite this
      const idx = allCards.findIndex(c => c.id === bestCard.id);
      if (idx !== -1) allCards[idx].image_url = fileUrl;
      linked++;
      console.log(`🖼️  Linked: ${file} → ${bestCard.bank} ${bestCard.card_name}`);
    } else {
      console.log(`⚠️  No match found for: ${file} (best score: ${bestScore})`);
    }
  }

  if (linked > 0) {
    console.log(`✅ Auto-linked ${linked} card image(s) from assets/cards/`);
  }

  return { linked };
}

// Run directly if invoked from command line
if (require.main === module) {
  seedCreditCards()
    .then((res) => {
      console.log('✅ Credit card seed completed:', res);
      process.exit(0);
    })
    .catch((err) => {
      console.error('❌ Failed to seed credit cards:', err);
      process.exit(1);
    });
}
