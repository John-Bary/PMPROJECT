-- Arena PM Tool - Seed Data
-- Run this after migrations to populate demo data
-- Usage: psql -d arena_pm_tool -f supabase/seed.sql

-- Note: Passwords are bcrypt hashed. The demo password is 'demo123'
-- You can generate new hashes with: npx bcryptjs 'your-password'

-- Demo Users
INSERT INTO users (email, password, name, first_name, last_name, role, avatar_color)
VALUES
    ('admin@example.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Admin User', 'Admin', 'User', 'admin', '#6366f1'),
    ('member@example.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'Team Member', 'Team', 'Member', 'member', '#10b981')
ON CONFLICT (email) DO NOTHING;

-- Demo Categories
INSERT INTO categories (name, color, position, created_by)
SELECT 'Backlog', '#6b7280', 0, id FROM users WHERE email = 'admin@example.com'
ON CONFLICT DO NOTHING;

INSERT INTO categories (name, color, position, created_by)
SELECT 'In Progress', '#3b82f6', 1, id FROM users WHERE email = 'admin@example.com'
ON CONFLICT DO NOTHING;

INSERT INTO categories (name, color, position, created_by)
SELECT 'Done', '#10b981', 2, id FROM users WHERE email = 'admin@example.com'
ON CONFLICT DO NOTHING;

-- Demo Tasks
INSERT INTO tasks (title, description, category_id, priority, status, position, created_by)
SELECT
    'Welcome to Arena PM',
    'This is your first task. Click to edit or drag to reorder.',
    c.id,
    'medium',
    'todo',
    0,
    u.id
FROM categories c, users u
WHERE c.name = 'Backlog' AND u.email = 'admin@example.com'
ON CONFLICT DO NOTHING;

INSERT INTO tasks (title, description, category_id, priority, status, position, created_by)
SELECT
    'Set up your project',
    'Configure categories and invite team members.',
    c.id,
    'high',
    'in_progress',
    0,
    u.id
FROM categories c, users u
WHERE c.name = 'In Progress' AND u.email = 'admin@example.com'
ON CONFLICT DO NOTHING;
