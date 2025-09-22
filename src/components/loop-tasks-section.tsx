"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import LoopProgress from "@/components/loop-progress";
import LoopVisualizer, { type StepWithStatus, type UserMap } from "@/components/loop-visualizer";
import { openLoopBuilder } from "@/lib/loopBuilder";
import useRealtime, { type RealtimeMessage } from "@/hooks/useRealtime";
import { cn } from "@/lib/utils";

export interface LoopStep {
  assignedTo?: string;
  description: string;
  estimatedTime?: number;
  dependencies?: string[];
  comments?: string;
  status: "PENDING" | "ACTIVE" | "COMPLETED" | "BLOCKED";
}

export interface TaskLoop {
  sequence: LoopStep[];
  currentStep: number;
  parallel?: boolean;
  updatedAt?: string;
}

interface LoopTasksSectionProps {
  taskId: string;
  canEdit?: boolean;
  className?: string;
  loop?: TaskLoop | null;
  users?: UserMap;
  loading?: boolean;
  onManageLoop?: () => void;
}

function useTaskLoop(
  taskId: string,
  { enabled = true }: { enabled?: boolean } = {}
): { loop: TaskLoop | null; users: UserMap; loading: boolean } {
  const [loop, setLoop] = useState<TaskLoop | null>(null);
  const [users, setUsers] = useState<UserMap>({});
  const [loading, setLoading] = useState<boolean>(enabled);
  const [loopVersion, setLoopVersion] = useState<number>(0);

  const loadUsers = useCallback(
    async (ids: string[]) => {
      if (!enabled) return {} as UserMap;

      const uniqueIds = Array.from(
        new Set(ids.filter((value): value is string => Boolean(value)))
      );

      if (!uniqueIds.length) return {} as UserMap;

      const normalizeUser = (value: unknown): UserMap[string] | null => {
        if (!value || typeof value !== "object" || !("_id" in value)) {
          return null;
        }

        const record = value as {
          _id?: unknown;
          name?: unknown;
          avatar?: unknown;
        };

        if (typeof record._id !== "string") {
          return null;
        }

        const name =
          typeof record.name === "string" && record.name.trim().length
            ? record.name
            : record._id;
        const avatar =
          typeof record.avatar === "string" && record.avatar.trim().length
            ? record.avatar
            : undefined;

        return { _id: record._id, name, avatar };
      };

      try {
        const res = await fetch(
          `/api/users?${uniqueIds
            .map((userId) => `id=${encodeURIComponent(userId)}`)
            .join("&")}`,
          { credentials: "include" }
        );

        if (!res.ok) return {} as UserMap;

        const json: unknown = await res.json();
        const nextUsers: UserMap = {} as UserMap;

        if (Array.isArray(json)) {
          for (const entry of json) {
            const normalized = normalizeUser(entry);
            if (normalized) {
              nextUsers[normalized._id] = normalized;
            }
          }
        } else if (json && typeof json === "object") {
          const values = Object.values(json as Record<string, unknown>);
          for (const value of values) {
            const normalized = normalizeUser(value);
            if (normalized) {
              nextUsers[normalized._id] = normalized;
            }
          }
        }

        if (Object.keys(nextUsers).length) {
          setUsers((prev) => ({ ...prev, ...nextUsers }));
        }

        return nextUsers;
      } catch {
        return {} as UserMap;
      }
    },
    [enabled]
  );

  const refreshLoop = useCallback(async () => {
    if (!enabled) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/tasks/${taskId}/loop`);
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
                .filter((value): value is string => Boolean(value))
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
      setLoading(false);
    }
  }, [enabled, loadUsers, taskId]);

  useEffect(() => {
    void refreshLoop();
  }, [refreshLoop]);

  const handleMessage = useCallback(
    (data: RealtimeMessage) => {
      if (!enabled) return;
      if (data.taskId !== taskId) return;
      if (data.event !== "loop.updated") return;
      if (!data.updatedAt) return;

      const updatedAt = new Date(data.updatedAt).getTime();
      if (updatedAt <= loopVersion) return;

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
        if (parallelValue !== undefined) {
          next.parallel = parallelValue;
        }
        return { ...next, updatedAt: data.updatedAt };
      });
      setLoopVersion(updatedAt);

      if (
        data.patch &&
        typeof data.patch === "object" &&
        Array.isArray((data.patch as { sequence?: unknown[] }).sequence)
      ) {
        const ids = Array.from(
          new Set(
            ((data.patch as { sequence?: LoopStep[] }).sequence || [])
              .map((step) => step?.assignedTo)
              .filter((value): value is string => Boolean(value))
          )
        );
        if (ids.length) {
          void loadUsers(ids);
        }
      }
    },
    [enabled, loadUsers, loopVersion, taskId]
  );

  useRealtime({ onMessage: handleMessage });

  return { loop, users, loading };
}

export default function LoopTasksSection({
  taskId,
  canEdit,
  className,
  loop: loopProp,
  users: usersProp,
  loading: loadingProp,
  onManageLoop,
}: LoopTasksSectionProps) {
  const shouldFetch =
    loopProp === undefined && usersProp === undefined && loadingProp === undefined;
  const { loop: fetchedLoop, users: fetchedUsers, loading: fetchedLoading } = useTaskLoop(
    taskId,
    { enabled: shouldFetch }
  );

  const loop = loopProp ?? fetchedLoop;
  const users = useMemo(() => usersProp ?? fetchedUsers, [fetchedUsers, usersProp]);
  const loading = loadingProp ?? fetchedLoading;

  const totalSteps = loop?.sequence.length ?? 0;
  const completedSteps = useMemo(() => {
    if (!loop) return 0;
    return loop.sequence.filter((s) => s.status === "COMPLETED").length;
  }, [loop]);

  const handleManageLoop = useCallback(() => {
    if (onManageLoop) {
      onManageLoop();
      return;
    }
    openLoopBuilder(taskId, loop ?? null);
  }, [loop, onManageLoop, taskId]);

  return (
    <Card className={cn("flex flex-col gap-4", className)}>
      <div className="flex flex-col gap-1">
        <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
          Loop Progress
        </span>
        {loading ? (
          <div className="text-sm text-gray-500">Loading loop...</div>
        ) : loop ? (
          <LoopProgress total={totalSteps} completed={completedSteps} />
        ) : (
          <div className="text-sm text-gray-500">No loop defined yet.</div>
        )}
      </div>
      {!loading && loop ? (
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
      {canEdit ? (
        <div className="flex justify-end">
          <Button onClick={handleManageLoop} className="px-5">
            Manage Loop
          </Button>
        </div>
      ) : null}
    </Card>
  );
}
