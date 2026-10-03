require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

const mongoose = require('mongoose');
const connectDB = require('../config/db');
const Brokerage = require('../models/Brokerage');
const User = require('../models/User');

const PASSWORD = 'Password123!';

const brokerages = [
  {
    name: 'Northbridge Mortgage',
    slug: 'northbridge',
    webhookSecret: 'northbridge-webhook-secret',
  },
  {
    name: 'Southgate Mortgage',
    slug: 'southgate',
    webhookSecret: 'southgate-webhook-secret',
  },
];

function usersForBrokerage(brokerage) {
  const slug = brokerage.slug;

  return [
    {
      name: `${brokerage.name} Admin`,
      email: `admin.${slug}@leadflow.test`,
      role: 'brokerage_admin',
    },
    {
      name: `${brokerage.name} Advisor`,
      email: `advisor.${slug}@leadflow.test`,
      role: 'advisor',
    },
    {
      name: `${brokerage.name} Client`,
      email: `client.${slug}@leadflow.test`,
      role: 'client',
    },
  ];
}

async function seed() {
  await connectDB();

  // This foundation seed only resets brokerages and users.
  await User.deleteMany({});
  await Brokerage.deleteMany({});

  const createdBrokerages = await Brokerage.create(brokerages);

  await User.create({
    name: 'Platform Admin',
    email: 'platform@leadflow.test',
    password: PASSWORD,
    role: 'platform_admin',
    brokerageId: null,
  });

  for (const brokerage of createdBrokerages) {
    for (const person of usersForBrokerage(brokerage)) {
      await User.create({
        ...person,
        password: PASSWORD,
        brokerageId: brokerage._id,
      });
    }
  }

  console.log('Seed complete. Every account uses the password:', PASSWORD);
  console.log('Platform admin: platform@leadflow.test');
  console.log('Northbridge: admin.northbridge@leadflow.test, advisor.northbridge@leadflow.test, client.northbridge@leadflow.test');
  console.log('Southgate: admin.southgate@leadflow.test, advisor.southgate@leadflow.test, client.southgate@leadflow.test');
  console.log('Webhook header x-webhook-secret: northbridge-webhook-secret or southgate-webhook-secret');

  await mongoose.disconnect();
}

seed().catch(async (error) => {
  console.error('Seed failed:', error.message);
  await mongoose.disconnect();
  process.exit(1);
});
