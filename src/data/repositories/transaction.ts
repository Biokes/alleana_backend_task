import { Database } from "../../config";
import BaseRepository from "./base";
import { Transaction } from "../models";

export class TransactionRepository extends BaseRepository<Transaction> {
  constructor() {
    super(Database.getRepository(Transaction));
  }
}

export const transactionRepository = new TransactionRepository();
