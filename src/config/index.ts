import { DataSource } from "typeorm";
import { Server } from "http";
import { Application } from "express";
import dotenv from "dotenv";
import { AppConfig } from "../utils/types";

dotenv.config();

export const appConfig: AppConfig = {
    port: Number(process.env.PORT),
    nodeENV: process.env.NODE_ENV!,
    DB_USERNAME: process.env.DB_USERNAME!,
    DB_PASSWORD: process.env.DB_PASSWORD!,
    DB_NAME: process.env.DB_NAME!,
    DB_HOST: process.env.DB_HOST!
}

export const Database: DataSource = new DataSource({
    type: "postgres",
    host: appConfig.DB_HOST,
    port: Number(process.env.DB_PORT),
    username: appConfig.DB_USERNAME,
    password: appConfig.DB_PASSWORD,
    database: appConfig.DB_NAME,
    synchronize: true,
    entities: [],
    logging: false,
})
