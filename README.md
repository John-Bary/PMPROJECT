# Todoria

A simple to do app built with React, Node.js, and PostgreSQL.

## Tech Stack

**Frontend:** React 19, Tailwind CSS, Zustand, React Router 7, @hello-pangea/dnd
**Backend:** Express 5, PostgreSQL, JWT Authentication, Resend, node-cron

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
cd todorio/server
npm install

# Install client dependencies
cd ../client
npm install
```

### 2. Configure Environment

**Server** - Copy `todorio/server/.env.example` to `todorio/server/.env`:

| Variable | Description |
|----------|-------------|
| `PORT` | Server port (default: 5001) |
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | Secret key for JWT tokens |
| `JWT_EXPIRES_IN` | Token expiration (default: 7d) |
| `ALLOWED_ORIGINS` | CORS allowed origins |
| `RESEND_API_KEY` | Resend API key |
| `EMAIL_FROM` | Sender email address |
| `EMAIL_FROM_NAME` | Sender display name |
| `ABSTRACT_API_KEY` | Holiday API key (optional) |

**Client** - Copy `todorio/client/.env.example` to `todorio/client/.env`:

| Variable | Description |
|----------|-------------|
| `REACT_APP_API_URL` | API base URL (default: http://localhost:5001/api) |

### 3. Set Up Database

```bash
cd todorio/server
npm run db:init
```

### 4. Run Development Servers

**Terminal 1 - Backend:**
```bash
cd todorio/server
npm run dev
```
Server runs at http://localhost:5001

**Terminal 2 - Frontend:**
```bash
cd todorio/client
npm start
```
App runs at http://localhost:3000

## Development Commands

### Client (`todorio/client`)
| Command | Description |
|---------|-------------|
| `npm start` | Start dev server (port 3000) |
| `npm run build` | Build for production |
| `npm test` | Run tests |

### Server (`todorio/server`)
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
cd todorio/client
npm run build

# The build output is in todorio/client/build/
```

## Deployment Notes

1. Set `NODE_ENV=production` on your server
2. Configure environment variables for production database and email service (Resend)
3. Serve the React build with a static file server or from Express
4. Set `TRUST_PROXY=true` if behind a reverse proxy
5. Configure `ALLOWED_ORIGINS` to your production domain

## Project Structure

```
todorio/
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
