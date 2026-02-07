/**
 * Migration: Seed default plans and create free subscriptions for existing workspaces.
 *
 * Plans:
 *   - free: 1 workspace, 3 members, 50 tasks
 *   - pro:  $3/seat/month, unlimited tasks, up to 50 members
 */

exports.shorthands = undefined;

exports.up = async (pgm) => {
  // Seed default plans
  pgm.sql(`
    INSERT INTO plans (id, name, price_per_seat_cents, max_members, max_tasks_per_workspace, features, active)
    VALUES
      ('free', 'Free', 0, 3, 50, '{"email_reminders": false}'::jsonb, true),
      ('pro', 'Pro', 300, 50, NULL, '{"email_reminders": true, "priority_support": false}'::jsonb, true)
    ON CONFLICT (id) DO NOTHING;
  `);

  // Create a free subscription for every existing workspace that doesn't have one
  pgm.sql(`
    INSERT INTO subscriptions (workspace_id, plan_id, status, seat_count)
    SELECT w.id, 'free', 'active', GREATEST(
      (SELECT COUNT(*) FROM workspace_members WHERE workspace_id = w.id),
      1
    )
    FROM workspaces w
    WHERE NOT EXISTS (
      SELECT 1 FROM subscriptions s WHERE s.workspace_id = w.id
    );
  `);
};

exports.down = (pgm) => {
  // Remove seeded subscriptions (only those on the free plan without stripe info)
  pgm.sql(`
    DELETE FROM subscriptions
    WHERE plan_id = 'free' AND stripe_customer_id IS NULL;
  `);

  // Remove seeded plans
  pgm.sql(`
    DELETE FROM plans WHERE id IN ('free', 'pro');
  `);
};
