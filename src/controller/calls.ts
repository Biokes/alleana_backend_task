import { Request, Response, NextFunction } from 'express';
import ApiResponse from '../utils/ApiResponse';
import AIleanaError from '../errors';
import { InitiateCallSchema } from '../utils/types';
import { callService } from '../services/calls';

class CallsController {
  async initiate(req: Request, res: Response, next: NextFunction) {
    try {
      const parsed = await InitiateCallSchema.parseAsync(req.body);
      const user = (req as any).user as { userId: number };
      const session = await callService.initiateCall(user.userId, parsed.calleeId);
      return ApiResponse.success(res, session, 201, 'Call initiated');
    } catch (error: any) {
      if (error instanceof AIleanaError) return ApiResponse.error(res, 400, error.message);
      return next(error);
    }
  }

  async accept(req: Request, res: Response, next: NextFunction) {
    try {
      const id = Number(req.params.id);
      const user = (req as any).user as { userId: number };
      const session = await callService.acceptCall(id, user.userId);
      return ApiResponse.success(res, session, 200, 'Call accepted');
    } catch (error: any) {
      if (error instanceof AIleanaError) return ApiResponse.error(res, 400, error.message);
      return next(error);
    }
  }

  async reject(req: Request, res: Response, next: NextFunction) {
    try {
      const id = Number(req.params.id);
      const user = (req as any).user as { userId: number };
      const session = await callService.rejectCall(id, user.userId);
      return ApiResponse.success(res, session, 200, 'Call rejected');
    } catch (error: any) {
      if (error instanceof AIleanaError) return ApiResponse.error(res, 400, error.message);
      return next(error);
    }
  }

  async end(req: Request, res: Response, next: NextFunction) {
    try {
      const id = Number(req.params.id);
      const user = (req as any).user as { userId: number };
      const session = await callService.endCall(id, user.userId);
      return ApiResponse.success(res, session, 200, 'Call ended');
    } catch (error: any) {
      if (error instanceof AIleanaError) return ApiResponse.error(res, 400, error.message);
      return next(error);
    }
  }

  async getOne(req: Request, res: Response, next: NextFunction) {
    try {
      const id = Number(req.params.id);
      const user = ((req as any).user) as { userId: number };
      const session = await callService.getSession(id, user.userId);
      return ApiResponse.success(res, session, 200);
    } catch (error: any) {
      if (error instanceof AIleanaError) return ApiResponse.error(res, 400, error.message);
      return next(error);
    }
  }

  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const user = ((req as any).user) as { userId: number };
      const sessions = await callService.listSessions(user.userId);
      return ApiResponse.success(res, sessions, 200);
    } catch (error: any) {
      if (error instanceof AIleanaError) return ApiResponse.error(res, 400, error.message);
      return next(error);
    }
  }
}

export const callsController = new CallsController();
