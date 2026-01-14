import { Request, Response, NextFunction } from 'express';
import ApiResponse from '../utils/ApiResponse';
import AIleanaError from '../errors';
import { WalletFundIntentSchema, MonnifyWebhookDTO, MonnifyWebhookSchema } from '../utils/types';
import { monnifyClient } from '../services/monnify/monnify.mock';
import { idempotencyStore, verifySignature } from '../services/monnify/client';
import { walletService } from '../services/wallet';

const HEADER_SIGNATURE = 'x-monnify-signature';
const HEADER_IDEMPOTENCY = 'idempotency-key';

class WalletController {

  async fundIntent(req: Request, res: Response, next: NextFunction) {
    try {
      const parsed = await WalletFundIntentSchema.parseAsync(req.body);
      const user = (req as any).user as { userId: number };
      const currency = parsed.currency || 'NGN';
      const intent = await monnifyClient.createPaymentIntent(user.userId, parsed.amount, currency);
      return ApiResponse.success(res, intent, 201, 'Funding intent created');
    } catch (error: any) {
      if (error instanceof AIleanaError) return ApiResponse.error(res, 400, error.message);
      return next(error);
    }
  }
  
  async webhook(req: Request, res: Response, next: NextFunction) {
    try {
      const signature = req.headers[HEADER_SIGNATURE] as string | undefined;
      const idempotencyKey = req.headers[HEADER_IDEMPOTENCY] as string | undefined;

      if (!signature) return ApiResponse.error(res, 400, { message: 'Missing signature' });
      if (!idempotencyKey) return ApiResponse.error(res, 400, { message: 'Missing idempotency key' });

      const payloadStr = JSON.stringify(req.body);
      const valid = verifySignature(payloadStr, signature, process.env.MONNIFY_WEBHOOK_SECRET);
      if (!valid) return ApiResponse.error(res, 401, { message: 'Invalid signature' });

      if (idempotencyStore.has(idempotencyKey)) {
        return ApiResponse.success(res, { message: 'Already processed' }, 200);
      }

      const parsed = await MonnifyWebhookSchema.parseAsync(req.body) as MonnifyWebhookDTO;

      if (parsed.data.status === 'PAID') {
        await walletService.fundWallet(parsed.data.userId, parsed.data.amount, parsed.data.reference);
      }

      idempotencyStore.set(idempotencyKey);
      return ApiResponse.success(res, { message: 'Webhook processed' }, 200);
    } catch (error: any) {
      if (error instanceof AIleanaError) return ApiResponse.error(res, 400, error.message);
      return next(error);
    }
  }

  async balance(req: Request, res: Response, next: NextFunction) {
    try {
      const user = (req as any).user as { userId: number };
      const result = await walletService.getBalance(user.userId);
      return ApiResponse.success(res, result, 200);
    } catch (error: any) {
      if (error instanceof AIleanaError) return ApiResponse.error(res, 400, error.message);
      return next(error);
    }
  }

  async transactions(req: Request, res: Response, next: NextFunction) {
    try {
      const user = (req as any).user as { userId: number };
      const result = await walletService.getTransactions(user.userId);
      return ApiResponse.success(res, result, 200);
    } catch (error: any) {
      if (error instanceof AIleanaError) return ApiResponse.error(res, 400, error.message);
      return next(error);
    }
  }
}

export const walletController = new WalletController();
