import { Router } from "express";
import { validateRequest } from "../middleware/validationHandler";
import { LoginSchema, RegisterSchema } from "../utils/types";
import { authController } from "../controller/auths";

export const authRouter: Router = Router()

authRouter.post('/register', validateRequest(RegisterSchema), authController.register);
authRouter.post("/login", validateRequest(LoginSchema), authController.login);
authRouter.post("/logout", authController.logout);
authRouter.post("/refresh-token", authController.refreshToken)