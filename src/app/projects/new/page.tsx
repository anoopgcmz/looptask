'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { SessionProvider } from 'next-auth/react';
import { Dialog, DialogContent, DialogTrigger, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { useToast } from '@/components/ui/toast-provider';
import type { ProjectType } from '@/types/api/project';

interface ProjectFormState {
  name: string;
  description: string;
  typeId: string;
}

function NewProjectPageInner() {
  const router = useRouter();
  const { showToast } = useToast();

  const [types, setTypes] = useState<ProjectType[]>([]);
  const [typesLoading, setTypesLoading] = useState(true);
  const [form, setForm] = useState<ProjectFormState>({
    name: '',
    description: '',
    typeId: '',
  });
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof ProjectFormState, string>>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [typeDialogOpen, setTypeDialogOpen] = useState(false);
  const [newTypeName, setNewTypeName] = useState('');
  const [newTypeError, setNewTypeError] = useState<string | null>(null);
  const [creatingType, setCreatingType] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const loadTypes = async () => {
      try {
        setTypesLoading(true);
        const response = await fetch('/api/project-types', { credentials: 'include' });
        if (!response.ok) {
          throw new Error('Unable to load project types');
        }
        const data = (await response.json()) as ProjectType[];
        if (!isMounted) {
          return;
        }
        setTypes(data);
        setForm((prev) => {
          if (prev.typeId) {
            return prev;
          }
          const defaultType = data.find((type) => type.name.toLowerCase() === 'general');
          const fallbackType = defaultType ?? data[0];
          return { ...prev, typeId: fallbackType?._id ?? '' };
        });
      } catch {
        if (!isMounted) return;
        setTypes([]);
      } finally {
        if (isMounted) {
          setTypesLoading(false);
        }
      }
    };

    void loadTypes();

    return () => {
      isMounted = false;
    };
  }, []);

  const existingTypeNames = useMemo(
    () => types.map((type) => type.name.trim().toLowerCase()),
    [types]
  );

  const validateForm = (state: ProjectFormState) => {
    const errors: Partial<Record<keyof ProjectFormState, string>> = {};
    if (!state.name.trim()) {
      errors.name = 'Project name is required';
    }
    if (!state.typeId) {
      errors.typeId = 'Select a project type';
    }
    return errors;
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedState: ProjectFormState = {
      name: form.name.trim(),
      description: form.description.trim(),
      typeId: form.typeId,
    };
    const nextErrors = validateForm(trimmedState);
    setFormErrors(nextErrors);
    setSubmitError(null);
    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch('/api/projects', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: trimmedState.name,
          description: trimmedState.description || undefined,
          typeId: trimmedState.typeId,
        }),
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { detail?: string };
        throw new Error(body.detail ?? 'Failed to create project');
      }
      const project = (await response.json()) as { _id?: string };
      showToast({ message: 'Project created successfully', tone: 'success' });
      if (project?._id) {
        router.push(`/projects/${project._id}`);
      } else {
        router.push('/projects');
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to create project';
      setSubmitError(message);
      showToast({ message, tone: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateType = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmed = newTypeName.trim();
    if (!trimmed) {
      setNewTypeError('Enter a project type name');
      return;
    }
    if (existingTypeNames.includes(trimmed.toLowerCase())) {
      setNewTypeError('That project type already exists');
      return;
    }
    setCreatingType(true);
    try {
      const response = await fetch('/api/project-types', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: trimmed }),
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { detail?: string };
        throw new Error(body.detail ?? 'Failed to create project type');
      }
      const created = (await response.json()) as ProjectType;
      setTypes((prev) => [...prev, created]);
      setForm((prev) => ({ ...prev, typeId: created._id }));
      setNewTypeName('');
      setNewTypeError(null);
      setTypeDialogOpen(false);
      showToast({ message: 'Project type added', tone: 'success' });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to create project type';
      setNewTypeError(message);
    } finally {
      setCreatingType(false);
    }
  };

  return (
    <div className="p-4 md:p-6">
      <div className="mx-auto max-w-3xl space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--tone-text-strong)]">Create a new project</h1>
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">
            Group related tasks, assign owners, and monitor progress at a glance.
          </p>
        </div>

        <Card>
          <form className="space-y-5" onSubmit={handleSubmit} noValidate>
            <div className="space-y-2">
              <label className="text-sm font-medium text-[var(--tone-text-strong)]" htmlFor="project-name">
                Project name
              </label>
              <Input
                id="project-name"
                name="name"
                value={form.name}
                onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                placeholder="Marketing website refresh"
                aria-invalid={Boolean(formErrors.name)}
                aria-describedby={formErrors.name ? 'project-name-error' : undefined}
                required
              />
              {formErrors.name ? (
                <p id="project-name-error" className="text-xs text-[var(--color-status-destructive)]">
                  {formErrors.name}
                </p>
              ) : null}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-[var(--tone-text-strong)]" htmlFor="project-description">
                Description
              </label>
              <Input
                id="project-description"
                name="description"
                value={form.description}
                onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
                placeholder="Share context and goals for this project"
              />
              <p className="text-xs text-[var(--color-text-muted)]">Optional</p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-[var(--tone-text-strong)]" htmlFor="project-type">
                Project type
              </label>
              <div className="flex items-center gap-2">
                <Select
                  id="project-type"
                  name="typeId"
                  value={form.typeId}
                  onChange={(event) => setForm((prev) => ({ ...prev, typeId: event.target.value }))}
                  disabled={typesLoading}
                  aria-invalid={Boolean(formErrors.typeId)}
                  aria-describedby={formErrors.typeId ? 'project-type-error' : undefined}
                  required
                >
                  <option value="" disabled>
                    {typesLoading ? 'Loading types…' : 'Select a type'}
                  </option>
                  {types.map((type) => (
                    <option key={type._id} value={type._id}>
                      {type.name}
                    </option>
                  ))}
                </Select>
                <Dialog open={typeDialogOpen} onOpenChange={(next) => {
                  setTypeDialogOpen(next);
                  if (!next) {
                    setNewTypeError(null);
                    setNewTypeName('');
                  }
                }}>
                  <DialogTrigger asChild>
                    <Button type="button" variant="secondary" size="icon" aria-label="Add project type">
                      <span aria-hidden="true" className="text-lg font-semibold text-[var(--brand-primary)]">
                        +
                      </span>
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <form className="space-y-4" onSubmit={handleCreateType}>
                      <div className="space-y-2">
                        <h2 className="text-lg font-semibold text-[var(--tone-text-strong)]">Add a project type</h2>
                        <p className="text-sm text-[var(--color-text-muted)]">
                          Give your new type a descriptive name so teammates can find it later.
                        </p>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-[var(--tone-text-strong)]" htmlFor="new-project-type">
                          Type name
                        </label>
                        <Input
                          id="new-project-type"
                          value={newTypeName}
                          onChange={(event) => {
                            setNewTypeName(event.target.value);
                            if (newTypeError) {
                              setNewTypeError(null);
                            }
                          }}
                          placeholder="General"
                          autoFocus
                        />
                        {newTypeError ? (
                          <p className="text-xs text-[var(--color-status-destructive)]">{newTypeError}</p>
                        ) : null}
                      </div>
                      <div className="flex items-center justify-end gap-3">
                        <DialogClose asChild>
                          <Button type="button" variant="ghost">
                            Cancel
                          </Button>
                        </DialogClose>
                        <Button type="submit" disabled={creatingType}>
                          {creatingType ? 'Saving…' : 'Add type'}
                        </Button>
                      </div>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
              {formErrors.typeId ? (
                <p id="project-type-error" className="text-xs text-[var(--color-status-destructive)]">
                  {formErrors.typeId}
                </p>
              ) : null}
            </div>

            {submitError ? (
              <div className="rounded-[10px] border border-[var(--color-status-destructive)]/40 bg-[var(--status-destructive-soft)] p-3 text-sm text-[var(--color-status-destructive)]">
                {submitError}
              </div>
            ) : null}

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button type="button" variant="secondary" onClick={() => router.push('/projects')}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? 'Creating…' : 'Create project'}
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
}

export default function NewProjectPage() {
  return (
    <SessionProvider>
      <NewProjectPageInner />
    </SessionProvider>
  );
}
