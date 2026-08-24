import db from './connection';

async function createIfNotExists(tableName: string, creator: (table: any) => void) {
  const exists = await db.schema.hasTable(tableName);
  if (!exists) {
    await db.schema.createTable(tableName, creator);
  }
}

export async function runMigrations() {
  console.log('🔄 Running database migrations...');

  // ── Users ────────────────────────────────────────────────────
  await createIfNotExists('users', (table) => {
    table.increments('id').primary();
    table.string('email').notNullable().unique();
    table.string('password_hash').notNullable();
    table.string('name').notNullable();
    table.timestamp('created_at').defaultTo(db.fn.now());
    table.timestamp('updated_at').defaultTo(db.fn.now());
  });

  // ── Profiles ─────────────────────────────────────────────────
  await createIfNotExists('profiles', (table) => {
    table.increments('id').primary();
    table.integer('user_id').unsigned().notNullable().unique()
      .references('id').inTable('users').onDelete('CASCADE');
    table.string('date_of_birth');
    table.string('gender');
    table.string('marital_status').defaultTo('single');
    table.integer('dependents').defaultTo(0);
    table.string('city');
    table.string('employment_type');
    table.string('employer');
    table.string('risk_preference').defaultTo('moderate');
    table.boolean('onboarding_completed').defaultTo(false);
    table.timestamp('created_at').defaultTo(db.fn.now());
    table.timestamp('updated_at').defaultTo(db.fn.now());
  });

  // ── Expense Categories ───────────────────────────────────────
  await createIfNotExists('expense_categories', (table) => {
    table.increments('id').primary();
    table.string('name').notNullable().unique();
    table.string('icon').notNullable();
    table.string('color').notNullable();
  });

  // ── Income Sources ───────────────────────────────────────────
  await createIfNotExists('income_sources', (table) => {
    table.increments('id').primary();
    table.integer('user_id').unsigned().notNullable()
      .references('id').inTable('users').onDelete('CASCADE');
    table.string('type').notNullable().defaultTo('salary');
    table.string('name').notNullable();
    table.decimal('amount', 15, 2).notNullable();
    table.string('frequency').notNullable().defaultTo('monthly');
    table.boolean('is_primary').defaultTo(false);
    table.timestamp('created_at').defaultTo(db.fn.now());
    table.timestamp('updated_at').defaultTo(db.fn.now());
  });

  // ── Expenses ─────────────────────────────────────────────────
  await createIfNotExists('expenses', (table) => {
    table.increments('id').primary();
    table.integer('user_id').unsigned().notNullable()
      .references('id').inTable('users').onDelete('CASCADE');
    table.integer('category_id').unsigned()
      .references('id').inTable('expense_categories');
    table.string('name').notNullable();
    table.decimal('amount', 15, 2).notNullable();
    table.string('frequency').notNullable().defaultTo('monthly');
    table.boolean('is_mandatory').defaultTo(false);
    table.timestamp('created_at').defaultTo(db.fn.now());
    table.timestamp('updated_at').defaultTo(db.fn.now());
  });

  // ── Bank Accounts ────────────────────────────────────────────
  await createIfNotExists('bank_accounts', (table) => {
    table.increments('id').primary();
    table.integer('user_id').unsigned().notNullable()
      .references('id').inTable('users').onDelete('CASCADE');
    table.string('bank_name').notNullable();
    table.string('account_type').notNullable().defaultTo('savings');
    table.decimal('balance', 15, 2).defaultTo(0);
    table.string('account_number');
    table.boolean('is_connected').defaultTo(false);
    table.timestamp('created_at').defaultTo(db.fn.now());
    table.timestamp('updated_at').defaultTo(db.fn.now());
  });

  // ── Transactions ─────────────────────────────────────────────
  await createIfNotExists('transactions', (table) => {
    table.increments('id').primary();
    table.integer('user_id').unsigned().notNullable()
      .references('id').inTable('users').onDelete('CASCADE');
    table.integer('bank_account_id').unsigned()
      .references('id').inTable('bank_accounts').onDelete('SET NULL');
    table.integer('category_id').unsigned()
      .references('id').inTable('expense_categories');
    table.decimal('amount', 15, 2).notNullable();
    table.string('type').notNullable();
    table.string('date').notNullable();
    table.string('description');
    table.timestamp('created_at').defaultTo(db.fn.now());
  });

  // ── Credit Cards (catalog) ──────────────────────────────────
  await createIfNotExists('credit_cards', (table) => {
    table.increments('id').primary();
    table.string('bank').notNullable();
    table.string('card_name').notNullable();
    table.string('card_network').notNullable();
    table.string('card_type').notNullable();
    table.decimal('annual_fee', 10, 2).defaultTo(0);
    table.decimal('joining_fee', 10, 2).defaultTo(0);
    table.text('rewards_description');
    table.text('cashback_description');
    table.text('lounge_access');
    table.text('fuel_benefits');
    table.text('dining_benefits');
    table.text('travel_benefits');
    table.text('milestone_benefits');
    table.text('forex_charges');
    table.decimal('interest_rate', 5, 2).defaultTo(0);
    table.decimal('min_income_required', 15, 2).defaultTo(0);
    table.string('card_color1').defaultTo('#1a1a2e');
    table.string('card_color2').defaultTo('#16213e');
    table.string('logo_url');
    table.string('best_for');
    table.text('features');
  });

  // ── User Credit Cards ────────────────────────────────────────
  await createIfNotExists('user_credit_cards', (table) => {
    table.increments('id').primary();
    table.integer('user_id').unsigned().notNullable()
      .references('id').inTable('users').onDelete('CASCADE');
    table.integer('credit_card_id').unsigned().notNullable()
      .references('id').inTable('credit_cards').onDelete('CASCADE');
    table.decimal('credit_limit', 15, 2).defaultTo(0);
    table.decimal('current_balance', 15, 2).defaultTo(0);
    table.integer('billing_date').defaultTo(1);
    table.timestamp('created_at').defaultTo(db.fn.now());
    table.timestamp('updated_at').defaultTo(db.fn.now());
  });

  // ── Loans ────────────────────────────────────────────────────
  await createIfNotExists('loans', (table) => {
    table.increments('id').primary();
    table.integer('user_id').unsigned().notNullable()
      .references('id').inTable('users').onDelete('CASCADE');
    table.string('type').notNullable();
    table.string('name').notNullable();
    table.decimal('principal', 15, 2).notNullable();
    table.decimal('outstanding_amount', 15, 2).notNullable();
    table.decimal('interest_rate', 5, 2).notNullable();
    table.decimal('emi', 15, 2).notNullable();
    table.integer('tenure_months').notNullable();
    table.integer('remaining_tenure_months').notNullable();
    table.string('start_date').notNullable();
    table.timestamp('created_at').defaultTo(db.fn.now());
    table.timestamp('updated_at').defaultTo(db.fn.now());
  });

  // ── Investments ──────────────────────────────────────────────
  await createIfNotExists('investments', (table) => {
    table.increments('id').primary();
    table.integer('user_id').unsigned().notNullable()
      .references('id').inTable('users').onDelete('CASCADE');
    table.string('type').notNullable();
    table.string('name').notNullable();
    table.decimal('invested_amount', 15, 2).notNullable();
    table.decimal('current_value', 15, 2).notNullable();
    table.decimal('monthly_contribution', 15, 2).defaultTo(0);
    table.string('start_date').notNullable();
    table.string('maturity_date');
    table.decimal('interest_rate', 5, 2);
    table.timestamp('created_at').defaultTo(db.fn.now());
    table.timestamp('updated_at').defaultTo(db.fn.now());
  });

  // ── Investment Products (catalog) ────────────────────────────
  await createIfNotExists('investment_products', (table) => {
    table.increments('id').primary();
    table.string('name').notNullable();
    table.string('type').notNullable();
    table.string('risk_level').notNullable();
    table.decimal('expected_return_min', 5, 2).notNullable();
    table.decimal('expected_return_max', 5, 2).notNullable();
    table.string('liquidity').notNullable();
    table.decimal('min_investment', 15, 2).defaultTo(0);
    table.string('lock_in_period');
    table.boolean('tax_benefit').defaultTo(false);
    table.text('tax_info');
    table.text('description');
  });

  // ── Financial Goals ──────────────────────────────────────────
  await createIfNotExists('financial_goals', (table) => {
    table.increments('id').primary();
    table.integer('user_id').unsigned().notNullable()
      .references('id').inTable('users').onDelete('CASCADE');
    table.string('name').notNullable();
    table.string('type').notNullable();
    table.decimal('target_amount', 15, 2).notNullable();
    table.decimal('current_amount', 15, 2).defaultTo(0);
    table.string('target_date').notNullable();
    table.decimal('monthly_contribution', 15, 2).defaultTo(0);
    table.string('priority').defaultTo('medium');
    table.string('status').defaultTo('on_track');
    table.timestamp('created_at').defaultTo(db.fn.now());
    table.timestamp('updated_at').defaultTo(db.fn.now());
  });

  // ── Goal Contributions ───────────────────────────────────────
  await createIfNotExists('goal_contributions', (table) => {
    table.increments('id').primary();
    table.integer('goal_id').unsigned().notNullable()
      .references('id').inTable('financial_goals').onDelete('CASCADE');
    table.decimal('amount', 15, 2).notNullable();
    table.string('date').notNullable();
    table.timestamp('created_at').defaultTo(db.fn.now());
  });

  // ── Financial Snapshots ──────────────────────────────────────
  await createIfNotExists('financial_snapshots', (table) => {
    table.increments('id').primary();
    table.integer('user_id').unsigned().notNullable()
      .references('id').inTable('users').onDelete('CASCADE');
    table.string('month').notNullable();
    table.decimal('income', 15, 2).defaultTo(0);
    table.decimal('expenses', 15, 2).defaultTo(0);
    table.decimal('savings', 15, 2).defaultTo(0);
    table.decimal('investments', 15, 2).defaultTo(0);
    table.decimal('debt', 15, 2).defaultTo(0);
    table.decimal('net_worth', 15, 2).defaultTo(0);
    table.timestamp('created_at').defaultTo(db.fn.now());
    table.unique(['user_id', 'month']);
  });

  // ── Financial Scores ─────────────────────────────────────────
  await createIfNotExists('financial_scores', (table) => {
    table.increments('id').primary();
    table.integer('user_id').unsigned().notNullable()
      .references('id').inTable('users').onDelete('CASCADE');
    table.integer('total_score').defaultTo(0);
    table.text('component_scores');
    table.timestamp('calculated_at').defaultTo(db.fn.now());
  });

  // ── Simulations ──────────────────────────────────────────────
  await createIfNotExists('simulations', (table) => {
    table.increments('id').primary();
    table.integer('user_id').unsigned().notNullable()
      .references('id').inTable('users').onDelete('CASCADE');
    table.string('name').notNullable();
    table.text('parameters');
    table.text('results');
    table.timestamp('created_at').defaultTo(db.fn.now());
  });

  // ── Advisor Recommendations ──────────────────────────────────
  await createIfNotExists('advisor_recommendations', (table) => {
    table.increments('id').primary();
    table.integer('user_id').unsigned().notNullable()
      .references('id').inTable('users').onDelete('CASCADE');
    table.string('type').notNullable();
    table.string('priority').notNullable();
    table.string('title').notNullable();
    table.text('description').notNullable();
    table.text('reason');
    table.string('action_text');
    table.string('status').defaultTo('active');
    table.timestamp('created_at').defaultTo(db.fn.now());
  });

  // ── Chat Conversations ───────────────────────────────────────
  await createIfNotExists('chat_conversations', (table) => {
    table.increments('id').primary();
    table.integer('user_id').unsigned().notNullable()
      .references('id').inTable('users').onDelete('CASCADE');
    table.string('title').defaultTo('New Conversation');
    table.timestamp('last_message_at').defaultTo(db.fn.now());
    table.timestamp('created_at').defaultTo(db.fn.now());
  });

  // ── Chat Messages ────────────────────────────────────────────
  await createIfNotExists('chat_messages', (table) => {
    table.increments('id').primary();
    table.integer('conversation_id').unsigned().notNullable()
      .references('id').inTable('chat_conversations').onDelete('CASCADE');
    table.string('role').notNullable();
    table.text('content').notNullable();
    table.text('metadata');
    table.timestamp('created_at').defaultTo(db.fn.now());
  });

  // ── Notifications ────────────────────────────────────────────
  await createIfNotExists('notifications', (table) => {
    table.increments('id').primary();
    table.integer('user_id').unsigned().notNullable()
      .references('id').inTable('users').onDelete('CASCADE');
    table.string('type').notNullable().defaultTo('info');
    table.string('title').notNullable();
    table.text('message').notNullable();
    table.boolean('is_read').defaultTo(false);
    table.text('data');
    table.timestamp('created_at').defaultTo(db.fn.now());
  });

  // ── User Preferences ────────────────────────────────────────
  await createIfNotExists('user_preferences', (table) => {
    table.increments('id').primary();
    table.integer('user_id').unsigned().notNullable().unique()
      .references('id').inTable('users').onDelete('CASCADE');
    table.string('theme').defaultTo('light');
    table.string('currency').defaultTo('INR');
    table.string('language').defaultTo('en');
    table.boolean('notifications_enabled').defaultTo(true);
    table.timestamp('created_at').defaultTo(db.fn.now());
    table.timestamp('updated_at').defaultTo(db.fn.now());
  });

  console.log('✅ All migrations completed successfully.');
}

// Run if called directly
if (require.main === module) {
  runMigrations()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('❌ Migration failed:', err);
      process.exit(1);
    });
}
