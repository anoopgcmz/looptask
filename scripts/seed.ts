import dbConnect from '@/lib/db';
import { Organization } from '@/models/Organization';
import { Team } from '@/models/Team';
import { User } from '@/models/User';
import { Task } from '@/models/Task';

export async function seed() {
  await dbConnect();
  await Promise.all([
    Organization.deleteMany({}),
    Team.deleteMany({}),
    User.deleteMany({}),
    Task.deleteMany({})
  ]);

  const organizations = await Organization.create([
    { name: 'Acme', domain: 'acme.com' },
    { name: 'Globex', domain: 'globex.com' },
    { name: 'Initech', domain: 'initech.com' },
  ]);

  for (const org of organizations) {
    const team = await Team.create({ name: `${org.name} Team` });
    const base = org.name.toLowerCase().replace(/\s+/g, '');
    const users = await User.create([
      {
        name: 'User One',
        email: `user1@${org.domain}`,
        username: `${base}user1`,
        password: 'user1',
        organizationId: org._id,
        teamId: team._id,
      },
      {
        name: 'User Two',
        email: `user2@${org.domain}`,
        username: `${base}user2`,
        password: 'user2',
        organizationId: org._id,
        teamId: team._id,
      },
      {
        name: 'User Three',
        email: `user3@${org.domain}`,
        username: `${base}user3`,
        password: 'user3',
        organizationId: org._id,
        teamId: team._id,
      },
      {
        name: 'Admin',
        email: `admin@${org.domain}`,
        username: `${base}admin`,
        password: 'admin',
        organizationId: org._id,
        teamId: team._id,
        role: 'ADMIN',
      },
    ]);
    const [user1, user2, user3] = users;
    if (!user1 || !user2 || !user3) {
      throw new Error('Failed to create seed users');
    }

    const simpleDue = new Date(Date.now() + 2 * 60 * 60 * 1000);
    await Task.create({
      title: 'Simple task',
      createdBy: user1._id,
      ownerId: user1._id,
      organizationId: org._id,
      teamId: team._id,
      dueDate: simpleDue,
    });

    await Task.create({
      title: 'Flow task',
      createdBy: user1._id,
      ownerId: user1._id,
      organizationId: org._id,
      teamId: team._id,
      status: 'FLOW_IN_PROGRESS',
      steps: [
        { title: 'Step 1', ownerId: user1._id, status: 'OPEN' },
        { title: 'Step 2', ownerId: user2._id, status: 'OPEN' },
        { title: 'Step 3', ownerId: user3._id, status: 'OPEN' }
      ],
      currentStepIndex: 0,
    });
  }

  console.log('Seeding complete');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  seed()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
