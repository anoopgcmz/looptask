const clients = new Set<WebSocket>();

export function addClient(ws: WebSocket) {
  clients.add(ws);
  ws.addEventListener('close', () => clients.delete(ws));
}

export function emitTaskTransition(task: any) {
  const message = JSON.stringify({
    event: 'task.transitioned',
    taskId: task._id?.toString(),
    task,
  });
  clients.forEach((ws) => {
    try {
      ws.send(message);
    } catch {
      clients.delete(ws);
    }
  });
}

export function emitCommentCreated(comment: any) {
  const message = JSON.stringify({
    event: 'comment.created',
    taskId: comment.taskId?.toString(),
    comment,
  });
  clients.forEach((ws) => {
    try {
      ws.send(message);
    } catch {
      clients.delete(ws);
    }
  });
}
