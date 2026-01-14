import { DataSource } from "typeorm";
import { Server } from "http";
import { Application } from "express";
import dotenv from "dotenv";
import { AppConfig } from "../utils/types";
import logger from "../utils/logger";
import { User, Wallet, Transaction, CallSession, CallEvent } from "../data/models";

dotenv.config();

export const appConfig: AppConfig = {
    port: Number(process.env.PORT),
    nodeENV: process.env.NODE_ENV!,
    DB_USERNAME: process.env.DB_USERNAME!,
    DB_PASSWORD: process.env.DB_PASSWORD!,
    DB_NAME: process.env.DB_NAME!,
    DB_HOST: process.env.DB_HOST!,
    JWT_SECRET: process.env.JWT_SECRET!,
    JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET!,
    PASSWORD_HASH: Number(process.env.PASSWORD_HASH!) 
}

export const Database: DataSource = new DataSource({
    type: "postgres",
    host: appConfig.DB_HOST,
    port: Number(process.env.DB_PORT),
    username: appConfig.DB_USERNAME,
    password: appConfig.DB_PASSWORD,
    database: appConfig.DB_NAME,
    synchronize: true,
    entities: [User, Wallet, Transaction, CallSession, CallEvent],
    logging: false,
})

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export async function initializeDatabase(): Promise<void> {
    const maxRetries = 5;
    const baseDelay = 2000;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            await Database.initialize();
            logger.info('Database connected successfully');
            return;
        } catch (error: any) {
            if (attempt === maxRetries) {
                logger.error('Database connection failed after all retries', { error: error.message });
                throw error;
            }
            const delay = baseDelay * Math.pow(2, attempt - 1);
            logger.warn(`Database connection attempt ${attempt}/${maxRetries} failed, retrying in ${delay}ms...`);
            await sleep(delay);
        }
    }
}

export async function gracefulShutdown(signal: string, server: Server): Promise<void> {
    logger.info(`${signal} received, starting graceful shutdown...`);
    server.close(() => {logger.info('HTTP server closed');});
    try {
        if (Database.isInitialized) {
            await Database.destroy();
            logger.info('Database connection closed');
        }
    } catch (error: any) {
        logger.error('Error closing database: ', { error: error.message });
    }
    process.exit(0);
}

export async function bootstrap(app: Application): Promise<void> {
    try {
        logger.info('Initializing LedgerFlow application...', {
            environment: appConfig.nodeENV,
            port: appConfig.port
        });
        await initializeDatabase();

        const server = app.listen(appConfig.port, () => {
            logger.info(`Server started successfully`, {
                port: appConfig.port,
                environment: appConfig.nodeENV,
                url: `http://localhost:${appConfig.port}`
            });
        });

        process.on('SIGTERM', () => gracefulShutdown('SIGTERM', server));
        process.on('SIGINT', () => gracefulShutdown('SIGINT', server));

    } catch (error: any) {
        logger.error('Failed to start application', {
            error: error.message,
            stack: error.stack
        });
        process.exit(1);
    }
}
