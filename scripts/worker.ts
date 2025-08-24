import agenda, { initAgenda, DEFAULT_TZ } from '@/lib/agenda';
import User from '@/models/User';
import Team from '@/models/Team';

agenda.define('task.dueSoon', async (job) => {
  console.log('task.dueSoon', job.attrs.data);
});

agenda.define('task.dueNow', async (job) => {
  console.log('task.dueNow', job.attrs.data);
});

agenda.define('task.overdueDigest', async (job) => {
  console.log('task.overdueDigest', job.attrs.data);
});

agenda.define('dashboard.dailySnapshot', async (job) => {
  console.log('dashboard.dailySnapshot', job.attrs.data);
});

(async () => {
  await initAgenda();
  await agenda.start();
  const users = await User.find({ isActive: true });
  for (const user of users) {
    await agenda.every(
      '0 9 * * *',
      'task.overdueDigest',
      { userId: user._id.toString() },
      {
        timezone: user.timezone || DEFAULT_TZ,
        unique: { name: 'task.overdueDigest', 'data.userId': user._id.toString() },
        skipImmediate: true,
      }
    );
  }
  const teams = await Team.find({});
  for (const team of teams) {
    const tz = (team as any).timezone || DEFAULT_TZ;
    await agenda.every(
      '0 18 * * *',
      'dashboard.dailySnapshot',
      { teamId: team._id.toString() },
      {
        timezone: tz,
        unique: { name: 'dashboard.dailySnapshot', 'data.teamId': team._id.toString() },
        skipImmediate: true,
      }
    );
  }
  console.log('Worker started');
})();
