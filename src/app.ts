import express, { Application, Request, Response } from "express";
import { errorHandler } from "./middleware/errorHandler";
import dotenv from "dotenv";
import cors from "cors";
import rateLimit from "express-rate-limit";
import { bootstrap } from "./config";
import { AppRouter } from "./router";

dotenv.config({
	path: process.env.NODE_ENV === "development" ? ".env" : ".env.test",
	override: true,
	debug: false
});

export const RATE_LIMIT_MS = 15 * 60 * 1_000;
const app: Application = express();
const isTest = process.env.NODE_ENV === "test";

if (!isTest) {
	app.use(
		rateLimit({
			message: "Too many requests",
			max: 100,
			windowMs: RATE_LIMIT_MS,
			statusCode: 429
		})
	);
}

app.use(
	cors({
		origin: [process.env.FRONTEND_URL!],
		methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
		allowedHeaders: ["Content-Type", "Authorization"],
		credentials: true
	})
);

app.use(express.json());
app.use("/api/v1/", AppRouter);

app.use((req: Request, res: Response) => {
	res.status(404).json({
		success: false,
		statusCode: 404,
		message: `Route ${req.method} ${req.path} not found`,
		timestamp: new Date().toISOString()
	});
});

app.use(errorHandler);
bootstrap(app);