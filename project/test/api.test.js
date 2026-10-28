process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
process.env.MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/devconnector_test';

const mongoose = require('mongoose');
const request = require('supertest');
const { expect } = require('chai');

const app = require('../server');
const User = require('../models/user');
const Profile = require('../models/profile');
const Project = require('../models/project');

async function waitForMongoConnection(timeoutMs = 10000) {
  const start = Date.now();
  while (mongoose.connection.readyState !== 1) {
    if (Date.now() - start > timeoutMs) {
      throw new Error('Timed out waiting for MongoDB connection');
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
}

async function registerAndLogin(email, role = 'user') {
  const password = 'Password123!';

  const registerRes = await request(app)
    .post('/api/auth/register')
    .send({ name: 'Test User', email, password });

  expect(registerRes.status).to.equal(201);

  if (role === 'admin') {
    await User.updateOne({ email }, { $set: { role: 'admin' } });
  }

  const loginRes = await request(app)
    .post('/api/auth/login')
    .send({ email, password });

  expect(loginRes.status).to.equal(200);
  expect(loginRes.body).to.have.property('token');
  return loginRes.body.token;
}

describe('DevConnector API', function () {
  this.timeout(20000);

  before(async () => {
    await waitForMongoConnection();
  });

  beforeEach(async () => {
    await Promise.all([
      User.deleteMany({}),
      Profile.deleteMany({}),
      Project.deleteMany({})
    ]);
  });

  after(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
  });

  describe('Auth Routes', () => {
    it('registers a user and returns 201', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          name: 'Alice',
          email: 'alice.test@example.com',
          password: 'Password123!'
        });

      expect(res.status).to.equal(201);
      expect(res.body.message).to.equal('User registered successfully');
    });

    it('logs in and accesses protected /api/auth/me', async () => {
      const token = await registerAndLogin('bob.test@example.com');

      const meRes = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(meRes.status).to.equal(200);
      expect(meRes.body).to.include.keys('_id', 'name', 'email', 'role');
      expect(meRes.body.email).to.equal('bob.test@example.com');
    });
  });

  describe('Profile Routes', () => {
    it('creates and fetches profiles', async () => {
      const token = await registerAndLogin('carol.test@example.com');

      const createRes = await request(app)
        .post('/api/profiles')
        .set('Authorization', `Bearer ${token}`)
        .send({
          bio: 'Backend developer',
          location: 'Remote',
          skills: 'Node.js,Express,MongoDB',
          social: {
            github: 'https://github.com/carol',
            linkedin: 'https://linkedin.com/in/carol'
          }
        });

      expect(createRes.status).to.equal(200);
      expect(createRes.body).to.have.property('bio', 'Backend developer');
      expect(createRes.body.skills).to.deep.equal(['Node.js', 'Express', 'MongoDB']);

      const listRes = await request(app).get('/api/profiles');
      expect(listRes.status).to.equal(200);
      expect(listRes.body).to.have.lengthOf(1);
    });

    it('deletes own profile', async () => {
      const token = await registerAndLogin('david.test@example.com');

      await request(app)
        .post('/api/profiles')
        .set('Authorization', `Bearer ${token}`)
        .send({ bio: 'I can be deleted' });

      const deleteRes = await request(app)
        .delete('/api/profiles')
        .set('Authorization', `Bearer ${token}`);

      expect(deleteRes.status).to.equal(200);
      expect(deleteRes.body.message).to.equal('Profile deleted successfully');
    });
  });

  describe('Project Routes', () => {
    it('supports project CRUD + like + comment', async () => {
      const token = await registerAndLogin('erin.test@example.com');

      const createRes = await request(app)
        .post('/api/projects')
        .set('Authorization', `Bearer ${token}`)
        .send({
          title: 'Portfolio API',
          description: 'A test project',
          techStack: ['Node.js', 'MongoDB'],
          repoLink: 'https://github.com/example/portfolio-api'
        });

      expect(createRes.status).to.equal(201);
      expect(createRes.body).to.have.property('_id');
      const projectId = createRes.body._id;

      const getRes = await request(app).get(`/api/projects/${projectId}`);
      expect(getRes.status).to.equal(200);
      expect(getRes.body.title).to.equal('Portfolio API');

      const updateRes = await request(app)
        .put(`/api/projects/${projectId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ title: 'Updated Portfolio API' });
      expect(updateRes.status).to.equal(200);
      expect(updateRes.body.title).to.equal('Updated Portfolio API');

      const likeRes = await request(app)
        .put(`/api/projects/${projectId}/like`)
        .set('Authorization', `Bearer ${token}`);
      expect(likeRes.status).to.equal(200);
      expect(likeRes.body.likes).to.equal(1);

      const commentRes = await request(app)
        .post(`/api/projects/${projectId}/comments`)
        .set('Authorization', `Bearer ${token}`)
        .send({ text: 'Nice project!' });
      expect(commentRes.status).to.equal(200);
      expect(commentRes.body).to.have.lengthOf(1);
      expect(commentRes.body[0].text).to.equal('Nice project!');

      const deleteRes = await request(app)
        .delete(`/api/projects/${projectId}`)
        .set('Authorization', `Bearer ${token}`);
      expect(deleteRes.status).to.equal(200);
      expect(deleteRes.body.message).to.equal('Project deleted successfully');
    });
  });

  describe('Admin Routes', () => {
    it('allows admin to delete any project', async () => {
      const userToken = await registerAndLogin('owner.test@example.com');
      const adminToken = await registerAndLogin('admin.project@example.com', 'admin');

      const createProjectRes = await request(app)
        .post('/api/projects')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          title: 'Project To Delete',
          description: 'Owned by regular user',
          repoLink: 'https://github.com/example/project-to-delete'
        });

      expect(createProjectRes.status).to.equal(201);
      const projectId = createProjectRes.body._id;

      const adminDeleteRes = await request(app)
        .delete(`/api/projects/${projectId}/admin`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(adminDeleteRes.status).to.equal(200);
      expect(adminDeleteRes.body.message).to.equal('Project deleted by admin.');
    });

    it('allows admin to delete any profile', async () => {
      const userToken = await registerAndLogin('profile.owner@example.com');
      const adminToken = await registerAndLogin('admin.profile@example.com', 'admin');

      const createProfileRes = await request(app)
        .post('/api/profiles')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ bio: 'Profile owned by regular user' });

      expect(createProfileRes.status).to.equal(200);

      const targetUser = await User.findOne({ email: 'profile.owner@example.com' });
      expect(targetUser).to.exist;

      const adminDeleteRes = await request(app)
        .delete(`/api/profiles/${targetUser._id}/admin`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(adminDeleteRes.status).to.equal(200);
      expect(adminDeleteRes.body.message).to.equal('Profile deleted by admin.');
    });

    it('returns 403 when non-admin tries to delete a project via admin route', async () => {
      const ownerToken = await registerAndLogin('owner2.test@example.com');
      const nonAdminToken = await registerAndLogin('nonadmin.project@example.com');

      const createProjectRes = await request(app)
        .post('/api/projects')
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({
          title: 'Protected Project',
          description: 'Should not be deletable by non-admin',
          repoLink: 'https://github.com/example/protected-project'
        });

      expect(createProjectRes.status).to.equal(201);
      const projectId = createProjectRes.body._id;

      const forbiddenRes = await request(app)
        .delete(`/api/projects/${projectId}/admin`)
        .set('Authorization', `Bearer ${nonAdminToken}`);

      expect(forbiddenRes.status).to.equal(403);
      expect(forbiddenRes.body.message).to.equal('Access denied. Admins only.');
    });

    it('returns 403 when non-admin tries to delete a profile via admin route', async () => {
      const userToken = await registerAndLogin('profile.owner2@example.com');
      const nonAdminToken = await registerAndLogin('nonadmin.profile@example.com');

      const createProfileRes = await request(app)
        .post('/api/profiles')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ bio: 'Protected profile' });

      expect(createProfileRes.status).to.equal(200);

      const targetUser = await User.findOne({ email: 'profile.owner2@example.com' });
      expect(targetUser).to.exist;

      const forbiddenRes = await request(app)
        .delete(`/api/profiles/${targetUser._id}/admin`)
        .set('Authorization', `Bearer ${nonAdminToken}`);

      expect(forbiddenRes.status).to.equal(403);
      expect(forbiddenRes.body.message).to.equal('Access denied. Admins only.');
    });

    it('returns 404 when admin deletes a non-existent project', async () => {
      const adminToken = await registerAndLogin('admin.missing.project@example.com', 'admin');
      const missingProjectId = new mongoose.Types.ObjectId().toString();

      const missingRes = await request(app)
        .delete(`/api/projects/${missingProjectId}/admin`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(missingRes.status).to.equal(404);
      expect(missingRes.body.message).to.equal('Project not found');
    });

    it('returns 404 when admin deletes a non-existent profile', async () => {
      const adminToken = await registerAndLogin('admin.missing.profile@example.com', 'admin');
      const missingUserId = new mongoose.Types.ObjectId().toString();

      const missingRes = await request(app)
        .delete(`/api/profiles/${missingUserId}/admin`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(missingRes.status).to.equal(404);
      expect(missingRes.body.message).to.equal('Profile not found');
    });
  });
});
