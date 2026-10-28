const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const User = require('./models/user');
const Profile = require('./models/profile');
const Project = require('./models/project');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/express-devdb';

async function seedDatabase() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('MongoDB connected for seeding');

    // Clear old data
    await User.deleteMany();
    await Profile.deleteMany();
    await Project.deleteMany();

    // Load JSON files
    const users = JSON.parse(await fs.promises.readFile(path.join(__dirname, 'seed-data/users.json')));
    const profiles = JSON.parse(await fs.promises.readFile(path.join(__dirname, 'seed-data/profiles.json')));
    const projects = JSON.parse(await fs.promises.readFile(path.join(__dirname, 'seed-data/projects.json')));

    // Hash all user passwords
    const hashedUsers = await Promise.all(
      users.map(async (user) => {
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(user.password, salt);
        return user;
      })
    );

    // Insert users first (important for ObjectId references)
    const createdUsers = await User.insertMany(users);
    console.log(`Inserted ${createdUsers.length} users`);

    
    // Set admin password
    const admin = await User.findOne({ role: 'admin' });
    if (admin) {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash('admin123', salt);
      admin.password = hashedPassword;
      await admin.save();
      console.log(`Admin password set to: admin123`);
      console.log(`Admin email: ${admin.email}`);
    } else {
      console.warn('No admin user found in seed data.');
    }

    // Insert profiles
    const createdProfiles = await Profile.insertMany(profiles);
    console.log(`Inserted ${createdProfiles.length} profiles`);

    // Insert projects
    const createdProjects = await Project.insertMany(projects);
    console.log(`Inserted ${createdProjects.length} projects`);

    console.log('Database seeded successfully');
    process.exit(0);
  } catch (err) {
    console.error('Error seeding database:', err);
    process.exit(1);
  }
}

seedDatabase();