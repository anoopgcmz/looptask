'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';

interface PasswordFormData {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

interface NotificationsFormData {
  email: boolean;
  push: boolean;
  digestFrequency: 'immediate' | 'daily' | 'weekly';
}

interface TimezoneFormData {
  timezone: string;
}

export default function SettingsPage() {
  const {
    register: registerPassword,
    handleSubmit: handlePasswordSubmit,
    formState: { errors: passwordErrors, isSubmitting: passwordSubmitting },
    reset: resetPassword,
  } = useForm<PasswordFormData>();

  const {
    register: registerNotifications,
    handleSubmit: handleNotificationsSubmit,
    formState: { isSubmitting: notificationsSubmitting },
    reset: resetNotifications,
  } = useForm<NotificationsFormData>();

  const {
    register: registerTimezone,
    handleSubmit: handleTimezoneSubmit,
    formState: { errors: timezoneErrors, isSubmitting: timezoneSubmitting },
    reset: resetTimezone,
  } = useForm<TimezoneFormData>();

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);

  const [notificationsError, setNotificationsError] = useState<string | null>(null);
  const [notificationsSuccess, setNotificationsSuccess] = useState<string | null>(null);

  const [timezoneError, setTimezoneError] = useState<string | null>(null);
  const [timezoneSuccess, setTimezoneSuccess] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const [userRes, notifRes] = await Promise.all([
          fetch('/api/users/me'),
          fetch('/api/users/me/notifications'),
        ]);
        if (!userRes.ok) throw new Error('Failed to load user');
        if (!notifRes.ok) throw new Error('Failed to load notifications');
        const user = await userRes.json();
        const prefs = await notifRes.json();
        resetTimezone({ timezone: user.timezone || '' });
        resetNotifications({
          email: prefs.email ?? true,
          push: prefs.push ?? true,
          digestFrequency: prefs.digestFrequency || 'immediate',
        });
      } catch {
        setLoadError('Failed to load settings');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [resetTimezone, resetNotifications]);

  const onPasswordSubmit = async (data: PasswordFormData) => {
    setPasswordError(null);
    setPasswordSuccess(null);
    if (data.newPassword !== data.confirmPassword) {
      setPasswordError('Passwords do not match');
      return;
    }
    try {
      const res = await fetch('/api/users/me/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword: data.currentPassword,
          newPassword: data.newPassword,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.detail || 'Failed to update password');
      }
      resetPassword();
      setPasswordSuccess('Password updated');
    } catch (e: unknown) {
      const err = e as Error;
      setPasswordError(err.message || 'Failed to update password');
    }
  };

  const onNotificationsSubmit = async (data: NotificationsFormData) => {
    setNotificationsError(null);
    setNotificationsSuccess(null);
    try {
      const res = await fetch('/api/users/me/notifications', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.detail || 'Failed to update notifications');
      }
      setNotificationsSuccess('Preferences saved');
    } catch (e: unknown) {
      const err = e as Error;
      setNotificationsError(err.message || 'Failed to update notifications');
    }
  };

  const onTimezoneSubmit = async (data: TimezoneFormData) => {
    setTimezoneError(null);
    setTimezoneSuccess(null);
    try {
      const res = await fetch('/api/users/me', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ timezone: data.timezone }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.detail || 'Failed to update timezone');
      }
      setTimezoneSuccess('Timezone updated');
    } catch (e: unknown) {
      const err = e as Error;
      setTimezoneError(err.message || 'Failed to update timezone');
    }
  };

  if (loading) return <p className="p-4">Loading...</p>;
  if (loadError) return <p className="p-4 text-red-500">{loadError}</p>;

  return (
    <div className="p-4 flex flex-col gap-8 max-w-md">
      <section>
        <h2 className="text-lg font-bold mb-2">Change Password</h2>
        <form
          onSubmit={handlePasswordSubmit(onPasswordSubmit)}
          className="flex flex-col gap-2"
        >
          <input
            type="password"
            placeholder="Current Password"
            className="border p-2"
            {...registerPassword('currentPassword', {
              required: 'Current password is required',
            })}
          />
          {passwordErrors.currentPassword && (
            <p className="text-red-500">{passwordErrors.currentPassword.message}</p>
          )}
          <input
            type="password"
            placeholder="New Password"
            className="border p-2"
            {...registerPassword('newPassword', {
              required: 'New password is required',
            })}
          />
          {passwordErrors.newPassword && (
            <p className="text-red-500">{passwordErrors.newPassword.message}</p>
          )}
          <input
            type="password"
            placeholder="Confirm Password"
            className="border p-2"
            {...registerPassword('confirmPassword', {
              required: 'Confirm password is required',
            })}
          />
          {passwordErrors.confirmPassword && (
            <p className="text-red-500">{passwordErrors.confirmPassword.message}</p>
          )}
          {passwordError && <p className="text-red-500">{passwordError}</p>}
          {passwordSuccess && <p className="text-green-500">{passwordSuccess}</p>}
          <button
            type="submit"
            className="bg-blue-500 text-white p-2"
            disabled={passwordSubmitting}
          >
            {passwordSubmitting ? 'Saving...' : 'Save'}
          </button>
        </form>
      </section>

      <section>
        <h2 className="text-lg font-bold mb-2">Notification Preferences</h2>
        <form
          onSubmit={handleNotificationsSubmit(onNotificationsSubmit)}
          className="flex flex-col gap-2"
        >
          <label className="flex items-center gap-2">
            <input type="checkbox" {...registerNotifications('email')} />
            <span>Email Notifications</span>
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" {...registerNotifications('push')} />
            <span>Push Notifications</span>
          </label>
          <label className="flex items-center gap-2">
            <span>Digest Frequency</span>
            <select
              className="border p-2"
              {...registerNotifications('digestFrequency')}
            >
              <option value="immediate">Immediate</option>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
            </select>
          </label>
          {notificationsError && <p className="text-red-500">{notificationsError}</p>}
          {notificationsSuccess && <p className="text-green-500">{notificationsSuccess}</p>}
          <button
            type="submit"
            className="bg-blue-500 text-white p-2"
            disabled={notificationsSubmitting}
          >
            {notificationsSubmitting ? 'Saving...' : 'Save'}
          </button>
        </form>
      </section>

      <section>
        <h2 className="text-lg font-bold mb-2">Timezone</h2>
        <form
          onSubmit={handleTimezoneSubmit(onTimezoneSubmit)}
          className="flex flex-col gap-2"
        >
          <select
            className="border p-2"
            {...registerTimezone('timezone', { required: 'Timezone is required' })}
          >
            {Intl.supportedValuesOf('timeZone').map((tz) => (
              <option key={tz} value={tz}>
                {tz}
              </option>
            ))}
          </select>
          {timezoneErrors.timezone && (
            <p className="text-red-500">{timezoneErrors.timezone.message}</p>
          )}
          {timezoneError && <p className="text-red-500">{timezoneError}</p>}
          {timezoneSuccess && <p className="text-green-500">{timezoneSuccess}</p>}
          <button
            type="submit"
            className="bg-blue-500 text-white p-2"
            disabled={timezoneSubmitting}
          >
            {timezoneSubmitting ? 'Saving...' : 'Save'}
          </button>
        </form>
      </section>
    </div>
  );
}

