import { Database } from "../../config";
import BaseRepository from "./base";
import {User} from "../models"

export class UserRepository extends BaseRepository<User> {
    constructor() {
        super(Database.getRepository(User));
    }
}

export const userRepository = new UserRepository();