"use client";

import { useCallback, useEffect, useState } from "react";
import Timeline, { TimelineEvent } from "@/components/timeline/timeline";
import useTaskChannel from "@/hooks/useTaskChannel";

interface HistoryEvent {
  id: string;
  type:
    | "CREATED"
    | "START"
    | "SEND_FOR_REVIEW"
    | "REQUEST_CHANGES"
    | "DONE"
    | "UPDATED"
    | "COMMENT";
  user: { name: string; avatar?: string };
  date: string;
}

const statusLabels: Record<string, string> = {
  CREATED: "Created",
  START: "Started",
  SEND_FOR_REVIEW: "Sent for review",
  REQUEST_CHANGES: "Requested changes",
  DONE: "Done",
  UPDATED: "Updated",
  COMMENT: "Commented",
};

interface Task {
  _id: string;
  status: string;
  steps?: unknown[];
}

const actionButtons: Record<string, { action: string; label: string }[]> = {
  OPEN: [{ action: "START", label: "Start" }],
  IN_PROGRESS: [{ action: "SEND_FOR_REVIEW", label: "Send for review" }],
  IN_REVIEW: [
    { action: "REQUEST_CHANGES", label: "Request changes" },
    { action: "DONE", label: "Done" },
  ],
  REVISIONS: [{ action: "SEND_FOR_REVIEW", label: "Send for review" }],
  FLOW_IN_PROGRESS: [{ action: "DONE", label: "Complete step" }],
  DONE: [],
};

export default function TaskPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [task, setTask] = useState<Task | null>(null);

  const load = useCallback(async () => {
    const [taskRes, historyRes] = await Promise.all([
      fetch(`/api/tasks/${id}`),
      fetch(`/api/tasks/${id}/history`),
    ]);
    if (taskRes.ok) {
      setTask(await taskRes.json());
    }
    if (historyRes.ok) {
      const data: HistoryEvent[] = await historyRes.json();
      setEvents(
        data.map((e) => ({
          user: e.user,
          status: statusLabels[e.type] ?? e.type,
          date: e.date,
        }))
      );
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleAction = async (action: string) => {
    await fetch(`/api/tasks/${id}/transition`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    await load();
  };

  useTaskChannel(id, (data) => {
    if (data.event === "task.transitioned") {
      void load();
    }
  });

  const buttons = task ? actionButtons[task.status] ?? [] : [];

  return (
    <div className="fixed inset-0 flex flex-col bg-white">
      <header className="border-b border-gray-200 p-4 flex items-center">
        <h1 className="text-lg font-semibold flex-1">Task {id} Timeline</h1>
        {task && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">{task.status}</span>
            {buttons.map((b) => (
              <button
                key={b.action}
                onClick={() => void handleAction(b.action)}
                className="bg-blue-500 text-white px-2 py-1 rounded text-sm"
              >
                {b.label}
              </button>
            ))}
          </div>
        )}
      </header>
      <div className="flex-1 overflow-y-auto p-4">
        <Timeline events={events} />
      </div>
    </div>
  );
}
