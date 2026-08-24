const getApiBase = (): string => {
  const rawUrl = import.meta.env.VITE_API_URL;
  if (!rawUrl || typeof rawUrl !== 'string') return '/api';
  const clean = rawUrl.trim().replace(/\/$/, '');
  return clean.endsWith('/api') ? clean : `${clean}/api`;
};

const API_BASE = getApiBase();

class ApiClient {
  private accessToken: string | null = null;
  private refreshToken: string | null = null;
  private onAuthError: (() => void) | null = null;

  constructor() {
    this.accessToken = localStorage.getItem('ftwin_access_token');
    this.refreshToken = localStorage.getItem('ftwin_refresh_token');
  }

  setTokens(accessToken: string, refreshToken: string) {
    this.accessToken = accessToken;
    this.refreshToken = refreshToken;
    localStorage.setItem('ftwin_access_token', accessToken);
    localStorage.setItem('ftwin_refresh_token', refreshToken);
  }

  clearTokens() {
    this.accessToken = null;
    this.refreshToken = null;
    localStorage.removeItem('ftwin_access_token');
    localStorage.removeItem('ftwin_refresh_token');
  }

  setOnAuthError(callback: () => void) {
    this.onAuthError = callback;
  }

  private async request<T>(
    path: string,
    options: RequestInit = {},
    retry = true,
  ): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (this.accessToken) {
      headers['Authorization'] = `Bearer ${this.accessToken}`;
    }

    const response = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers,
    });

    // Handle token expiration
    if (response.status === 401 && retry && this.refreshToken) {
      const refreshed = await this.refreshAccessToken();
      if (refreshed) {
        return this.request<T>(path, options, false);
      }
    }

    if (response.status === 401) {
      this.clearTokens();
      this.onAuthError?.();
      throw new Error('Authentication required');
    }

    let data: any;
    const contentType = response.headers.get('content-type') || '';

    if (contentType.includes('application/json')) {
      try {
        data = await response.json();
      } catch (err: any) {
        throw new Error(`Server returned invalid JSON response: ${err.message}`);
      }
    } else {
      const rawText = await response.text();
      if (!response.ok) {
        throw new Error(`Server error (${response.status}): ${rawText.slice(0, 150)}`);
      }
      throw new Error(`Expected JSON from ${API_BASE}${path} but received HTML/Text. Please verify VITE_API_URL is configured.`);
    }

    if (!response.ok) {
      throw new Error(data?.error || data?.message || 'Request failed');
    }

    return data;
  }

  private async refreshAccessToken(): Promise<boolean> {
    try {
      const response = await fetch(`${API_BASE}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: this.refreshToken }),
      });

      if (!response.ok) return false;
      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) return false;

      const data = await response.json();
      if (data?.success && data?.data) {
        this.setTokens(data.data.accessToken, data.data.refreshToken);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  // ── Auth ────────────────────────────────────────────────────
  async register(email: string, password: string, name: string) {
    return this.request<any>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, name }),
    });
  }

  async login(email: string, password: string) {
    return this.request<any>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }

  async getMe() {
    return this.request<any>('/auth/me');
  }

  // ── Profile ─────────────────────────────────────────────────
  async getProfile() {
    return this.request<any>('/profile');
  }

  async updateProfile(data: any) {
    return this.request<any>('/profile', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // ── Income ──────────────────────────────────────────────────
  async getIncome() {
    return this.request<any>('/income');
  }

  async addIncome(data: any) {
    return this.request<any>('/income', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateIncome(id: number, data: any) {
    return this.request<any>(`/income/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteIncome(id: number) {
    return this.request<any>(`/income/${id}`, { method: 'DELETE' });
  }

  // ── Expenses ────────────────────────────────────────────────
  async getExpenseCategories() {
    return this.request<any>('/expenses/categories');
  }

  async getExpenses() {
    return this.request<any>('/expenses');
  }

  async addExpense(data: any) {
    return this.request<any>('/expenses', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateExpense(id: number, data: any) {
    return this.request<any>(`/expenses/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteExpense(id: number) {
    return this.request<any>(`/expenses/${id}`, { method: 'DELETE' });
  }

  // ── Financial ───────────────────────────────────────────────
  async getSnapshot() {
    return this.request<any>('/financial/snapshot');
  }

  async getHealthScore() {
    return this.request<any>('/financial/health-score');
  }

  async getRecommendations() {
    return this.request<any>('/financial/recommendations');
  }

  async simulate(params: any) {
    return this.request<any>('/financial/simulate', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  }

  async getPurchaseAdvice(item: string, amount: number) {
    return this.request<any>('/financial/purchase-advice', {
      method: 'POST',
      body: JSON.stringify({ item, amount }),
    });
  }

  async getTwinData() {
    return this.request<any>('/financial/twin');
  }

  // ── Goals ───────────────────────────────────────────────────
  async getGoals() {
    return this.request<any>('/goals');
  }

  async createGoal(data: any) {
    return this.request<any>('/goals', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateGoal(id: number, data: any) {
    return this.request<any>(`/goals/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteGoal(id: number) {
    return this.request<any>(`/goals/${id}`, { method: 'DELETE' });
  }

  async contributeToGoal(id: number, amount: number) {
    return this.request<any>(`/goals/${id}/contribute`, {
      method: 'POST',
      body: JSON.stringify({ amount }),
    });
  }

  // ── Investments ─────────────────────────────────────────────
  async getInvestments() {
    return this.request<any>('/investments');
  }

  async addInvestment(data: any) {
    return this.request<any>('/investments', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateInvestment(id: number, data: any) {
    return this.request<any>(`/investments/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteInvestment(id: number) {
    return this.request<any>(`/investments/${id}`, { method: 'DELETE' });
  }

  async getInvestmentProducts() {
    return this.request<any>('/investments/products');
  }

  // ── Credit Cards (Real Indian Dataset + Image Management) ────
  async getCreditCardCatalog(params?: { bank?: string; network?: string; search?: string; sort?: string; withImage?: string }) {
    const query = new URLSearchParams();
    if (params?.bank) query.append('bank', params.bank);
    if (params?.network) query.append('network', params.network);
    if (params?.search) query.append('search', params.search);
    if (params?.sort) query.append('sort', params.sort);
    if (params?.withImage) query.append('withImage', params.withImage);
    const qs = query.toString() ? `?${query.toString()}` : '';
    return this.request<any>(`/credit-cards/catalog${qs}`);
  }

  async getCreditCardDetail(id: number) {
    return this.request<any>(`/credit-cards/detail/${id}`);
  }

  async getCreditCardRecommendations() {
    return this.request<any>('/credit-cards/recommend');
  }

  async getUserCreditCards() {
    return this.request<any>('/credit-cards/user');
  }

  async addUserCreditCard(data: { creditCardId: number; lastFourDigits?: string; creditLimit?: number; availableLimit?: number; isPrimary?: boolean }) {
    return this.request<any>('/credit-cards/user', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async removeUserCreditCard(id: number) {
    return this.request<any>(`/credit-cards/user/${id}`, { method: 'DELETE' });
  }

  async uploadCardImage(id: number, data: { imageBase64?: string; imageUrl?: string; fileName?: string }) {
    return this.request<any>(`/credit-cards/${id}/image`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async deleteCardImage(id: number) {
    return this.request<any>(`/credit-cards/${id}/image`, { method: 'DELETE' });
  }

  async batchUploadCardImages(files: { fileName: string; imageBase64: string; cardId?: number }[]) {
    return this.request<any>('/credit-cards/batch-image-upload', {
      method: 'POST',
      body: JSON.stringify({ files }),
    });
  }

  async getCardAdminStatus() {
    return this.request<any>('/credit-cards/admin/status');
  }

  async reimportCardCsv() {
    return this.request<any>('/credit-cards/reimport-csv', { method: 'POST' });
  }

  // ── Chat ────────────────────────────────────────────────────
  async getConversations() {
    return this.request<any>('/chat/conversations');
  }

  async createConversation(title?: string) {
    return this.request<any>('/chat/conversations', {
      method: 'POST',
      body: JSON.stringify({ title }),
    });
  }

  async deleteConversation(id: number) {
    return this.request<any>(`/chat/conversations/${id}`, { method: 'DELETE' });
  }

  async getMessages(conversationId: number) {
    return this.request<any>(`/chat/conversations/${conversationId}/messages`);
  }

  async sendMessage(conversationId: number, content: string) {
    return this.request<any>(`/chat/conversations/${conversationId}/messages`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    });
  }

  async confirmFinancialUpdate(updateData: any, messageId?: number) {
    return this.request<any>('/chat/confirm-update', {
      method: 'POST',
      body: JSON.stringify({ updateData, messageId }),
    });
  }

  // ── Loans ───────────────────────────────────────────────────
  async getLoans() {
    return this.request<any>('/loans');
  }

  async addLoan(data: any) {
    return this.request<any>('/loans', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateLoan(id: number, data: any) {
    return this.request<any>(`/loans/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteLoan(id: number) {
    return this.request<any>(`/loans/${id}`, { method: 'DELETE' });
  }

  // ── Bank Accounts ──────────────────────────────────────────
  async getBankAccounts() {
    return this.request<any>('/bank-accounts');
  }

  async addBankAccount(data: any) {
    return this.request<any>('/bank-accounts', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateBankAccount(id: number, data: any) {
    return this.request<any>(`/bank-accounts/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteBankAccount(id: number) {
    return this.request<any>(`/bank-accounts/${id}`, { method: 'DELETE' });
  }

  // ── Notifications ──────────────────────────────────────────
  async getNotifications() {
    return this.request<any>('/notifications');
  }

  async markNotificationRead(id: number) {
    return this.request<any>(`/notifications/${id}/read`, { method: 'PUT' });
  }

  async markAllNotificationsRead() {
    return this.request<any>('/notifications/read-all', { method: 'PUT' });
  }

  // ── Preferences ────────────────────────────────────────────
  async getPreferences() {
    return this.request<any>('/notifications/preferences');
  }

  async updatePreferences(data: any) {
    return this.request<any>('/notifications/preferences', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }
}

export const api = new ApiClient();
