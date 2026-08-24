import { config } from '../../config';
import db from '../../db/connection';
import { getFinancialSnapshot, calculateHealthScore, analyzePurchase } from '../financial-engine';

// ── Financial Intent Detection (Rule-based fallback) ───────────
interface DetectedIntent {
  intent: string;
  entities: Record<string, any>;
  confidence: number;
  confirmationMessage: string;
  updateData: Record<string, any>;
}

const AMOUNT_PATTERN = /₹?\s*([\d,]+(?:\.\d+)?)\s*(?:lakh|lac|l)?\s*(?:crore|cr)?/gi;
const LAKH_PATTERN = /₹?\s*([\d,]+(?:\.\d+)?)\s*(?:lakh|lac|l)/gi;
const CRORE_PATTERN = /₹?\s*([\d,]+(?:\.\d+)?)\s*(?:crore|cr)/gi;

function parseAmount(text: string): number | null {
  // Check crore first
  const croreMatch = text.match(/₹?\s*([\d,]+(?:\.\d+)?)\s*(?:crore|cr)/i);
  if (croreMatch) {
    return parseFloat(croreMatch[1].replace(/,/g, '')) * 10000000;
  }

  // Check lakh
  const lakhMatch = text.match(/₹?\s*([\d,]+(?:\.\d+)?)\s*(?:lakh|lac|l(?:akhs)?)/i);
  if (lakhMatch) {
    return parseFloat(lakhMatch[1].replace(/,/g, '')) * 100000;
  }

  // Check k/thousand
  const kMatch = text.match(/₹?\s*([\d,]+(?:\.\d+)?)\s*(?:k|thousand)/i);
  if (kMatch) {
    return parseFloat(kMatch[1].replace(/,/g, '')) * 1000;
  }

  // Plain number with ₹
  const plainMatch = text.match(/₹\s*([\d,]+(?:\.\d+)?)/);
  if (plainMatch) {
    return parseFloat(plainMatch[1].replace(/,/g, ''));
  }

  // Plain large number (likely rupees if > 100)
  const numMatch = text.match(/([\d,]+(?:\.\d+)?)/);
  if (numMatch) {
    const num = parseFloat(numMatch[1].replace(/,/g, ''));
    if (num >= 100) return num;
  }

  return null;
}

export function detectFinancialIntent(message: string): DetectedIntent | null {
  const lower = message.toLowerCase();

  // ── SET_SALARY ──
  if (/(?:my\s+)?(?:salary|income|earning|ctc|take\s+home|monthly\s+pay|i\s+earn|i\s+make|i\s+get\s+paid)\s+(?:is|=|:)?\s*/i.test(lower)) {
    const amount = parseAmount(message);
    if (amount && amount >= 1000) {
      return {
        intent: 'SET_SALARY',
        entities: { amount, frequency: 'monthly' },
        confidence: 0.9,
        confirmationMessage: `Monthly Salary: ₹${formatIndianNum(amount)}`,
        updateData: { type: 'income', name: 'Monthly Salary', amount, frequency: 'monthly', isPrimary: true },
      };
    }
  }

  // ── SET_GOAL — check BEFORE expenses so "spend on marriage" doesn't become a generic expense ──

  // SET_GOAL (Marriage)
  if (/(?:marriage|wedding|shaadi)/i.test(lower)) {
    const amount = parseAmount(message);
    if (amount) {
      return {
        intent: 'SET_GOAL',
        entities: { amount, goalType: 'marriage', name: 'Marriage' },
        confidence: 0.9,
        confirmationMessage: `Marriage Goal: ₹${formatIndianNum(amount)}`,
        updateData: { type: 'goal', goalType: 'marriage', name: 'Marriage', targetAmount: amount },
      };
    }
  }

  // SET_GOAL (Car)
  if (/(?:buy|purchase|want|spend|planning|plan|save)\s*(?:a\s+|an\s+|for\s+|to\s+(?:buy\s+)?|on\s+(?:a\s+)?)?(?:car|vehicle|bike|motorcycle)/i.test(lower)) {
    const amount = parseAmount(message);
    if (amount) {
      return {
        intent: 'SET_GOAL',
        entities: { amount, goalType: 'car', name: 'Car Purchase' },
        confidence: 0.85,
        confirmationMessage: `Car Purchase Goal: ₹${formatIndianNum(amount)}`,
        updateData: { type: 'goal', goalType: 'car', name: 'Car Purchase', targetAmount: amount },
      };
    }
  }

  // SET_GOAL (House)
  if (/(?:buy|purchase|want|spend|planning|plan|save)\s*(?:a\s+|an\s+|for\s+|to\s+(?:buy\s+)?|on\s+(?:a\s+)?)?(?:house|home|flat|apartment|property)/i.test(lower)) {
    const amount = parseAmount(message);
    if (amount) {
      return {
        intent: 'SET_GOAL',
        entities: { amount, goalType: 'house', name: 'House Purchase' },
        confidence: 0.85,
        confirmationMessage: `House Purchase Goal: ₹${formatIndianNum(amount)}`,
        updateData: { type: 'goal', goalType: 'house', name: 'House Purchase', targetAmount: amount },
      };
    }
  }

  // SET_GOAL (Education)
  if (/(?:education|study|studies|course|college|university|mba|degree)\s*(?:budget|cost|fee|expense)?\s*(?:is|=|:|\s+of)?\s*/i.test(lower)) {
    const amount = parseAmount(message);
    if (amount) {
      return {
        intent: 'SET_GOAL',
        entities: { amount, goalType: 'education', name: 'Education' },
        confidence: 0.8,
        confirmationMessage: `Education Goal: ₹${formatIndianNum(amount)}`,
        updateData: { type: 'goal', goalType: 'education', name: 'Education', targetAmount: amount },
      };
    }
  }

  // SET_GOAL (Travel / Vacation)
  if (/(?:travel|vacation|trip|holiday)\s*(?:budget|cost|plan)?\s*(?:is|=|:|\s+of|for)?\s*/i.test(lower)) {
    const amount = parseAmount(message);
    if (amount) {
      return {
        intent: 'SET_GOAL',
        entities: { amount, goalType: 'travel', name: 'Travel / Vacation' },
        confidence: 0.8,
        confirmationMessage: `Travel Goal: ₹${formatIndianNum(amount)}`,
        updateData: { type: 'goal', goalType: 'travel', name: 'Travel / Vacation', targetAmount: amount },
      };
    }
  }

  // ── SET_EXPENSE ──
  const expensePatterns = [
    { regex: /(?:my\s+)?rent\s+(?:is|=|:)?\s*/i, name: 'Rent', category: 'Housing', mandatory: true },
    { regex: /(?:i\s+)?(?:spend|spending)\s+(?:about\s+|around\s+|approximately\s+)?/i, name: 'Monthly Expenses', category: 'Other', mandatory: false },
    { regex: /(?:my\s+)?(?:monthly\s+)?(?:expense|expenditure|spending)\s+(?:is|=|:)?\s*/i, name: 'Monthly Expenses', category: 'Other', mandatory: false },
    { regex: /(?:my\s+)?(?:electricity|power)\s+bill\s+(?:is|=|:)?\s*/i, name: 'Electricity Bill', category: 'Bills & Utilities', mandatory: true },
    { regex: /(?:my\s+)?(?:grocery|groceries)\s+(?:is|=|:)?\s*/i, name: 'Groceries', category: 'Food & Dining', mandatory: true },
    { regex: /(?:my\s+)?(?:internet|wifi|broadband)\s+(?:is|=|:)?\s*/i, name: 'Internet', category: 'Bills & Utilities', mandatory: true },
    { regex: /(?:my\s+)?(?:phone|mobile)\s+bill\s+(?:is|=|:)?\s*/i, name: 'Phone Bill', category: 'Bills & Utilities', mandatory: true },
  ];

  for (const pattern of expensePatterns) {
    if (pattern.regex.test(lower)) {
      const amount = parseAmount(message);
      if (amount && amount >= 100) {
        return {
          intent: 'SET_EXPENSE',
          entities: { amount, name: pattern.name, category: pattern.category, mandatory: pattern.mandatory },
          confidence: 0.85,
          confirmationMessage: `${pattern.name}: ₹${formatIndianNum(amount)}/month`,
          updateData: { type: 'expense', name: pattern.name, amount, category: pattern.category, isMandatory: pattern.mandatory },
        };
      }
    }
  }

  // ── SET_EMI ──
  if (/(?:my\s+)?(?:emi|loan\s+payment|installment)\s+(?:is|=|:)?\s*/i.test(lower)) {
    const amount = parseAmount(message);
    if (amount && amount >= 100) {
      return {
        intent: 'SET_EMI',
        entities: { amount },
        confidence: 0.85,
        confirmationMessage: `Monthly EMI: ₹${formatIndianNum(amount)}`,
        updateData: { type: 'loan', name: 'Loan EMI', emi: amount },
      };
    }
  }


  // ── SET_SAVINGS ──
  if (/(?:i\s+have|my\s+savings?\s+(?:is|are|=|:))\s*/i.test(lower) && /(?:sav|saved|balance)/i.test(lower)) {
    const amount = parseAmount(message);
    if (amount) {
      return {
        intent: 'SET_SAVINGS',
        entities: { amount },
        confidence: 0.8,
        confirmationMessage: `Savings: ₹${formatIndianNum(amount)}`,
        updateData: { type: 'savings', amount },
      };
    }
  }

  // ── SET_INVESTMENT ──
  if (/(?:i\s+)?invest\s*(?:₹?\s*[\d,]+|about|around)/i.test(lower)) {
    const amount = parseAmount(message);
    if (amount) {
      return {
        intent: 'SET_INVESTMENT',
        entities: { amount, frequency: 'monthly' },
        confidence: 0.8,
        confirmationMessage: `Monthly Investment: ₹${formatIndianNum(amount)}`,
        updateData: { type: 'investment', amount, frequency: 'monthly' },
      };
    }
  }

  // ── PURCHASE_ADVICE ──
  if (/(?:how\s+(?:should\s+)?i\s+pay|can\s+i\s+afford|should\s+i\s+buy|want\s+to\s+buy)\s*/i.test(lower)) {
    const amount = parseAmount(message);
    const itemMatch = message.match(/(?:buy|afford|pay\s+for)\s+(?:a\s+|an\s+)?([\w\s]+?)(?:\s+(?:for|worth|costing|of)\s+)/i);
    const item = itemMatch ? itemMatch[1].trim() : 'item';
    if (amount) {
      return {
        intent: 'PURCHASE_ADVICE',
        entities: { amount, item },
        confidence: 0.85,
        confirmationMessage: `Purchase Analysis: ${item} — ₹${formatIndianNum(amount)}`,
        updateData: { type: 'purchase', item, amount },
      };
    }
  }

  // ── ASK_STATUS ──
  if (/(?:how\s+am\s+i\s+doing|financial\s+(?:status|health|situation|summary)|my\s+finances|show\s+(?:me\s+)?my\s+(?:finances|money))/i.test(lower)) {
    return {
      intent: 'ASK_STATUS',
      entities: {},
      confidence: 0.9,
      confirmationMessage: '',
      updateData: {},
    };
  }

  // ── ASK_INVEST ──
  if (/(?:where\s+should\s+i\s+invest|how\s+(?:to|should\s+i)\s+invest|investment\s+(?:advice|suggestion|recommendation)|what\s+(?:to|should\s+i)\s+invest\s+in)/i.test(lower)) {
    return {
      intent: 'ASK_INVEST',
      entities: {},
      confidence: 0.85,
      confirmationMessage: '',
      updateData: {},
    };
  }

  return null;
}

// ── Groq LLM Integration (Unified: reply + intent detection) ──
interface LLMResponse {
  reply: string;
  detectedUpdate: {
    type: 'income' | 'expense' | 'goal' | 'loan' | 'savings' | 'investment' | 'purchase_query' | 'status_query' | 'invest_query' | 'health_query' | null;
    name: string;
    amount: number;
    category?: string;
    goalType?: string;
    frequency?: string;
    isMandatory?: boolean;
    purchaseItem?: string;
    confirmMessage: string;
  } | null;
}

async function getGroqResponseUnified(
  userId: number,
  userMessage: string,
  conversationHistory: { role: string; content: string }[],
  snapshot: any,
): Promise<LLMResponse> {
  if (!config.groqApiKey) {
    return {
      reply: getFallbackResponse(userId, userMessage, snapshot),
      detectedUpdate: null,
    };
  }

  const candidateModels = [
    config.groqModel || 'openai/gpt-oss-120b',
    'openai/gpt-oss-120b',
    'groq/compound',
    'groq/compound-mini',
    'qwen/qwen3.6-27b',
  ];

  const modelsToTry = [...new Set(candidateModels)];

  const systemPrompt = `You are FTWIN, a personalized AI financial assistant for Indian users. You understand the user's complete financial situation.

CURRENT FINANCIAL SNAPSHOT:
- Monthly Income: ₹${formatIndianNum(snapshot.totalMonthlyIncome)}
- Monthly Expenses: ₹${formatIndianNum(snapshot.totalMonthlyExpenses)}
- Monthly EMIs: ₹${formatIndianNum(snapshot.totalEMIs)}
- Monthly Surplus: ₹${formatIndianNum(snapshot.monthlySurplus)}
- Total Savings: ₹${formatIndianNum(snapshot.totalSavings)}
- Total Investments: ₹${formatIndianNum(snapshot.totalInvestments)}
- Total Debt: ₹${formatIndianNum(snapshot.totalDebt)}
- Net Worth: ₹${formatIndianNum(snapshot.netWorth)}
- Emergency Fund: ${snapshot.emergencyFundMonths} months
- Savings Rate: ${snapshot.savingsRate}%
- Debt-to-Income: ${snapshot.debtToIncomeRatio}%

You MUST respond with valid JSON in this exact format (no markdown, no backticks, just raw JSON):
{
  "reply": "Your short conversational response here (2-3 sentences max)",
  "detectedUpdate": null or {
    "type": "income|expense|goal|loan|savings|investment|purchase_query|status_query|invest_query|health_query|loan_rate_query",
    "name": "descriptive name for the item",
    "amount": numeric_amount,
    "category": "optional category",
    "goalType": "marriage|car|house|education|travel|retirement|emergency_fund|custom",
    "frequency": "monthly|yearly|one_time",
    "isMandatory": true/false,
    "purchaseItem": "item name for purchase queries",
    "confirmMessage": "short message describing what will be updated"
  }
}

INTENT DETECTION RULES — detect ANY financial data the user mentions:
- If user mentions salary, income, earnings, CTC, pay → type: "income"
- If user mentions ANY expense (rent, food, gym, subscription, insurance, phone bill, electricity, internet, shopping, petrol, maid, milk, tuition, netflix, spotify, school fees, medicine, etc.) → type: "expense", set isMandatory=true for essential expenses (rent, bills, groceries, insurance, medicine), false for discretionary
- If user mentions a goal (marriage, car, house, education, travel, vacation, retirement, emergency fund, or ANY saving target) → type: "goal", set goalType appropriately
- If user mentions a loan, EMI, debt, borrowed amount → type: "loan"
- If user mentions savings, bank balance, FD, RD → type: "savings"
- If user mentions SIP, mutual fund, stocks, investment contribution → type: "investment"
- If user asks "should I buy X", "can I afford X" → type: "purchase_query"
- If user asks about financial status, health, how they're doing → type: "status_query"
- If user asks where/how to invest → type: "invest_query"
- If user asks about health/financial score → type: "health_query"
- If user asks which bank is best for a loan, loan interest rates, bank comparison for home/car/personal/education/gold/two-wheeler loan → type: "loan_rate_query", set category to the loan type key (home_loan, car_loan, personal_loan, education_loan, gold_loan, two_wheeler_loan), set amount = loan amount if mentioned, set tenureYears = tenure if mentioned (default 20)
- For queries (purchase_query, status_query, invest_query, health_query, loan_rate_query) set amount to 0 unless explicitly mentioned (except purchase_query where amount = item cost)
- If user is just chatting or asking a question with no financial data → set detectedUpdate to null

AMOUNT PARSING:
- "15 lakh" or "15L" = 1500000
- "1.5 crore" or "1.5cr" = 15000000
- "50k" or "50 thousand" = 50000
- "₹80,000" = 80000
- Always return the amount as a plain number (no commas, no ₹)

REPLY RULES:
- When financial data is detected (expense, income, goal, loan, etc.), give a DETAILED and INSIGHTFUL reply that analyzes the impact:
  * Show what % of their income this represents (e.g. "That's 2.5% of your monthly income")
  * Compare with benchmarks (e.g. "Food expenses are typically 15-20% of income — yours is 25%, which is on the higher side")
  * Show the impact on their surplus/savings (e.g. "After this expense, your monthly surplus drops from ₹40,000 to ₹38,000")
  * Give a short actionable tip (e.g. "Consider setting a dining budget of ₹3,000/month to keep food costs under 20%")
  * End with: "Would you like me to update this in your dashboard? Just type 'yes' to confirm."
- For status/health queries: give a detailed verdict with key insights about what's working and what needs attention
- For investment queries: give specific, contextual advice based on their situation
- Keep the response to 4-6 sentences max — detailed but not a wall of text
- Use Indian Rupee (₹) and Indian number formatting (lakhs, crores)
- Be warm, professional, and sound like a knowledgeable financial advisor — NOT a generic chatbot
- NEVER say generic things like "Sure, I've noted it" or "I'll show you the option to update" — those are lazy replies
- DO NOT use bullet points or numbered lists — write in natural flowing sentences
- Use 1-2 emojis for warmth`;

  const messages = [
    { role: 'system' as const, content: systemPrompt },
    ...conversationHistory.slice(-10).map(m => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    })),
    { role: 'user' as const, content: userMessage },
  ];

  for (const model of modelsToTry) {
    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${config.groqApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          messages,
          max_tokens: 1024,
          temperature: 0.3, // Lower temp for more consistent JSON
          response_format: { type: 'json_object' },
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        console.warn(`Groq model ${model} failed (${response.status}): ${errText}`);
        continue;
      }

      const data: any = await response.json();
      let raw = data.choices?.[0]?.message?.content || '';

      // Strip thinking blocks if present
      raw = raw.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();

      // Try to parse JSON
      try {
        // Handle cases where the model wraps JSON in markdown code blocks
        const jsonMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, raw];
        const parsed = JSON.parse(jsonMatch[1]?.trim() || raw);

        if (parsed.reply) {
          return {
            reply: parsed.reply,
            detectedUpdate: parsed.detectedUpdate || null,
          };
        }
      } catch (parseErr) {
        console.warn('Failed to parse LLM JSON response, using as plain text:', parseErr);
        // If JSON parse fails, return raw text with regex fallback for intent
        if (raw) {
          return {
            reply: raw,
            detectedUpdate: null,
          };
        }
      }
    } catch (err) {
      console.warn(`Error trying Groq model ${model}:`, err);
    }
  }

  // Full fallback
  return {
    reply: getFallbackResponse(userId, userMessage, snapshot),
    detectedUpdate: null,
  };
}

// ── Fallback Response (no API key) ─────────────────────────────
function getFallbackResponse(userId: number, message: string, snapshot: any): string {
  const lower = message.toLowerCase();

  if (/(?:hello|hi|hey|namaste)/i.test(lower)) {
    if (snapshot.totalMonthlyIncome > 0) {
      return `Hello! I'm FTWIN, your financial assistant. Based on your current profile, your monthly income is ₹${formatIndianNum(snapshot.totalMonthlyIncome)} with a surplus of ₹${formatIndianNum(snapshot.monthlySurplus)}. How can I help you today?`;
    }
    return "Hello! I'm FTWIN, your financial assistant. I can help you understand your finances, simulate decisions, and plan for your goals. Start by telling me about your income, or set up your profile to get personalized advice.";
  }

  if (/(?:how\s+am\s+i|status|health|situation)/i.test(lower)) {
    if (snapshot.totalMonthlyIncome === 0) {
      return "I don't have your financial information yet. Please add your income and expenses in your profile, or tell me here — for example: \"My salary is ₹80,000.\"";
    }
    if (snapshot.monthlySurplus < 0) {
      return `⚠️ You're spending more than you earn right now. Here's your full picture 👇`;
    } else if (snapshot.savingsRate < 20) {
      return `Your finances are okay but your savings rate of ${snapshot.savingsRate}% could improve. Here's the breakdown 👇`;
    } else {
      return `Looking good! 💪 Your savings rate is ${snapshot.savingsRate}% and you have a healthy surplus. Here's your snapshot 👇`;
    }
  }

  if (/(?:invest|investment)/i.test(lower)) {
    if (snapshot.investmentCapacity <= 0) {
      return `Your investment capacity is currently ₹0 — expenses consume your full income. Let's work on creating surplus first.`;
    }
    return `You have ₹${formatIndianNum(snapshot.investmentCapacity)}/month available for investments. Here's a suggested allocation 👇`;
  }

  return `I'm FTWIN, your financial AI. Try asking me things like "How am I doing?", "My salary is ₹80,000", or "Should I buy a laptop for ₹1 lakh?" — I'll respond with visual insights and actionable advice.`;
}


// ── Main Chat Handler ──────────────────────────────────────────
export async function handleChatMessage(
  userId: number,
  conversationId: number,
  userMessage: string,
): Promise<{
  reply: string;
  detectedIntent: DetectedIntent | null;
  metadata: Record<string, any>;
}> {
  // Get conversation history
  const history = await db('chat_messages')
    .where({ conversation_id: conversationId })
    .orderBy('created_at', 'asc')
    .limit(20);

  const conversationHistory = history.map((m: any) => ({
    role: m.role,
    content: m.content,
  }));

  // ── Check if user is confirming a pending update (typed "yes") ──
  const lower = userMessage.toLowerCase().trim();
  const isConfirmation = /^(yes|yeah|yep|yup|sure|ok|okay|confirm|update|update\s*it|do\s*it|haan|ha|go\s*ahead|please|kar\s*do|save\s*it)$/i.test(lower);

  if (isConfirmation) {
    // Look for the last assistant message with a pending (unconfirmed) financial update
    const lastPendingMsg = [...history].reverse().find((m: any) => {
      if (m.role !== 'assistant' || !m.metadata) return false;
      try {
        const meta = typeof m.metadata === 'string' ? JSON.parse(m.metadata) : m.metadata;
        return meta.confirmationRequired && !meta.confirmed && meta.financialData;
      } catch { return false; }
    });

    if (lastPendingMsg) {
      const meta = typeof lastPendingMsg.metadata === 'string'
        ? JSON.parse(lastPendingMsg.metadata)
        : lastPendingMsg.metadata;

      // Get pre-update snapshot
      const preSnapshot = await getFinancialSnapshot(userId);

      // Apply the update
      const result = await applyFinancialUpdate(userId, meta.financialData);

      // Mark the original message as confirmed
      const updatedMeta = { ...meta, confirmed: true };
      await db('chat_messages').where({ id: lastPendingMsg.id }).update({
        metadata: JSON.stringify(updatedMeta),
      });

      // Get post-update snapshot
      const postSnapshot = await getFinancialSnapshot(userId);

      const updateName = meta.financialData.name || meta.financialData.goalType || 'Update';
      const reply = result.success
        ? `✅ Done! I've updated **${updateName}** in your dashboard. Your financial snapshot has been refreshed — check the changes below 👇`
        : `❌ Something went wrong while updating. Please try again or add it manually from your dashboard.`;

      return {
        reply,
        detectedIntent: null,
        metadata: {
          autoConfirmed: true,
          updateResult: result,
          visualData: {
            type: 'snapshot',
            snapshot: {
              totalMonthlyIncome: postSnapshot.totalMonthlyIncome,
              totalMonthlyExpenses: postSnapshot.totalMonthlyExpenses,
              monthlySurplus: postSnapshot.monthlySurplus,
              savingsRate: postSnapshot.savingsRate,
              emergencyFundMonths: postSnapshot.emergencyFundMonths,
              debtToIncomeRatio: postSnapshot.debtToIncomeRatio,
              totalSavings: postSnapshot.totalSavings,
              totalDebt: postSnapshot.totalDebt,
              netWorth: postSnapshot.netWorth,
              investmentCapacity: postSnapshot.investmentCapacity,
              totalEMIs: postSnapshot.totalEMIs,
              mandatoryExpenses: postSnapshot.mandatoryExpenses,
              discretionaryExpenses: postSnapshot.discretionaryExpenses,
            },
            expenseBreakdown: postSnapshot.expenseBreakdown || [],
            incomeBreakdown: postSnapshot.incomeBreakdown || [],
          },
          preChangeSnapshot: {
            totalMonthlyIncome: preSnapshot.totalMonthlyIncome,
            totalMonthlyExpenses: preSnapshot.totalMonthlyExpenses,
            monthlySurplus: preSnapshot.monthlySurplus,
            savingsRate: preSnapshot.savingsRate,
            emergencyFundMonths: preSnapshot.emergencyFundMonths,
            investmentCapacity: preSnapshot.investmentCapacity,
            debtToIncomeRatio: preSnapshot.debtToIncomeRatio,
            totalSavings: preSnapshot.totalSavings,
            netWorth: preSnapshot.netWorth,
          },
          postSnapshot: {
            totalMonthlyIncome: postSnapshot.totalMonthlyIncome,
            totalMonthlyExpenses: postSnapshot.totalMonthlyExpenses,
            monthlySurplus: postSnapshot.monthlySurplus,
            savingsRate: postSnapshot.savingsRate,
            emergencyFundMonths: postSnapshot.emergencyFundMonths,
            investmentCapacity: postSnapshot.investmentCapacity,
            debtToIncomeRatio: postSnapshot.debtToIncomeRatio,
            totalSavings: postSnapshot.totalSavings,
            netWorth: postSnapshot.netWorth,
          },
        },
      };
    }
  }

  // Get user's financial snapshot for context
  const snapshot = await getFinancialSnapshot(userId);

  // ── Unified LLM call: reply + intent detection ──
  const llmResult = await getGroqResponseUnified(userId, userMessage, conversationHistory, snapshot);
  let reply = llmResult.reply;

  // ── Build intent from LLM detection (primary) or regex fallback ──
  let detectedIntent: DetectedIntent | null = null;
  const metadata: Record<string, any> = {};

  const llmUpdate = llmResult.detectedUpdate as any;

  if (llmUpdate && llmUpdate.type && !['status_query', 'invest_query', 'health_query', 'purchase_query'].includes(llmUpdate.type)) {
    // LLM detected a financial update — map it to our intent format
    const intentTypeMap: Record<string, string> = {
      income: 'SET_SALARY',
      expense: 'SET_EXPENSE',
      goal: 'SET_GOAL',
      loan: 'SET_EMI',
      savings: 'SET_SAVINGS',
      investment: 'SET_INVESTMENT',
    };

    const updateDataMap: Record<string, any> = {
      income: { type: 'income', name: llmUpdate.name || 'Monthly Salary', amount: llmUpdate.amount, frequency: llmUpdate.frequency || 'monthly', isPrimary: true },
      expense: { type: 'expense', name: llmUpdate.name || 'Expense', amount: llmUpdate.amount, category: llmUpdate.category || 'Other', isMandatory: llmUpdate.isMandatory || false },
      goal: { type: 'goal', goalType: llmUpdate.goalType || 'custom', name: llmUpdate.name || 'Goal', targetAmount: llmUpdate.amount },
      loan: { type: 'loan', name: llmUpdate.name || 'Loan EMI', emi: llmUpdate.amount },
      savings: { type: 'savings', amount: llmUpdate.amount },
      investment: { type: 'investment', amount: llmUpdate.amount, frequency: llmUpdate.frequency || 'monthly' },
    };

    detectedIntent = {
      intent: intentTypeMap[llmUpdate.type] || 'SET_EXPENSE',
      entities: { amount: llmUpdate.amount, name: llmUpdate.name, goalType: llmUpdate.goalType },
      confidence: 0.9,
      confirmationMessage: llmUpdate.confirmMessage || `Update: ${llmUpdate.name} — ₹${formatIndianNum(llmUpdate.amount)}`,
      updateData: updateDataMap[llmUpdate.type] || { type: llmUpdate.type, name: llmUpdate.name, amount: llmUpdate.amount },
    };
  }

  // If LLM detected a purchase query, handle it
  if (llmUpdate?.type === 'purchase_query' && llmUpdate.amount > 0) {
    detectedIntent = {
      intent: 'PURCHASE_ADVICE',
      entities: { amount: llmUpdate.amount, item: llmUpdate.purchaseItem || llmUpdate.name || 'item' },
      confidence: 0.9,
      confirmationMessage: `Purchase Analysis: ${llmUpdate.purchaseItem || llmUpdate.name} — ₹${formatIndianNum(llmUpdate.amount)}`,
      updateData: { type: 'purchase', item: llmUpdate.purchaseItem || llmUpdate.name, amount: llmUpdate.amount },
    };
  }

  // Map LLM query types to intent names for visual data
  if (llmUpdate?.type === 'status_query') {
    detectedIntent = { intent: 'ASK_STATUS', entities: {}, confidence: 0.9, confirmationMessage: '', updateData: {} };
  }
  if (llmUpdate?.type === 'invest_query') {
    detectedIntent = { intent: 'ASK_INVEST', entities: {}, confidence: 0.9, confirmationMessage: '', updateData: {} };
  }
  if (llmUpdate?.type === 'health_query') {
    detectedIntent = { intent: 'ASK_HEALTH', entities: {}, confidence: 0.9, confirmationMessage: '', updateData: {} };
  }
  // ── Loan rate comparison query ──
  if (llmUpdate?.type === 'loan_rate_query') {
    detectedIntent = {
      intent: 'ASK_LOAN_RATES',
      entities: {
        loanType: llmUpdate.category || 'home_loan',
        amount: llmUpdate.amount || 0,
        tenureYears: llmUpdate.tenureYears || 20,
      },
      confidence: 0.9,
      confirmationMessage: '',
      updateData: {},
    };
  }
  // ── Regex fallback for loan rate queries ──
  if (!detectedIntent) {
    const lowerMsg = userMessage.toLowerCase();
    if (/(?:which\s+bank|bank\s+(?:gives?|offer|has)|best\s+(?:bank|interest)|loan\s+(?:rate|interest)|interest\s+rate|compare\s+(?:bank|loan)|home\s+loan\s+rate|car\s+loan\s+rate|personal\s+loan\s+rate)/i.test(lowerMsg)) {
      let loanType = 'home_loan';
      if (/car\s*loan|vehicle\s*loan|auto\s*loan/i.test(lowerMsg)) loanType = 'car_loan';
      else if (/personal\s*loan/i.test(lowerMsg)) loanType = 'personal_loan';
      else if (/education\s*loan|student\s*loan|study\s*loan/i.test(lowerMsg)) loanType = 'education_loan';
      else if (/gold\s*loan/i.test(lowerMsg)) loanType = 'gold_loan';
      else if (/two.?wheeler|bike\s*loan|scooter\s*loan/i.test(lowerMsg)) loanType = 'two_wheeler_loan';
      const amt = parseAmount(userMessage);
      detectedIntent = {
        intent: 'ASK_LOAN_RATES',
        entities: { loanType, amount: amt || 0, tenureYears: 20 },
        confidence: 0.85,
        confirmationMessage: '',
        updateData: {},
      };
    }
  }

  // ── Regex fallback: if LLM didn't detect anything, try regex ──
  if (!detectedIntent) {
    detectedIntent = detectFinancialIntent(userMessage);
  }

  // ── Set metadata for confirmation prompts ──
  if (detectedIntent && detectedIntent.intent !== 'ASK_STATUS' && detectedIntent.intent !== 'ASK_INVEST' && detectedIntent.intent !== 'ASK_HEALTH' && detectedIntent.intent !== 'PURCHASE_ADVICE' && detectedIntent.intent !== 'ASK_LOAN_RATES') {
    if (Object.keys(detectedIntent.updateData).length > 0 && detectedIntent.updateData.type) {
      metadata.detectedIntent = detectedIntent.intent;
      metadata.financialData = detectedIntent.updateData;
      metadata.confirmationRequired = true;
      metadata.confirmationMessage = detectedIntent.confirmationMessage;
      metadata.confirmed = false;
    }
  }

  // ── Attach Visual Data ──
  try {
    // ASK_STATUS — full financial snapshot with charts
    if (detectedIntent?.intent === 'ASK_STATUS') {
      metadata.visualData = {
        type: 'snapshot',
        snapshot: {
          totalMonthlyIncome: snapshot.totalMonthlyIncome,
          totalMonthlyExpenses: snapshot.totalMonthlyExpenses,
          monthlySurplus: snapshot.monthlySurplus,
          savingsRate: snapshot.savingsRate,
          emergencyFundMonths: snapshot.emergencyFundMonths,
          debtToIncomeRatio: snapshot.debtToIncomeRatio,
          totalSavings: snapshot.totalSavings,
          totalDebt: snapshot.totalDebt,
          netWorth: snapshot.netWorth,
          investmentCapacity: snapshot.investmentCapacity,
          totalEMIs: snapshot.totalEMIs,
          mandatoryExpenses: snapshot.mandatoryExpenses,
          discretionaryExpenses: snapshot.discretionaryExpenses,
        },
        expenseBreakdown: snapshot.expenseBreakdown || [],
        incomeBreakdown: snapshot.incomeBreakdown || [],
      };
    }

    // ASK_INVEST — investment capacity + suggested allocation
    else if (detectedIntent?.intent === 'ASK_INVEST') {
      const investmentRatio = snapshot.totalMonthlyIncome > 0
        ? (snapshot.monthlyInvestmentContributions / snapshot.totalMonthlyIncome) * 100
        : 0;
      metadata.visualData = {
        type: 'investment',
        investmentCapacity: snapshot.investmentCapacity,
        currentMonthlyContributions: snapshot.monthlyInvestmentContributions,
        monthlySurplus: snapshot.monthlySurplus,
        investmentRatio: Math.round(investmentRatio),
        savingsRate: snapshot.savingsRate,
        emergencyFundMonths: snapshot.emergencyFundMonths,
        suggestedAllocation: getSuggestedAllocation(snapshot),
      };
    }

    // PURCHASE_ADVICE — run full purchase analysis
    else if (detectedIntent?.intent === 'PURCHASE_ADVICE') {
      const amount = detectedIntent.entities.amount;
      const item = detectedIntent.entities.item || 'Purchase';
      if (amount) {
        const purchaseAnalysis = await analyzePurchase(userId, item, amount);
        metadata.visualData = {
          type: 'purchase',
          ...purchaseAnalysis,
        };
      }
    }

    // Health score query
    else if (detectedIntent?.intent === 'ASK_HEALTH') {
      const healthScore = await calculateHealthScore(userId);
      metadata.visualData = {
        type: 'health_score',
        totalScore: healthScore.totalScore,
        maxScore: healthScore.maxScore,
        grade: healthScore.grade,
        components: healthScore.components,
      };
    }

    // LOAN RATE COMPARISON — read from JSON bank rates
    else if (detectedIntent?.intent === 'ASK_LOAN_RATES') {
      const loanType: string = detectedIntent.entities.loanType || 'home_loan';
      const amount: number = detectedIntent.entities.amount || 0;
      const tenureYears: number = detectedIntent.entities.tenureYears || 20;
      const tenureMonths = tenureYears * 12;

      const path = await import('path');
      const fs = await import('fs');
      const ratesPath = path.resolve(__dirname, '../../../data/bank_loan_rates.json');
      let bankRates: any[] = [];
      try {
        bankRates = JSON.parse(fs.readFileSync(ratesPath, 'utf-8'));
      } catch {
        bankRates = [];
      }

      const ranked = bankRates
        .filter((b: any) => b[`${loanType}_min`] !== null && b[`${loanType}_min`] !== undefined)
        .map((b: any) => {
          const rateMin = b[`${loanType}_min`];
          const rateMax = b[`${loanType}_max`];
          const monthlyRate = rateMin / 100 / 12;
          const emi = amount > 0 && tenureMonths > 0
            ? Math.round((amount * monthlyRate * Math.pow(1 + monthlyRate, tenureMonths)) / (Math.pow(1 + monthlyRate, tenureMonths) - 1))
            : null;
          return {
            bank: b.bank,
            full_name: b.full_name,
            bank_type: b.type,
            rate_min: rateMin,
            rate_max: rateMax,
            emi_estimate: emi,
            total_interest: emi ? emi * tenureMonths - amount : null,
            processing_fee_pct: b.processing_fee_pct,
            source_url: b.source_url,
          };
        })
        .sort((a: any, b: any) => a.rate_min - b.rate_min)
        .slice(0, 8);

      const loanTypeLabel: Record<string, string> = {
        home_loan: 'Home Loan',
        car_loan: 'Car Loan',
        personal_loan: 'Personal Loan',
        education_loan: 'Education Loan',
        gold_loan: 'Gold Loan',
        two_wheeler_loan: 'Two-Wheeler Loan',
      };

      metadata.visualData = {
        type: 'loan_compare',
        loanType,
        loanTypeLabel: loanTypeLabel[loanType] || loanType,
        amount,
        tenureYears,
        banks: ranked,
      };
    }

    // SET_GOAL — show goal planning card with timeline
    if (detectedIntent?.intent === 'SET_GOAL') {
      const goalAmount = detectedIntent.entities.amount;
      const goalType = detectedIntent.entities.goalType || 'custom';
      const goalName = detectedIntent.entities.name || 'Goal';
      const monthlyAvailable = Math.max(0, snapshot.monthlySurplus);
      const monthsNeeded = monthlyAvailable > 0 ? Math.ceil(goalAmount / monthlyAvailable) : 0;
      const suggestedMonthly = monthsNeeded > 0 ? Math.ceil(goalAmount / Math.max(monthsNeeded, 24)) : 0;

      metadata.visualData = {
        type: 'goal_plan',
        goalName,
        goalType,
        targetAmount: goalAmount,
        currentSavings: snapshot.totalSavings,
        monthlySurplus: snapshot.monthlySurplus,
        monthsToGoal: monthsNeeded,
        suggestedMonthly,
        snapshot: {
          totalMonthlyIncome: snapshot.totalMonthlyIncome,
          totalMonthlyExpenses: snapshot.totalMonthlyExpenses,
          monthlySurplus: snapshot.monthlySurplus,
          savingsRate: snapshot.savingsRate,
          emergencyFundMonths: snapshot.emergencyFundMonths,
          totalSavings: snapshot.totalSavings,
          netWorth: snapshot.netWorth,
        },
      };
    }

    // All update intents — store pre-change snapshot for before/after comparison
    if (metadata.confirmationRequired) {
      metadata.preChangeSnapshot = {
        totalMonthlyIncome: snapshot.totalMonthlyIncome,
        totalMonthlyExpenses: snapshot.totalMonthlyExpenses,
        monthlySurplus: snapshot.monthlySurplus,
        savingsRate: snapshot.savingsRate,
        emergencyFundMonths: snapshot.emergencyFundMonths,
        investmentCapacity: snapshot.investmentCapacity,
        debtToIncomeRatio: snapshot.debtToIncomeRatio,
        totalSavings: snapshot.totalSavings,
        netWorth: snapshot.netWorth,
      };
    }

    // For ANY update intent (salary, expense, etc.) — also attach a snapshot so there's always a visual
    if (metadata.confirmationRequired && !metadata.visualData) {
      metadata.visualData = {
        type: 'snapshot',
        snapshot: {
          totalMonthlyIncome: snapshot.totalMonthlyIncome,
          totalMonthlyExpenses: snapshot.totalMonthlyExpenses,
          monthlySurplus: snapshot.monthlySurplus,
          savingsRate: snapshot.savingsRate,
          emergencyFundMonths: snapshot.emergencyFundMonths,
          debtToIncomeRatio: snapshot.debtToIncomeRatio,
          totalSavings: snapshot.totalSavings,
          totalDebt: snapshot.totalDebt,
          netWorth: snapshot.netWorth,
          investmentCapacity: snapshot.investmentCapacity,
          totalEMIs: snapshot.totalEMIs,
          mandatoryExpenses: snapshot.mandatoryExpenses,
          discretionaryExpenses: snapshot.discretionaryExpenses,
        },
        expenseBreakdown: snapshot.expenseBreakdown || [],
        incomeBreakdown: snapshot.incomeBreakdown || [],
      };
    }

  } catch (vizErr) {
    console.warn('Failed to build visual data:', vizErr);
  }

  return { reply, detectedIntent, metadata };

}

// ── Suggested Investment Allocation ────────────────────────────
function getSuggestedAllocation(snapshot: any): { name: string; value: number; color: string }[] {
  const hasEmergency = snapshot.emergencyFundMonths >= 3;
  const isHighDebt = snapshot.debtToIncomeRatio > 30;

  if (!hasEmergency) {
    return [
      { name: 'Emergency Fund (FD/Liquid)', value: 50, color: '#F59E0B' },
      { name: 'Equity (Index Fund)', value: 20, color: '#3B82F6' },
      { name: 'Debt Fund / PPF', value: 20, color: '#22C55E' },
      { name: 'Gold (SGB/ETF)', value: 10, color: '#A855F7' },
    ];
  }

  if (isHighDebt) {
    return [
      { name: 'Debt Repayment', value: 40, color: '#EF4444' },
      { name: 'Equity (Index Fund)', value: 25, color: '#3B82F6' },
      { name: 'Debt Fund / PPF', value: 25, color: '#22C55E' },
      { name: 'Gold (SGB/ETF)', value: 10, color: '#A855F7' },
    ];
  }

  return [
    { name: 'Equity (Index/Large Cap)', value: 40, color: '#3B82F6' },
    { name: 'Debt Fund / PPF', value: 25, color: '#22C55E' },
    { name: 'Gold (SGB/ETF)', value: 15, color: '#A855F7' },
    { name: 'Small/Mid Cap', value: 10, color: '#F97316' },
    { name: 'Liquid / FD', value: 10, color: '#6B7280' },
  ];
}


// ── Apply Financial Update from Chat ───────────────────────────
export async function applyFinancialUpdate(
  userId: number,
  updateData: Record<string, any>,
): Promise<{ success: boolean; message: string }> {
  try {
    switch (updateData.type) {
      case 'income': {
        // Check if primary income exists, update or create
        const existing = await db('income_sources')
          .where({ user_id: userId, is_primary: true })
          .first();
        if (existing) {
          await db('income_sources').where({ id: existing.id }).update({
            amount: updateData.amount,
            name: updateData.name || existing.name,
            updated_at: new Date().toISOString(),
          });
        } else {
          await db('income_sources').insert({
            user_id: userId,
            type: 'salary',
            name: updateData.name || 'Monthly Salary',
            amount: updateData.amount,
            frequency: updateData.frequency || 'monthly',
            is_primary: true,
          });
        }
        return { success: true, message: 'Income updated successfully.' };
      }

      case 'expense': {
        // Find or create category
        let categoryId = null;
        if (updateData.category) {
          const cat = await db('expense_categories').where({ name: updateData.category }).first();
          categoryId = cat?.id || null;
        }
        await db('expenses').insert({
          user_id: userId,
          category_id: categoryId,
          name: updateData.name,
          amount: updateData.amount,
          frequency: 'monthly',
          is_mandatory: updateData.isMandatory || false,
        });
        return { success: true, message: 'Expense added successfully.' };
      }

      case 'loan': {
        await db('loans').insert({
          user_id: userId,
          type: 'other',
          name: updateData.name || 'Loan',
          principal: updateData.amount || updateData.emi * 12,
          outstanding_amount: updateData.amount || updateData.emi * 12,
          interest_rate: updateData.interestRate || 10,
          emi: updateData.emi,
          tenure_months: updateData.tenureMonths || 12,
          remaining_tenure_months: updateData.tenureMonths || 12,
          start_date: new Date().toISOString().split('T')[0],
        });
        return { success: true, message: 'Loan/EMI added successfully.' };
      }

      case 'goal': {
        // Calculate target date (default 2 years from now)
        const targetDate = new Date();
        targetDate.setFullYear(targetDate.getFullYear() + 2);

        await db('financial_goals').insert({
          user_id: userId,
          name: updateData.name,
          type: updateData.goalType || 'custom',
          target_amount: updateData.targetAmount,
          current_amount: 0,
          target_date: targetDate.toISOString().split('T')[0],
          monthly_contribution: 0,
          priority: 'medium',
          status: 'on_track',
        });
        return { success: true, message: `Goal "${updateData.name}" created successfully.` };
      }

      case 'savings': {
        const existingAccount = await db('bank_accounts')
          .where({ user_id: userId })
          .first();
        if (existingAccount) {
          await db('bank_accounts').where({ id: existingAccount.id }).update({
            balance: updateData.amount,
            updated_at: new Date().toISOString(),
          });
        } else {
          await db('bank_accounts').insert({
            user_id: userId,
            bank_name: 'Savings Account',
            account_type: 'savings',
            balance: updateData.amount,
          });
        }
        return { success: true, message: 'Savings updated successfully.' };
      }

      case 'investment': {
        await db('investments').insert({
          user_id: userId,
          type: 'other',
          name: 'Monthly Investment',
          invested_amount: 0,
          current_value: 0,
          monthly_contribution: updateData.amount,
          start_date: new Date().toISOString().split('T')[0],
        });
        return { success: true, message: 'Investment contribution recorded.' };
      }

      default:
        return { success: false, message: 'Unknown update type.' };
    }
  } catch (err) {
    console.error('Failed to apply financial update:', err);
    return { success: false, message: 'Failed to update financial data.' };
  }
}

function formatIndianNum(num: number): string {
  if (num === 0) return '0';
  const absNum = Math.abs(Math.round(num));
  const str = absNum.toString();
  if (str.length <= 3) return (num < 0 ? '-' : '') + str;

  let result = str.slice(-3);
  let remaining = str.slice(0, -3);

  while (remaining.length > 2) {
    result = remaining.slice(-2) + ',' + result;
    remaining = remaining.slice(0, -2);
  }
  if (remaining.length > 0) {
    result = remaining + ',' + result;
  }

  return (num < 0 ? '-' : '') + result;
}
