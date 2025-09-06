import webpush from 'web-push';
import type { PushSubscription } from '@/models/User';

const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails('mailto:notify@example.com', VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
}

export async function sendPush(
  subscription: PushSubscription,
  data: Record<string, unknown>
) {
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) return;
  try {
    await webpush.sendNotification(subscription, JSON.stringify(data));
  } catch {
    // ignore errors for now
  }
}

export async function sendPushToUser(
  user: { pushSubscriptions?: PushSubscription[] },
  data: Record<string, unknown>
) {
  const subs: PushSubscription[] = user.pushSubscriptions || [];
  await Promise.all(subs.map((s) => sendPush(s, data)));
}
