"use client";

import { use, useCallback, useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { SessionProvider } from 'next-auth/react';
import useAuth from '@/hooks/useAuth';
import { isRealtimeMessage } from '@/hooks/useRealtime';
import TaskDetail from "@/components/task-detail";
import StatusBadge from "@/components/status-badge";
import CommentThread from "@/components/comment-thread";
import type { TimelineEvent } from "@/components/timeline/timeline";
import Timeline from "@/components/timeline/timeline";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import DeleteTaskModal from '@/components/delete-task-modal';
import type { TaskStatus } from '@/models/Task';
import { Button } from '@/components/ui/button';
import type { TaskStep } from '@/types/api/task';

interface Task {
  _id: string;
  title: string;
  status: TaskStatus;
  ownerId?: string;
  createdBy?: string;
  steps?: TaskStep[];
  currentStepIndex?: number;
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

function TaskPageContent({ id }: { id: string }) {
  const router = useRouter();
  const { user, isLoading, status } = useAuth();
  const [task, setTask] = useState<Task | null>(null);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [history, setHistory] = useState<TimelineEvent[]>([]);
  const [userQuery, setUserQuery] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [ownerName, setOwnerName] = useState('');
  const [stepOwners, setStepOwners] = useState<Record<string, { name?: string; email?: string }>>({});
  const [stepUpdating, setStepUpdating] = useState<number | null>(null);

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
    if (typeof window === 'undefined') return;
    const url = `${window.location.origin.replace(/^http/, 'ws')}/api/ws?taskId=${id}`;
    const ws = new WebSocket(url);
    const handleMessage = (event: MessageEvent) => {
      try {
        const data: unknown = JSON.parse(event.data);
        if (!isRealtimeMessage(data) || data.taskId !== id) return;
        if (
          data.event === 'task.updated' ||
          data.event === 'task.transitioned' ||
          data.event === 'comment.created'
        ) {
          void loadHistory();
        }
      } catch {
        // ignore malformed events
      }
    };
    ws.addEventListener('message', handleMessage);
    return () => {
      ws.removeEventListener('message', handleMessage);
      ws.close();
    };
  }, [id, loadHistory]);

  useEffect(() => {
    if (status !== 'authenticated') return;
    void load();
    void loadAttachments();
    void loadHistory();
  }, [load, loadAttachments, loadHistory, status]);

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
    if (!task?.steps?.length) {
      setStepOwners({});
      return;
    }
    const ids = Array.from(
      new Set(
        task.steps
          .map((step) => step.ownerId)
          .filter((value): value is string => Boolean(value))
      )
    );
    if (!ids.length) {
      setStepOwners({});
      return;
    }
    const loadOwners = async () => {
      try {
        const res = await fetch(
          `/api/users?${ids.map((ownerId) => `id=${encodeURIComponent(ownerId)}`).join('&')}`
        );
        if (!res.ok) return;
        const data: unknown = await res.json();
        const next: Record<string, { name?: string; email?: string }> = {};
        const pushEntry = (entry: unknown) => {
          if (!entry || typeof entry !== 'object') return;
          const record = entry as { _id?: unknown; name?: unknown; email?: unknown };
          if (typeof record._id !== 'string') return;
          const name =
            typeof record.name === 'string' && record.name.trim().length
              ? record.name
              : undefined;
          const email =
            typeof record.email === 'string' && record.email.trim().length
              ? record.email
              : undefined;
          next[record._id] = { name, email };
        };
        if (Array.isArray(data)) {
          data.forEach(pushEntry);
        } else if (data && typeof data === 'object') {
          Object.values(data as Record<string, unknown>).forEach(pushEntry);
        }
        setStepOwners(next);
      } catch {
        // ignore failures
      }
    };
    void loadOwners();
  }, [task?.steps]);

  const canEdit = useMemo(() => {
    if (!user?.userId || !task) return false;
    if (user.role === 'ADMIN') return true;
    return user.userId === task.createdBy || user.userId === task.ownerId;
  }, [task, user?.role, user?.userId]);

  useEffect(() => {
    if (status === 'unauthenticated' && !isLoading) {
      router.push('/login');
    }
  }, [isLoading, router, status]);

  useEffect(() => {
    if (!canEdit) {
      setUsers([]);
      return;
    }
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
  }, [userQuery, canEdit]);

  if (isLoading && status === 'loading') {
    return <div className="p-4">Loading task…</div>;
  }

  if (status === 'unauthenticated') {
    return null;
  }

  const onOwnerSubmit = async (
    { ownerId }: { ownerId: string },
    u: User
  ) => {
    if (!task || !canEdit) return;
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
      void loadHistory();
    } else {
      setTask(previous);
    }
  };

  const handleOwnerSelect = (u: User) => {
    if (!canEdit) return;
    setOwnerValue('ownerId', u._id, { shouldValidate: true });
    void submitOwner((data) => onOwnerSubmit(data, u))();
  };

  const handleTransition = async (action: string) => {
    if (!task || !canEdit) return;
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
      void loadHistory();
    } else {
      setTask(previous);
    }
  };

  const handleStepStatusChange = async (
    index: number,
    nextStatus: 'IN_PROGRESS' | 'DONE'
  ) => {
    if (!task) return;
    const step = task.steps?.[index];
    const isStepOwner = Boolean(step?.ownerId) && step?.ownerId === user?.userId;
    if (!(canEdit || isStepOwner)) return;
    setStepUpdating(index);
    try {
      const res = await fetch(`/api/tasks/${id}/transition`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: nextStatus === 'IN_PROGRESS' ? 'START' : 'DONE' }),
      });
      if (res.ok) {
        const updated = await res.json();
        setTask(updated);
        void loadHistory();
      }
    } finally {
      setStepUpdating(null);
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
    if (!canEdit) return;
    const res = await fetch(`/api/tasks/${id}`, { method: 'DELETE' });
    if (res.ok) {
      router.push('/tasks');
    }
  };

  if (!task) return <div>Loading...</div>;
  const actions = task.steps?.length ? [] : ACTIONS[task.status];
  const hasRemainingSteps = task.steps?.some((s) => s.status !== 'DONE') ?? false;
  const activeStepIndex = hasRemainingSteps ? task.currentStepIndex ?? 0 : -1;

  return (
    <div className="min-h-screen bg-[#F9FAFB]">
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col px-4 pb-12 pt-6 lg:px-8">
        <Link
          href="/tasks"
          className="mb-4 inline-flex items-center text-sm font-medium text-[#4F46E5] transition hover:text-[#4338CA]"
        >
          &larr; Back to Tasks
        </Link>
        <div className="sticky top-0 z-20 -mx-4 -mt-2 border-b border-gray-200 bg-[#F9FAFB]/80 px-4 py-4 backdrop-blur supports-[backdrop-filter]:bg-[#F9FAFB]/60 lg:-mx-8 lg:px-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-semibold text-[#111827]">{task.title}</h1>
              <StatusBadge status={task.status} />
            </div>
            {canEdit ? (
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push(`/tasks/${id}/edit`)}
                >
                  Edit Task
                </Button>
                {actions.map((a, index) => (
                  <Button
                    key={a.action}
                    onClick={() => void handleTransition(a.action)}
                    variant={index === 0 ? 'default' : 'outline'}
                  >
                    {a.label}
                  </Button>
                ))}
                <DeleteTaskModal onConfirm={deleteTask}>
                  <Button
                    type="button"
                    variant="outline"
                    className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                  >
                    Delete Task
                  </Button>
                </DeleteTaskModal>
              </div>
            ) : null}
          </div>
        </div>
        <div className="mt-6 flex flex-1 flex-col gap-6">
          <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-[#111827]">Task Information</h2>
            </div>
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <span className="text-sm font-medium text-[#374151]">Owner</span>
                {canEdit ? (
                  <div className="relative">
                    <input
                      className="h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-[#111827] placeholder:text-[#9CA3AF] focus:border-[#4F46E5] focus:outline-none focus:ring-2 focus:ring-[#4F46E5]/30"
                      value={userQuery}
                      onChange={(e) => setUserQuery(e.target.value)}
                      placeholder={ownerName || 'Search users'}
                    />
                    {ownerErrors.ownerId ? (
                      <span className="mt-1 block text-xs text-red-600">
                        {ownerErrors.ownerId.message}
                      </span>
                    ) : null}
                    {users.length ? (
                      <ul className="absolute z-10 mt-2 max-h-48 w-full overflow-auto rounded-lg border border-gray-200 bg-white shadow-lg">
                        {users.map((u) => (
                          <li
                            key={u._id}
                            className="cursor-pointer px-3 py-2 text-sm text-[#111827] hover:bg-[#EEF2FF]"
                            onClick={() => void handleOwnerSelect(u)}
                          >
                            {u.name || u.email}
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                ) : (
                  <span className="rounded-full bg-[#EEF2FF] px-3 py-1 text-sm font-medium text-[#4338CA]">
                    {ownerName || 'Unassigned'}
                  </span>
                )}
              </div>
            </div>
          </section>
          <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-[#111827]">Task Details</h2>
            <div className="mt-4">
              <TaskDetail
                key={task.ownerId}
                id={id}
                canEdit={canEdit}
                readOnly
                showLoopTasks={false}
              />
            </div>
          </section>
          <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-[#111827]">Step Progress</h2>
            <div className="mt-4 flex flex-col gap-3">
              {task.steps?.length ? (
                task.steps.map((step, idx) => {
                  const ownerInfo = stepOwners[step.ownerId];
                  const ownerLabel = ownerInfo?.name || ownerInfo?.email || 'Unassigned';
                  const isActive = activeStepIndex === idx && step.status !== 'DONE';
                  const waitingOnPrevious = activeStepIndex >= 0 && idx > activeStepIndex;
                  const isStepOwner = Boolean(step.ownerId) && step.ownerId === user?.userId;
                  const canModify =
                    stepUpdating === null &&
                    isActive &&
                    (canEdit || isStepOwner);

                  const handleChange = (value: string) => {
                    if (value === step.status) return;
                    if (value === 'IN_PROGRESS' || value === 'DONE') {
                      void handleStepStatusChange(idx, value as 'IN_PROGRESS' | 'DONE');
                    }
                  };

                  return (
                    <div
                      key={`${step.ownerId}-${idx}`}
                      className="rounded-lg border border-gray-200 bg-gray-50 p-4"
                    >
                      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <div>
                          <p className="text-sm font-medium text-[#111827]">
                            {step.title || `Step ${idx + 1}`}
                          </p>
                          <p className="text-xs text-[#6B7280]">
                            Assigned to {ownerLabel}
                            {isActive
                              ? ' • Active'
                              : step.status === 'DONE'
                                ? ' • Completed'
                                : ''}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold uppercase tracking-wide text-[#6B7280]">
                            Status
                          </span>
                          <select
                            className="h-9 rounded-md border border-gray-300 bg-white px-3 text-sm text-[#111827] focus:border-[#4F46E5] focus:outline-none focus:ring-2 focus:ring-[#4F46E5]/30 disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-[#9CA3AF]"
                            value={step.status}
                            onChange={(event) => handleChange(event.target.value)}
                            disabled={!canModify}
                          >
                            <option value="OPEN">Open</option>
                            <option value="IN_PROGRESS" disabled={step.status === 'DONE'}>
                              In Progress
                            </option>
                            <option value="DONE" disabled={step.status === 'OPEN'}>
                              Done
                            </option>
                          </select>
                        </div>
                      </div>
                      {waitingOnPrevious ? (
                        <p className="mt-2 text-xs text-[#6B7280]">
                          Waiting for the previous step to be completed.
                        </p>
                      ) : null}
                      {isActive && step.status === 'OPEN' && canEdit ? (
                        <p className="mt-2 text-xs text-[#6B7280]">
                          Start this step when you&apos;re ready to work on it.
                        </p>
                      ) : null}
                    </div>
                  );
                })
              ) : (
                <p className="text-sm text-[#6B7280]">No steps defined for this task.</p>
              )}
            </div>
          </section>
          <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-[#111827]">Collaboration</h2>
            </div>
            <Tabs defaultValue="activity" className="mt-4">
              <TabsList className="flex w-full gap-2 border-b border-gray-200">
                <TabsTrigger
                  value="activity"
                  className="rounded-t-lg px-3 py-2 text-sm font-medium text-[#6B7280] data-[state=active]:bg-white data-[state=active]:text-[#4F46E5]"
                >
                  Activity
                </TabsTrigger>
                <TabsTrigger
                  value="comments"
                  className="rounded-t-lg px-3 py-2 text-sm font-medium text-[#6B7280] data-[state=active]:bg-white data-[state=active]:text-[#4F46E5]"
                >
                  Comments
                </TabsTrigger>
              </TabsList>
              <TabsContent value="activity" className="mt-4">
                <Timeline events={history} />
              </TabsContent>
              <TabsContent value="comments" className="mt-4">
                <CommentThread taskId={id} />
              </TabsContent>
            </Tabs>
          </section>
          <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-[#111827]">Attachments</h2>
            <div className="mt-4 flex flex-col gap-4">
              {canEdit ? (
                <form onSubmit={submitUpload(onUploadSubmit)} className="flex flex-col gap-3 rounded-lg border border-dashed border-[#C7D2FE] bg-[#EEF2FF]/40 p-4">
                  <label className="text-sm font-medium text-[#4338CA]">
                    Upload new file
                    <input
                      type="file"
                      {...registerUpload('file')}
                      className="mt-2 block w-full text-sm text-[#4B5563]"
                    />
                  </label>
                  {uploadErrors.file ? (
                    <span className="text-xs text-red-600">
                      {uploadErrors.file.message as string}
                    </span>
                  ) : null}
                  <div className="flex justify-end">
                    <Button type="submit">Upload</Button>
                  </div>
                </form>
              ) : null}
              <ul className="flex flex-col gap-3">
                {attachments.map((a) => (
                  <li
                    key={a._id}
                    className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-[#111827]"
                  >
                    <a
                      href={a.url}
                      target="_blank"
                      rel="noreferrer"
                      className="font-medium text-[#4F46E5] hover:text-[#4338CA]"
                    >
                      {a.filename}
                    </a>
                    {canEdit ? (
                      <button
                        onClick={() => void handleDelete(a._id)}
                        className="text-xs font-medium text-red-600 hover:text-red-700"
                      >
                        Remove
                      </button>
                    ) : null}
                  </li>
                ))}
                {!attachments.length ? (
                  <li className="rounded-lg border border-dashed border-gray-200 bg-gray-50 px-4 py-6 text-center text-sm text-[#6B7280]">
                    No attachments yet.
                  </li>
                ) : null}
              </ul>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

export default function TaskPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  return (
    <SessionProvider>
      <TaskPageContent id={id} />
    </SessionProvider>
  );
}

