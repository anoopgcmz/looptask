'use client';

import { useState } from 'react';
import { SessionProvider } from 'next-auth/react';
import useAuth from '@/hooks/useAuth';

const domainPattern = /^(?!-)(?:[a-zA-Z0-9-]{1,63}\.)+[a-zA-Z]{2,}$/;

type CreateOrganizationResponse = {
  organization: {
    id: string;
    name: string;
    domain: string;
  };
  invitation: {
    email: string;
    role: 'ADMIN' | 'USER';
    token: string;
    expiresAt: string;
  };
};

function NewOrganizationForm() {
  const { user, isLoading } = useAuth();
  const [form, setForm] = useState({
    name: '',
    domain: '',
    email: '',
    role: 'ADMIN' as 'ADMIN' | 'USER',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState<CreateOrganizationResponse | null>(null);
  const [isSubmitting, setSubmitting] = useState(false);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setSuccess(null);

    if (!form.name.trim()) {
      setError('Organization name is required.');
      return;
    }

    if (!domainPattern.test(form.domain.trim())) {
      setError('Please enter a valid domain (e.g., acme.com).');
      return;
    }

    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email.trim())) {
      setError('Please enter a valid email address.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/organizations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name.trim(),
          domain: form.domain.trim(),
          initialAdmin: {
            email: form.email.trim(),
            role: form.role,
          },
        }),
      });

      const data = (await res.json().catch(() => null)) as
        | CreateOrganizationResponse
        | { detail?: string }
        | null;

      if (!res.ok) {
        setError((data && 'detail' in data && data.detail) || 'Failed to create organization.');
        return;
      }

      if (data && 'organization' in data) {
        setSuccess(data as CreateOrganizationResponse);
        setForm({ name: '', domain: '', email: '', role: 'ADMIN' });
      } else {
        setError('Unexpected response from server.');
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unexpected error';
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  if (!isLoading && user && user.role !== 'PLATFORM') {
    return (
      <div className="p-6">
        <p className="rounded border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          You do not have permission to create organizations.
        </p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
      <form
        onSubmit={handleSubmit}
        className="flex w-full max-w-lg flex-col gap-4 rounded-lg border border-slate-200 bg-white p-6 shadow-sm"
      >
        <div className="space-y-1">
          <h1 className="text-xl font-semibold text-slate-900">Create organization</h1>
          <p className="text-sm text-slate-600">
            Provision a new tenant and send the first invitation to the product champion.
          </p>
        </div>

        {error && (
          <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>
        )}

        {success && (
          <div className="space-y-2 rounded border border-green-200 bg-green-50 p-3 text-sm text-green-700">
            <p>
              Organization <strong>{success.organization.name}</strong> created. Invitation token for{' '}
              <strong>{success.invitation.email}</strong> expires on{' '}
              {new Date(success.invitation.expiresAt).toLocaleString()}.
            </p>
            <p className="break-words font-mono text-xs text-green-800">
              Token: {success.invitation.token}
            </p>
          </div>
        )}

        <label className="flex flex-col gap-2">
          <span className="text-sm font-medium text-slate-700">Organization name</span>
          <input
            name="name"
            value={form.name}
            onChange={handleChange}
            placeholder="Acme Inc."
            className="rounded border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
            required
          />
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-sm font-medium text-slate-700">Primary domain</span>
          <input
            name="domain"
            value={form.domain}
            onChange={handleChange}
            placeholder="acme.com"
            className="rounded border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
            required
          />
        </label>

        <div className="rounded border border-slate-200 bg-slate-50 p-4">
          <h2 className="text-sm font-semibold text-slate-800">Initial admin</h2>
          <div className="mt-3 flex flex-col gap-3">
            <label className="flex flex-col gap-2">
              <span className="text-sm font-medium text-slate-700">Email</span>
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                placeholder="champion@acme.com"
                className="rounded border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                required
              />
            </label>

            <label className="flex flex-col gap-2">
              <span className="text-sm font-medium text-slate-700">Role</span>
              <select
                name="role"
                value={form.role}
                onChange={handleChange}
                className="rounded border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
              >
                <option value="ADMIN">Admin</option>
                <option value="USER">Member</option>
              </select>
            </label>
          </div>
        </div>

        <button
          type="submit"
          className="mt-2 rounded bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-300"
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Creating…' : 'Create organization'}
        </button>
      </form>
    </div>
  );
}

export default function NewOrganizationPage() {
  return (
    <SessionProvider>
      <NewOrganizationForm />
    </SessionProvider>
  );
}
