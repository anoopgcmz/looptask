import dbConnect from '@/lib/db';
import { Organization } from '@/models/Organization';
import { User, type UserDocument } from '@/models/User';

export interface AdminSeedConfig {
  name: string;
  email: string;
  username: string;
  password: string;
  organizationName: string;
  organizationDomain: string;
}

export const getAdminSeedConfig = (): AdminSeedConfig => ({
  name: process.env.SEED_ADMIN_NAME ?? 'LoopTask Admin',
  email: process.env.SEED_ADMIN_EMAIL ?? 'admin@looptask.local',
  username: process.env.SEED_ADMIN_USERNAME ?? 'admin',
  password: process.env.SEED_ADMIN_PASSWORD ?? 'admin123',
  organizationName: process.env.SEED_ADMIN_ORGANIZATION_NAME ?? 'LoopTask',
  organizationDomain:
    process.env.SEED_ADMIN_ORGANIZATION_DOMAIN ?? 'looptask.local',
});

const ensureOrganization = async (
  name: string,
  domain: string
) => {
  const existing = await Organization.findOne({ domain });
  if (existing) {
    return existing;
  }
  return Organization.create({ name, domain });
};

const promoteToAdmin = async (user: UserDocument) => {
  if (user.role !== 'ADMIN') {
    user.role = 'ADMIN';
    await user.save();
  }
  return user;
};

export async function seedAdmin() {
  await dbConnect();
  const config = getAdminSeedConfig();

  const existing = await User.findOne({
    $or: [{ email: config.email }, { username: config.username }],
  });

  if (existing) {
    await promoteToAdmin(existing);
    console.log('Admin account already exists.', {
      email: config.email,
      username: config.username,
    });
    return existing;
  }

  const organization = await ensureOrganization(
    config.organizationName,
    config.organizationDomain
  );

  const user = await User.create({
    name: config.name,
    email: config.email,
    username: config.username,
    password: config.password,
    organizationId: organization._id,
    role: 'ADMIN',
  });

  console.log('Admin account created.', {
    email: config.email,
    username: config.username,
    password: config.password,
  });

  return user;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  seedAdmin()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
