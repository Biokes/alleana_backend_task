import crypto from 'crypto';
import { appConfig } from '../../config';

export type PaymentIntent = {
  reference: string;
  amount: number;
  currency: string;
  checkoutUrl: string;
  status: 'PENDING' | 'PAID' | 'FAILED';
};

export interface MonnifyClient {
  createPaymentIntent(userId: number, amount: number, currency?: string): Promise<PaymentIntent>;
}

export function computeSignature(payload: string, secret?: string): string {
  const key = secret || appConfig.JWT_SECRET; // fallback to JWT_SECRET if MONNIFY_WEBHOOK_SECRET is not set
  return crypto.createHmac('sha256', key).update(payload, 'utf8').digest('hex');
}

export function verifySignature(payload: string, signature: string, secret?: string): boolean {
  const expected = computeSignature(payload, secret);
  return crypto.timingSafeEqual(Buffer.from(signature, 'hex'), Buffer.from(expected, 'hex'));
}

// Simple in-memory idempotency store (replace with Redis/DB in production)
class IdempotencyStore {
  private readonly store = new Map<string, number>();

  has(key: string): boolean {
    return this.store.has(key);
  }

  set(key: string): void {
    this.store.set(key, Date.now());
  }
}

export const idempotencyStore = new IdempotencyStore();
