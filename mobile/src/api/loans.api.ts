import { Platform } from 'react-native';
import { apiClient } from './client';

export interface Loan {
  id: string;
  friendName: string;
  amount: number;
  dueDate: string;
  status: 'pending' | 'repaid';
  isOverdue: boolean;
  daysOverdue: number;
  repaidAt: string | null;
  receiptUrl: string | null;
  createdAt: string;
}

export interface Summary {
  totalLent: number;
  totalRepaid: number;
  totalPending: number;
  overdueAmount: number;
  counts: {
    total: number;
    repaid: number;
    pending: number;
    overdue: number;
  };
}

export interface CreateLoanInput {
  friendName: string;
  amount: number;
  dueDate: string;
}

export async function getLoans(status: string = 'all'): Promise<Loan[]> {
  const res = await apiClient.get<Loan[]>('/loans', {
    params: { status },
  });
  return res.data;
}

export async function getLoanById(id: string): Promise<Loan> {
  const res = await apiClient.get<Loan>(`/loans/${id}`);
  return res.data;
}

export async function createLoan(data: CreateLoanInput): Promise<Loan> {
  const res = await apiClient.post<Loan>('/loans', data);
  return res.data;
}

export async function repayLoan(id: string): Promise<Loan> {
  const res = await apiClient.patch<Loan>(`/loans/${id}/repay`);
  return res.data;
}

export async function deleteLoan(id: string): Promise<void> {
  await apiClient.delete(`/loans/${id}`);
}

export async function getSummary(): Promise<Summary> {
  const res = await apiClient.get<Summary>('/summary');
  return res.data;
}

/**
 * Uploads a receipt image using multipart/form-data.
 * Accepts local file URI from expo-image-picker.
 */
export async function uploadReceipt(loanId: string, fileUri: string): Promise<Loan> {
  const formData = new FormData();
  const filename = fileUri.split('/').pop() || 'receipt.jpg';
  const match = /\.(\w+)$/.exec(filename);
  const ext = match ? match[1].toLowerCase() : 'jpg';
  const mimeType = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';

  if (Platform.OS === 'web') {
    // On web the picker returns a blob:/data: URI; convert it to a real Blob
    const blob = await (await fetch(fileUri)).blob();
    const webExt = blob.type.split('/')[1] || 'jpg';
    formData.append('receipt', blob, `receipt.${webExt}`);
  } else {
    // React Native FormData file shape
    formData.append('receipt', {
      uri: fileUri,
      name: filename,
      type: mimeType,
    } as unknown as Blob);
  }

  const res = await apiClient.post<Loan>(`/loans/${loanId}/receipt`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });

  return res.data;
}
