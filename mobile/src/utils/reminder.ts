import { Platform, Share } from 'react-native';
import { Loan } from '../api/loans.api';
import { formatCurrency } from './formatCurrency';
import { formatFriendlyDate, daysUntil } from './date';

/**
 * Builds a polite, ready-to-send repayment reminder for a pending loan.
 * Tone softens or firms up slightly depending on how late the loan is.
 */
export function buildReminderMessage(loan: Loan): string {
  const firstName = loan.friendName.trim().split(/\s+/)[0];
  const amount = formatCurrency(loan.amount);
  const due = formatFriendlyDate(loan.dueDate);

  if (loan.isOverdue) {
    return (
      `Hi ${firstName}! 👋 Hope you're doing well. Just a gentle reminder about the ${amount} ` +
      `I lent you, which was due on ${due}. Could you let me know when you'll be able to settle it? Thanks!`
    );
  }

  const days = daysUntil(loan.dueDate);
  const when = days === 0 ? 'today' : days === 1 ? 'tomorrow' : `on ${due}`;
  return (
    `Hi ${firstName}! 👋 Quick heads-up that the ${amount} I lent you is due ${when}. ` +
    `No stress, just keeping track. Thanks!`
  );
}

/**
 * Opens the system share sheet with the reminder text so the user can send it
 * through WhatsApp, SMS, etc. Nothing is sent automatically.
 * Browsers without the Web Share API fall back to a WhatsApp compose link.
 */
export async function shareReminder(loan: Loan): Promise<void> {
  const message = buildReminderMessage(loan);

  if (Platform.OS === 'web') {
    const nav = window.navigator as Navigator & { share?: (data: { text: string }) => Promise<void> };
    if (typeof nav.share === 'function') {
      try {
        await nav.share({ text: message });
        return;
      } catch {
        // User cancelled or share failed; fall through to WhatsApp link
      }
    }
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank', 'noopener');
    return;
  }

  await Share.share({ message });
}
