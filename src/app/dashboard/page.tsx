'use client';

import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { SessionProvider } from 'next-auth/react';
import { motion } from 'framer-motion';
import type { TaskResponse as Task } from '@/types/api/task';
import useAuth from '@/hooks/useAuth';

type MetricCardProps = {
  title: string;
  value: string;
  subtext: string;
  progress: number;
  icon: ReactNode;
  accentClassName: string;
  progressClassName: string;
};

type BadgeTone = 'slate' | 'emerald' | 'sky' | 'amber' | 'rose' | 'violet';

const badgeToneStyles: Record<BadgeTone, string> = {
  slate: 'bg-slate-100 text-slate-600 border-slate-200',
  emerald: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  sky: 'bg-sky-100 text-sky-700 border-sky-200',
  amber: 'bg-amber-100 text-amber-700 border-amber-200',
  rose: 'bg-rose-100 text-rose-700 border-rose-200',
  violet: 'bg-violet-100 text-violet-700 border-violet-200',
};

function IconBadge({ icon, className }: { icon: ReactNode; className?: string }) {
  return (
    <span
      className={`inline-flex h-10 w-10 items-center justify-center rounded-full ${className ?? ''}`}
      aria-hidden={true}
    >
      {icon}
    </span>
  );
}

function MetricCard({
  title,
  value,
  subtext,
  progress,
  icon,
  accentClassName,
  progressClassName,
}: MetricCardProps) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <p className="mt-2 text-3xl font-semibold text-slate-900">{value}</p>
        </div>
        <IconBadge icon={icon} className={accentClassName} />
      </div>
      <p className="mt-4 text-sm text-slate-500">{subtext}</p>
      <div className="mt-4 h-2 rounded-full bg-slate-100">
        <div
          className={`h-2 rounded-full ${progressClassName}`}
          style={{ width: `${Math.min(Math.max(progress, 0), 100)}%` }}
        />
      </div>
    </div>
  );
}

function Badge({ tone = 'slate', children }: { tone?: BadgeTone; children: ReactNode }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium ${badgeToneStyles[tone]}`}
    >
      {children}
    </span>
  );
}

function RecentActivityCard({ task }: { task: Task }) {
  const statusTone: BadgeTone =
    task.status === 'DONE'
      ? 'emerald'
      : task.status === 'OPEN'
        ? 'slate'
        : task.status === 'REVISIONS'
          ? 'rose'
          : 'sky';

  const priorityTone: BadgeTone =
    task.priority === 'HIGH' ? 'rose' : task.priority === 'MEDIUM' ? 'amber' : 'emerald';

  const formattedDate = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
  }).format(new Date(task.updatedAt));

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-base font-semibold text-slate-900">{task.title}</h3>
          {task.description ? (
            <p className="mt-1 line-clamp-2 text-sm text-slate-500">{task.description}</p>
          ) : null}
        </div>
        <span className="text-xs font-medium text-slate-400">{formattedDate}</span>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone={priorityTone}>{task.priority.toLowerCase()} priority</Badge>
        <Badge tone={statusTone}>{task.status.replaceAll('_', ' ').toLowerCase()}</Badge>
        {task.dueDate ? (
          <Badge tone="violet">Due {new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(new Date(task.dueDate))}</Badge>
        ) : null}
      </div>
    </motion.div>
  );
}

const statusTabs = [
  { value: 'OPEN', label: 'Open', query: ['OPEN'] },
  {
    value: 'IN_PROGRESS',
    label: 'In Progress',
    query: ['IN_PROGRESS', 'IN_REVIEW', 'REVISIONS', 'FLOW_IN_PROGRESS'],
  },
  { value: 'DONE', label: 'Done', query: ['DONE'] },
];

type Objective = {
  _id: string;
  title: string;
  status: 'OPEN' | 'DONE';
  linkedTaskIds?: string[];
};

type ObjectiveSummary = {
  objective: Objective;
  progress: number;
  completedCount: number;
  totalLinked: number;
};

function DashboardInner() {
  const { user, status } = useAuth();
  const [tasks, setTasks] = useState<Record<string, Task[]>>({
    OPEN: [],
    IN_PROGRESS: [],
    DONE: [],
  });
  const [objectives, setObjectives] = useState<Objective[]>([]);
  const [objectivesLoading, setObjectivesLoading] = useState(false);

  const loadTasks = useCallback(async () => {
    const results = await Promise.all(
      statusTabs.map(async (s) => {
        try {
          const res = await fetch(`/api/tasks?${s.query.map((st) => `status=${st}`).join('&')}`);
          if (!res.ok) return [] as Task[];
          return (await res.json()) as Task[];
        } catch {
          return [] as Task[];
        }
      })
    );
    const next: Record<string, Task[]> = {};
    statusTabs.forEach((s, i) => {
      next[s.value] = results[i] as Task[];
    });
    setTasks(next);
  }, []);

  useEffect(() => {
    void loadTasks();
  }, [loadTasks]);

  const allTasks = useMemo(() => Object.values(tasks).flat(), [tasks]);
  const tasksById = useMemo(() => {
    const map = new Map<string, Task>();
    allTasks.forEach((task) => {
      map.set(task._id, task);
    });
    return map;
  }, [allTasks]);

  const today = useMemo(() => new Date().toISOString().split('T')[0] ?? '', []);

  useEffect(() => {
    if (!user?.teamId) {
      setObjectives([]);
      return;
    }
    const loadObjectives = async () => {
      setObjectivesLoading(true);
      try {
        const res = await fetch(`/api/objectives?date=${today}&teamId=${user.teamId}`);
        if (!res.ok) {
          setObjectives([]);
          return;
        }
        setObjectives((await res.json()) as Objective[]);
      } catch {
        setObjectives([]);
      } finally {
        setObjectivesLoading(false);
      }
    };
    void loadObjectives();
  }, [today, user?.teamId]);

  const metrics = useMemo(() => {
    const totalTasks = allTasks.length;
    const openCount = tasks.OPEN?.length ?? 0;
    const inProgressCount = tasks.IN_PROGRESS?.length ?? 0;
    const completedCount = tasks.DONE?.length ?? 0;

    const openRate = totalTasks ? Math.round((openCount / totalTasks) * 100) : 0;
    const inProgressRate = totalTasks ? Math.round((inProgressCount / totalTasks) * 100) : 0;
    const completedRate = totalTasks ? Math.round((completedCount / totalTasks) * 100) : 0;

    return [
      {
        title: 'Open Tasks',
        value: `${openCount} tasks`,
        subtext: `${openRate}% of total work`,
        progress: openRate,
        icon: (
          <svg viewBox="0 0 24 24" className="h-5 w-5 text-rose-600">
            <path
              d="m12 3 8 8-8 10-8-10z"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
            />
            <circle cx={12} cy={12} r={2} fill="currentColor" />
          </svg>
        ),
        accentClassName: 'bg-rose-100 text-rose-600',
        progressClassName: 'bg-rose-500',
      },
      {
        title: 'In Progress',
        value: `${inProgressCount} tasks`,
        subtext: `${inProgressRate}% of total work`,
        progress: inProgressRate,
        icon: (
          <svg viewBox="0 0 24 24" className="h-5 w-5 text-sky-600">
            <path
              d="M4 4h16v5H4zM4 15h7v5H4zM13 11h7v9h-7z"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
            />
          </svg>
        ),
        accentClassName: 'bg-sky-100 text-sky-600',
        progressClassName: 'bg-sky-500',
      },
      {
        title: 'Completed',
        value: `${completedCount} tasks`,
        subtext: `${completedRate}% of total work`,
        progress: completedRate,
        icon: (
          <svg viewBox="0 0 24 24" className="h-5 w-5 text-emerald-600">
            <path
              d="M20 6 9 17l-5-5"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
            />
          </svg>
        ),
        accentClassName: 'bg-emerald-100 text-emerald-600',
        progressClassName: 'bg-emerald-500',
      },
    ];
  }, [allTasks, tasks]);

  const recentActivity = useMemo(() => {
    return [...allTasks]
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
      .slice(0, 6);
  }, [allTasks]);

  const objectiveSummaries = useMemo<ObjectiveSummary[]>(() => {
    const activeObjectives = objectives.filter((objective) => objective.status !== 'DONE');
    return activeObjectives.map((objective) => {
      const linkedTasks = (objective.linkedTaskIds ?? [])
        .map((taskId) => tasksById.get(taskId))
        .filter((task): task is Task => Boolean(task));
      const totalLinked = linkedTasks.length;
      const completedCount = linkedTasks.filter((task) => task.status === 'DONE').length;
      const progress = totalLinked
        ? Math.round((completedCount / totalLinked) * 100)
        : objective.status === 'DONE'
          ? 100
          : 0;
      return {
        objective,
        progress,
        completedCount,
        totalLinked,
      };
    });
  }, [objectives, tasksById]);

  const firstName = useMemo(() => {
    const name = user?.name ?? user?.email ?? 'there';
    return name.split(' ')[0];
  }, [user?.email, user?.name]);

  if (status === 'loading') {
    return <div className="p-4 md:p-6">Loading dashboard…</div>;
  }

  if (status === 'unauthenticated') {
    return null;
  }

  return (
    <div className="space-y-8 bg-slate-50 p-4 md:p-8">
      <motion.header
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-2"
      >
        <p className="text-sm font-medium text-slate-500">Good morning, {firstName}!</p>
        <h1 className="text-2xl font-semibold text-slate-900">
          Here&rsquo;s what&rsquo;s happening with your team today.
        </h1>
      </motion.header>
      <motion.section
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-1 gap-4 md:grid-cols-3"
      >
        {metrics.map((metric) => (
          <MetricCard key={metric.title} {...metric} />
        ))}
      </motion.section>

      <div className="grid gap-6 lg:grid-cols-5">
        <section className="lg:col-span-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Recent Activity</h2>
              <p className="text-sm text-slate-500">
                Latest updates across your open and completed work.
              </p>
            </div>
          </div>
          <div className="mt-4 space-y-4">
            {recentActivity.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
                No task updates yet—once work starts moving, you&rsquo;ll see it here.
              </div>
            ) : (
              recentActivity.map((task) => <RecentActivityCard key={task._id} task={task} />)
            )}
          </div>
        </section>

        <section className="lg:col-span-2">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Objectives in Progress</h2>
              <p className="text-sm text-slate-500">
                Track how close your active objectives are to completion.
              </p>
            </div>
          </div>
          <div className="mt-4 space-y-4">
            {objectivesLoading ? (
              <div className="rounded-3xl border border-slate-200 bg-white p-6 text-sm text-slate-500">
                Loading objectives…
              </div>
            ) : objectiveSummaries.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-6 text-sm text-slate-500">
                No active objectives right now. When new objectives are started, they&rsquo;ll appear here.
              </div>
            ) : (
              objectiveSummaries.map(({ objective, progress, completedCount, totalLinked }) => (
                <div
                  key={objective._id}
                  className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="text-base font-semibold text-slate-900">{objective.title}</h3>
                      <p className="mt-1 text-sm text-slate-500">
                        {totalLinked > 0
                          ? `${completedCount} of ${totalLinked} linked tasks complete`
                          : 'No linked tasks yet'}
                      </p>
                    </div>
                    <Badge tone="sky">{progress}%</Badge>
                  </div>
                  <div className="mt-4 h-2 rounded-full bg-slate-100">
                    <div
                      className="h-2 rounded-full bg-sky-500"
                      style={{ width: `${Math.min(Math.max(progress, 0), 100)}%` }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <SessionProvider>
      <DashboardInner />
    </SessionProvider>
  );
}

