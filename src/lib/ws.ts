interface MetaWebSocket extends WebSocket {
  userId?: string;
  organizationId?: string;
  taskIds?: string[];
}

const userClients = new Map<string, Set<WebSocket>>();
const taskClients = new Map<string, Set<WebSocket>>();
// Track which users are present in each task. Value is a map of userId to
// number of active connections so we only emit `user.left` when the last
// connection closes.
const taskPresence = new Map<string, Map<string, number>>();

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
        ws.send(
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
  ws.addEventListener('message', (event) => {
    try {
      const data = JSON.parse(event.data.toString());
      if (data.event === 'comment.typing' && data.taskId) {
        if (ws.taskIds?.includes(data.taskId) && ws.userId) {
          emitTyping({ taskId: data.taskId, userId: ws.userId }, ws);
        }
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

export function emitTyping(payload: any, exclude?: WebSocket) {
  const taskId = payload.taskId?.toString();
  const message = JSON.stringify({
    event: 'comment.typing',
    ...payload,
  });
  if (taskId) broadcast(taskClients.get(taskId), message, exclude);
}
