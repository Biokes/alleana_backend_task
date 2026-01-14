import { Database } from "../../config";
import BaseRepository from "./base";
import { CallEvent } from "../models";

export class CallEventRepository extends BaseRepository<CallEvent> {
  constructor() {
    super(Database.getRepository(CallEvent));
  }
}

export const callEventRepository = new CallEventRepository();
