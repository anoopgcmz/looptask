"use client";

import { useCallback, useEffect, useState, type ChangeEvent } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import TaskDetail from "@/components/task-detail";
import StatusBadge from "@/components/status-badge";
import CommentThread from "@/components/comment-thread";
import Timeline, { TimelineEvent } from "@/components/timeline/timeline";
import DeleteTaskModal from '@/components/delete-task-modal';
import type { TaskStatus } from '@/models/Task';

interface Task {
  _id: string;
  title: string;
  status: TaskStatus;
  ownerId?: string;
}

interface Attachment {
  _id: string;
  filename: string;
  url: string;
}

interface User {
  _id: string;
  name?: string;
  email?: string;
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
  const router = useRouter();
  const [task, setTask] = useState<Task | null>(null);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [history, setHistory] = useState<TimelineEvent[]>([]);
  const [userQuery, setUserQuery] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [ownerName, setOwnerName] = useState('');

  const load = useCallback(async () => {
    const res = await fetch(`/api/tasks/${id}`);
    if (res.ok) setTask(await res.json());
  }, [id]);

  const loadAttachments = useCallback(async () => {
    const res = await fetch(`/api/tasks/${id}/attachments`);
    if (res.ok) setAttachments(await res.json());
  }, [id]);

  const loadHistory = useCallback(async () => {
    const res = await fetch(`/api/tasks/${id}/history`);
    if (res.ok) setHistory(await res.json());
  }, [id]);

  useEffect(() => {
    void load();
    void loadAttachments();
    void loadHistory();
  }, [load, loadAttachments, loadHistory]);

  useEffect(() => {
    if (!task?.ownerId) return;
    const loadOwner = async () => {
      const res = await fetch(`/api/users/${task.ownerId}`);
      if (res.ok) {
        const u = await res.json();
        setOwnerName(u.name || u.email || '');
      }
    };
    void loadOwner();
  }, [task?.ownerId]);

  useEffect(() => {
    const loadUsers = async () => {
      const q = userQuery.trim();
      if (!q) {
        setUsers([]);
        return;
      }
      const res = await fetch(`/api/users?q=${encodeURIComponent(q)}`);
      if (res.ok) setUsers(await res.json());
    };
    void loadUsers();
  }, [userQuery]);

  const handleOwnerSelect = async (u: User) => {
    if (!task) return;
    const previous = task;
    setTask({ ...task, ownerId: u._id });
    setOwnerName(u.name || u.email || '');
    setUserQuery('');
    setUsers([]);
    const res = await fetch(`/api/tasks/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ownerId: u._id }),
    });
    if (res.ok) {
      const updated = await res.json();
      setTask(updated);
    } else {
      setTask(previous);
    }
  };

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

  const deleteTask = async () => {
    const res = await fetch(`/api/tasks/${id}`, { method: 'DELETE' });
    if (res.ok) {
      router.push('/tasks');
    }
  };

  if (!task) return <div>Loading...</div>;
  const actions = ACTIONS[task.status];

  return (
    <div className="p-4">
      <Link
        href="/tasks"
        className="text-blue-500 underline mb-4 inline-block"
      >
        &larr; Back to Tasks
      </Link>
        <div className="flex gap-8">
          <div className="flex-1 flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-semibold">{task.title}</h1>
              <StatusBadge status={task.status} />
            </div>
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
          <DeleteTaskModal onConfirm={deleteTask}>
            <button className="border rounded px-2 py-1 text-sm text-red-600">
              Delete Task
            </button>
          </DeleteTaskModal>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm">Owner:</span>
          <div className="relative flex-1">
            <input
              className="border rounded px-2 py-1 text-sm w-full"
              value={userQuery}
              onChange={(e) => setUserQuery(e.target.value)}
              placeholder={ownerName || 'Search users'}
            />
            {users.length ? (
              <ul className="absolute z-10 bg-white border mt-1 w-full max-h-40 overflow-auto">
                {users.map((u) => (
                  <li
                    key={u._id}
                    className="p-1 cursor-pointer hover:bg-gray-100"
                    onClick={() => void handleOwnerSelect(u)}
                  >
                    {u.name || u.email}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        </div>
        <TaskDetail key={task.ownerId} id={id} />
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
      <aside className="w-64">
        <Timeline events={history} />
      </aside>
    </div>
  </div>
  );
}

