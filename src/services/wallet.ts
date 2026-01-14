import { Database } from '../config';
import { Transaction, TransactionType, Wallet } from '../data/models';
import { transactionRepository } from '../data/repositories/transaction';
import { walletRepository } from '../data/repositories/wallet';
import AIleanaError from '../errors';

export class WalletService {
  private readonly currencyDefault = 'NGN';

  async getOrCreateWallet(userId: number): Promise<Wallet> {
    const existing = await walletRepository.findOne({ where: { userId } });
    if (existing) return existing;
    const created = await walletRepository.create({ userId, balance: 0, currency: this.currencyDefault });
    return created;
  }

  async getBalance(userId: number): Promise<{ balance: number; currency: string }> {
    const wallet = await this.getOrCreateWallet(userId);
    return { balance: wallet.balance, currency: wallet.currency };
  }

  async getTransactions(userId: number): Promise<Transaction[]> {
    const wallet = await this.getOrCreateWallet(userId);
    return transactionRepository.find({ where: { walletId: wallet.id }, order: { createdAt: 'DESC' as any } });
  }

  async fundWallet(userId: number, amount: number, reference: string): Promise<{ wallet: Wallet; transaction: Transaction }> {
    if (amount <= 0) throw new AIleanaError('Amount must be greater than 0');

    return Database.manager.transaction(async (manager) => {
      const walletRepo = manager.getRepository(Wallet);
      const txnRepo = manager.getRepository(Transaction);

      let wallet = await walletRepo.findOne({ where: { userId } });
      if (!wallet) {
        wallet = walletRepo.create({ userId, balance: 0, currency: this.currencyDefault });
        wallet = await walletRepo.save(wallet);
      }

      // Credit
      wallet.balance = Number((wallet.balance + amount).toFixed(2));
      await walletRepo.save(wallet);

      const transaction = txnRepo.create({
        walletId: wallet.id,
        type: TransactionType.CREDIT,
        amount,
        reference
      });
      const savedTxn = await txnRepo.save(transaction);

      return { wallet, transaction: savedTxn };
    });
  }

  async debitWallet(userId: number, amount: number, reference: string): Promise<{ wallet: Wallet; transaction: Transaction }> {
    if (amount <= 0) throw new AIleanaError('Amount must be greater than 0');

    return Database.manager.transaction(async (manager) => {
      const walletRepo = manager.getRepository(Wallet);
      const txnRepo = manager.getRepository(Transaction);

      const wallet = await walletRepo.findOne({ where: { userId } });
      if (!wallet) throw new AIleanaError('Wallet not found');
      if (wallet.balance < amount) throw new AIleanaError('Insufficient balance');

      wallet.balance = Number((wallet.balance - amount).toFixed(2));
      await walletRepo.save(wallet);

      const transaction = txnRepo.create({
        walletId: wallet.id,
        type: TransactionType.DEBIT,
        amount,
        reference
      });
      const savedTxn = await txnRepo.save(transaction);

      return { wallet, transaction: savedTxn };
    });
  }

  async transferWallet(fromUserId: number, toUserId: number, amount: number, reference: string): Promise<{ from: Wallet; to: Wallet }> {
    if (fromUserId === toUserId) throw new AIleanaError('Cannot transfer to the same user');
    if (amount <= 0) throw new AIleanaError('Amount must be greater than 0');

    return Database.manager.transaction(async (manager) => {
      const walletRepo = manager.getRepository(Wallet);
      const txnRepo = manager.getRepository(Transaction);

      let fromWallet = await walletRepo.findOne({ where: { userId: fromUserId } });
      let toWallet = await walletRepo.findOne({ where: { userId: toUserId } });

      if (!fromWallet) throw new AIleanaError('Source wallet not found');
      if (!toWallet) {
        toWallet = walletRepo.create({ userId: toUserId, balance: 0, currency: this.currencyDefault });
        toWallet = await walletRepo.save(toWallet);
      }
      if (fromWallet.balance < amount) throw new AIleanaError('Insufficient balance');

      fromWallet.balance = Number((fromWallet.balance - amount).toFixed(2));
      await walletRepo.save(fromWallet);
      const debitTxn = txnRepo.create({ walletId: fromWallet.id, type: TransactionType.DEBIT, amount, reference: `${reference}-DEBIT` });
      await txnRepo.save(debitTxn);

      toWallet.balance = Number((toWallet.balance + amount).toFixed(2));
      await walletRepo.save(toWallet);
      const creditTxn = txnRepo.create({ walletId: toWallet.id, type: TransactionType.CREDIT, amount, reference: `${reference}-CREDIT` });
      await txnRepo.save(creditTxn);

      return { from: fromWallet, to: toWallet };
    });
  }
}

export const walletService = new WalletService();
