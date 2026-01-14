import { Router } from 'express';
import { walletController } from '../controller/wallet';
import { authenticateJWT } from '../auth/middleware/auth';

export const walletRouter: Router = Router();

walletRouter.post('/fund-intent', authenticateJWT, walletController.fundIntent.bind(walletController));
walletRouter.get('/balance', authenticateJWT, walletController.balance.bind(walletController));
walletRouter.get('/transactions', authenticateJWT, walletController.transactions.bind(walletController));

walletRouter.post('/webhook', walletController.webhook.bind(walletController));
