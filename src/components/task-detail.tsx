"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { openLoopBuilder } from "@/lib/loopBuilder";
import LoopVisualizer, { StepWithStatus, UserMap } from "@/components/loop-visualizer";
import LoopProgress from "@/components/loop-progress";
import useTaskChannel from "@/hooks/useTaskChannel";

interface Task {
  title?: string;
  description?: string;
  ownerId?: string;
  dueDate?: string;
  priority?: string;
  tags?: string[];
  status?: string;
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
}

export default function TaskDetail({ id }: { id: string }) {
  const [task, setTask] = useState<Task | null>(null);
  const [loop, setLoop] = useState<TaskLoop | null>(null);
  const [users, setUsers] = useState<UserMap>({});
  const [loopLoading, setLoopLoading] = useState(true);

  const refreshTask = useCallback(async () => {
    const res = await fetch(`/api/tasks/${id}`);
    if (res.ok) {
      setTask(await res.json());
    }
  }, [id]);

  const refreshLoop = useCallback(async () => {
    setLoopLoading(true);
    try {
      const res = await fetch(`/api/tasks/${id}/loop`);
      if (res.ok) {
        const loopData = await res.json();
        setLoop(loopData);

        const ids = Array.from(
          new Set(
            (loopData.sequence || [])
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
            const data = await userRes.json();
            const map: UserMap = Array.isArray(data)
              ? data.reduce(
                  (acc: UserMap, u: any) => {
                    acc[u._id] = u;
                    return acc;
                  },
                  {}
                )
              : data;
            setUsers(map);
          }
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

  useTaskChannel(id, { refreshTask, refreshLoop });

  const updateField = async (field: keyof Task, value: string) => {
    if (!task) return;
    await fetch(`/api/tasks/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [field]: value }),
    });
    setTask({ ...task, [field]: value });
  };

  if (!task) {
    return <div>Loading...</div>;
  }

  return (
    <div className="p-4 flex flex-col gap-4">
      <input
        className="border p-2"
        value={task.title ?? ""}
        onChange={(e) => setTask({ ...task, title: e.target.value })}
        onBlur={(e) => void updateField("title", e.target.value)}
      />
      <textarea
        className="border p-2"
        value={task.description ?? ""}
        onChange={(e) => setTask({ ...task, description: e.target.value })}
        onBlur={(e) => void updateField("description", e.target.value)}
      />
      <input
        className="border p-2"
        type="date"
        value={task.dueDate ? task.dueDate.split("T")[0] : ""}
        onChange={(e) => setTask({ ...task, dueDate: e.target.value })}
        onBlur={(e) => void updateField("dueDate", e.target.value)}
      />
      <input
        className="border p-2"
        value={task.priority ?? ""}
        onChange={(e) => setTask({ ...task, priority: e.target.value })}
        onBlur={(e) => void updateField("priority", e.target.value)}
      />
      <div>Owner: {task.ownerId}</div>
      <div>Tags: {task.tags?.join(", ")}</div>
      <div>Status: {task.status}</div>
      {loopLoading ? (
        <div>Loading loop...</div>
      ) : loop ? (
        <div className="flex flex-col gap-2">
          <LoopProgress
            total={loop.sequence.length}
            completed={loop.sequence.filter((s) => s.status === "COMPLETED").length}
          />
          <div className="font-semibold">Loop Steps</div>
          <LoopVisualizer
            steps={
              loop.sequence.map((s, idx) => ({
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
      ) : (
        <div className="text-sm text-gray-500">No loop defined yet.</div>
      )}
      <Button
        onClick={() => openLoopBuilder(id)}
        variant="outline"
        className="text-xs self-start"
      >
        Add to Loop
      </Button>
    </div>
  );
}

