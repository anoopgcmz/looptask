import dbConnect from '@/lib/db';
import Organization from '@/models/Organization';
import Team from '@/models/Team';
import User from '@/models/User';
import Task from '@/models/Task';

async function run() {
  await dbConnect();
  await Promise.all([
    Organization.deleteMany({}),
    Team.deleteMany({}),
    User.deleteMany({}),
    Task.deleteMany({})
  ]);

  const org = await Organization.create({ name: 'Acme' });
  const team = await Team.create({ name: 'Accounts' });
  const [acc, sr, chief] = await User.create([
    { name: 'Acc', email: 'acc@ex.com', organizationId: org._id, teamId: team._id },
    { name: 'Sr', email: 'sr@ex.com', organizationId: org._id, teamId: team._id },
    { name: 'Chief', email: 'chief@ex.com', organizationId: org._id, teamId: team._id }
  ]);

  const simpleDue = new Date(Date.now() + 2 * 60 * 60 * 1000);
  await Task.create({
    title: 'Simple task',
    creatorId: acc._id,
    ownerId: acc._id,
    organizationId: org._id,
    teamId: team._id,
    dueAt: simpleDue,
  });

  await Task.create({
    title: 'Flow task',
    creatorId: acc._id,
    ownerId: acc._id,
    organizationId: org._id,
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
