import dbConnect from '@/lib/db';
import User, { type IUser } from '@/models/User';
import Notification, { type INotification } from '@/models/Notification';
import { Resend } from 'resend';
import path from 'path';
import { promises as fs } from 'fs';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

async function loadTemplate(): Promise<string> {
  const fullPath = path.join(process.cwd(), 'src', 'emails', 'notification-digest.html');
  return fs.readFile(fullPath, 'utf8');
}

async function main() {
  await dbConnect();
  const template = await loadTemplate();
  const now = new Date();
  const users = await User.find({
    isActive: true,
    'notificationSettings.digestFrequency': { $ne: 'immediate' },
    'notificationSettings.email': { $ne: false },
  });

  for (const user of users) {
    const prefs: Partial<IUser['notificationSettings']> =
      user.notificationSettings ?? {};
    const freq = prefs.digestFrequency;
    const last: Date = prefs.lastDigestAt || new Date(0);
    const interval = freq === 'weekly' ? 7 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000;
    if (now.getTime() - last.getTime() < interval) continue;

    const notifications = await Notification.find({
      userId: user._id,
      read: false,
      createdAt: { $gt: last },
    }).lean();
    if (!notifications.length) continue;

    const listItems = notifications
      .map((n: INotification) => `<li>${n.message}</li>`)
      .join('');
    const html = template.replace('{{content}}', listItems);
    if (resend) {
      await resend.emails.send({
        from: 'notify@example.com',
        to: user.email,
        subject: 'Notification Digest',
        html,
      });
    }
    await User.updateOne(
      { _id: user._id },
      { 'notificationSettings.lastDigestAt': now }
    );
  }
  console.log('Digest complete');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
