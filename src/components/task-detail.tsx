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

interface User {
  _id: string;
  name?: string;
}

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
  const [ownerName, setOwnerName] = useState<string | null>(null);
  const [loopLoading, setLoopLoading] = useState(true);
  const [taskVersion, setTaskVersion] = useState(0);
  const [loopVersion, setLoopVersion] = useState(0);
  const viewers = usePresence(id);
  const { user } = useAuth();

  const loadUsers = useCallback(async (ids: string[]) => {
    const uniqueIds = Array.from(
      new Set(ids.filter((value): value is string => Boolean(value)))
    );

    if (!uniqueIds.length) return {} as UserMap;

    try {
      const res = await fetch(
        `/api/users?${uniqueIds
          .map((userId) => `id=${encodeURIComponent(userId)}`)
          .join("&")}`,
        { credentials: "include" }
      );

      if (!res.ok) return {} as UserMap;

      const json: unknown = await res.json();
      let map: UserMap = {} as UserMap;
      if (Array.isArray(json)) {
        const result: UserMap = {} as UserMap;
        for (const u of json) {
          if (u && typeof u === "object" && "_id" in u) {
            const user = u as User;
            result[user._id] = user;
          }
        }
        map = result;
      } else if (json && typeof json === "object") {
        map = json as UserMap;
      }

      if (Object.keys(map).length) {
        setUsers((prev) => ({ ...prev, ...map }));
      }

      return map;
    } catch {
      return {} as UserMap;
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

        const idsToLoad = [taskData.ownerId, taskData.createdBy].filter(
          (value): value is string => Boolean(value)
        );
        if (idsToLoad.length) {
          void loadUsers(idsToLoad);
        }
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

          const ids = Array.from(
            new Set(
              (loopData.sequence ?? [])
                .map((s: LoopStep) => s.assignedTo)
                .filter((v: string | undefined): v is string => !!v)
            )
          );
          if (ids.length) {
            void loadUsers(ids);
          }
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

  useEffect(() => {
    const ownerId = task?.ownerId;
    if (!ownerId) {
      setOwnerName(null);
      return;
    }

    const owner = users[ownerId];
    if (owner?.name) {
      setOwnerName(owner.name);
    } else {
      setOwnerName(ownerId);
    }
  }, [task?.ownerId, users]);

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

            if (data.patch && typeof data.patch === "object" && "ownerId" in data.patch) {
              const nextOwnerId = (data.patch as Partial<Task>).ownerId;
              if (nextOwnerId) {
                void loadUsers([nextOwnerId]);
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
                const updates = data.patch.sequence as unknown[];
                if (
                  updates.every(
                    (
                      s: unknown
                    ): s is { index: number } & Partial<LoopStep> =>
                      !!s &&
                      typeof s === "object" &&
                      "index" in s &&
                      typeof (s as { index: unknown }).index === "number"
                  )
                ) {
                  updates.forEach(({ index, ...rest }) => {
                    const current = seq[index] ?? ({} as LoopStep);
                    seq[index] = {
                      ...current,
                      ...(rest as Partial<LoopStep>),
                    };
                  });
                  next.sequence = seq;
                } else {
                  next.sequence = updates as unknown as LoopStep[];
                }
              }
              const parallelValue =
                data.patch &&
                typeof data.patch === "object" &&
                "parallel" in data.patch
                  ? (data.patch as { parallel?: TaskLoop["parallel"] }).parallel
                  : undefined;
              if (parallelValue !== undefined) next.parallel = parallelValue;
              return { ...next, updatedAt: data.updatedAt };
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
    <div className="p-4">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="flex flex-col gap-4">
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
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
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
              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Owner
                </label>
                <Input
                  readOnly
                  value={ownerName ?? "Unassigned"}
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
        </div>
        <div className="flex flex-col gap-4">
          <Card className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Loop Progress
              </span>
              {loopLoading ? (
                <div className="text-sm text-gray-500">Loading loop...</div>
              ) : loop ? (
                <LoopProgress
                  total={loop.sequence.length}
                  completed={
                    loop.sequence.filter((s: LoopStep) => s.status === "COMPLETED").length
                  }
                />
              ) : (
                <div className="text-sm text-gray-500">No loop defined yet.</div>
              )}
            </div>
            {!loopLoading && loop ? (
              <div className="flex flex-col gap-2">
                <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Loop Steps
                </span>
                <LoopVisualizer
                  steps={
                    loop.sequence.map((s: LoopStep, idx) => ({
                      id: String(idx),
                      assignedTo: s.assignedTo ?? "",
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
            ) : null}
            {fieldsEditable ? (
              <div className="flex justify-end">
                <Button onClick={() => openLoopBuilder(id)} className="px-5">
                  Manage Loop
                </Button>
              </div>
            ) : null}
          </Card>
        </div>
      </div>
    </div>
  );
}

