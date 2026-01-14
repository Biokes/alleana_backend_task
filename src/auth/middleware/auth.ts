import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { appConfig } from "../../config";

export interface AuthPayload {
  userId: number;
  email: string;
  role: string;
}

function getTokenFromRequest(req: Request): string | null {
  const authHeader = req.headers["authorization"]; 
  if (authHeader && typeof authHeader === 'string') {
    const [scheme, token] = authHeader.split(' ');
    if (scheme === 'Bearer' && token) return token;
  }
  const cookieToken = (req as any).cookies?.accessToken;
  return cookieToken || null;
}

export function authenticateJWT(req: Request, res: Response, next: NextFunction) {
  const token = getTokenFromRequest(req);
  if (!token) {
    return res.status(401).json({ success: false, statusCode: 401, message: 'Unauthorized' });
  }
  try {
    const payload = jwt.verify(token, appConfig.JWT_SECRET) as AuthPayload;
    (req as any).user = payload;
    return next();
  } catch (err) {
    return res.status(401).json({ success: false, statusCode: 401, message: 'Invalid or expired token' });
  }
}
