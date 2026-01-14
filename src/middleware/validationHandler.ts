import { Request, Response, NextFunction } from "express";
import z,{ ZodObject, ZodRawShape } from "zod";
import ApiResponse from "../utils/ApiResponse";


export const validateRequest = (schema:  ZodObject<ZodRawShape>) => {
  return async (req: Request, res: Response, next: NextFunction)=> {
    try {
      const validated = await schema.parseAsync(req.body);
      req.body = validated;
      return next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        const messages = error.issues.map((err) => ({
          field: err.path.join('.'),
          message: err.message,
        }));
        return ApiResponse.error(res, 400, messages);
      }
      return next(error);
    }
  };
};