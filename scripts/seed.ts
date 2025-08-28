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
  const [user1, user2, user3, _admin] = await User.create([
    {
      name: 'User One',
      email: 'user1@ex.com',
      username: 'user1',
      password: 'user1',
      organizationId: org._id,
      teamId: team._id,
    },
    {
      name: 'User Two',
      email: 'user2@ex.com',
      username: 'user2',
      password: 'user2',
      organizationId: org._id,
      teamId: team._id,
    },
    {
      name: 'User Three',
      email: 'user3@ex.com',
      username: 'user3',
      password: 'user3',
      organizationId: org._id,
      teamId: team._id,
    },
    {
      name: 'Admin',
      email: 'admin@ex.com',
      username: 'admin',
      password: 'admin',
      organizationId: org._id,
      teamId: team._id,
      isAdmin: true,
    },
  ]);

  const simpleDue = new Date(Date.now() + 2 * 60 * 60 * 1000);
  await Task.create({
    title: 'Simple task',
    creatorId: user1._id,
    ownerId: user1._id,
    organizationId: org._id,
    teamId: team._id,
    dueAt: simpleDue,
  });

  await Task.create({
    title: 'Flow task',
    creatorId: user1._id,
    ownerId: user1._id,
    organizationId: org._id,
    teamId: team._id,
    status: 'FLOW_IN_PROGRESS',
    steps: [
      { ownerId: user1._id, status: 'OPEN' },
      { ownerId: user2._id, status: 'OPEN' },
      { ownerId: user3._id, status: 'OPEN' }
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
