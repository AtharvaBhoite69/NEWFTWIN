// ============================================================
// FTWIN Shared Types — Single source of truth for client & server
// ============================================================

// ── Auth ──────────────────────────────────────────────────────
export interface AuthUser {
  id: number;
  email: string;
  name: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
}

export interface AuthResponse {
  user: AuthUser;
  accessToken: string;
  refreshToken: string;
}

// ── Profile ───────────────────────────────────────────────────
export interface Profile {
  id: number;
  userId: number;
  dateOfBirth?: string;
  gender?: 'male' | 'female' | 'other' | 'prefer_not_to_say';
  maritalStatus?: 'single' | 'married' | 'divorced' | 'widowed';
  dependents: number;
  city?: string;
  employmentType?: 'salaried' | 'self_employed' | 'freelancer' | 'business_owner' | 'student' | 'retired' | 'unemployed';
  employer?: string;
  riskPreference: 'conservative' | 'moderate' | 'aggressive';
  onboardingCompleted: boolean;
}

// ── Income ────────────────────────────────────────────────────
export interface IncomeSource {
  id: number;
  userId: number;
  type: 'salary' | 'freelance' | 'business' | 'rental' | 'interest' | 'dividend' | 'other';
  name: string;
  amount: number;
  frequency: 'monthly' | 'weekly' | 'biweekly' | 'annually' | 'one_time';
  isPrimary: boolean;
  createdAt: string;
  updatedAt: string;
}

// ── Expenses ──────────────────────────────────────────────────
export interface ExpenseCategory {
  id: number;
  name: string;
  icon: string;
  color: string;
}

export interface Expense {
  id: number;
  userId: number;
  categoryId: number;
  categoryName?: string;
  name: string;
  amount: number;
  frequency: 'monthly' | 'weekly' | 'daily' | 'annually' | 'one_time';
  isMandatory: boolean;
  createdAt: string;
  updatedAt: string;
}

// ── Bank Accounts ─────────────────────────────────────────────
export interface BankAccount {
  id: number;
  userId: number;
  bankName: string;
  accountType: 'savings' | 'current' | 'salary' | 'fd' | 'rd';
  balance: number;
  accountNumber?: string;
  isConnected: boolean;
  createdAt: string;
  updatedAt: string;
}

// ── Transactions ──────────────────────────────────────────────
export interface Transaction {
  id: number;
  userId: number;
  bankAccountId?: number;
  categoryId?: number;
  categoryName?: string;
  amount: number;
  type: 'credit' | 'debit';
  date: string;
  description: string;
  createdAt: string;
}

// ── Loans ─────────────────────────────────────────────────────
export interface Loan {
  id: number;
  userId: number;
  type: 'home' | 'car' | 'personal' | 'education' | 'credit_card' | 'other';
  name: string;
  principal: number;
  outstandingAmount: number;
  interestRate: number;
  emi: number;
  tenureMonths: number;
  remainingTenureMonths: number;
  startDate: string;
  createdAt: string;
  updatedAt: string;
}

// ── Investments ───────────────────────────────────────────────
export interface Investment {
  id: number;
  userId: number;
  type: 'fd' | 'rd' | 'mutual_fund' | 'index_fund' | 'stocks' | 'gold' | 'ppf' | 'nps' | 'epf' | 'debt' | 'govt_scheme' | 'other';
  name: string;
  investedAmount: number;
  currentValue: number;
  monthlyContribution: number;
  startDate: string;
  maturityDate?: string;
  interestRate?: number;
  createdAt: string;
  updatedAt: string;
}

export interface InvestmentProduct {
  id: number;
  name: string;
  type: string;
  riskLevel: 'low' | 'medium' | 'high';
  expectedReturnMin: number;
  expectedReturnMax: number;
  liquidity: 'high' | 'medium' | 'low';
  minInvestment: number;
  lockInPeriod?: string;
  taxBenefit: boolean;
  taxInfo?: string;
  description: string;
}

// ── Financial Goals ───────────────────────────────────────────
export type GoalType = 'marriage' | 'car' | 'house' | 'education' | 'travel' | 'emergency_fund' | 'retirement' | 'custom';
export type GoalStatus = 'on_track' | 'at_risk' | 'behind' | 'unrealistic' | 'completed';

export interface FinancialGoal {
  id: number;
  userId: number;
  name: string;
  type: GoalType;
  targetAmount: number;
  currentAmount: number;
  targetDate: string;
  monthlyContribution: number;
  priority: 'high' | 'medium' | 'low';
  status: GoalStatus;
  createdAt: string;
  updatedAt: string;
}

export interface GoalContribution {
  id: number;
  goalId: number;
  amount: number;
  date: string;
  createdAt: string;
}

// ── Credit Cards ──────────────────────────────────────────────
export interface CreditCard {
  id: number;
  bank: string;
  cardName: string;
  cardNetwork: 'visa' | 'mastercard' | 'rupay' | 'amex' | 'diners';
  cardType: 'rewards' | 'cashback' | 'travel' | 'fuel' | 'lifestyle' | 'premium' | 'business' | 'entry';
  annualFee: number;
  joiningFee: number;
  rewardsDescription: string;
  cashbackDescription?: string;
  loungeAccess?: string;
  fuelBenefits?: string;
  diningBenefits?: string;
  travelBenefits?: string;
  milestoneBenefits?: string;
  forexCharges?: string;
  interestRate: number;
  minIncomeRequired: number;
  cardColor1: string;
  cardColor2: string;
  logoUrl?: string;
  bestFor: string;
  features: string[];
}

export interface UserCreditCard {
  id: number;
  userId: number;
  creditCardId: number;
  creditLimit: number;
  currentBalance: number;
  billingDate: number;
  card?: CreditCard;
  createdAt: string;
  updatedAt: string;
}

// ── Financial Snapshot ────────────────────────────────────────
export interface FinancialSnapshot {
  totalMonthlyIncome: number;
  totalMonthlyExpenses: number;
  mandatoryExpenses: number;
  discretionaryExpenses: number;
  totalEMIs: number;
  monthlySurplus: number;
  totalSavings: number;
  totalInvestments: number;
  totalDebt: number;
  netWorth: number;
  emergencyFundMonths: number;
  investmentCapacity: number;
  debtToIncomeRatio: number;
  savingsRate: number;
  expenseBreakdown: { category: string; amount: number; percentage: number; color: string }[];
  incomeBreakdown: { source: string; amount: number; percentage: number }[];
}

// ── Financial Health Score ────────────────────────────────────
export interface HealthScoreComponent {
  name: string;
  score: number;
  maxScore: number;
  reason: string;
  improvement: string;
}

export interface FinancialHealthScore {
  totalScore: number;
  maxScore: number;
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  components: HealthScoreComponent[];
  calculatedAt: string;
}

// ── Simulator ─────────────────────────────────────────────────
export interface SimulationParams {
  salaryChange?: number;
  expenseChange?: number;
  newInvestmentMonthly?: number;
  newLoanEmi?: number;
  newLoanAmount?: number;
  loanInterestRate?: number;
  loanTenureMonths?: number;
  oneTimeExpense?: number;
  inflationRate?: number;
}

export interface SimulationResult {
  current: FinancialSnapshot;
  simulated: FinancialSnapshot;
  currentHealthScore: FinancialHealthScore;
  simulatedHealthScore: FinancialHealthScore;
  impact: {
    surplusChange: number;
    savingsRateChange: number;
    healthScoreChange: number;
    debtRatioChange: number;
    investmentCapacityChange: number;
  };
  warnings: string[];
  recommendations: string[];
}

// ── Purchase Advisor ──────────────────────────────────────────
export interface PurchaseOption {
  method: string;
  description: string;
  monthlyCost: number;
  totalCost: number;
  savingsImpact: number;
  emergencyFundImpact: number;
  recommended: boolean;
  reason: string;
}

export interface PurchaseAdvice {
  item: string;
  amount: number;
  options: PurchaseOption[];
  bestOption: PurchaseOption;
  warnings: string[];
}

// ── Advisor ───────────────────────────────────────────────────
export type RecommendationPriority = 'high' | 'medium' | 'low';
export type RecommendationStatus = 'active' | 'dismissed' | 'completed';

export interface AdvisorRecommendation {
  id: number;
  userId: number;
  type: 'emergency_fund' | 'debt_reduction' | 'investment' | 'savings' | 'insurance' | 'expense_reduction' | 'goal_adjustment' | 'credit' | 'general';
  priority: RecommendationPriority;
  title: string;
  description: string;
  reason: string;
  actionText?: string;
  status: RecommendationStatus;
  createdAt: string;
}

// ── Chat ──────────────────────────────────────────────────────
export interface ChatConversation {
  id: number;
  userId: number;
  title: string;
  lastMessageAt: string;
  createdAt: string;
}

export interface ChatMessage {
  id: number;
  conversationId: number;
  role: 'user' | 'assistant' | 'system';
  content: string;
  metadata?: {
    detectedIntent?: string;
    financialData?: Record<string, unknown>;
    confirmationRequired?: boolean;
    confirmed?: boolean;
    cardType?: 'financial_update' | 'recommendation' | 'insight' | 'chart';
  };
  createdAt: string;
}

// ── Notifications ─────────────────────────────────────────────
export interface Notification {
  id: number;
  userId: number;
  type: 'info' | 'warning' | 'success' | 'alert';
  title: string;
  message: string;
  isRead: boolean;
  data?: Record<string, unknown>;
  createdAt: string;
}

// ── User Preferences ─────────────────────────────────────────
export interface UserPreferences {
  userId: number;
  theme: 'light' | 'dark';
  currency: string;
  language: string;
  notificationsEnabled: boolean;
}

// ── API Response Wrapper ──────────────────────────────────────
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}
