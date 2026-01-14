import { Database } from "../../config";
import BaseRepository from "./base";
import { Wallet } from "../models";

export class WalletRepository extends BaseRepository<Wallet> {
  constructor() {
    super(Database.getRepository(Wallet));
  }
}

export const walletRepository = new WalletRepository();
