import { MonnifyClient, PaymentIntent } from './client';
import crypto from 'crypto';

export class MockMonnifyClient implements MonnifyClient {
  async createPaymentIntent(userId: number, amount: number, currency: string = 'NGN'): Promise<PaymentIntent> {
    const reference = `MN-${userId}-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
    const checkoutUrl = `https://mock.monnify/checkout/${reference}`;
    return {
      reference,
      amount,
      currency,
      checkoutUrl,
      status: 'PENDING'
    };
  }
}

export const monnifyClient = new MockMonnifyClient();
