import { apiClient } from './client';

export interface RequestOtpResponse {
  message: string;
  expiresInSeconds: number;
}

export interface VerifyOtpResponse {
  token: string;
  user: {
    id: string;
    phone: string;
  };
}

export async function requestOtp(phone: string): Promise<RequestOtpResponse> {
  const res = await apiClient.post<RequestOtpResponse>('/auth/request-otp', {
    phone,
  });
  return res.data;
}

export async function verifyOtp(
  phone: string,
  otp: string,
): Promise<VerifyOtpResponse> {
  const res = await apiClient.post<VerifyOtpResponse>('/auth/verify-otp', {
    phone,
    otp,
  });
  return res.data;
}
