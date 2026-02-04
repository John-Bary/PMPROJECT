# CLAUDE.md - Todoria

## Project Overview

Todoria is a simple to do app. It provides task management with categories, calendar views, drag & drop functionality, and team collaboration features.

## Tech Stack

### Frontend (React)
- **Framework**: React 19 with Create React App
- **Styling**: Tailwind CSS 3.4
- **State Management**: Zustand 5
- **Routing**: React Router DOM 7
- **HTTP Client**: Axios
- **Drag & Drop**: @hello-pangea/dnd
- **Date Handling**: date-fns, react-day-picker
- **Icons**: lucide-react
- **Notifications**: react-hot-toast

### Backend (Node.js)
- **Framework**: Express 5
- **Database**: PostgreSQL (via pg)
- **Authentication**: JWT (jsonwebtoken) + bcryptjs
- **Email**: Resend
- **Scheduled Tasks**: node-cron
- **Environment**: dotenv

## Project Structure

```
todorio/
├── client/                    # React frontend
│   ├── src/
│   │   ├── components/        # Reusable UI components
│   │   │   ├── TaskItem.jsx   # Individual task row
│   │   │   ├── TaskList.jsx   # Task list with drag & drop
│   │   │   ├── TaskModal.jsx  # Create/edit task modal
│   │   │   ├── CategorySection.jsx
│   │   │   ├── CategoryModal.jsx
│   │   │   ├── DatePicker.jsx
│   │   │   ├── FilterDropdown.jsx
│   │   │   └── Loader.jsx
│   │   ├── pages/             # Page components
│   │   │   ├── Dashboard.jsx  # Main dashboard
│   │   │   ├── ListView.jsx   # Task list view
│   │   │   ├── CalendarView.jsx
│   │   │   ├── Login.jsx
│   │   │   └── Register.jsx
│   │   ├── store/             # Zustand stores
│   │   ├── utils/             # Helper functions
│   │   └── App.js             # Root component with routing
│   └── package.json
│
├── server/                    # Node.js backend
│   ├── config/                # Database configuration
│   ├── controllers/           # Route handlers
│   │   ├── authController.js
│   │   ├── taskController.js
│   │   └── categoryController.js
│   ├── middleware/            # Express middleware (auth)
│   ├── routes/                # API route definitions
│   │   ├── auth.js
│   │   ├── tasks.js
│   │   └── categories.js
│   ├── scripts/               # Database scripts
│   │   ├── initDatabase.js
│   │   └── resetDatabase.js
│   ├── server.js              # Express entry point
│   └── package.json
│
└── tasks.md                   # Development guide/checklist
```

## Development Commands

### Frontend (from `/todorio/client`)
```bash
npm start          # Start dev server on port 3000
npm run build      # Build for production
npm test           # Run tests
```

### Backend (from `/todorio/server`)
```bash
npm run dev        # Start dev server with nodemon on port 5000
npm start          # Start production server
npm run db:init    # Initialize database schema
npm run db:reset   # Reset database (destructive)
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user
- `POST /api/auth/logout` - Logout user

### Tasks
- `GET /api/tasks` - Get all tasks
- `POST /api/tasks` - Create task
- `PUT /api/tasks/:id` - Update task
- `DELETE /api/tasks/:id` - Delete task
- `PATCH /api/tasks/:id/complete` - Toggle completion
- `PATCH /api/tasks/reorder` - Reorder tasks (drag & drop)

### Categories
- `GET /api/categories` - Get all categories
- `POST /api/categories` - Create category
- `PUT /api/categories/:id` - Update category
- `DELETE /api/categories/:id` - Delete category

## Environment Variables

### Server (`server/.env`)
```
PORT=5000
DATABASE_URL=postgresql://user:password@localhost:5432/todorio
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=7d
RESEND_API_KEY=re_your_api_key_here
EMAIL_FROM=noreply@example.com
EMAIL_FROM_NAME=Todoria
```

### Client (`client/.env`)
```
REACT_APP_API_URL=http://localhost:5000/api
```

## Database Schema

### Users
- id, email (unique), password (hashed), name, avatar_color, created_at

### Categories
- id, name, color, position, user_id, created_at

### Tasks
- id, name, description, assignee_id (FK users), due_date, priority (low/medium/high), completed, category_id (FK categories), position, created_by (FK users), created_at, updated_at

## Key Features

1. **Task Management**: Create, edit, delete tasks with inline editing
2. **Categories**: Organize tasks into collapsible categories
3. **Drag & Drop**: Reorder tasks within and across categories
4. **Calendar View**: View tasks by due date
5. **Filtering**: Filter by assignee, priority, date range
6. **Search**: Search tasks by name
7. **Email Reminders**: Scheduled reminder emails for due tasks

## Code Style Guidelines

- Use functional components with hooks
- Keep components focused and small
- Use Zustand for global state
- Handle errors with try-catch and toast notifications
- Use Tailwind CSS utility classes
- Follow existing patterns for API calls in controllers

## Common Patterns

### API Calls (Frontend)
```javascript
import axios from 'axios';
const API_URL = process.env.REACT_APP_API_URL;

// Include auth token in requests
axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
```

### Protected Routes (Backend)
```javascript
const authMiddleware = require('../middleware/auth');
router.get('/protected', authMiddleware, controller.method);
```

## Testing

- Frontend: Jest + React Testing Library
- Backend: Manual testing with Postman (automated tests not yet implemented)
