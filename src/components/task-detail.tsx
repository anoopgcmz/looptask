"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
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

export default function TaskDetail({ id, canEdit: canEditProp }: { id: string; canEdit?: boolean }) {
  const [task, setTask] = useState<Task | null>(null);
  const [loop, setLoop] = useState<TaskLoop | null>(null);
  const [users, setUsers] = useState<UserMap>({});
  const [loopLoading, setLoopLoading] = useState(true);
  const [taskVersion, setTaskVersion] = useState(0);
  const [loopVersion, setLoopVersion] = useState(0);
  const viewers = usePresence(id);
  const { user } = useAuth();

  const refreshTask = useCallback(async () => {
    const res = await fetch(`/api/tasks/${id}`);
    if (res.ok) {
      const json: unknown = await res.json();
      if (json && typeof json === "object" && "updatedAt" in json) {
        const taskData = json as Task;
        setTask(taskData);
        setTaskVersion(new Date(taskData.updatedAt).getTime());
      }
    }
  }, [id]);

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
          const userRes = await fetch(
            `/api/users?${ids.map((u) => `id=${u}`).join('&')}`,
            { credentials: 'include' }
          );
          if (userRes.ok) {
            const userJson: unknown = await userRes.json();
            let map: UserMap = {} as UserMap;
            if (Array.isArray(userJson)) {
              map = userJson.reduce(
                (acc: UserMap, u: User) => {
                  acc[u._id] = u;
                  return acc;
                },
                {} as UserMap
              );
            } else if (userJson && typeof userJson === "object") {
              map = userJson as UserMap;
            }
            setUsers(map);
          }
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
}, [id]);

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
              return { ...next, updatedAt: data.updatedAt };
            });
            setLoopVersion(lver);
          }
          break;
        default:
          break;
      }
    },
    [id, taskVersion, loopVersion]
  );
  const { status } = useRealtime({ onMessage: handleMessage });

  const canEdit = useMemo(() => {
    if (typeof canEditProp === "boolean") return canEditProp;
    if (!user?.userId || !task) return false;
    return user.userId === task.createdBy || user.userId === task.ownerId;
  }, [canEditProp, task, user?.userId]);

  const updateField = async (field: keyof Task, value: string) => {
    if (!task || !canEdit) return;
    await fetch(`/api/tasks/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [field]: value }),
    });
    setTask({ ...task, [field]: value });
  };

  const priorityOptions = ["LOW", "MEDIUM", "HIGH"] as const;

  const handlePriorityChange = async (value: string) => {
    if (!task || !canEdit) return;
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
      {status !== "connected" && (
        <div className="bg-red-500 text-white text-center p-1 text-xs">
          Offline
        </div>
      )}
      <div className="flex items-center justify-between gap-2">
        <input
          className="border p-2 flex-1"
          value={task.title ?? ""}
          onChange={
            canEdit ? (e) => setTask({ ...task, title: e.target.value }) : undefined
          }
          onBlur={
            canEdit ? (e) => void updateField("title", e.target.value) : undefined
          }
          readOnly={!canEdit}
        />
        {viewers.length > 0 && (
          <div className="flex -space-x-2 ml-2">
            {viewers.map((u) => (
              <Avatar
                key={u._id}
                src={u.avatar}
                fallback={u.name?.[0] || "?"}
                className="w-8 h-8 border-2 border-white"
              />
            ))}
          </div>
        )}
      </div>
      <textarea
        className="border p-2"
        value={task.description ?? ""}
        onChange={
          canEdit ? (e) => setTask({ ...task, description: e.target.value }) : undefined
        }
        onBlur={
          canEdit ? (e) => void updateField("description", e.target.value) : undefined
        }
        readOnly={!canEdit}
      />
      <input
        className="border p-2"
        type="date"
        value={task.dueDate ? task.dueDate.split("T")[0] || "" : ""}
        onChange={
          canEdit ? (e) => setTask({ ...task, dueDate: e.target.value }) : undefined
        }
        onBlur={
          canEdit ? (e) => void updateField("dueDate", e.target.value) : undefined
        }
        readOnly={!canEdit}
        disabled={!canEdit}
      />
      <select
        className="border p-2"
        value={task.priority ?? ""}
        onChange={canEdit ? (e) => void handlePriorityChange(e.target.value) : undefined}
        disabled={!canEdit}
      >
        <option value="" disabled>
          Select priority
        </option>
        {priorityOptions.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
      <div>Owner: {task.ownerId}</div>
      <div>Tags: {task.tags?.join(", ")}</div>
      <div>Status: {task.status}</div>
      {loopLoading ? (
        <div>Loading loop...</div>
      ) : loop ? (
        <div className="flex flex-col gap-2">
          <LoopProgress
            total={loop.sequence.length}
            completed={
              loop.sequence.filter((s: LoopStep) => s.status === 'COMPLETED').length
            }
          />
          <div className="font-semibold">Loop Steps</div>
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
      ) : (
        <div className="text-sm text-gray-500">No loop defined yet.</div>
      )}
      {canEdit ? (
        <Button
          onClick={() => openLoopBuilder(id)}
          variant="outline"
          className="text-xs self-start"
        >
          Add to Loop
        </Button>
      ) : null}
    </div>
  );
}

