interface MetaWebSocket extends WebSocket {
  userId?: string;
  organizationId?: string;
  taskIds?: string[];
}

const userClients = new Map<string, Set<WebSocket>>();
const taskClients = new Map<string, Set<WebSocket>>();

export function addClient(ws: MetaWebSocket) {
  if (ws.userId) {
    const set = userClients.get(ws.userId) ?? new Set<WebSocket>();
    set.add(ws);
    userClients.set(ws.userId, set);
  }
  if (ws.taskIds) {
    ws.taskIds.forEach((taskId) => {
      const set = taskClients.get(taskId) ?? new Set<WebSocket>();
      set.add(ws);
      taskClients.set(taskId, set);
    });
  }
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
      });
    }
  });
}

function broadcast(set: Set<WebSocket> | undefined, message: string) {
  if (!set) return;
  set.forEach((ws) => {
    try {
      ws.send(message);
    } catch {
      set.delete(ws);
    }
  });
}

export function emitTaskTransition(task: any) {
  const taskId = task._id?.toString();
  const message = JSON.stringify({
    event: 'task.transitioned',
    taskId,
    task,
  });
  broadcast(taskClients.get(taskId), message);
}

export function emitTaskUpdated(task: any) {
  const taskId = task._id?.toString();
  const message = JSON.stringify({
    event: 'task.updated',
    taskId,
    task,
  });
  broadcast(taskClients.get(taskId), message);
}

export function emitCommentCreated(comment: any) {
  const taskId = comment.taskId?.toString();
  const message = JSON.stringify({
    event: 'comment.created',
    taskId,
    comment,
  });
  broadcast(taskClients.get(taskId), message);
}

export function emitLoopUpdated(payload: { taskId: any; loop: any }) {
  const taskId = payload.taskId?.toString();
  const message = JSON.stringify({
    event: 'loop.updated',
    taskId,
    loop: payload.loop,
  });
  broadcast(taskClients.get(taskId), message);
}

export function emitNotification(notification: any, userId: string) {
  const message = JSON.stringify({
    event: 'notification.created',
    notification,
  });
  broadcast(userClients.get(userId), message);
}

export function emitPresence(payload: any) {
  const taskId = payload.taskId?.toString();
  const message = JSON.stringify({
    event: 'presence',
    ...payload,
  });
  if (taskId) broadcast(taskClients.get(taskId), message);
}

export function emitTyping(payload: any) {
  const taskId = payload.taskId?.toString();
  const message = JSON.stringify({
    event: 'typing',
    ...payload,
  });
  if (taskId) broadcast(taskClients.get(taskId), message);
}
