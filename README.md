# DevConnector

DevConnector is a full-stack developer portfolio platform built with Express.js and MongoDB.
Developers can register, build a profile, publish projects, and like or comment on each other's work. It also includes admin moderation, screenshot uploads, request logging, and an animated single-page frontend that talks directly to the REST API.

## Screenshots

![DevConnector Screen 1](images/Screenshot%202026-03-20%20130629.png)
![DevConnector Screen 2](images/Screenshot%202026-03-20%20130636.png)
![DevConnector Screen 3](images/Screenshot%202026-03-20%20130644.png)
![DevConnector Screen 4](images/Screenshot%202026-03-20%20130652.png)

## Features

- User registration and login with JWT authentication
- Protected routes via auth middleware
- Profile create, read, update, and delete
- Project create, read, update, and delete
- Project likes and comments
- Project screenshot uploads with Multer
- Admin-only routes for removing any project or profile
- Centralized error handling and request logging (Morgan + Winston)
- Animated frontend served at `/app`
- Integration test suite (Mocha + Chai + Supertest)

## Tech Stack

| Layer    | Technology                          |
| -------- | ----------------------------------- |
| Runtime  | Node.js                             |
| Server   | Express.js                          |
| Database | MongoDB + Mongoose                  |
| Auth     | JSON Web Tokens + bcrypt            |
| Uploads  | Multer                              |
| Logging  | Morgan + Winston                    |
| Testing  | Mocha + Chai + Supertest            |
| Frontend | HTML, CSS, vanilla JavaScript       |

## Project Structure

```
.
├── images/              # README screenshots
└── project/             # Application root (run all commands from here)
    ├── frontend/        # Animated single-page UI (served at /app)
    ├── middleware/      # Auth, admin, and upload middleware
    ├── models/          # Mongoose schemas (User, Profile, Project)
    ├── public/          # Legacy static pages (login.html, projects.html, ...)
    ├── routes/          # Auth, profile, and project API routes
    ├── seed-data/       # JSON seed data
    ├── test/            # Integration tests
    ├── utils/           # Winston logger
    ├── seed.js          # Database seeding script
    └── server.js        # Express app entry point
```

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) 18 or newer
- [MongoDB](https://www.mongodb.com/try/download/community) running locally on port 27017

### Installation

1. Clone the repository and move into the application folder.

   ```bash
   git clone https://github.com/nithineleti/DevConnector.git
   cd DevConnector/project
   ```

2. Install dependencies.

   ```bash
   npm install
   ```

3. Create a `.env` file inside `project/`.

   ```env
   MONGO_URI="mongodb://localhost:27017/express-devdb"
   JWT_SECRET="replace-with-a-long-random-string"
   ```

4. Seed the database with sample users, profiles, and projects.

   ```bash
   npm run seed
   ```

   > Seeding clears the existing users, profiles, and projects in the target database.

5. Start the server.

   ```bash
   npm start
   ```

6. Open [http://localhost:3000](http://localhost:3000) in your browser.

### Demo Login

The seed script creates an admin account:

| Email                     | Password   |
| ------------------------- | ---------- |
| henry.black@example.com   | admin123   |

To try the app as a regular user, register a new account from the **Create Account** panel.

## Running Tests

The tests use a separate `devconnector_test` database, so they don't touch your seeded data.

```bash
npm test
```

## App URLs

| URL                                   | Description                        |
| ------------------------------------- | ---------------------------------- |
| http://localhost:3000/                | Redirects to the frontend          |
| http://localhost:3000/app             | Animated frontend                  |
| http://localhost:3000/api             | API welcome message                |
| http://localhost:3000/login.html      | Legacy static pages                |

## API Reference

### Auth

| Method | Endpoint             | Access  | Description              |
| ------ | -------------------- | ------- | ------------------------ |
| POST   | `/api/auth/register` | Public  | Register a new user      |
| POST   | `/api/auth/login`    | Public  | Log in and receive a JWT |
| GET    | `/api/auth/me`       | Private | Get the current user     |

### Profiles

| Method | Endpoint                         | Access  | Description                  |
| ------ | -------------------------------- | ------- | ---------------------------- |
| POST   | `/api/profiles`                  | Private | Create or update own profile |
| GET    | `/api/profiles`                  | Public  | List all profiles            |
| GET    | `/api/profiles/:userId`          | Public  | Get a profile by user ID     |
| DELETE | `/api/profiles`                  | Private | Delete own profile           |
| DELETE | `/api/profiles/:userId/admin`    | Admin   | Delete any profile           |

### Projects

| Method | Endpoint                         | Access  | Description                  |
| ------ | -------------------------------- | ------- | ---------------------------- |
| POST   | `/api/projects`                  | Private | Create a project             |
| GET    | `/api/projects`                  | Public  | List all projects            |
| GET    | `/api/projects/:id`              | Public  | Get a project by ID          |
| PUT    | `/api/projects/:id`              | Owner   | Update a project             |
| DELETE | `/api/projects/:id`              | Owner   | Delete a project             |
| POST   | `/api/projects/:id/screenshot`   | Owner   | Upload a project screenshot  |
| PUT    | `/api/projects/:id/like`         | Private | Like or unlike a project     |
| POST   | `/api/projects/:id/comments`     | Private | Comment on a project         |
| DELETE | `/api/projects/:id/admin`        | Admin   | Delete any project           |

Private routes require an `Authorization: Bearer <token>` header.

## Author

**Nithin Eleti** · [github.com/nithineleti](https://github.com/nithineleti)
