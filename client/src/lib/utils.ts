/**
 * Format a number in Indian numbering system
 * e.g., 1000000 → "10,00,000"
 */
export function formatIndian(num: number): string {
  if (num === null || num === undefined || isNaN(num)) return '0';
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

/**
 * Format currency with ₹ symbol
 */
export function formatCurrency(num: number): string {
  return `₹${formatIndian(num)}`;
}

/**
 * Format percentage
 */
export function formatPercentage(num: number): string {
  return `${num.toFixed(1)}%`;
}

/**
 * Format date to readable string
 */
export function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

/**
 * Format relative time
 */
export function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return formatDate(dateStr);
}

/**
 * Get greeting based on time
 */
export function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

/**
 * Get goal type display name
 */
export function getGoalTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    marriage: '💒 Marriage',
    car: '🚗 Car',
    house: '🏠 House',
    education: '🎓 Education',
    travel: '✈️ Travel',
    emergency_fund: '🛡️ Emergency Fund',
    retirement: '🌅 Retirement',
    custom: '🎯 Custom',
  };
  return labels[type] || '🎯 Goal';
}

/**
 * Get status color class
 */
export function getStatusClass(status: string): string {
  // Returns a color value instead of class name since we use vanilla CSS
  return '';
}

/**
 * Get status color (inline)
 */
export function getStatusColor(status: string): string {
  switch (status) {
    case 'on_track': return 'var(--success)';
    case 'at_risk': return 'var(--warning)';
    case 'behind': return 'var(--danger)';
    case 'unrealistic': return '#991B1B';
    case 'completed': return 'var(--success)';
    default: return 'var(--text-muted)';
  }
}

/**
 * Get status label
 */
export function getStatusLabel(status: string): string {
  switch (status) {
    case 'on_track': return 'ON TRACK';
    case 'at_risk': return 'AT RISK';
    case 'behind': return 'BEHIND';
    case 'unrealistic': return 'UNREALISTIC';
    case 'completed': return 'COMPLETED';
    default: return status.toUpperCase();
  }
}

/**
 * Grade color
 */
export function getGradeColor(grade: string): string {
  switch (grade) {
    case 'A': return '#22C55E';
    case 'B': return '#84CC16';
    case 'C': return '#F59E0B';
    case 'D': return '#F97316';
    case 'F': return '#EF4444';
    default: return '#6B7280';
  }
}
