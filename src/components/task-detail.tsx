"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import useRealtime, { type RealtimeMessage } from "@/hooks/useRealtime";
import usePresence from "@/hooks/usePresence";
import { Avatar } from "@/components/ui/avatar";
import useAuth from "@/hooks/useAuth";
import LoopTasksSection from "@/components/loop-tasks-section";
import { cn } from "@/lib/utils";
import { getTodayDateInputValue, isDateInputBeforeToday } from "@/lib/dateInput";
import type { ProjectSummary } from "@/types/api/project";

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
  projectId?: string;
}

export default function TaskDetail({
  id,
  canEdit: canEditProp,
  readOnly = false,
  showLoopTasks = true,
}: {
  id: string;
  canEdit?: boolean;
  readOnly?: boolean;
  showLoopTasks?: boolean;
}) {
  const [task, setTask] = useState<Task | null>(null);
  const [users, setUsers] = useState<Record<string, User>>({});
  const [ownerName, setOwnerName] = useState<string | null>(null);
  const [taskVersion, setTaskVersion] = useState(0);
  const [dueDateError, setDueDateError] = useState<string | null>(null);
  const [project, setProject] = useState<ProjectSummary | null>(null);
  const [projectOptions, setProjectOptions] = useState<ProjectSummary[]>([]);
  const [projectListLoading, setProjectListLoading] = useState(false);
  const [projectSelectError, setProjectSelectError] = useState<string | null>(null);
  const viewers = usePresence(id);
  const { user } = useAuth();

  const loadUsers = useCallback(async (ids: string[]) => {
    const uniqueIds = Array.from(
      new Set(ids.filter((value): value is string => Boolean(value)))
    );

    if (!uniqueIds.length) return {} as Record<string, User>;

    try {
      const res = await fetch(
        `/api/users?${uniqueIds
          .map((userId) => `id=${encodeURIComponent(userId)}`)
          .join("&")}`,
        { credentials: "include" }
      );

      if (!res.ok) return {} as Record<string, User>;

      const json: unknown = await res.json();
      let map: Record<string, User> = {} as Record<string, User>;
      if (Array.isArray(json)) {
        const result: Record<string, User> = {} as Record<string, User>;
        for (const u of json) {
          if (u && typeof u === "object" && "_id" in u) {
            const user = u as User;
            result[user._id] = user;
          }
        }
        map = result;
      } else if (json && typeof json === "object") {
        map = json as Record<string, User>;
      }

      if (Object.keys(map).length) {
        setUsers((prev) => ({ ...prev, ...map }));
      }

      return map;
    } catch {
      return {} as Record<string, User>;
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

  const loadProjectDetail = useCallback(async (projectIdValue: string) => {
    if (!projectIdValue) {
      setProject(null);
      return;
    }
    try {
      const res = await fetch(`/api/projects/${projectIdValue}`, { credentials: "include" });
      if (!res.ok) {
        throw new Error("Unable to load project");
      }
      const data = (await res.json()) as ProjectSummary;
      setProject(data);
    } catch {
      setProject(null);
    }
  }, []);

  const loadProjectOptions = useCallback(async () => {
    setProjectListLoading(true);
    try {
      const res = await fetch("/api/projects?limit=200", { credentials: "include" });
      if (!res.ok) {
        throw new Error("Unable to load projects");
      }
      const data = (await res.json()) as ProjectSummary[];
      setProjectOptions(data);
    } catch {
      setProjectOptions([]);
    } finally {
      setProjectListLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshTask();
  }, [refreshTask]);

  useEffect(() => {
    if (!task?.projectId) {
      setProject(null);
      return;
    }
    void loadProjectDetail(task.projectId);
  }, [loadProjectDetail, task?.projectId]);

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
        default:
          break;
      }
    },
    [id, taskVersion, loadUsers]
  );
  useRealtime({ onMessage: handleMessage });

  const canEdit = useMemo(() => {
    if (typeof canEditProp === "boolean") return canEditProp;
    if (!user?.userId || !task) return false;
    return user.userId === task.createdBy || user.userId === task.ownerId;
  }, [canEditProp, task, user?.userId]);

  const fieldsEditable = canEdit && !readOnly;

  useEffect(() => {
    if (!fieldsEditable) return;
    void loadProjectOptions();
  }, [fieldsEditable, loadProjectOptions]);

  useEffect(() => {
    if (!project) return;
    setProjectOptions((prev) => {
      if (prev.some((item) => item._id === project._id)) {
        return prev;
      }
      return [...prev, project];
    });
  }, [project]);
  const minDueDate = useMemo(() => getTodayDateInputValue(), []);

  const updateField = async (field: keyof Task, value: string) => {
    if (!task || !fieldsEditable) return;
    if (field === "dueDate") {
      if (value && isDateInputBeforeToday(value)) {
        setDueDateError("Due date cannot be in the past");
        return;
      }
      setDueDateError(null);
    }
    await fetch(`/api/tasks/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [field]: value }),
    });
    setTask((prev) => (prev ? { ...prev, [field]: value } : prev));
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

  const handleProjectChange = async (value: string) => {
    if (!task || !fieldsEditable) return;
    if (!value) {
      setProjectSelectError("Select a project");
      return;
    }

    if (task.projectId === value) {
      setProjectSelectError(null);
      return;
    }

    setProjectSelectError(null);
    const previousProjectId = task.projectId;
    setTask((prev) => (prev ? { ...prev, projectId: value } : prev));
    try {
      const res = await fetch(`/api/tasks/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId: value }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { detail?: string };
        throw new Error(body.detail ?? "Failed to update project");
      }
      setProjectSelectError(null);
      void loadProjectDetail(value);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to update project";
      setProjectSelectError(message);
      setTask((prev) => (prev ? { ...prev, projectId: previousProjectId } : prev));
      if (previousProjectId) {
        void loadProjectDetail(previousProjectId);
      }
    }
  };

  if (!task) {
    return <div>Loading...</div>;
  }

  const containerClass = cn(
    "grid gap-4",
    showLoopTasks ? "lg:grid-cols-[minmax(0,1fr)_320px]" : undefined
  );

  return (
    <div className="p-4">
      <div className={containerClass}>
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
          <Card className="flex flex-col gap-2">
            <label className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              Project
            </label>
            {fieldsEditable ? (
              <div className="space-y-1">
                <Select
                  value={task.projectId ?? ''}
                  onChange={(event) => void handleProjectChange(event.target.value)}
                  disabled={projectListLoading}
                >
                  <option value="" disabled>
                    {projectListLoading ? 'Loading projects…' : 'Select project'}
                  </option>
                  {projectOptions.map((option) => (
                    <option key={option._id} value={option._id}>
                      {option.name}
                      {option.type?.name ? ` • ${option.type.name}` : ''}
                    </option>
                  ))}
                </Select>
                {projectSelectError ? (
                  <p className="text-sm text-red-600">{projectSelectError}</p>
                ) : null}
              </div>
            ) : (
              <p className="text-sm text-gray-900">
                {task.projectId ? (
                  project ? (
                    <>
                      {project.name}
                      {project.type?.name ? (
                        <span className="text-gray-500">{' '}• {project.type.name}</span>
                      ) : null}
                    </>
                  ) : (
                    'Loading project…'
                  )
                ) : (
                  'No project assigned'
                )}
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
                  <div className="space-y-1">
                    <Input
                      type="date"
                      min={minDueDate}
                      className="border-[#E5E7EB] text-sm text-gray-900 focus:border-[#4F46E5] focus:ring-[#4F46E5]"
                      value={task.dueDate ? task.dueDate.split("T")[0] || "" : ""}
                      onChange={(e) => {
                        const nextValue = e.target.value;
                        if (nextValue && isDateInputBeforeToday(nextValue)) {
                          setDueDateError("Due date cannot be in the past");
                          return;
                        }
                        setDueDateError(null);
                        setTask((prev) =>
                          prev ? { ...prev, dueDate: nextValue } : prev,
                        );
                      }}
                      onBlur={(e) => {
                        const nextValue = e.target.value;
                        if (nextValue && isDateInputBeforeToday(nextValue)) {
                          setDueDateError("Due date cannot be in the past");
                          return;
                        }
                        void updateField("dueDate", nextValue);
                      }}
                    />
                    {dueDateError ? (
                      <p className="text-sm text-red-600">{dueDateError}</p>
                    ) : null}
                  </div>
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
        {showLoopTasks ? (
          <div className="flex flex-col gap-4">
            <LoopTasksSection taskId={id} canEdit={fieldsEditable} />
          </div>
        ) : null}
      </div>
    </div>
  );
}

