import { Database } from '../config';
import { CallEvent, CallEventType, CallSession, CallStatus } from '../data/models';
import { callEventRepository } from '../data/repositories/callEvent';
import { callSessionRepository } from '../data/repositories/callSession';
import AIleanaError from '../errors';
import { walletService } from './wallet';

function round2(n: number): number { return Math.round(n * 100) / 100; }

export class CallService {
  private readonly defaultRatePerMin = 5;

  async initiateCall(callerId: number, calleeId: number): Promise<CallSession> {
    if (callerId === calleeId) throw new AIleanaError('Caller and callee cannot be the same');
    const session = await callSessionRepository.create({
      callerId,
      calleeId,
      status: CallStatus.INITIATED,
      startedAt: null,
      endedAt: null,
      durationSec: null,
      cost: null,
    } as any);
    await callEventRepository.create({ sessionId: session.id, type: CallEventType.CREATED, metadata: null } as any);
    return session;
  }

  async acceptCall(sessionId: number, userId: number): Promise<CallSession> {
    const session = await callSessionRepository.findById(String(sessionId));
    if (!session) throw new AIleanaError('Call session not found');
    if (session.calleeId !== userId) throw new AIleanaError('Only callee can accept the call');
    if (session.status !== CallStatus.INITIATED && session.status !== CallStatus.RINGING) {
      throw new AIleanaError('Call cannot be accepted in current state');
    }

    const updated = await callSessionRepository.update(String(session.id), {
      status: CallStatus.ACTIVE,
      startedAt: new Date(),
    } as any);
    await callEventRepository.create({ sessionId: session.id, type: CallEventType.ACCEPTED, metadata: null } as any);
    return updated as CallSession;
  }

  async rejectCall(sessionId: number, userId: number): Promise<CallSession> {
    const session = await callSessionRepository.findById(String(sessionId));
    if (!session) throw new AIleanaError('Call session not found');
    if (session.calleeId !== userId) throw new AIleanaError('Only callee can reject the call');
    if (session.status === CallStatus.ENDED || session.status === CallStatus.FAILED) {
      throw new AIleanaError('Call already completed');
    }

    const updated = await callSessionRepository.update(String(session.id), {
      status: CallStatus.FAILED,
      endedAt: new Date(),
      durationSec: 0,
      cost: 0,
    } as any);
    await callEventRepository.create({ sessionId: session.id, type: CallEventType.REJECTED, metadata: null } as any);
    return updated as CallSession;
  }

  async endCall(sessionId: number, userId: number): Promise<CallSession> {
    const repo = Database.getRepository(CallSession);
    const session = await repo.findOne({ where: { id: sessionId } });
    if (!session) throw new AIleanaError('Call session not found');
    if (session.callerId !== userId && session.calleeId !== userId) {
      throw new AIleanaError('Not authorized to end this call');
    }

    if (session.status !== CallStatus.ACTIVE) {
      // Idempotent-ish: if already ended/failed, return as is
      if (session.status === CallStatus.ENDED || session.status === CallStatus.FAILED) return session;
      throw new AIleanaError('Call is not active');
    }

    const now = new Date();
    const startedAt = session.startedAt ? new Date(session.startedAt) : now;
    const durationSec = Math.max(0, Math.floor((now.getTime() - startedAt.getTime()) / 1000));

    const ratePerSec = this.defaultRatePerMin / 60;
    const cost = round2(durationSec * ratePerSec);

    return Database.manager.transaction(async (manager) => {
      const sRepo = manager.getRepository(CallSession);
      const updated = await sRepo.save({
        ...session,
        status: CallStatus.ENDED,
        endedAt: now,
        durationSec,
        cost,
      });

      if (cost > 0) {
        const ref = `CALL-${updated.id}-${now.getTime()}`;
        await walletService.debitWallet(updated.callerId, cost, ref);
      }

      await manager.getRepository(CallEvent).save({ sessionId: session.id, type: CallEventType.ENDED, metadata: { endedBy: userId } });
      return updated;
    });
  }

  async getSession(sessionId: number, userId: number): Promise<CallSession> {
    const session = await callSessionRepository.findById(String(sessionId));
    if (!session) throw new AIleanaError('Call session not found');
    if (session.callerId !== userId && session.calleeId !== userId) {
      throw new AIleanaError('Not authorized to access this session');
    }
    return session;
  }

  async listSessions(userId: number): Promise<CallSession[]> {
    const repo = Database.getRepository(CallSession);
    return repo.find({ where: [{ callerId: userId }, { calleeId: userId }] as any, order: { createdAt: 'DESC' as any } });
  }
}

export const callService = new CallService();
