# Arena PM Tool - Project Management MVP

A full-stack task management application similar to Asana, built with React, Node.js, and PostgreSQL.

## Features

- User authentication (5 team members)
- Task list with inline editing
- Drag & drop task reordering
- Calendar view
- Category management
- Email reminders
- Search and filters

## Tech Stack

**Frontend:**
- React
- Tailwind CSS
- React Router DOM
- @hello-pangea/dnd (drag & drop)
- react-day-picker (calendar)
- Zustand (state management)
- Axios (HTTP client)

**Backend:**
- Node.js + Express
- PostgreSQL
- JWT Authentication
- Nodemailer (email reminders)
- Node-cron (scheduled tasks)

## Project Structure

```
arena-pm-tool/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/    # Reusable components
│   │   ├── pages/         # Page components
│   │   ├── store/         # Zustand state management
│   │   ├── utils/         # Helper functions
│   │   └── App.js
│   └── package.json
│
├── server/                 # Node.js backend
│   ├── config/            # Database config
│   ├── controllers/       # Route controllers
│   ├── middleware/        # Custom middleware
│   ├── models/            # Database models
│   ├── routes/            # API routes
│   ├── utils/             # Helper functions
│   ├── server.js          # Entry point
│   └── package.json
│
└── README.md
```

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- PostgreSQL (v12 or higher)
- npm or yarn

### Installation

1. Clone the repository
2. Install dependencies:

```bash
# Install server dependencies
cd server
npm install

# Install client dependencies
cd ../client
npm install
```

3. Set up environment variables:
   - Copy `server/.env.example` to `server/.env`
   - Update the values with your configuration

4. Set up the database:
   - Create a PostgreSQL database named `arena_pm_tool`
   - Run migrations (to be added in next steps)

### Running the Application

**Backend:**
```bash
cd server
npm run dev
```
Server will run on http://localhost:5000

**Frontend:**
```bash
cd client
npm start
```
React app will run on http://localhost:3000

## Development Progress

- [x] Step 1: Project initialization
- [ ] Step 2: Database schema
- [ ] Step 3: Authentication
- [ ] ... (more steps to follow)

## License

MIT
