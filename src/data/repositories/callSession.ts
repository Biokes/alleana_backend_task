import { Database } from "../../config";
import BaseRepository from "./base";
import { CallSession } from "../models";

export class CallSessionRepository extends BaseRepository<CallSession> {
  constructor() {
    super(Database.getRepository(CallSession));
  }
}

export const callSessionRepository = new CallSessionRepository();
