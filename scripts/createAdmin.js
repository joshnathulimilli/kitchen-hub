require('dotenv').config();

const connectDB = require('../src/config/db');
const User = require('../src/models/User');

const createAdmin = async () => {
  const [, , email, password, name = 'System Admin'] = process.argv;

  if (!email || !password) {
    console.error('Usage: npm.cmd run create-admin -- admin@example.com Admin@12345 "Admin User"');
    process.exit(1);
  }

  await connectDB();

  const existingUser = await User.findOne({ email });
  if (existingUser) {
    existingUser.role = 'admin';
    existingUser.name = name;
    existingUser.password = password;
    await existingUser.save();
    console.log(`Updated existing user as admin: ${email}`);
    process.exit(0);
  }

  await User.create({
    name,
    email,
    password,
    role: 'admin'
  });

  console.log(`Created admin user: ${email}`);
  process.exit(0);
};

createAdmin().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
