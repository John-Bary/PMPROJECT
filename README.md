# Todoria

A simple to do app built with React, Node.js, and PostgreSQL.

## Tech Stack

**Frontend:** React 19, Tailwind CSS, Zustand, React Router 7, @hello-pangea/dnd
**Backend:** Express 5, PostgreSQL, JWT Authentication, Nodemailer, node-cron

## Prerequisites

- Node.js v18 or higher
- PostgreSQL v12 or higher
- npm

## Quick Start

### 1. Clone and Install

```bash
git clone <your-repo-url>
cd PMPROJECT

# Install server dependencies
cd todoria/server
npm install

# Install client dependencies
cd ../client
npm install
```

### 2. Configure Environment

**Server** - Copy `todoria/server/.env.example` to `todoria/server/.env`:

| Variable | Description |
|----------|-------------|
| `PORT` | Server port (default: 5001) |
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | Secret key for JWT tokens |
| `JWT_EXPIRES_IN` | Token expiration (default: 7d) |
| `ALLOWED_ORIGINS` | CORS allowed origins |
| `EMAIL_HOST` | SMTP server host |
| `EMAIL_PORT` | SMTP port (default: 587) |
| `EMAIL_USER` | SMTP username |
| `EMAIL_PASSWORD` | SMTP password |
| `EMAIL_FROM` | Sender email address |
| `ABSTRACT_API_KEY` | Holiday API key (optional) |

**Client** - Copy `todoria/client/.env.example` to `todoria/client/.env`:

| Variable | Description |
|----------|-------------|
| `REACT_APP_API_URL` | API base URL (default: http://localhost:5001/api) |

### 3. Set Up Database

```bash
cd todoria/server
npm run db:init
```

### 4. Run Development Servers

**Terminal 1 - Backend:**
```bash
cd todoria/server
npm run dev
```
Server runs at http://localhost:5001

**Terminal 2 - Frontend:**
```bash
cd todoria/client
npm start
```
App runs at http://localhost:3000

## Development Commands

### Client (`todoria/client`)
| Command | Description |
|---------|-------------|
| `npm start` | Start dev server (port 3000) |
| `npm run build` | Build for production |
| `npm test` | Run tests |

### Server (`todoria/server`)
| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server with nodemon |
| `npm start` | Start production server |
| `npm run db:init` | Initialize database schema |
| `npm run db:reset` | Reset database (destructive) |
| `npm test` | Run tests |

## Build for Production

```bash
# Build client
cd todoria/client
npm run build

# The build output is in todoria/client/build/
```

## Deployment Notes

1. Set `NODE_ENV=production` on your server
2. Configure environment variables for production database and SMTP
3. Serve the React build with a static file server or from Express
4. Set `TRUST_PROXY=true` if behind a reverse proxy
5. Configure `ALLOWED_ORIGINS` to your production domain

## Project Structure

```
todoria/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/    # Reusable UI components
│   │   ├── pages/         # Page components
│   │   ├── store/         # Zustand state management
│   │   └── utils/         # Helper functions
│   └── package.json
│
├── server/                 # Node.js backend
│   ├── config/            # Database configuration
│   ├── controllers/       # Route handlers
│   ├── middleware/        # Authentication middleware
│   ├── routes/            # API routes
│   ├── scripts/           # Database scripts
│   ├── jobs/              # Scheduled tasks (reminders)
│   └── package.json
│
└── README.md
```

## License

MIT
