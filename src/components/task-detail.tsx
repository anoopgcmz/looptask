"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { openLoopBuilder } from "@/lib/loopBuilder";
import LoopVisualizer, { type StepWithStatus, type UserMap } from "@/components/loop-visualizer";
import LoopProgress from "@/components/loop-progress";
import useRealtime, { type RealtimeMessage } from "@/hooks/useRealtime";
import usePresence from "@/hooks/usePresence";
import { Avatar } from "@/components/ui/avatar";
import useAuth from "@/hooks/useAuth";

interface TaskStep {
  title?: string;
  ownerId?: string;
  description?: string;
  dueAt?: string;
  status?: 'OPEN' | 'DONE';
  completedAt?: string;
}

type TaskUser = {
  _id: string;
  name: string;
  avatar?: string;
};

interface Task {
  title?: string;
  description?: string;
  ownerId?: string;
  dueDate?: string;
  priority?: string;
  tags?: string[];
  status?: string;
  updatedAt?: string;
  createdBy?: string;
  steps?: TaskStep[];
}

interface LoopStep {
  assignedTo?: string;
  description: string;
  estimatedTime?: number;
  dependencies?: string[];
  comments?: string;
  status: 'PENDING' | 'ACTIVE' | 'COMPLETED' | 'BLOCKED';
}

interface TaskLoop {
  sequence: LoopStep[];
  currentStep: number;
  parallel?: boolean;
  updatedAt?: string;
}

export default function TaskDetail({
  id,
  canEdit: canEditProp,
  readOnly = false,
}: {
  id: string;
  canEdit?: boolean;
  readOnly?: boolean;
}) {
  const [task, setTask] = useState<Task | null>(null);
  const [loop, setLoop] = useState<TaskLoop | null>(null);
  const [users, setUsers] = useState<UserMap>({});
  const [loopLoading, setLoopLoading] = useState(true);
  const [taskVersion, setTaskVersion] = useState(0);
  const [loopVersion, setLoopVersion] = useState(0);
  const viewers = usePresence(id);
  const { user } = useAuth();

  const loadUsers = useCallback(async (ids: (string | undefined)[]) => {
    const uniqueIds = Array.from(
      new Set(ids.filter((value): value is string => typeof value === "string" && value.length > 0))
    );
    if (!uniqueIds.length) return;

    const query = uniqueIds.map((userId) => `id=${encodeURIComponent(userId)}`).join('&');
    try {
      const userRes = await fetch(`/api/users?${query}`, { credentials: 'include' });
      if (!userRes.ok) return;

      const userJson: unknown = await userRes.json();
      const map: UserMap = {};
      const assignUser = (raw: unknown) => {
        if (!raw || typeof raw !== "object" || !("_id" in raw)) return;
        const candidate = raw as { _id: unknown; name?: unknown; avatar?: unknown };
        if (typeof candidate._id !== "string") return;
        const normalized: TaskUser = {
          _id: candidate._id,
          name:
            typeof candidate.name === "string" && candidate.name.length
              ? candidate.name
              : "Unknown user",
          avatar: typeof candidate.avatar === "string" ? candidate.avatar : undefined,
        };
        map[normalized._id] = normalized;
      };

      if (Array.isArray(userJson)) {
        userJson.forEach(assignUser);
      } else if (userJson && typeof userJson === "object") {
        Object.values(userJson).forEach(assignUser);
      }

      if (Object.keys(map).length) {
        setUsers((prev) => ({ ...prev, ...map }));
      }
    } catch {
      // Ignore user lookup failures; steps can still render without names.
    }
  }, []);

  const refreshTask = useCallback(async () => {
    const res = await fetch(`/api/tasks/${id}`);
    if (res.ok) {
      const json: unknown = await res.json();
      if (json && typeof json === "object" && "updatedAt" in json) {
        const taskData = json as Task;
        setTask(taskData);
        setTaskVersion(new Date(taskData.updatedAt).getTime());
        const stepOwnerIds = (taskData.steps ?? []).map((step) => step.ownerId);
        void loadUsers(stepOwnerIds);
      }
    }
  }, [id, loadUsers]);

  const refreshLoop = useCallback(async () => {
    setLoopLoading(true);
    try {
    const res = await fetch(`/api/tasks/${id}/loop`);
    if (res.ok) {
      const json: unknown = await res.json();
      if (json && typeof json === "object" && "updatedAt" in json) {
        const loopData = json as TaskLoop;
        setLoop(loopData);
        setLoopVersion(new Date(loopData.updatedAt).getTime());

        const ids = (loopData.sequence ?? [])
          .map((s: LoopStep) => s.assignedTo)
          .filter((value): value is string => typeof value === "string" && value.length > 0);
        void loadUsers(ids);
      } else {
        setLoop(null);
      }
    } else {
      setLoop(null);
    }
  } finally {
    setLoopLoading(false);
  }
}, [id, loadUsers]);

  useEffect(() => {
    void refreshTask();
  }, [refreshTask]);

  useEffect(() => {
    void refreshLoop();
  }, [refreshLoop]);

  const handleMessage = useCallback(
    (data: RealtimeMessage) => {
      if (data.taskId !== id) return;
      switch (data.event) {
        case "task.updated":
        case "task.transitioned":
          if (!data.updatedAt) return;
          const tver = new Date(data.updatedAt).getTime();
          if (tver > taskVersion) {
            setTask((prev) =>
              prev ? { ...prev, ...data.patch, updatedAt: data.updatedAt } : { ...data.patch, updatedAt: data.updatedAt }
            );
            setTaskVersion(tver);
            if (data.patch && typeof data.patch === "object" && "steps" in data.patch) {
              const stepsPatch = (data.patch as { steps?: TaskStep[] }).steps;
              if (Array.isArray(stepsPatch)) {
                const owners = stepsPatch.map((step) => step?.ownerId);
                void loadUsers(owners);
              }
            }
          }
          break;
        case "loop.updated":
          if (!data.updatedAt) return;
          const lver = new Date(data.updatedAt).getTime();
          if (lver > loopVersion) {
            setLoop((prev) => {
              if (!prev || !data.patch) {
                return { ...(data.patch || {}), updatedAt: data.updatedAt } as TaskLoop;
              }
              const next: TaskLoop = { ...prev };
              if (Array.isArray(data.patch.sequence)) {
                const seq = [...prev.sequence];
                if (data.patch.sequence.every((s: unknown) => typeof s.index === "number")) {
                  data.patch.sequence.forEach((s: unknown) => {
                    seq[s.index] = { ...seq[s.index], ...s };
                  });
                  next.sequence = seq;
                } else {
                  next.sequence = data.patch.sequence as unknown;
                }
              }
              if (data.patch.parallel !== undefined) next.parallel = data.patch.parallel;
              const updatedLoop = { ...next, updatedAt: data.updatedAt };
              const assignedIds = Array.isArray(updatedLoop.sequence)
                ? updatedLoop.sequence
                    .map((step) => step?.assignedTo)
                    .filter((value): value is string => typeof value === "string" && value.length > 0)
                : [];
              if (assignedIds.length) {
                void loadUsers(assignedIds);
              }
              return updatedLoop;
            });
            setLoopVersion(lver);
          }
          break;
        default:
          break;
      }
    },
    [id, taskVersion, loopVersion, loadUsers]
  );
  useRealtime({ onMessage: handleMessage });

  const canEdit = useMemo(() => {
    if (typeof canEditProp === "boolean") return canEditProp;
    if (!user?.userId || !task) return false;
    return user.userId === task.createdBy || user.userId === task.ownerId;
  }, [canEditProp, task, user?.userId]);

  const fieldsEditable = canEdit && !readOnly;

  const updateField = async (field: keyof Task, value: string) => {
    if (!task || !fieldsEditable) return;
    await fetch(`/api/tasks/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [field]: value }),
    });
    setTask({ ...task, [field]: value });
  };

  const priorityOptions = ["LOW", "MEDIUM", "HIGH"] as const;

  const handlePriorityChange = async (value: string) => {
    if (!task || !fieldsEditable) return;
    if (!priorityOptions.includes(value as (typeof priorityOptions)[number])) return;
    if (task.priority === value) return;

    const previousPriority = task.priority;

    setTask((prev) => (prev ? { ...prev, priority: value } : prev));

    try {
      const res = await fetch(`/api/tasks/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priority: value }),
      });

      if (!res.ok) {
        throw new Error("Failed to update priority");
      }
    } catch {
      setTask((prev) => (prev ? { ...prev, priority: previousPriority } : prev));
    }
  };

  if (!task) {
    return <div>Loading...</div>;
  }

  return (
    <div className="p-4 flex flex-col gap-4">
      <Card className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            Task Title
          </label>
          {fieldsEditable ? (
            <Input
              className="flex-1 border-[#E5E7EB] bg-white text-base placeholder:text-gray-400 focus:border-[#4F46E5] focus:ring-[#4F46E5]"
              value={task.title ?? ""}
              onChange={(e) => setTask({ ...task, title: e.target.value })}
              onBlur={(e) => void updateField("title", e.target.value)}
              placeholder="Add a task title"
            />
          ) : (
            <p className="text-base font-medium text-gray-900">
              {task.title?.trim() ? task.title : "Untitled task"}
            </p>
          )}
        </div>
        {viewers.length > 0 && (
          <div className="flex flex-col gap-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              Active Viewers
            </span>
            <div className="flex -space-x-2">
              {viewers.map((u) => (
                <Avatar
                  key={u._id}
                  src={u.avatar}
                  fallback={u.name?.[0] || "?"}
                  className="w-8 h-8 border-2 border-white shadow-sm"
                />
              ))}
            </div>
          </div>
        )}
      </Card>
      <Card className="flex flex-col gap-2">
        <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">
          Description
        </label>
        {fieldsEditable ? (
          <Textarea
            className="min-h-[120px] border-[#E5E7EB] text-sm text-gray-900 placeholder:text-gray-400 focus:border-[#4F46E5] focus:ring-[#4F46E5]"
            value={task.description ?? ""}
            onChange={(e) => setTask({ ...task, description: e.target.value })}
            onBlur={(e) => void updateField("description", e.target.value)}
            placeholder="Describe the work that needs to be done"
          />
        ) : (
          <p className="whitespace-pre-wrap text-sm text-gray-900">
            {task.description?.trim() ? task.description : "No description provided."}
          </p>
        )}
      </Card>
      <Card className="flex flex-col gap-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              Due Date
            </label>
            {fieldsEditable ? (
              <Input
                type="date"
                className="border-[#E5E7EB] text-sm text-gray-900 focus:border-[#4F46E5] focus:ring-[#4F46E5]"
                value={task.dueDate ? task.dueDate.split("T")[0] || "" : ""}
                onChange={(e) => setTask({ ...task, dueDate: e.target.value })}
                onBlur={(e) => void updateField("dueDate", e.target.value)}
              />
            ) : (
              <p className="text-sm text-gray-900">
                {task.dueDate ? task.dueDate.split("T")[0] : "No due date"}
              </p>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              Priority
            </label>
            {fieldsEditable ? (
              <Select
                value={task.priority ?? ""}
                onChange={(e) => void handlePriorityChange(e.target.value)}
              >
                <option value="" disabled>
                  Select priority
                </option>
                {priorityOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </Select>
            ) : (
              <p className="text-sm text-gray-900">
                {task.priority ?? "No priority set"}
              </p>
            )}
          </div>
          <div className="flex flex-col gap-2 md:row-span-3">
            <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              Steps
            </label>
            {task.steps && task.steps.length ? (
              <ul className="flex flex-col gap-3">
                {task.steps.map((step, index) => {
                  const owner = step.ownerId ? users[step.ownerId] : undefined;
                  const dueLabel = formatDate(step.dueAt);
                  return (
                    <li
                      key={`${step.ownerId ?? 'step'}-${index}`}
                      className="rounded-lg border border-gray-200 bg-gray-50 p-3 shadow-sm"
                    >
                      <div className="text-sm font-medium text-gray-900">
                        {step.title?.trim() ? step.title : `Step ${index + 1}`}
                      </div>
                      <div className="mt-1 text-xs text-gray-600">
                        Owner: {owner?.name ?? (step.ownerId ? 'Unknown owner' : 'Unassigned')}
                      </div>
                      {dueLabel ? (
                        <div className="mt-1 text-xs text-gray-500">Due {dueLabel}</div>
                      ) : null}
                      {step.status ? (
                        <div className="mt-1 text-xs uppercase tracking-wide text-gray-500">
                          Status: {step.status}
                        </div>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            ) : (
              <div className="rounded-lg border border-dashed border-gray-200 p-3 text-sm text-gray-500">
                No steps have been added to this task yet.
              </div>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              Owner
            </label>
            <Input
              readOnly
              value={task.ownerId ?? "Unassigned"}
              className="border-[#E5E7EB] text-sm text-gray-900 focus:border-[#4F46E5] focus:ring-[#4F46E5]"
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              Status
            </label>
            <Input
              readOnly
              value={task.status ?? "Unknown"}
              className="border-[#E5E7EB] text-sm text-gray-900 focus:border-[#4F46E5] focus:ring-[#4F46E5]"
            />
          </div>
          <div className="flex flex-col gap-2 md:col-span-2">
            <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              Tags
            </label>
            <Input
              readOnly
              value={task.tags?.join(", ") || "No tags"}
              className="border-[#E5E7EB] text-sm text-gray-900 focus:border-[#4F46E5] focus:ring-[#4F46E5]"
            />
          </div>
        </div>
      </Card>
      {fieldsEditable ? (
        <Card className="flex flex-col gap-4">
          {loopLoading ? (
            <div className="text-sm text-gray-500">Loading loop...</div>
          ) : loop ? (
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Loop Progress
                </span>
                <LoopProgress
                  total={loop.sequence.length}
                  completed={
                    loop.sequence.filter((s: LoopStep) => s.status === 'COMPLETED').length
                  }
                />
              </div>
              <div className="flex flex-col gap-2">
                <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Loop Steps
                </span>
                <LoopVisualizer
                  steps={
                    loop.sequence.map((s: LoopStep, idx) => ({
                      id: String(idx),
                      assignedTo: s.assignedTo ?? '',
                      description: s.description,
                      estimatedTime: s.estimatedTime,
                      dependencies: s.dependencies ?? [],
                      index: idx,
                      status: s.status,
                    })) as StepWithStatus[]
                  }
                  users={users}
                />
              </div>
            </div>
          ) : (
            <div className="text-sm text-gray-500">No loop defined yet.</div>
          )}
          <div className="flex justify-end">
            <Button onClick={() => openLoopBuilder(id)} className="px-5">
              Manage Loop
            </Button>
          </div>
        </Card>
      ) : null}
    </div>
  );
}

function formatDate(value?: string) {
  if (!value) return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  return date.toLocaleDateString();
}

