# Step 4: Task Management System - COMPLETE ✅

## What We Built

Complete CRUD operations for tasks and categories, including filtering, search, assignment management, and drag-drop position handling.

## Files Created

### Controllers
**File: `server/controllers/taskController.js`**
- `getAllTasks` - Get all tasks with optional filters (category, assignee, status, priority, search)
- `getTaskById` - Get single task with full details
- `createTask` - Create new task with validation
- `updateTask` - Update task fields
- `updateTaskPosition` - Handle drag & drop reordering
- `deleteTask` - Delete task and reorder remaining

**File: `server/controllers/categoryController.js`**
- `getAllCategories` - Get all categories with task counts
- `getCategoryById` - Get single category
- `createCategory` - Create new category
- `updateCategory` - Update category name/color/position
- `deleteCategory` - Delete category (prevents deletion if has tasks)

### Routes
**File: `server/routes/tasks.js`**
- GET `/api/tasks` - List all tasks
- GET `/api/tasks/:id` - Get task by ID
- POST `/api/tasks` - Create task
- PUT `/api/tasks/:id` - Update task
- PATCH `/api/tasks/:id/position` - Update position (drag & drop)
- DELETE `/api/tasks/:id` - Delete task

**File: `server/routes/categories.js`**
- GET `/api/categories` - List all categories
- GET `/api/categories/:id` - Get category by ID
- POST `/api/categories` - Create category
- PUT `/api/categories/:id` - Update category
- DELETE `/api/categories/:id` - Delete category

### Updated Files
**File: `server/server.js`**
- Added task routes (`/api/tasks`)
- Added category routes (`/api/categories`)

## Task Features

### Task Fields
- `id` - Unique identifier
- `title` - Task title (required)
- `description` - Detailed description
- `category_id` - Category assignment
- `assignee_id` - User assignment
- `priority` - low, medium, high, urgent
- `status` - todo, in_progress, completed
- `due_date` - Due date timestamp
- `completed_at` - Auto-set when status becomes 'completed'
- `position` - Order within category (for drag & drop)
- `created_by` - User who created the task
- `created_at` - Creation timestamp
- `updated_at` - Last update timestamp

### Task Operations

#### Create Task
```bash
POST /api/tasks
{
  "title": "Task Title",
  "description": "Task description",
  "category_id": 1,
  "assignee_id": 2,
  "priority": "high",
  "status": "todo",
  "due_date": "2026-01-25"
}
```

#### Get All Tasks (with filters)
```bash
GET /api/tasks
GET /api/tasks?category_id=1
GET /api/tasks?assignee_id=2
GET /api/tasks?status=todo
GET /api/tasks?priority=high
GET /api/tasks?search=repository
```

#### Update Task
```bash
PUT /api/tasks/:id
{
  "title": "Updated Title",
  "status": "in_progress",
  "priority": "urgent"
}
```

#### Update Position (Drag & Drop)
```bash
PATCH /api/tasks/:id/position
{
  "category_id": 2,
  "position": 1
}
```

#### Delete Task
```bash
DELETE /api/tasks/:id
```

## Category Features

### Category Fields
- `id` - Unique identifier
- `name` - Category name (unique, required)
- `color` - Hex color code (e.g., #3B82F6)
- `position` - Display order
- `task_count` - Number of tasks in category (computed)
- `created_by` - User who created the category
- `created_at` - Creation timestamp
- `updated_at` - Last update timestamp

### Category Operations

#### Create Category
```bash
POST /api/categories
{
  "name": "Backlog",
  "color": "#6366F1"
}
```

#### Get All Categories
```bash
GET /api/categories
```
Returns categories with task counts.

#### Update Category
```bash
PUT /api/categories/:id
{
  "name": "Updated Name",
  "color": "#EC4899"
}
```

#### Delete Category
```bash
DELETE /api/categories/:id
```
Note: Cannot delete category with tasks.

## Validation Rules

### Tasks
- ✅ Title is required
- ✅ Priority must be: low, medium, high, or urgent
- ✅ Status must be: todo, in_progress, or completed
- ✅ Automatically sets `completed_at` when status changes to 'completed'
- ✅ Position auto-calculated on creation
- ✅ Position auto-adjusted on deletion

### Categories
- ✅ Name is required and unique (case-insensitive)
- ✅ Color must be valid hex format (#RRGGBB)
- ✅ Cannot delete category with tasks
- ✅ Position auto-calculated on creation
- ✅ Position auto-adjusted on deletion

## Advanced Features

### 1. Task Filtering
Filter tasks by multiple criteria:
```bash
# Multiple filters can be combined
GET /api/tasks?category_id=1&priority=high&status=todo
```

Supported filters:
- `category_id` - Filter by category
- `assignee_id` - Filter by assigned user
- `status` - Filter by status
- `priority` - Filter by priority
- `search` - Search in title and description (case-insensitive)

### 2. Drag & Drop Support
The `updateTaskPosition` endpoint handles:
- Moving tasks within same category
- Moving tasks between categories
- Automatic reordering of other tasks
- Position conflict resolution

Example: Move task 5 to position 2 in category 3
```bash
PATCH /api/tasks/5/position
{
  "category_id": 3,
  "position": 2
}
```

### 3. Auto-Completion Tracking
When task status changes to 'completed':
- `completed_at` timestamp is automatically set
When status changes from 'completed' to anything else:
- `completed_at` is automatically cleared

### 4. Task Counts
Categories endpoint includes task count:
```json
{
  "id": 1,
  "name": "To Do",
  "taskCount": 5
}
```

### 5. Rich Task Data
Tasks include joined data:
- Category name and color
- Assignee name and email
- Creator name
- All timestamps

## API Examples

### Create a Task
```bash
curl -X POST http://localhost:5001/api/tasks \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "title": "Implement dark mode",
    "description": "Add dark mode toggle to settings",
    "category_id": 1,
    "assignee_id": 3,
    "priority": "medium",
    "due_date": "2026-02-01"
  }'
```

### Get Tasks for a Specific User
```bash
curl http://localhost:5001/api/tasks?assignee_id=2 \
  -H "Authorization: Bearer <token>"
```

### Search Tasks
```bash
curl http://localhost:5001/api/tasks?search=authentication \
  -H "Authorization: Bearer <token>"
```

### Move Task to Different Category
```bash
curl -X PATCH http://localhost:5001/api/tasks/5/position \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "category_id": 2,
    "position": 0
  }'
```

### Update Task Status
```bash
curl -X PUT http://localhost:5001/api/tasks/5 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "status": "completed"
  }'
```

### Create Custom Category
```bash
curl -X POST http://localhost:5001/api/categories \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "name": "On Hold",
    "color": "#94A3B8"
  }'
```

## Database Schema

### Tasks Table
```sql
tasks
├── id (SERIAL PRIMARY KEY)
├── title (VARCHAR 500, NOT NULL)
├── description (TEXT)
├── category_id (INTEGER, FK -> categories.id)
├── assignee_id (INTEGER, FK -> users.id)
├── priority (VARCHAR 20, DEFAULT 'medium')
├── status (VARCHAR 50, DEFAULT 'todo')
├── due_date (TIMESTAMP)
├── completed_at (TIMESTAMP)
├── position (INTEGER, DEFAULT 0)
├── created_by (INTEGER, FK -> users.id)
├── created_at (TIMESTAMP, DEFAULT NOW())
└── updated_at (TIMESTAMP, AUTO-UPDATE)
```

### Categories Table
```sql
categories
├── id (SERIAL PRIMARY KEY)
├── name (VARCHAR 255, NOT NULL)
├── color (VARCHAR 7, DEFAULT '#3B82F6')
├── position (INTEGER, DEFAULT 0)
├── created_by (INTEGER, FK -> users.id)
├── created_at (TIMESTAMP, DEFAULT NOW())
└── updated_at (TIMESTAMP, AUTO-UPDATE)
```

## Verified Tests ✅

All endpoints tested and working:

### Tasks
- ✅ GET /api/tasks - List all tasks
- ✅ GET /api/tasks?priority=high - Filter by priority
- ✅ GET /api/tasks?category_id=1 - Filter by category
- ✅ GET /api/tasks/:id - Get single task
- ✅ POST /api/tasks - Create task
- ✅ PUT /api/tasks/:id - Update task
- ✅ PATCH /api/tasks/:id/position - Update position
- ✅ DELETE /api/tasks/:id - Delete task

### Categories
- ✅ GET /api/categories - List all categories with task counts
- ✅ GET /api/categories/:id - Get single category
- ✅ POST /api/categories - Create category
- ✅ PUT /api/categories/:id - Update category
- ✅ DELETE /api/categories/:id - Delete category (with protection)

### Validation
- ✅ Required field validation
- ✅ Priority validation
- ✅ Status validation
- ✅ Color format validation
- ✅ Duplicate category name prevention
- ✅ Category deletion protection

### Auto-Features
- ✅ Auto-position calculation
- ✅ Auto-position reordering
- ✅ Auto completed_at timestamps
- ✅ Task count calculation
- ✅ Rich joined data

## File Structure

```
server/
├── controllers/
│   ├── authController.js
│   ├── taskController.js          # NEW
│   └── categoryController.js      # NEW
├── routes/
│   ├── auth.js
│   ├── tasks.js                   # NEW
│   └── categories.js              # NEW
├── middleware/
│   └── auth.js
├── config/
│   ├── database.js
│   └── schema.sql
└── server.js                       # UPDATED
```

## Default Categories

The database comes with 4 default categories:

| ID | Name | Color | Position |
|----|------|-------|----------|
| 1 | To Do | #3B82F6 (Blue) | 0 |
| 2 | In Progress | #F59E0B (Orange) | 1 |
| 3 | Review | #8B5CF6 (Purple) | 2 |
| 4 | Completed | #10B981 (Green) | 3 |

## Priority Levels

- **low** - Minor tasks, no urgency
- **medium** - Standard priority (default)
- **high** - Important tasks
- **urgent** - Critical, needs immediate attention

## Status Values

- **todo** - Not started (default)
- **in_progress** - Currently being worked on
- **completed** - Finished (auto-sets `completed_at`)

## Security

- ✅ All task routes require authentication
- ✅ All category routes require authentication
- ✅ Created tasks automatically track creator (`created_by`)
- ✅ Input validation on all operations
- ✅ SQL injection prevention (parameterized queries)

## Performance Features

- ✅ Database indexes on frequently queried fields
- ✅ Efficient JOIN queries
- ✅ Optimized position updates
- ✅ Single query for task counts

## Next Steps

**Ready for Step 5: Frontend Setup (React)**

We'll build:
- React app structure
- Tailwind CSS setup
- Zustand state management
- Axios API client
- React Router setup
- Protected routes
- Authentication UI
- Login/Register pages

The backend API is now complete and ready to be consumed by the frontend!

## Quick Test Commands

```bash
# Login
curl -X POST http://localhost:5001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@arena.com","password":"password123"}' \
  -c cookies.txt

# Get all tasks
curl http://localhost:5001/api/tasks -b cookies.txt

# Create task
curl -X POST http://localhost:5001/api/tasks \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{"title":"New Task","category_id":1,"priority":"high"}'

# Get all categories
curl http://localhost:5001/api/categories -b cookies.txt
```

Let me know when you're ready for Step 5! 🚀
