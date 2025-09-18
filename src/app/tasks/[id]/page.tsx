"use client";

import { use, useCallback, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import TaskDetail from "@/components/task-detail";
import StatusBadge from "@/components/status-badge";
import CommentThread from "@/components/comment-thread";
import type { TimelineEvent } from "@/components/timeline/timeline";
import Timeline from "@/components/timeline/timeline";
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

const TRANSITION_MAP: Record<TaskStatus, Record<string, TaskStatus>> = {
  OPEN: { START: 'IN_PROGRESS' },
  IN_PROGRESS: { SEND_FOR_REVIEW: 'IN_REVIEW' },
  IN_REVIEW: { REQUEST_CHANGES: 'REVISIONS', DONE: 'DONE' },
  REVISIONS: { SEND_FOR_REVIEW: 'IN_REVIEW' },
  FLOW_IN_PROGRESS: { DONE: 'DONE' },
  DONE: {},
};

const ownerSchema = z.object({ ownerId: z.string().min(1, 'Owner is required') });
const uploadSchema = z.object({
  file: z
    .custom<FileList>((v) => v instanceof FileList && v.length > 0, {
      message: 'File is required',
    }),
});

function createResolver<T>(schema: z.ZodSchema<T>) {
  return (values: unknown) => {
    const result = schema.safeParse(values);
    if (result.success) return { values: result.data, errors: {} };
      const errors = result.error.issues.reduce<Record<string, unknown>>(
        (acc, issue) => {
          const [firstPath] = issue.path;
          if (typeof firstPath === 'string') {
            acc[firstPath] = { type: issue.code, message: issue.message };
          }
          return acc;
        },
        {}
      );
    return { values: {}, errors };
  };
}

export default function TaskPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [task, setTask] = useState<Task | null>(null);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [history, setHistory] = useState<TimelineEvent[]>([]);
  const [userQuery, setUserQuery] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [ownerName, setOwnerName] = useState('');

  const {
    handleSubmit: submitOwner,
    setValue: setOwnerValue,
    formState: { errors: ownerErrors },
  } = useForm<{ ownerId: string }>({ resolver: createResolver(ownerSchema) });

  const {
    register: registerUpload,
    handleSubmit: submitUpload,
    reset: resetUpload,
    formState: { errors: uploadErrors },
  } = useForm<{ file: FileList }>({ resolver: createResolver(uploadSchema) });

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

  const onOwnerSubmit = async (
    { ownerId }: { ownerId: string },
    u: User
  ) => {
    if (!task) return;
    const previous = task;
    setTask({ ...task, ownerId });
    setOwnerName(u.name || u.email || '');
    setUserQuery('');
    setUsers([]);
    const res = await fetch(`/api/tasks/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ownerId }),
    });
    if (res.ok) {
      const updated = await res.json();
      setTask(updated);
    } else {
      setTask(previous);
    }
  };

  const handleOwnerSelect = (u: User) => {
    setOwnerValue('ownerId', u._id, { shouldValidate: true });
    void submitOwner((data) => onOwnerSubmit(data, u))();
  };

  const handleTransition = async (action: string) => {
    if (!task) return;
    const previous = task;
    const predicted = TRANSITION_MAP[task.status]?.[action] ?? task.status;
    setTask({ ...task, status: predicted });
    const res = await fetch(`/api/tasks/${id}/transition`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action }),
    });
    if (res.ok) {
      const updated = await res.json();
      setTask(updated);
    } else {
      setTask(previous);
    }
  };

  const onUploadSubmit = async ({ file }: { file: FileList }) => {
    const f = file.item(0);
    if (!f) return;
    const tempId = `temp-${Date.now()}`;
    const tempAtt = { _id: tempId, filename: f.name, url: URL.createObjectURL(f) };
    setAttachments((prev) => [tempAtt, ...prev]);
    const formData = new FormData();
    formData.append('file', f);
    const res = await fetch(`/api/tasks/${id}/attachments`, {
      method: 'POST',
      body: formData,
    });
    if (res.ok) {
      const att = await res.json();
      setAttachments((prev) =>
        prev.map((a) => (a._id === tempId ? att : a))
      );
    } else {
      setAttachments((prev) => prev.filter((a) => a._id !== tempId));
    }
    resetUpload();
  };

  const handleDelete = async (attachmentId: string) => {
    const previous = attachments;
    setAttachments((prev) => prev.filter((a) => a._id !== attachmentId));
    const res = await fetch(`/api/tasks/${id}/attachments?id=${attachmentId}`, {
      method: 'DELETE',
    });
    if (!res.ok) {
      setAttachments(previous);
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
            {ownerErrors.ownerId ? (
              <span className="text-xs text-red-600">
                {ownerErrors.ownerId.message}
              </span>
            ) : null}
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
          <form onSubmit={submitUpload(onUploadSubmit)} className="flex flex-col gap-2">
            <input type="file" {...registerUpload('file')} />
            {uploadErrors.file ? (
              <span className="text-xs text-red-600">
                {uploadErrors.file.message as string}
              </span>
            ) : null}
            <button type="submit" className="border rounded px-2 py-1 text-sm">
              Upload
            </button>
          </form>
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

