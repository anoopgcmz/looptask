'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { SessionProvider } from 'next-auth/react';
import { Card } from '@/components/ui/card';
import type { ProjectSummary } from '@/types/api/project';

function ProjectsPageInner() {
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadProjects = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await fetch('/api/projects', { credentials: 'include' });
        if (!response.ok) {
          throw new Error('Unable to load projects');
        }
        const data = (await response.json()) as ProjectSummary[];
        if (isMounted) {
          setProjects(data);
        }
      } catch (err: unknown) {
        if (!isMounted) return;
        const message = err instanceof Error ? err.message : 'Unable to load projects';
        setError(message);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    void loadProjects();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--tone-text-strong)]">Projects</h1>
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">
            Track initiatives, monitor progress, and drill into tasks for each project.
          </p>
        </div>
        <Link
          href="/projects/new"
          className="inline-flex items-center justify-center rounded-[10px] bg-[var(--brand-primary)] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[var(--brand-primary)]/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary)] focus-visible:ring-offset-2"
        >
          Add Project
        </Link>
      </div>

      {loading ? (
        <Card className="border-dashed text-sm text-[var(--color-text-muted)]">
          Loading projects…
        </Card>
      ) : error ? (
        <Card className="border-[var(--color-status-destructive)]/40 bg-[var(--status-destructive-soft)] text-sm text-[var(--color-status-destructive)]">
          {error}
        </Card>
      ) : projects.length === 0 ? (
        <Card className="flex flex-col items-start gap-4 text-sm text-[var(--color-text-muted)]">
          <div>
            <p className="text-base font-semibold text-[var(--tone-text-strong)]">No projects yet</p>
            <p className="mt-1 max-w-xl text-sm text-[var(--color-text-muted)]">
              Create your first project to organize related tasks and collaborate with your team.
            </p>
          </div>
          <Link
            href="/projects/new"
            className="inline-flex items-center justify-center rounded-[10px] bg-[var(--brand-primary)] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[var(--brand-primary)]/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-primary)] focus-visible:ring-offset-2"
          >
            Add Project
          </Link>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {projects.map((project) => {
            const description = project.description?.trim();
            return (
              <Link key={project._id} href={`/projects/${project._id}`} className="block h-full">
                <Card className="flex h-full flex-col justify-between">
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h2 className="text-lg font-semibold text-[var(--tone-text-strong)]">
                          {project.name}
                        </h2>
                        {project.type?.name ? (
                          <span className="mt-1 inline-flex items-center rounded-full bg-[var(--brand-primary)]/10 px-2.5 py-0.5 text-xs font-medium text-[var(--brand-primary)]">
                            {project.type.name}
                          </span>
                        ) : null}
                      </div>
                      <span aria-hidden="true" className="text-xl text-[var(--color-text-muted)]">
                        →
                      </span>
                    </div>
                    <p className="line-clamp-3 text-sm text-[var(--color-text-muted)]">
                      {description && description.length > 0
                        ? description
                        : 'No description provided yet.'}
                    </p>
                  </div>
                  <div className="mt-6 grid grid-cols-3 gap-3">
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-[var(--color-text-muted)]">
                        Pending
                      </p>
                      <p className="mt-1 text-lg font-semibold text-[var(--tone-text-strong)]">
                        {project.stats.pending}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-[var(--color-text-muted)]">
                        Done
                      </p>
                      <p className="mt-1 text-lg font-semibold text-[var(--tone-text-strong)]">
                        {project.stats.done}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-[var(--color-text-muted)]">
                        Total
                      </p>
                      <p className="mt-1 text-lg font-semibold text-[var(--tone-text-strong)]">
                        {project.stats.total}
                      </p>
                    </div>
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function ProjectsPage() {
  return (
    <SessionProvider>
      <ProjectsPageInner />
    </SessionProvider>
  );
}
