import { Router } from 'express';
import { callsController } from '../controller/calls';
import { authenticateJWT } from '../auth/middleware/auth';

export const callsRouter: Router = Router();

callsRouter.post('/initiate', authenticateJWT, callsController.initiate.bind(callsController));
callsRouter.post('/:id/accept', authenticateJWT, callsController.accept.bind(callsController));
callsRouter.post('/:id/reject', authenticateJWT, callsController.reject.bind(callsController));
callsRouter.post('/:id/end', authenticateJWT, callsController.end.bind(callsController));

callsRouter.get('/:id', authenticateJWT, callsController.getOne.bind(callsController));
callsRouter.get('/', authenticateJWT, callsController.list.bind(callsController));
