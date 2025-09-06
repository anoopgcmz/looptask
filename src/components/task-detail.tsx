"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { openLoopBuilder } from "@/lib/loopBuilder";
import LoopTimeline, { StepWithStatus } from "@/components/loop-timeline";
import LoopProgress from "@/components/loop-progress";

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
  description: string;
  status: 'PENDING' | 'ACTIVE' | 'COMPLETED' | 'BLOCKED';
}

interface TaskLoop {
  sequence: LoopStep[];
  currentStep: number;
}

export default function TaskDetail({ id }: { id: string }) {
  const [task, setTask] = useState<Task | null>(null);
  const [loop, setLoop] = useState<TaskLoop | null>(null);

  useEffect(() => {
    const load = async () => {
      const res = await fetch(`/api/tasks/${id}`);
      if (res.ok) {
        setTask(await res.json());
      }
    };
    void load();
  }, [id]);

  useEffect(() => {
    const loadLoop = async () => {
      const res = await fetch(`/api/tasks/${id}/loop`);
      if (res.ok) setLoop(await res.json());
    };
    void loadLoop();
  }, [id]);

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
      {loop && (
        <div className="flex flex-col gap-2">
          <LoopProgress
            total={loop.sequence.length}
            completed={loop.sequence.filter((s) => s.status === "COMPLETED").length}
          />
          <div className="font-semibold">Loop Steps</div>
          <LoopTimeline
            currentStep={loop.currentStep}
            steps={
              loop.sequence.map((s, idx) => ({
                id: String(idx),
                assignedTo: "",
                description: s.description,
                dependencies: [],
                index: idx,
                status: s.status,
              })) as StepWithStatus[]
            }
            users={[]}
          />
        </div>
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

