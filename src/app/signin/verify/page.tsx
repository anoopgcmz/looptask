'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function VerifyPage() {
  const params = useSearchParams();
  const email = params.get('email') || '';
  const router = useRouter();
  const [code, setCode] = useState('');
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setInterval(() => setCooldown((c) => c - 1), 1000);
    return () => clearInterval(id);
  }, [cooldown]);

  const verify = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/auth/otp/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, code }),
    });
    if (res.ok) {
      router.push('/tasks');
    }
  };

  const resend = async () => {
    const res = await fetch('/api/auth/otp/request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    if (res.ok) setCooldown(60);
  };

  return (
    <div className="flex flex-col gap-2 p-4">
      <p>Enter the code sent to {email}</p>
      <form onSubmit={verify} className="flex flex-col gap-2">
        <input
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          maxLength={6}
          className="border p-2"
        />
        <button type="submit" className="bg-blue-500 text-white p-2">
          Verify
        </button>
      </form>
      <button onClick={resend} disabled={cooldown > 0} className="p-2 border">
        Resend {cooldown > 0 && `(${cooldown})`}
      </button>
    </div>
  );
}
