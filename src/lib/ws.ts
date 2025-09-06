import dbConnect from '@/lib/db';
import RateLimit from '@/models/RateLimit';
import type { Types } from 'mongoose';

interface MetaWebSocket extends WebSocket {
  userId?: string;
  organizationId?: string;
  taskIds?: string[];
}

export interface TaskTransitionPayload {
  taskId: Types.ObjectId | string;
  patch: Record<string, unknown>;
  updatedAt: Date;
}

export interface TaskUpdatedPayload {
  taskId: Types.ObjectId | string;
  patch: Record<string, unknown>;
  updatedAt: Date;
}

export interface CommentCreatedPayload {
  taskId: Types.ObjectId | string;
  [key: string]: unknown;
}

export interface LoopUpdatedPayload {
  taskId: Types.ObjectId | string;
  patch: Record<string, unknown>;
  updatedAt: Date;
}

export interface NotificationCreatedPayload {
  notification: Record<string, unknown>;
  userId: string;
}

export interface PresencePayload {
  taskId?: Types.ObjectId | string;
  [key: string]: unknown;
}

export interface TypingPayload {
  taskId: Types.ObjectId | string;
  userId: string;
}

const userClients = new Map<string, Set<WebSocket>>();
const taskClients = new Map<string, Set<WebSocket>>();
// Track which users are present in each task. Value is a map of userId to
// number of active connections so we only emit `user.left` when the last
// connection closes.
const taskPresence = new Map<string, Map<string, number>>();

const recentEvents = new Map<string, number>();
const SHORT_THROTTLE_MS = 500;

const LONG_LIMITS: Record<string, { limit: number; windowSeconds: number }> = {
  'comment.typing': { limit: 20, windowSeconds: 10 },
};

function safeSend(ws: WebSocket, data: string): boolean {
  try {
    ws.send(data);
    return true;
  } catch (err) {
    console.error('WebSocket send failed', err);
    try {
      ws.send(
        JSON.stringify({ event: 'error', message: 'send failed' })
      );
    } catch {}
    return false;
  }
}

function isThrottled(userId: string, event: string): boolean {
  const key = `${userId}:${event}`;
  const now = Date.now();
  const last = recentEvents.get(key) ?? 0;
  if (now - last < SHORT_THROTTLE_MS) return true;
  recentEvents.set(key, now);
  return false;
}

async function checkRateLimit(userId: string, event: string): Promise<boolean> {
  const cfg = LONG_LIMITS[event];
  if (!cfg) return true;
  await dbConnect();
  const key = `ws:${userId}:${event}`;
  const now = new Date();
  const windowEndsAt = new Date(now.getTime() + cfg.windowSeconds * 1000);
  const record = await RateLimit.findOne({ key });
  if (!record || record.windowEndsAt < now) {
    await RateLimit.updateOne(
      { key },
      { count: 1, windowEndsAt },
      { upsert: true }
    );
    return true;
  }
  if (record.count >= cfg.limit) return false;
  await RateLimit.updateOne({ key }, { $inc: { count: 1 } });
  return true;
}

function notifyLimited(ws: WebSocket, event: string) {
  safeSend(ws, JSON.stringify({ event: 'rate.limited', type: event }));
}

export function addClient(ws: MetaWebSocket) {
  if (ws.userId) {
    const set = userClients.get(ws.userId) ?? new Set<WebSocket>();
    set.add(ws);
    userClients.set(ws.userId, set);
  }
  if (ws.taskIds) {
    ws.taskIds.forEach((taskId) => {
      const set = taskClients.get(taskId) ?? new Set<WebSocket>();
      const presence = taskPresence.get(taskId) ?? new Map<string, number>();
      // Inform the connecting client about existing viewers.
      presence.forEach((_, uid) => {
        safeSend(
          ws,
          JSON.stringify({ event: 'user.joined', taskId, userId: uid })
        );
      });
      set.add(ws);
      taskClients.set(taskId, set);

      if (ws.userId) {
        const count = presence.get(ws.userId) ?? 0;
        presence.set(ws.userId, count + 1);
        taskPresence.set(taskId, presence);
        if (count === 0) {
          broadcast(
            taskClients.get(taskId),
            JSON.stringify({ event: 'user.joined', taskId, userId: ws.userId })
          );
        }
      }
    });
  }
  ws.addEventListener('message', async (event) => {
    try {
      const data = JSON.parse(event.data.toString()) as {
        event?: string;
        taskId?: string;
      };
      const evt = data.event;
      if (ws.userId && evt) {
        if (isThrottled(ws.userId, evt) || !(await checkRateLimit(ws.userId, evt))) {
          notifyLimited(ws, evt);
          return;
        }
      }
      if (evt === 'comment.typing' && typeof data.taskId === 'string') {
        if (ws.taskIds?.includes(data.taskId) && ws.userId) {
          emitTyping({ taskId: data.taskId, userId: ws.userId }, ws);
        }
      } else if (evt === 'ping') {
        safeSend(ws, 'pong');
      }
    } catch {
      // ignore
    }
  });
  ws.addEventListener('close', () => {
    if (ws.userId) {
      const set = userClients.get(ws.userId);
      set?.delete(ws);
      if (set && set.size === 0) userClients.delete(ws.userId);
    }
    if (ws.taskIds) {
      ws.taskIds.forEach((taskId) => {
        const set = taskClients.get(taskId);
        set?.delete(ws);
        if (set && set.size === 0) taskClients.delete(taskId);
        if (ws.userId) {
          const presence = taskPresence.get(taskId);
          if (presence) {
            const count = presence.get(ws.userId) ?? 0;
            if (count <= 1) {
              presence.delete(ws.userId);
              if (presence.size === 0) taskPresence.delete(taskId);
              broadcast(
                taskClients.get(taskId),
                JSON.stringify({
                  event: 'user.left',
                  taskId,
                  userId: ws.userId,
})
              );
            } else {
              presence.set(ws.userId, count - 1);
            }
          }
        }
      });
    }
  });
}

function broadcast(
  set: Set<WebSocket> | undefined,
  message: string,
  exclude?: WebSocket
) {
  if (!set) return;
  set.forEach((ws) => {
    if (exclude && ws === exclude) return;
    if (!safeSend(ws, message)) {
      set.delete(ws);
    }
  });
}

export function emitTaskTransition(payload: TaskTransitionPayload) {
  const taskId = payload.taskId?.toString();
  const message = JSON.stringify({
    event: 'task.transitioned',
    taskId,
    patch: payload.patch,
    updatedAt: payload.updatedAt,
  });
  broadcast(taskClients.get(taskId), message);
}

export function emitTaskUpdated(payload: TaskUpdatedPayload) {
  const taskId = payload.taskId?.toString();
  const message = JSON.stringify({
    event: 'task.updated',
    taskId,
    patch: payload.patch,
    updatedAt: payload.updatedAt,
  });
  broadcast(taskClients.get(taskId), message);
}

export function emitCommentCreated(comment: CommentCreatedPayload) {
  const taskId = comment.taskId?.toString();
  const message = JSON.stringify({
    event: 'comment.created',
    taskId,
    comment,
  });
  broadcast(taskClients.get(taskId), message);
}

export function emitLoopUpdated(payload: LoopUpdatedPayload) {
  const taskId = payload.taskId?.toString();
  const message = JSON.stringify({
    event: 'loop.updated',
    taskId,
    patch: payload.patch,
    updatedAt: payload.updatedAt,
  });
  broadcast(taskClients.get(taskId), message);
}

export function emitNotification({ notification, userId }: NotificationCreatedPayload) {
  const message = JSON.stringify({
    event: 'notification.created',
    notification,
  });
  broadcast(userClients.get(userId), message);
}

export function emitPresence(payload: PresencePayload) {
  const taskId = payload.taskId?.toString();
  const message = JSON.stringify({
    event: 'presence',
    ...payload,
  });
  if (taskId) broadcast(taskClients.get(taskId), message);
}

export function emitTyping(payload: TypingPayload, exclude?: WebSocket) {
  const taskId = payload.taskId?.toString();
  const message = JSON.stringify({
    event: 'comment.typing',
    ...payload,
  });
  if (taskId) broadcast(taskClients.get(taskId), message, exclude);
}
