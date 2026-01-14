import { Router, Request, Response } from "express";
import { authRouter } from "./auth";
import { appConfig } from "../config";

export const AppRouter: Router = Router();

AppRouter.get('/health', (req: Request, res: Response) => {
    res.status(200).json({
        status: 'ok',
        url: req.url,
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: appConfig.nodeENV
    });
});

AppRouter.use('/auths', authRouter);
