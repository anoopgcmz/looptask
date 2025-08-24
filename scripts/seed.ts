import dbConnect from '@/lib/db';
import Team from '@/models/Team';
import User from '@/models/User';
import Task from '@/models/Task';

async function run() {
  await dbConnect();
  await Promise.all([
    Team.deleteMany({}),
    User.deleteMany({}),
    Task.deleteMany({})
  ]);

  const team = await Team.create({ name: 'Accounts' });
  const [acc, sr, chief] = await User.create([
    { name: 'Acc', email: 'acc@ex.com', teamId: team._id },
    { name: 'Sr', email: 'sr@ex.com', teamId: team._id },
    { name: 'Chief', email: 'chief@ex.com', teamId: team._id }
  ]);

  const simpleDue = new Date(Date.now() + 2 * 60 * 60 * 1000);
  await Task.create({
    title: 'Simple task',
    creatorId: acc._id,
    ownerId: acc._id,
    teamId: team._id,
    dueAt: simpleDue,
  });

  await Task.create({
    title: 'Flow task',
    creatorId: acc._id,
    ownerId: acc._id,
    teamId: team._id,
    status: 'FLOW_IN_PROGRESS',
    steps: [
      { ownerId: acc._id, status: 'OPEN' },
      { ownerId: sr._id, status: 'OPEN' },
      { ownerId: chief._id, status: 'OPEN' }
    ],
    currentStepIndex: 0,
  });

  console.log('Seeding complete');
  process.exit(0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
