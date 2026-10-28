# DevConnector Backend + Frontend

DevConnector is a full-featured Express.js application for developer portfolios.
It includes authentication, profile management, project CRUD, likes/comments, file uploads, admin controls, logging, and an animated frontend connected to the API.

## Screenshots

![DevConnector Screen 1](images/Screenshot%202026-03-20%20130629.png)
![DevConnector Screen 2](images/Screenshot%202026-03-20%20130636.png)
![DevConnector Screen 3](images/Screenshot%202026-03-20%20130644.png)
![DevConnector Screen 4](images/Screenshot%202026-03-20%20130652.png)

## Features

1. User registration and login with JWT.
2. Protected routes using auth middleware.
3. Profile create, update, read, and delete.
4. Project create, read, update, and delete.
5. Project likes and comments.
6. Screenshot upload using Multer.
7. Admin-only deletion routes for projects and profiles.
8. Centralized error handling and request logging.
9. Modern animated frontend hosted from /app.

## Tech Stack

1. Node.js
2. Express.js
3. MongoDB + Mongoose
4. JWT + bcrypt
5. Multer
6. Morgan + Winston
7. Mocha + Chai + Supertest
8. HTML, CSS, Vanilla JavaScript

## Project Structure

- frontend/: Animated single-page UI
- images/: README screenshots
- middleware/: Auth, admin, upload middleware
- models/: Mongoose schemas
- public/: Existing static route-trigger pages
- routes/: Auth, profiles, projects API routes
- seed-data/: JSON seed files
- seed.js: Database seeding script
- server.js: Express app entry point
- test/: Integration tests

## Setup

1. Install dependencies.

```bash
npm install
```

2. Make sure MongoDB is running locally.

3. Create .env in the project root.

```env
MONGO_URI="mongodb://localhost:27017/express-devdb"
JWT_SECRET="123"
```

4. Seed the database.

```bash
node seed.js
```

5. Start the server.

```bash
node server.js
```

## Run Tests

```bash
npm test
```

Current test status: all integration tests are passing.

## App URLs

1. API root: http://localhost:3000/
2. New animated frontend: http://localhost:3000/app
3. Legacy static pages: http://localhost:3000/login.html and related pages

## Main API Endpoints

### Auth

- POST /api/auth/register
- POST /api/auth/login
- GET /api/auth/me

### Profiles

- POST /api/profiles
- GET /api/profiles
- GET /api/profiles/:userId
- DELETE /api/profiles
- DELETE /api/profiles/:userId/admin

### Projects

- POST /api/projects
- GET /api/projects
- GET /api/projects/:id
- PUT /api/projects/:id
- DELETE /api/projects/:id
- POST /api/projects/:id/screenshot
- PUT /api/projects/:id/like
- POST /api/projects/:id/comments
- DELETE /api/projects/:id/admin

## Notes

1. The project is ready to be pushed to GitHub.
2. README image links are local to this project, so screenshots will render correctly after push.
