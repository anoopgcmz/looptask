"use client";

import { useCallback, useEffect, useState, type ChangeEvent } from 'react';
import TaskDetail from "@/components/task-detail";
import StatusBadge from "@/components/status-badge";
import CommentThread from "@/components/comment-thread";
import type { TaskStatus } from '@/models/Task';

interface Task {
  _id: string;
  title: string;
  status: TaskStatus;
}

interface Attachment {
  _id: string;
  filename: string;
  url: string;
}

const ACTIONS: Record<TaskStatus, { action: string; label: string }[]> = {
  OPEN: [{ action: 'START', label: 'Start' }],
  IN_PROGRESS: [{ action: 'SEND_FOR_REVIEW', label: 'Send for Review' }],
  IN_REVIEW: [
    { action: 'REQUEST_CHANGES', label: 'Request Changes' },
    { action: 'DONE', label: 'Mark Done' },
  ],
  REVISIONS: [{ action: 'SEND_FOR_REVIEW', label: 'Send for Review' }],
  FLOW_IN_PROGRESS: [{ action: 'DONE', label: 'Mark Done' }],
  DONE: [],
};

export default function TaskPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const [task, setTask] = useState<Task | null>(null);
  const [attachments, setAttachments] = useState<Attachment[]>([]);

  const load = useCallback(async () => {
    const res = await fetch(`/api/tasks/${id}`);
    if (res.ok) setTask(await res.json());
  }, [id]);

  const loadAttachments = useCallback(async () => {
    const res = await fetch(`/api/tasks/${id}/attachments`);
    if (res.ok) setAttachments(await res.json());
  }, [id]);

  useEffect(() => {
    void load();
    void loadAttachments();
  }, [load, loadAttachments]);

  const handleTransition = async (action: string) => {
    const res = await fetch(`/api/tasks/${id}/transition`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    });
    if (res.ok) {
      const updated = await res.json();
      setTask(updated);
    }
  };

  const handleUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`/api/tasks/${id}/attachments`, {
      method: 'POST',
      body: formData,
    });
    if (res.ok) {
      const att = await res.json();
      setAttachments((prev) => [att, ...prev]);
      e.target.value = '';
    }
  };

  const handleDelete = async (attachmentId: string) => {
    const res = await fetch(`/api/tasks/${id}/attachments?id=${attachmentId}`, {
      method: 'DELETE',
    });
    if (res.ok) {
      setAttachments((prev) => prev.filter((a) => a._id !== attachmentId));
    }
  };

  if (!task) return <div>Loading...</div>;
  const actions = ACTIONS[task.status];

  return (
    <div className="p-4 flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <h1 className="text-xl font-semibold">{task.title}</h1>
        <StatusBadge status={task.status} />
      </div>
      {actions.length ? (
        <div className="flex gap-2">
          {actions.map((a) => (
            <button
              key={a.action}
              onClick={() => void handleTransition(a.action)}
              className="border rounded px-2 py-1 text-sm"
            >
              {a.label}
            </button>
          ))}
        </div>
      ) : null}
      <TaskDetail id={id} />
      <div className="flex flex-col gap-2">
        <h2 className="font-semibold">Attachments</h2>
        <input type="file" onChange={(e) => void handleUpload(e)} />
        <ul className="list-disc pl-4">
          {attachments.map((a) => (
            <li key={a._id} className="flex items-center gap-2">
              <a href={a.url} target="_blank" rel="noreferrer" className="underline">
                {a.filename}
              </a>
              <button
                onClick={() => void handleDelete(a._id)}
                className="text-xs text-red-600"
              >
                delete
              </button>
            </li>
          ))}
        </ul>
      </div>
      <CommentThread taskId={id} />
    </div>
  );
}

