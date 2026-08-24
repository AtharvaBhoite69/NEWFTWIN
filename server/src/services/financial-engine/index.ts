import db from '../../db/connection';

/**
 * FTWIN Financial Engine
 * 
 * The centralized calculation engine that ALL features consume.
 * When any financial data changes, this engine recalculates
 * all dependent metrics. This is the single source of truth.
 */

// ── Helper: Convert any frequency to monthly amount ────────────
function toMonthly(amount: number, frequency: string): number {
  switch (frequency) {
    case 'daily': return amount * 30;
    case 'weekly': return amount * 4.33;
    case 'biweekly': return amount * 2.17;
    case 'monthly': return amount;
    case 'annually': return amount / 12;
    case 'one_time': return 0; // one-time doesn't affect monthly
    default: return amount;
  }
}

// ── Calculate Total Monthly Income ─────────────────────────────
export async function calculateMonthlyIncome(userId: number): Promise<{
  total: number;
  breakdown: { source: string; amount: number; percentage: number }[];
}> {
  const sources = await db('income_sources').where({ user_id: userId });
  let total = 0;
  const breakdown: { source: string; amount: number; percentage: number }[] = [];

  for (const src of sources) {
    const monthly = toMonthly(src.amount, src.frequency);
    total += monthly;
    breakdown.push({ source: src.name, amount: monthly, percentage: 0 });
  }

  // Calculate percentages
  for (const item of breakdown) {
    item.percentage = total > 0 ? Math.round((item.amount / total) * 100) : 0;
  }

  return { total, breakdown };
}

// ── Calculate Total Monthly Expenses ───────────────────────────
export async function calculateMonthlyExpenses(userId: number): Promise<{
  total: number;
  mandatory: number;
  discretionary: number;
  breakdown: { category: string; amount: number; percentage: number; color: string }[];
}> {
  const expenses = await db('expenses')
    .leftJoin('expense_categories', 'expenses.category_id', 'expense_categories.id')
    .where({ 'expenses.user_id': userId })
    .select('expenses.*', 'expense_categories.name as category_name', 'expense_categories.color');

  let total = 0;
  let mandatory = 0;
  let discretionary = 0;
  const categoryMap: Record<string, { amount: number; color: string }> = {};

  for (const exp of expenses) {
    const monthly = toMonthly(exp.amount, exp.frequency);
    total += monthly;

    if (exp.is_mandatory) {
      mandatory += monthly;
    } else {
      discretionary += monthly;
    }

    const catName = exp.category_name || 'Other';
    const catColor = exp.color || '#94A3B8';
    if (!categoryMap[catName]) {
      categoryMap[catName] = { amount: 0, color: catColor };
    }
    categoryMap[catName].amount += monthly;
  }

  const breakdown = Object.entries(categoryMap).map(([category, data]) => ({
    category,
    amount: data.amount,
    percentage: total > 0 ? Math.round((data.amount / total) * 100) : 0,
    color: data.color,
  })).sort((a, b) => b.amount - a.amount);

  return { total, mandatory, discretionary, breakdown };
}

// ── Calculate Total EMIs ───────────────────────────────────────
export async function calculateTotalEMIs(userId: number): Promise<number> {
  const loans = await db('loans').where({ user_id: userId });
  return loans.reduce((sum: number, loan: any) => sum + loan.emi, 0);
}

// ── Calculate Monthly Surplus ──────────────────────────────────
export async function calculateMonthlySurplus(userId: number): Promise<number> {
  const income = await calculateMonthlyIncome(userId);
  const expenses = await calculateMonthlyExpenses(userId);
  const emis = await calculateTotalEMIs(userId);
  return income.total - expenses.total - emis;
}

// ── Calculate Total Savings (bank balances) ────────────────────
export async function calculateTotalSavings(userId: number): Promise<number> {
  const accounts = await db('bank_accounts').where({ user_id: userId });
  return accounts.reduce((sum: number, acc: any) => sum + acc.balance, 0);
}

// ── Calculate Total Investments ────────────────────────────────
export async function calculateTotalInvestments(userId: number): Promise<{
  totalInvested: number;
  currentValue: number;
  monthlyContributions: number;
}> {
  const investments = await db('investments').where({ user_id: userId });
  const totalInvested = investments.reduce((sum: number, inv: any) => sum + inv.invested_amount, 0);
  const currentValue = investments.reduce((sum: number, inv: any) => sum + inv.current_value, 0);
  const monthlyContributions = investments.reduce((sum: number, inv: any) => sum + inv.monthly_contribution, 0);
  return { totalInvested, currentValue, monthlyContributions };
}

// ── Calculate Total Debt ───────────────────────────────────────
export async function calculateTotalDebt(userId: number): Promise<number> {
  const loans = await db('loans').where({ user_id: userId });
  const creditCards = await db('user_credit_cards').where({ user_id: userId });
  const loanDebt = loans.reduce((sum: number, loan: any) => sum + loan.outstanding_amount, 0);
  const ccDebt = creditCards.reduce((sum: number, cc: any) => sum + cc.current_balance, 0);
  return loanDebt + ccDebt;
}

// ── Calculate Net Worth ────────────────────────────────────────
export async function calculateNetWorth(userId: number): Promise<number> {
  const savings = await calculateTotalSavings(userId);
  const investments = await calculateTotalInvestments(userId);
  const debt = await calculateTotalDebt(userId);
  return savings + investments.currentValue - debt;
}

// ── Calculate Emergency Fund Months ────────────────────────────
export async function calculateEmergencyFundMonths(userId: number): Promise<number> {
  const expenses = await calculateMonthlyExpenses(userId);
  const emis = await calculateTotalEMIs(userId);
  const monthlyEssentials = expenses.mandatory + emis;

  if (monthlyEssentials === 0) return 0;

  // Emergency fund = liquid savings (bank balances)
  const savings = await calculateTotalSavings(userId);
  return parseFloat((savings / monthlyEssentials).toFixed(1));
}

// ── Calculate Debt to Income Ratio ─────────────────────────────
export async function calculateDebtToIncomeRatio(userId: number): Promise<number> {
  const income = await calculateMonthlyIncome(userId);
  const emis = await calculateTotalEMIs(userId);
  if (income.total === 0) return 0;
  return parseFloat(((emis / income.total) * 100).toFixed(1));
}

// ── Calculate Investment Capacity ──────────────────────────────
export async function calculateInvestmentCapacity(userId: number): Promise<number> {
  const surplus = await calculateMonthlySurplus(userId);
  const investments = await calculateTotalInvestments(userId);

  // Investment capacity = surplus minus existing monthly investment contributions
  const available = surplus - investments.monthlyContributions;
  return Math.max(0, available);
}

// ── Calculate Savings Rate ─────────────────────────────────────
export async function calculateSavingsRate(userId: number): Promise<number> {
  const income = await calculateMonthlyIncome(userId);
  const surplus = await calculateMonthlySurplus(userId);
  if (income.total === 0) return 0;
  return parseFloat(((surplus / income.total) * 100).toFixed(1));
}

// ── Calculate Goal Feasibility ─────────────────────────────────
export async function calculateGoalStatus(goalId: number): Promise<{
  status: string;
  requiredMonthly: number;
  monthsRemaining: number;
  shortfall: number;
}> {
  const goal = await db('financial_goals').where({ id: goalId }).first();
  if (!goal) {
    return { status: 'on_track', requiredMonthly: 0, monthsRemaining: 0, shortfall: 0 };
  }

  const remaining = goal.target_amount - goal.current_amount;
  const targetDate = new Date(goal.target_date);
  const now = new Date();
  const monthsRemaining = Math.max(0, 
    (targetDate.getFullYear() - now.getFullYear()) * 12 + (targetDate.getMonth() - now.getMonth())
  );

  if (remaining <= 0) {
    return { status: 'completed', requiredMonthly: 0, monthsRemaining, shortfall: 0 };
  }

  if (monthsRemaining <= 0) {
    return { status: 'unrealistic', requiredMonthly: remaining, monthsRemaining: 0, shortfall: remaining };
  }

  const requiredMonthly = remaining / monthsRemaining;
  const surplus = await calculateMonthlySurplus(goal.user_id);

  let status: string;
  if (goal.monthly_contribution >= requiredMonthly * 0.95) {
    status = 'on_track';
  } else if (goal.monthly_contribution >= requiredMonthly * 0.7) {
    status = 'at_risk';
  } else if (surplus >= requiredMonthly) {
    status = 'at_risk'; // Can afford it but not allocating enough
  } else {
    status = 'behind';
  }

  // Check if it's outright unrealistic
  if (requiredMonthly > surplus * 2 && surplus > 0) {
    status = 'unrealistic';
  }

  return {
    status,
    requiredMonthly: Math.round(requiredMonthly),
    monthsRemaining,
    shortfall: Math.max(0, Math.round(requiredMonthly - goal.monthly_contribution)),
  };
}

// ── Get Complete Financial Snapshot ─────────────────────────────
export async function getFinancialSnapshot(userId: number) {
  const [income, expenses, emis, savings, investments, debt, netWorth, emergencyMonths, debtRatio, investCapacity, savingsRate] = await Promise.all([
    calculateMonthlyIncome(userId),
    calculateMonthlyExpenses(userId),
    calculateTotalEMIs(userId),
    calculateTotalSavings(userId),
    calculateTotalInvestments(userId),
    calculateTotalDebt(userId),
    calculateNetWorth(userId),
    calculateEmergencyFundMonths(userId),
    calculateDebtToIncomeRatio(userId),
    calculateInvestmentCapacity(userId),
    calculateSavingsRate(userId),
  ]);

  return {
    totalMonthlyIncome: income.total,
    totalMonthlyExpenses: expenses.total,
    mandatoryExpenses: expenses.mandatory,
    discretionaryExpenses: expenses.discretionary,
    totalEMIs: emis,
    monthlySurplus: income.total - expenses.total - emis,
    totalSavings: savings,
    totalInvestments: investments.currentValue,
    totalInvestedAmount: investments.totalInvested,
    monthlyInvestmentContributions: investments.monthlyContributions,
    totalDebt: debt,
    netWorth,
    emergencyFundMonths: emergencyMonths,
    investmentCapacity: investCapacity,
    debtToIncomeRatio: debtRatio,
    savingsRate,
    expenseBreakdown: expenses.breakdown,
    incomeBreakdown: income.breakdown,
  };
}

// ── Calculate Financial Health Score ───────────────────────────
export async function calculateHealthScore(userId: number) {
  const snapshot = await getFinancialSnapshot(userId);
  const components: { name: string; score: number; maxScore: number; reason: string; improvement: string }[] = [];

  // 1. Savings Rate (0-15 points)
  {
    let score = 0;
    let reason = '';
    let improvement = '';
    if (snapshot.totalMonthlyIncome === 0) {
      reason = 'No income data available.';
      improvement = 'Add your income sources to get an accurate score.';
    } else if (snapshot.savingsRate >= 30) {
      score = 15;
      reason = `You save ${snapshot.savingsRate}% of your income — excellent discipline.`;
      improvement = 'Maintain this savings rate and consider increasing investments.';
    } else if (snapshot.savingsRate >= 20) {
      score = 12;
      reason = `You save ${snapshot.savingsRate}% of your income — good but can improve.`;
      improvement = 'Try to reach a 30% savings rate by reducing discretionary spending.';
    } else if (snapshot.savingsRate >= 10) {
      score = 8;
      reason = `You save ${snapshot.savingsRate}% of your income — below the recommended 20%.`;
      improvement = 'Review your discretionary expenses and set up automatic savings.';
    } else if (snapshot.savingsRate > 0) {
      score = 4;
      reason = `You save only ${snapshot.savingsRate}% of your income — needs attention.`;
      improvement = 'Start with a target of saving at least 10% of your income.';
    } else {
      reason = 'You are not saving any money or spending more than you earn.';
      improvement = 'Prioritize cutting expenses to create a positive cash flow.';
    }
    components.push({ name: 'Savings Rate', score, maxScore: 15, reason, improvement });
  }

  // 2. Emergency Fund (0-15 points)
  {
    let score = 0;
    let reason = '';
    let improvement = '';
    if (snapshot.emergencyFundMonths >= 6) {
      score = 15;
      reason = `You have ${snapshot.emergencyFundMonths} months of essential expenses covered.`;
      improvement = 'Your emergency fund is strong. Consider investing any excess.';
    } else if (snapshot.emergencyFundMonths >= 3) {
      score = 10;
      reason = `You have ${snapshot.emergencyFundMonths} months of essential expenses covered.`;
      improvement = 'Target: 6 months of essential expenses in liquid savings.';
    } else if (snapshot.emergencyFundMonths >= 1) {
      score = 5;
      reason = `You have approximately ${snapshot.emergencyFundMonths} months of essential expenses covered.`;
      improvement = 'Build your emergency fund to at least 3 months of essential expenses.';
    } else {
      reason = 'You have no significant emergency fund.';
      improvement = 'Start building an emergency fund — even ₹1,000/month helps.';
    }
    components.push({ name: 'Emergency Fund', score, maxScore: 15, reason, improvement });
  }

  // 3. Debt Management (0-15 points)
  {
    let score = 15; // Start with full score
    let reason = '';
    let improvement = '';
    if (snapshot.debtToIncomeRatio === 0 && snapshot.totalDebt === 0) {
      reason = 'You have no outstanding debt — excellent financial position.';
      improvement = 'Stay debt-free and avoid unnecessary loans.';
    } else if (snapshot.debtToIncomeRatio <= 20) {
      score = 12;
      reason = `Your debt-to-income ratio is ${snapshot.debtToIncomeRatio}% — manageable.`;
      improvement = 'Consider accelerating debt repayment if possible.';
    } else if (snapshot.debtToIncomeRatio <= 40) {
      score = 8;
      reason = `Your debt-to-income ratio is ${snapshot.debtToIncomeRatio}% — moderate risk.`;
      improvement = 'Focus on paying off high-interest debt first.';
    } else if (snapshot.debtToIncomeRatio <= 60) {
      score = 4;
      reason = `Your debt-to-income ratio is ${snapshot.debtToIncomeRatio}% — high.`;
      improvement = 'Prioritize debt reduction. Avoid taking new loans.';
    } else {
      score = 0;
      reason = `Your debt-to-income ratio is ${snapshot.debtToIncomeRatio}% — critically high.`;
      improvement = 'Immediate debt consolidation needed. Seek professional financial advice.';
    }
    components.push({ name: 'Debt Management', score, maxScore: 15, reason, improvement });
  }

  // 4. Spending Control (0-15 points)
  {
    let score = 0;
    let reason = '';
    let improvement = '';
    const spendingRatio = snapshot.totalMonthlyIncome > 0
      ? (snapshot.totalMonthlyExpenses / snapshot.totalMonthlyIncome) * 100
      : 100;

    if (snapshot.totalMonthlyIncome === 0) {
      reason = 'No income data to evaluate spending.';
      improvement = 'Add your income data for accurate analysis.';
    } else if (spendingRatio <= 50) {
      score = 15;
      reason = `You spend ${Math.round(spendingRatio)}% of your income — excellent control.`;
      improvement = 'Great discipline! Ensure your surplus is working for you.';
    } else if (spendingRatio <= 70) {
      score = 11;
      reason = `You spend ${Math.round(spendingRatio)}% of your income — room for improvement.`;
      improvement = 'Identify and reduce discretionary expenses.';
    } else if (spendingRatio <= 90) {
      score = 6;
      reason = `You spend ${Math.round(spendingRatio)}% of your income — tight budget.`;
      improvement = 'Review all subscriptions and non-essential spending.';
    } else {
      score = 2;
      reason = `You spend ${Math.round(spendingRatio)}% or more of your income.`;
      improvement = 'Urgently reduce expenses or increase income.';
    }
    components.push({ name: 'Spending Control', score, maxScore: 15, reason, improvement });
  }

  // 5. Investment Health (0-15 points)
  {
    let score = 0;
    let reason = '';
    let improvement = '';
    const investmentRatio = snapshot.totalMonthlyIncome > 0
      ? (snapshot.monthlyInvestmentContributions / snapshot.totalMonthlyIncome) * 100
      : 0;

    if (snapshot.totalMonthlyIncome === 0) {
      reason = 'No income data to evaluate investment health.';
      improvement = 'Add your income and investment data.';
    } else if (investmentRatio >= 20) {
      score = 15;
      reason = `You invest ${Math.round(investmentRatio)}% of your income — excellent.`;
      improvement = 'Review asset allocation for optimal diversification.';
    } else if (investmentRatio >= 10) {
      score = 10;
      reason = `You invest ${Math.round(investmentRatio)}% of your income — good start.`;
      improvement = 'Try to increase to 20% for better wealth creation.';
    } else if (investmentRatio > 0) {
      score = 5;
      reason = `You invest only ${Math.round(investmentRatio)}% of your income.`;
      improvement = 'Increase SIP amounts gradually each month.';
    } else {
      reason = 'You are not investing any money currently.';
      improvement = 'Start with even ₹500/month in a simple index fund or RD.';
    }
    components.push({ name: 'Investment Health', score, maxScore: 15, reason, improvement });
  }

  // 6. Goal Progress (0-10 points)
  {
    const goals = await db('financial_goals').where({ user_id: userId });
    let score = 0;
    let reason = '';
    let improvement = '';

    if (goals.length === 0) {
      score = 0;
      reason = 'No financial goals set.';
      improvement = 'Set at least one financial goal to give your money direction.';
    } else {
      let onTrack = 0;
      for (const goal of goals) {
        const status = await calculateGoalStatus(goal.id);
        if (status.status === 'on_track' || status.status === 'completed') onTrack++;
      }
      const ratio = onTrack / goals.length;
      score = Math.round(ratio * 10);
      reason = `${onTrack} of ${goals.length} goals are on track.`;
      improvement = ratio < 1
        ? 'Review and adjust contributions for off-track goals.'
        : 'All goals on track! Consider setting more ambitious targets.';
    }
    components.push({ name: 'Goal Progress', score, maxScore: 10, reason, improvement });
  }

  // 7. Cash Flow Health (0-15 points)
  {
    let score = 0;
    let reason = '';
    let improvement = '';

    if (snapshot.totalMonthlyIncome === 0) {
      reason = 'No income data available.';
      improvement = 'Add your income sources for cash flow analysis.';
    } else if (snapshot.monthlySurplus > snapshot.totalMonthlyIncome * 0.3) {
      score = 15;
      reason = `Positive cash flow of ₹${formatIndian(snapshot.monthlySurplus)}/month — strong position.`;
      improvement = 'Deploy surplus into investments and goal contributions.';
    } else if (snapshot.monthlySurplus > 0) {
      score = 10;
      reason = `Positive cash flow of ₹${formatIndian(snapshot.monthlySurplus)}/month — adequate.`;
      improvement = 'Increase surplus by optimizing expenses.';
    } else if (snapshot.monthlySurplus === 0) {
      score = 5;
      reason = 'You are breaking even — no surplus or deficit.';
      improvement = 'Find ways to reduce expenses or increase income.';
    } else {
      score = 0;
      reason = `Negative cash flow of ₹${formatIndian(Math.abs(snapshot.monthlySurplus))}/month.`;
      improvement = 'Urgent: cut expenses immediately. You are spending more than you earn.';
    }
    components.push({ name: 'Cash Flow', score, maxScore: 15, reason, improvement });
  }

  const totalScore = components.reduce((sum, c) => sum + c.score, 0);
  const maxScore = components.reduce((sum, c) => sum + c.maxScore, 0);

  let grade: 'A' | 'B' | 'C' | 'D' | 'F';
  const percentage = (totalScore / maxScore) * 100;
  if (percentage >= 85) grade = 'A';
  else if (percentage >= 70) grade = 'B';
  else if (percentage >= 55) grade = 'C';
  else if (percentage >= 40) grade = 'D';
  else grade = 'F';

  // Store the score
  await db('financial_scores').insert({
    user_id: userId,
    total_score: totalScore,
    component_scores: JSON.stringify(components),
    calculated_at: new Date().toISOString(),
  });

  return {
    totalScore,
    maxScore,
    grade,
    components,
    calculatedAt: new Date().toISOString(),
  };
}

// ── Generate Advisor Recommendations ───────────────────────────
export async function generateRecommendations(userId: number) {
  const snapshot = await getFinancialSnapshot(userId);
  const recommendations: {
    type: string;
    priority: 'high' | 'medium' | 'low';
    title: string;
    description: string;
    reason: string;
  }[] = [];

  // Only generate if user has financial data
  if (snapshot.totalMonthlyIncome === 0) {
    recommendations.push({
      type: 'general',
      priority: 'high',
      title: 'Complete Your Financial Profile',
      description: 'Add your income, expenses, and other financial details to get personalized recommendations.',
      reason: 'We need your financial data to provide meaningful advice.',
    });
    return recommendations;
  }

  // HIGH PRIORITY
  if (snapshot.monthlySurplus < 0) {
    recommendations.push({
      type: 'expense_reduction',
      priority: 'high',
      title: 'You\'re Spending More Than You Earn',
      description: `Your expenses exceed your income by ₹${formatIndian(Math.abs(snapshot.monthlySurplus))}/month. Review and cut discretionary spending immediately.`,
      reason: 'Negative cash flow will deplete your savings and increase debt.',
    });
  }

  if (snapshot.emergencyFundMonths < 3) {
    recommendations.push({
      type: 'emergency_fund',
      priority: 'high',
      title: 'Build Your Emergency Fund',
      description: `You have ${snapshot.emergencyFundMonths} months of essential expenses covered. Target at least 3-6 months.`,
      reason: 'An emergency fund protects you from unexpected expenses without taking on debt.',
    });
  }

  if (snapshot.debtToIncomeRatio > 40) {
    recommendations.push({
      type: 'debt_reduction',
      priority: 'high',
      title: 'Reduce Your Debt Burden',
      description: `Your debt-to-income ratio is ${snapshot.debtToIncomeRatio}%. Focus on paying off high-interest loans first.`,
      reason: 'High debt reduces your financial flexibility and increases interest costs.',
    });
  }

  // MEDIUM PRIORITY
  if (snapshot.savingsRate < 20 && snapshot.monthlySurplus > 0) {
    recommendations.push({
      type: 'savings',
      priority: 'medium',
      title: 'Increase Your Savings Rate',
      description: `Your current savings rate is ${snapshot.savingsRate}%. Aim for at least 20% of your income.`,
      reason: 'A higher savings rate accelerates wealth building and financial security.',
    });
  }

  if (snapshot.monthlyInvestmentContributions === 0 && snapshot.monthlySurplus > 0) {
    recommendations.push({
      type: 'investment',
      priority: 'medium',
      title: 'Start Investing Your Surplus',
      description: `You have ₹${formatIndian(snapshot.investmentCapacity)} available monthly. Consider starting with index funds or PPF.`,
      reason: 'Uninvested money loses value to inflation over time.',
    });
  }

  if (snapshot.discretionaryExpenses > snapshot.mandatoryExpenses && snapshot.discretionaryExpenses > 0) {
    recommendations.push({
      type: 'expense_reduction',
      priority: 'medium',
      title: 'Review Discretionary Spending',
      description: `Your discretionary spending (₹${formatIndian(snapshot.discretionaryExpenses)}) exceeds your mandatory expenses. Review for optimization.`,
      reason: 'Reducing discretionary spending is the fastest way to increase your surplus.',
    });
  }

  // LOW PRIORITY
  if (snapshot.monthlySurplus > snapshot.totalMonthlyIncome * 0.3 && snapshot.investmentCapacity > 0) {
    recommendations.push({
      type: 'investment',
      priority: 'low',
      title: 'Consider Increasing Investments',
      description: `You have a healthy surplus. Consider allocating more to long-term investments for wealth creation.`,
      reason: 'Maximizing investment allocation when cash flow is strong builds long-term wealth.',
    });
  }

  // Store recommendations
  await db('advisor_recommendations').where({ user_id: userId, status: 'active' }).delete();
  for (const rec of recommendations) {
    await db('advisor_recommendations').insert({
      user_id: userId,
      ...rec,
      status: 'active',
    });
  }

  return recommendations;
}

// ── Simulate Financial Changes ─────────────────────────────────
export async function runSimulation(userId: number, params: {
  salaryChange?: number;
  expenseChange?: number;
  newInvestmentMonthly?: number;
  newLoanEmi?: number;
  newLoanAmount?: number;
  loanInterestRate?: number;
  loanTenureMonths?: number;
  oneTimeExpense?: number;
  inflationRate?: number;
}) {
  const current = await getFinancialSnapshot(userId);

  // Clone and apply changes
  const simulated = { ...current };

  if (params.salaryChange !== undefined) {
    simulated.totalMonthlyIncome += params.salaryChange;
  }

  if (params.expenseChange !== undefined) {
    simulated.totalMonthlyExpenses += params.expenseChange;
  }

  if (params.newLoanEmi !== undefined) {
    simulated.totalEMIs += params.newLoanEmi;
  }

  if (params.newInvestmentMonthly !== undefined) {
    simulated.monthlyInvestmentContributions += params.newInvestmentMonthly;
  }

  if (params.newLoanAmount !== undefined) {
    simulated.totalDebt += params.newLoanAmount;
  }

  if (params.oneTimeExpense !== undefined) {
    simulated.totalSavings -= params.oneTimeExpense;
    if (simulated.totalSavings < 0) simulated.totalSavings = 0;
  }

  // Recalculate derived values
  simulated.monthlySurplus = simulated.totalMonthlyIncome - simulated.totalMonthlyExpenses - simulated.totalEMIs;
  simulated.investmentCapacity = Math.max(0, simulated.monthlySurplus - simulated.monthlyInvestmentContributions);
  simulated.netWorth = simulated.totalSavings + simulated.totalInvestments - simulated.totalDebt;
  simulated.debtToIncomeRatio = simulated.totalMonthlyIncome > 0
    ? parseFloat(((simulated.totalEMIs / simulated.totalMonthlyIncome) * 100).toFixed(1))
    : 0;
  simulated.savingsRate = simulated.totalMonthlyIncome > 0
    ? parseFloat(((simulated.monthlySurplus / simulated.totalMonthlyIncome) * 100).toFixed(1))
    : 0;

  // Recalculate emergency fund
  const monthlyEssentials = simulated.mandatoryExpenses + simulated.totalEMIs;
  simulated.emergencyFundMonths = monthlyEssentials > 0
    ? parseFloat((simulated.totalSavings / monthlyEssentials).toFixed(1))
    : 0;

  // Calculate impact
  const impact = {
    surplusChange: simulated.monthlySurplus - current.monthlySurplus,
    savingsRateChange: simulated.savingsRate - current.savingsRate,
    healthScoreChange: 0, // Calculated separately if needed
    debtRatioChange: simulated.debtToIncomeRatio - current.debtToIncomeRatio,
    investmentCapacityChange: simulated.investmentCapacity - current.investmentCapacity,
  };

  // Generate warnings
  const warnings: string[] = [];
  if (simulated.monthlySurplus < 0) {
    warnings.push('This change would result in negative monthly cash flow.');
  }
  if (simulated.emergencyFundMonths < 3) {
    warnings.push('Your emergency fund would fall below the recommended 3 months.');
  }
  if (simulated.debtToIncomeRatio > 40) {
    warnings.push('Your debt-to-income ratio would exceed the safe threshold of 40%.');
  }
  if (simulated.totalSavings < 0) {
    warnings.push('You would not have sufficient savings for this purchase.');
  }

  // Generate recommendations
  const recommendations: string[] = [];
  if (simulated.monthlySurplus > 0 && simulated.investmentCapacity > 5000) {
    recommendations.push(`After this change, you would still have ₹${formatIndian(simulated.investmentCapacity)} monthly for investments.`);
  }
  if (impact.surplusChange < 0) {
    recommendations.push(`Your monthly surplus would decrease by ₹${formatIndian(Math.abs(impact.surplusChange))}.`);
  }
  if (impact.surplusChange > 0) {
    recommendations.push(`Your monthly surplus would increase by ₹${formatIndian(impact.surplusChange)}.`);
  }

  return {
    current,
    simulated,
    impact,
    warnings,
    recommendations,
  };
}

// ── Purchase Advisor (Powered by Real Credit Cards Catalog) ────
export async function analyzePurchase(userId: number, itemName: string, amount: number) {
  const snapshot = await getFinancialSnapshot(userId);
  
  // 1. Get user's own cards
  const userCards = await db('user_credit_cards')
    .join('credit_cards', 'user_credit_cards.credit_card_id', 'credit_cards.id')
    .where({ 'user_credit_cards.user_id': userId })
    .select(
      'user_credit_cards.*',
      'credit_cards.card_name',
      'credit_cards.bank',
      'credit_cards.network',
      'credit_cards.cardcheck_score',
      'credit_cards.rating_verdict',
      'credit_cards.best_for',
      'credit_cards.annual_fee_inr',
      'credit_cards.reward_rate_pct',
      'credit_cards.apr_pct_annual',
      'credit_cards.source_url',
      'credit_cards.image_url'
    );

  // 2. Get top relevant market cards for this purchase category if user wants recommendations
  const itemLower = itemName.toLowerCase();
  let relevantCategory = 'shopping';
  if (itemLower.includes('flight') || itemLower.includes('hotel') || itemLower.includes('trip') || itemLower.includes('travel')) {
    relevantCategory = 'travel';
  } else if (itemLower.includes('food') || itemLower.includes('dining') || itemLower.includes('dinner') || itemLower.includes('restaurant')) {
    relevantCategory = 'food';
  } else if (itemLower.includes('fuel') || itemLower.includes('petrol') || itemLower.includes('diesel')) {
    relevantCategory = 'fuel';
  }

  const marketCards = await db('credit_cards')
    .whereRaw('(LOWER(best_for) LIKE ? OR LOWER(best_for) LIKE ? OR LOWER(card_name) LIKE ?)', [
      `%${relevantCategory}%`,
      '%cashback%',
      `%${relevantCategory}%`
    ])
    .orderBy('cardcheck_score', 'desc')
    .limit(4);

  const options: {
    method: string;
    description: string;
    monthlyCost: number;
    totalCost: number;
    savingsImpact: number;
    emergencyFundImpact: number;
    recommended: boolean;
    reason: string;
    cardDetails?: any;
    rewardEstimate?: number;
  }[] = [];

  // Option A: Pay Cash / Savings
  if (snapshot.totalSavings >= amount) {
    const newSavings = snapshot.totalSavings - amount;
    const monthlyNeeds = snapshot.mandatoryExpenses + snapshot.totalEMIs;
    const newEmergencyMonths = monthlyNeeds > 0 ? newSavings / monthlyNeeds : 0;
    const safeToSpend = newEmergencyMonths >= 3;

    options.push({
      method: 'Full Cash Payment',
      description: `Pay ₹${formatIndian(amount)} upfront from liquid savings.`,
      monthlyCost: 0,
      totalCost: amount,
      savingsImpact: -amount,
      emergencyFundImpact: parseFloat((newEmergencyMonths - snapshot.emergencyFundMonths).toFixed(1)),
      recommended: safeToSpend && snapshot.monthlySurplus > 0,
      reason: safeToSpend
        ? `Preserves emergency buffer (${newEmergencyMonths.toFixed(1)} months remaining) with zero interest cost.`
        : `Reduces your emergency reserve to ${newEmergencyMonths.toFixed(1)} months (recommended minimum is 3 months).`,
    });
  }

  // Option B: User's Existing Credit Cards
  for (const card of userCards) {
    const avail = (card.available_limit && card.available_limit > 0) ? card.available_limit : card.credit_limit;
    // Extract base reward percentage number if available
    let rewardPct = 1.0;
    if (card.reward_rate_pct) {
      const match = card.reward_rate_pct.match(/([\d.]+)/);
      if (match) rewardPct = parseFloat(match[1]);
    }
    const estimatedReward = Math.round(amount * (rewardPct / 100));

    if (avail >= amount) {
      options.push({
        method: `Your Card: ${card.card_name}`,
        description: `Pay via ${card.bank} ${card.card_name} and pay in full by the due date.`,
        monthlyCost: amount,
        totalCost: Math.max(0, amount - estimatedReward),
        savingsImpact: 0,
        emergencyFundImpact: 0,
        recommended: snapshot.monthlySurplus >= amount && snapshot.totalSavings >= amount,
        reason: `Earn ~₹${formatIndian(estimatedReward)} in value-back (${card.reward_rate_pct || '1-2%'}) while keeping liquid cash until bill payment.`,
        cardDetails: card,
        rewardEstimate: estimatedReward,
      });
    }
  }

  // Option C: Top Catalog Card (if user wants to apply or compare)
  if (marketCards.length > 0) {
    const topMarket = marketCards[0];
    let marketRewardPct = 1.5;
    if (topMarket.reward_rate_pct) {
      const match = topMarket.reward_rate_pct.match(/([\d.]+)/);
      if (match) marketRewardPct = parseFloat(match[1]);
    }
    const marketReward = Math.round(amount * (marketRewardPct / 100));

    options.push({
      method: `Best Match Card: ${topMarket.card_name}`,
      description: `Optimized for ${topMarket.best_for} (CardCheck Score: ${topMarket.cardcheck_score}/100).`,
      monthlyCost: amount,
      totalCost: Math.max(0, amount - marketReward),
      savingsImpact: 0,
      emergencyFundImpact: 0,
      recommended: userCards.length === 0 && snapshot.monthlySurplus >= amount,
      reason: `Offers ${topMarket.reward_rate_pct || 'up to 5%'} rewards on ${topMarket.best_for}. Annual fee: ${topMarket.annual_fee_inr || 'Free'}.`,
      cardDetails: topMarket,
      rewardEstimate: marketReward,
    });
  }

  // Option D: Split Cash + Financing (for large purchases >= ₹25,000)
  if (amount >= 25000 && snapshot.totalSavings > 0) {
    const downPayment = Math.min(Math.round(snapshot.totalSavings * 0.3), Math.round(amount * 0.4));
    const financed = amount - downPayment;
    const tenure = 12;
    const estInterestRate = 0.13; // ~13% p.a. market rate
    const monthlyEmi = Math.round((financed * (1 + (estInterestRate * tenure / 12))) / tenure);

    options.push({
      method: `Smart Hybrid: ₹${formatIndian(downPayment)} Cash + ₹${formatIndian(financed)} EMI`,
      description: `Pay ₹${formatIndian(downPayment)} upfront and finance ₹${formatIndian(financed)} over ${tenure} months at ~₹${formatIndian(monthlyEmi)}/mo.`,
      monthlyCost: monthlyEmi,
      totalCost: downPayment + (monthlyEmi * tenure),
      savingsImpact: -downPayment,
      emergencyFundImpact: 0,
      recommended: snapshot.monthlySurplus > monthlyEmi * 2 && snapshot.totalSavings < amount,
      reason: `Protects your emergency cash while keeping monthly payments manageable at ₹${formatIndian(monthlyEmi)}/mo.`,
    });
  }

  // Select recommended option
  const recommended = options.find(o => o.recommended) || options[0];

  return {
    item: itemName,
    amount,
    options,
    bestOption: recommended || null,
    matchedCards: marketCards,
    warnings: snapshot.monthlySurplus < 0
      ? ['Your monthly expenses exceed your income. Any new purchase or EMI will worsen cash flow.']
      : (snapshot.emergencyFundMonths < 3 ? ['Your emergency reserve is below 3 months. Avoid large full-cash drains.'] : []),
  };
}

// ── Indian Number Formatting ───────────────────────────────────
function formatIndian(num: number): string {
  const absNum = Math.abs(Math.round(num));
  const str = absNum.toString();
  if (str.length <= 3) return str;

  let result = str.slice(-3);
  let remaining = str.slice(0, -3);

  while (remaining.length > 2) {
    result = remaining.slice(-2) + ',' + result;
    remaining = remaining.slice(0, -2);
  }
  if (remaining.length > 0) {
    result = remaining + ',' + result;
  }

  return num < 0 ? '-' + result : result;
}

