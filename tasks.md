# Step-by-Step Development Guide for Project Management Tool MVP

## 🎯 Development Order: Foundation → Features → Polish

---

## PHASE 1: Project Setup & Foundation (Days 1-2)

### Step 1: Initialize Project
```bash
# Create project structure
□ Create new folder: project-manager-mvp
□ Initialize React app: npx create-react-app client
□ Initialize Node.js backend: npm init in /server folder
□ Create .gitignore files for both
□ Initialize Git repository
□ Create README.md with project overview
```

### Step 2: Setup Backend Structure
```bash
□ Install backend dependencies:
  - express
  - cors
  - dotenv
  - bcryptjs (for password hashing)
  - jsonwebtoken (for auth)
  - pg or mongoose (database)
  - resend (email)
  - node-cron (scheduled tasks)
  
□ Create folder structure:
  /server
    /routes
    /controllers
    /models
    /middleware
    /config
    /utils
    server.js
    
□ Setup Express server (server.js)
□ Configure CORS
□ Setup environment variables (.env)
□ Test server runs on port 5000
```

### Step 3: Setup Frontend Structure
```bash
□ Install frontend dependencies:
  - axios (API calls)
  - react-router-dom (routing)
  - @hello-pangea/dnd (drag & drop - React Beautiful DnD fork)
  - react-day-picker (date picker)
  - react-hot-toast (notifications)
  - zustand or redux-toolkit (state management)
  
□ Create folder structure:
  /client/src
    /components
    /pages
    /context or /store
    /utils
    /services (API calls)
    /styles
    
□ Remove default Create React App files
□ Setup basic routing structure
□ Test app runs on port 3000
```

### Step 4: Setup Database
```bash
□ Choose database (PostgreSQL recommended)
□ Install database locally or use cloud (Supabase/Railway)
□ Create database connection file
□ Test database connection
□ Create initial schema design (on paper/whiteboard):
  - users table
  - tasks table
  - categories table
```

---

## PHASE 2: Authentication & User Management (Days 3-4)

### Step 5: Create Database Schema - Users
```sql
□ Create users table:
  - id (primary key)
  - email (unique)
  - password (hashed)
  - name
  - avatar_color
  - created_at
  
□ Seed database with 5 test users
□ Test queries work
```

### Step 6: Build Authentication Backend
```bash
□ Create /models/User.js
□ Create /routes/auth.js
□ Create /controllers/authController.js
□ Implement POST /api/auth/register
□ Implement POST /api/auth/login
□ Implement GET /api/auth/me (get current user)
□ Implement POST /api/auth/logout
□ Create JWT middleware for protected routes
□ Test all endpoints with Postman/Insomnia
```

### Step 7: Build Authentication Frontend
```bash
□ Create /pages/Login.jsx
□ Create /pages/Register.jsx (optional for MVP)
□ Create /context/AuthContext.jsx or /store/authStore.js
□ Create /services/authService.js (API calls)
□ Build login form UI
□ Implement login logic
□ Store JWT in localStorage
□ Create protected route wrapper
□ Test login/logout flow
□ Create "current user" display in header
```

### Step 8: Create User List Endpoint
```bash
□ Create GET /api/users (get all team members)
□ Test endpoint returns 5 users
□ Create /services/userService.js on frontend
□ Fetch users on app load
□ Store users in global state
```

---

## PHASE 3: Basic Task Management (Days 5-7)

### Step 9: Create Database Schema - Tasks & Categories
```sql
□ Create categories table:
  - id (primary key)
  - name
  - color
  - position (for ordering)
  - user_id (creator)
  - created_at
  
□ Create tasks table:
  - id (primary key)
  - name
  - description
  - assignee_id (foreign key to users)
  - due_date
  - priority (enum: low, medium, high)
  - completed (boolean)
  - category_id (foreign key to categories)
  - position (for ordering within category)
  - created_by (foreign key to users)
  - created_at
  - updated_at
  
□ Seed with sample tasks from your Excel
□ Test queries
```

### Step 10: Build Tasks API Backend
```bash
□ Create /models/Task.js
□ Create /routes/tasks.js
□ Create /controllers/taskController.js
□ Implement GET /api/tasks (get all tasks)
□ Implement POST /api/tasks (create task)
□ Implement PUT /api/tasks/:id (update task)
□ Implement DELETE /api/tasks/:id (delete task)
□ Implement PATCH /api/tasks/:id/complete (toggle completion)
□ Add authentication middleware to all routes
□ Test all endpoints
```

### Step 11: Build Categories API Backend
```bash
□ Create /models/Category.js
□ Create /routes/categories.js
□ Create /controllers/categoryController.js
□ Implement GET /api/categories (get all)
□ Implement POST /api/categories (create)
□ Implement PUT /api/categories/:id (update)
□ Implement DELETE /api/categories/:id (delete)
□ Test all endpoints
```

### Step 12: Build Task List Frontend - Basic View
```bash
□ Create /pages/Dashboard.jsx (main app page)
□ Create /components/TaskList.jsx
□ Create /components/TaskItem.jsx
□ Create /components/CategorySection.jsx
□ Create /services/taskService.js
□ Fetch tasks on component mount
□ Display tasks grouped by category
□ Show task name, assignee, due date, priority
□ Test data displays correctly
```

### Step 13: Add Task Modal
```bash
□ Create /components/TaskModal.jsx
□ Add "+ Add task" button
□ Build task creation form:
  - Task name (text input)
  - Assignee (dropdown - use user list)
  - Due date (basic date input for now)
  - Priority (dropdown: Low/Medium/High)
  - Category (dropdown - use category list)
  - Notes (textarea)
  
□ Implement create task API call
□ Refresh task list after creation
□ Show success toast notification
□ Test task creation works
```

### Step 14: Add Edit & Delete Functionality
```bash
□ Add "Edit" button to each task
□ Open TaskModal in edit mode
□ Pre-fill form with existing task data
□ Implement update API call
□ Add "Delete" button to each task
□ Add confirmation dialog
□ Implement delete API call
□ Refresh list after edit/delete
□ Test edit and delete work
```

### Step 15: Add Task Completion Checkbox
```bash
□ Add checkbox to each task item
□ Style completed tasks (gray out, strikethrough)
□ Implement toggle completion API call
□ Update UI optimistically (immediate feedback)
□ Add "Show/Hide completed" toggle
□ Test completion works
```

---

## PHASE 4: Inline Editing (Days 8-9)

### Step 16: Implement Inline Assignee Editing
```bash
□ Make assignee clickable
□ Show dropdown on click with team member list
□ Implement select handler
□ Call update API with new assignee
□ Update UI immediately
□ Close dropdown after selection
□ Test assignee change works
```

### Step 17: Implement Inline Date Editing
```bash
□ Install react-day-picker
□ Create /components/DatePicker.jsx
□ Make due date clickable
□ Show calendar popup on click
□ Implement date select handler
□ Call update API with new date
□ Update UI immediately
□ Close calendar after selection
□ Test date change works
```

### Step 18: Implement Inline Priority Editing
```bash
□ Make priority badge clickable
□ Show dropdown on click (Low/Medium/High)
□ Implement select handler
□ Call update API with new priority
□ Update badge color immediately
□ Close dropdown after selection
□ Test priority change works
```

### Step 19: Implement Inline Task Name Editing
```bash
□ Make task name clickable
□ Switch to input field on click
□ Auto-focus input
□ Save on Enter key or blur
□ Revert on Escape key
□ Call update API with new name
□ Test task name editing works
```

---

## PHASE 5: Category Management (Day 10)

### Step 20: Build Category Management UI
```bash
□ Create /components/AddCategoryButton.jsx
□ Add "+ Add Category" button at bottom of categories
□ Create /components/CategoryModal.jsx
□ Build category creation form:
  - Category name
  - Color picker (simple color options)
  
□ Implement create category API call
□ Add new category to list
□ Test category creation
```

### Step 21: Category Actions
```bash
□ Add edit/delete buttons to category headers (show on hover)
□ Implement rename category
□ Implement delete category (with confirmation)
□ Handle tasks when category deleted (move to "Uncategorized")
□ Test category editing/deletion
```

### Step 22: Collapsible Categories
```bash
□ Add collapse/expand icon to category headers
□ Implement toggle collapse state
□ Animate collapse/expand
□ Save collapse state to localStorage
□ Test collapsible categories work
```

---

## PHASE 6: Drag & Drop (Days 11-12)

### Step 23: Setup Drag & Drop Library
```bash
□ Install @hello-pangea/dnd
□ Read documentation
□ Create simple test case (drag items in a list)
□ Understand DragDropContext, Droppable, Draggable
```

### Step 24: Implement Task Reordering Within Category
```bash
□ Wrap TaskList in DragDropContext
□ Make each CategorySection a Droppable
□ Make each TaskItem a Draggable
□ Implement onDragEnd handler
□ Update task positions in state
□ Create API endpoint: PATCH /api/tasks/reorder
□ Save new order to database
□ Test drag to reorder works
```

### Step 25: Implement Drag Between Categories
```bash
□ Handle cross-category drag in onDragEnd
□ Update task category_id
□ Update task position
□ Call API to save changes
□ Test dragging tasks between categories
□ Add visual feedback during drag
```

### Step 26: Polish Drag & Drop Experience
```bash
□ Add drag handle icon (⋮⋮)
□ Add ghost/placeholder during drag
□ Add smooth animations
□ Disable drag for completed tasks (optional)
□ Test on different screen sizes
```

---

## PHASE 7: Calendar View (Days 13-15)

### Step 27: Build Basic Calendar UI
```bash
□ Create /pages/CalendarView.jsx
□ Add Calendar tab to navigation
□ Build calendar grid (7 columns × 5-6 rows)
□ Add month/year navigation
□ Add "Today" button
□ Style calendar to match Asana
□ Test navigation works
```

### Step 28: Display Tasks on Calendar
```bash
□ Group tasks by due date
□ Render task pills on appropriate dates
□ Color-code by priority
□ Show task count if many tasks
□ Add hover tooltip with task details
□ Handle overflow (show "X more")
□ Test tasks display correctly
```

### Step 29: Make Calendar Interactive
```bash
□ Click on task → open task modal for editing
□ Click on empty date → create task with that due date
□ Implement these interactions
□ Test calendar interactions work
```

### Step 30: Two-Way Calendar Sync
```bash
□ When task updated in list → update calendar
□ When task updated in calendar → update list
□ Use shared state management
□ Test changes sync immediately
□ Test across all scenarios:
  - Create task in list
  - Create task in calendar
  - Edit date in list
  - Edit date in calendar
  - Delete task in list
  - Delete task in calendar
```

### Step 31: Calendar Drag & Drop (OPTIONAL - Nice to Have)
```bash
□ Make tasks draggable on calendar
□ Implement drop on different date
□ Update task due date
□ Save to database
□ Test drag to reschedule works
```

---

## PHASE 8: Email Reminders (Days 16-17)

### Step 32: Setup Email Service
```bash
□ Install resend
□ Setup email credentials (Gmail/SendGrid)
□ Create /utils/emailService.js
□ Test sending basic email
□ Create email templates folder
□ Design reminder email HTML template
```

### Step 33: Build Reminder Logic
```bash
□ Create /utils/reminderService.js
□ Write function to find tasks needing reminders:
  - Not completed
  - Due date within X days
  - Assignee has email
  
□ Write function to send reminder email
□ Test logic manually
```

### Step 34: Schedule Reminder Job
```bash
□ Install node-cron
□ Create /jobs/reminderJob.js
□ Schedule daily check (e.g., 9 AM)
□ Run reminder service
□ Log emails sent
□ Test scheduled job runs
```

### Step 35: Reminder Settings UI
```bash
□ Create reminder settings page/modal
□ Allow users to set:
  - Days before due date
  - Time of day
  - Enable/disable per task
  
□ Save settings to database
□ Apply settings to reminder logic
□ Test settings work
```

---

## PHASE 9: Search & Filters (Days 18-19)

### Step 36: Build Search Functionality
```bash
□ Add search input to toolbar
□ Implement client-side search (filter tasks by name)
□ Highlight search results
□ Add "Clear search" button
□ Test search works
```

### Step 37: Build Filter Functionality
```bash
□ Add filter dropdown to toolbar
□ Implement filters:
  - By assignee (checkboxes for each team member)
  - By priority (Low/Medium/High)
  - By date range (This week, This month, etc.)
  - Show/hide completed toggle
  
□ Combine multiple filters (AND logic)
□ Show active filter count badge
□ Add "Clear all filters" button
□ Test filters work correctly
```

---

## PHASE 10: Polish & User Experience (Days 20-22)

### Step 38: Add Loading States
```bash
□ Create /components/Loader.jsx
□ Show spinner while fetching tasks
□ Show skeleton loaders for task items
□ Add loading state to buttons during API calls
□ Disable buttons while loading
□ Test loading states appear correctly
```

### Step 39: Add Error Handling
```bash
☑ Create error boundary component
☑ Add try-catch to all API calls
☑ Show error toasts for failed operations
☑ Add retry logic for failed requests
☑ Create /pages/ErrorPage.jsx for 404/500
☑ Test error scenarios
```

### Step 40: Add Toast Notifications
```bash
□ Install react-hot-toast
□ Add Toaster component to App
□ Show success toast:
  - Task created
  - Task updated
  - Task deleted
  - Category created
  
□ Show error toast for failures
□ Style toasts to match dark theme
□ Test all notifications
```

### Step 41: Add Empty States
```bash
□ Create /components/EmptyState.jsx
□ Show when no tasks exist
□ Show when no search/filter results
□ Show when category is empty
□ Add helpful messages and CTAs
□ Test all empty states
```

### Step 42: Keyboard Shortcuts
```bash
□ Implement shortcuts:
  - "N" or "+" → Create new task
  - "Escape" → Close modal/cancel
  - "Enter" → Save/submit
  - "/" → Focus search
  - "Ctrl+F" → Toggle filters
  
□ Add keyboard shortcut help modal (? key)
□ Test all shortcuts work
```

### Step 43: Responsive Design
```bash
□ Test on mobile (375px width)
□ Test on tablet (768px width)
□ Test on desktop (1440px width)
□ Adjust layouts for smaller screens:
  - Stack assignee/date/priority on mobile
  - Hamburger menu on mobile
  - Single column calendar on mobile
  
□ Test touch interactions (tap, swipe)
□ Ensure all features work on mobile
```

### Step 44: Performance Optimization
```bash
□ Implement React.memo for task items
□ Add useMemo/useCallback where needed
□ Lazy load calendar view
□ Optimize database queries (add indexes)
□ Compress images/assets
□ Enable gzip compression
□ Test page load speed (<2 seconds)
```

### Step 45: Accessibility
```bash
□ Add ARIA labels to buttons
□ Ensure keyboard navigation works
□ Add focus styles
□ Test with screen reader (optional)
□ Ensure proper heading hierarchy
□ Add alt text to icons
```

---

## PHASE 11: Testing & Bug Fixes (Days 23-24)

### Step 46: Manual Testing Checklist
```bash
□ Test all user flows:
  - Login → Create task → Edit → Delete → Logout
  - Drag and drop
  - Calendar sync
  - Filters and search
  - All inline editing
  
□ Test edge cases:
  - Empty states
  - Very long task names
  - Many tasks in one day
  - No due date
  - Past due dates
  
□ Test on different browsers:
  - Chrome
  - Firefox
  - Safari
  - Edge
  
□ Create bug list
□ Prioritize bugs (P0 = critical, P1 = high, P2 = low)
```

### Step 47: Fix Critical Bugs
```bash
□ Fix P0 bugs (app-breaking)
□ Fix P1 bugs (major issues)
□ Test fixes work
□ Retest affected features
```

### Step 48: Code Cleanup
```bash
□ Remove console.logs
□ Remove commented code
□ Fix ESLint warnings
□ Organize imports
□ Add comments to complex code
□ Format code consistently
```

---

## PHASE 12: Deployment (Days 25-26)

### Step 49: Prepare for Production
```bash
□ Create production .env file
□ Update CORS settings for production
□ Add rate limiting to API
□ Setup database backups
□ Add security headers
□ Test production build locally
```

### Step 50: Deploy Database
```bash
□ Create production database (Supabase/Railway/RDS)
□ Run migrations
□ Seed with 5 user accounts
□ Test database connection from local
```

### Step 51: Deploy Backend
```bash
□ Choose hosting (Railway/Render/Heroku)
□ Create new project
□ Connect GitHub repo
□ Set environment variables
□ Deploy
□ Test API endpoints work
```

### Step 52: Deploy Frontend
```bash
□ Update API URLs to production
□ Build production bundle
□ Choose hosting (Vercel/Netlify)
□ Connect GitHub repo
□ Deploy
□ Test app works
```

### Step 53: Final Testing on Production
```bash
□ Test complete user flow on production URL
□ Test with all 5 team members
□ Check email reminders work
□ Monitor for errors
□ Fix any production-only bugs
```

---

## PHASE 13: Documentation & Handoff (Day 27)

### Step 54: Write Documentation
```bash
□ Update README.md:
  - Project description
  - Features list
  - Setup instructions
  - Environment variables needed
  - Deployment instructions
  
□ Create USER_GUIDE.md:
  - How to login
  - How to create/edit tasks
  - How to use calendar
  - How to drag and drop
  - Keyboard shortcuts
  
□ Create API_DOCS.md (optional):
  - List all endpoints
  - Request/response examples
```

### Step 55: Setup Monitoring
```bash
□ Add error tracking (Sentry - optional)
□ Add analytics (Google Analytics - optional)
□ Setup uptime monitoring (UptimeRobot)
□ Create admin dashboard to view logs
```

### Step 56: Gather Feedback & Iterate
```bash
□ Share with 5 team members
□ Gather initial feedback
□ Create prioritized improvement list
□ Plan v1.1 features
```

---

## 📊 TOTAL TIMELINE ESTIMATE

**Working Solo (Full-time):**
- Phase 1-2: 4 days (Setup + Auth)
- Phase 3-4: 5 days (Tasks + Inline Editing)
- Phase 5-6: 3 days (Categories + Drag & Drop)
- Phase 7-8: 5 days (Calendar + Reminders)
- Phase 9-10: 5 days (Search/Filters + Polish)
- Phase 11-13: 5 days (Testing + Deployment)
- **Total: 27 days (5-6 weeks)**

**Working Part-time (4 hours/day):**
- **Total: 10-12 weeks**

**With Help (2 developers):**
- **Total: 3-4 weeks**

---

## 🎯 QUICK START CHECKLIST (First Day)

Start here to get moving immediately:

```bash
□ 1. Create project folders
□ 2. Initialize React app
□ 3. Initialize Express server
□ 4. Setup database (local PostgreSQL)
□ 5. Get both running (React on :3000, Express on :5000)
□ 6. Create first API endpoint: GET /api/health
□ 7. Call it from React, see "Server is running" message
□ 8. Commit to Git
```

Once you see data flowing from backend → frontend, you're ready to start Step 5!

---

## 💡 PRO TIPS

1. **Use Claude Code** to generate boilerplate (routes, models, components)
2. **Commit often** - after every completed step
3. **Test as you go** - don't wait until the end
4. **Start simple** - get it working, then make it pretty
5. **Use existing libraries** - don't reinvent the wheel
6. **Focus on MVP** - resist adding extra features
7. **Ask for help** when stuck (Claude Code, Stack Overflow)

---

## 📝 NOTES SECTION (Use this as you work)

**Blockers:**
- 

**Questions:**
- 

**Decisions Made:**
- 

**Technical Debt:**
- 

**Nice to Haves (for later):**
- 

---

Good luck! 🚀 Start with Step 1 and work through sequentially. Each step builds on the previous one.
