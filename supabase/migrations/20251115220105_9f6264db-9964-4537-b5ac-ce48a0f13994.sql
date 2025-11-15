-- Add guest-only mode setting
INSERT INTO settings (key, value, updated_by)
VALUES (
  'guest_mode_only',
  jsonb_build_object('enabled', true),
  (SELECT id FROM auth.users WHERE id IN (SELECT user_id FROM user_roles WHERE role = 'admin') LIMIT 1)
)
ON CONFLICT (key) DO UPDATE
SET value = jsonb_build_object('enabled', true);

-- Add magic admin token settings
INSERT INTO settings (key, value, updated_by)
VALUES (
  'magic_admin_token',
  jsonb_build_object(
    'token', 'JJ-ADMIN-' || substring(md5(random()::text) from 1 for 32),
    'expires_at', (NOW() + INTERVAL '7 days')::text,
    'enabled', true,
    'temp_admin_email', 'temp-admin-' || substring(md5(random()::text) from 1 for 8) || '@jj-emas-internal.com',
    'temp_admin_password', substring(md5(random()::text) from 1 for 16)
  ),
  (SELECT id FROM auth.users WHERE id IN (SELECT user_id FROM user_roles WHERE role = 'admin') LIMIT 1)
)
ON CONFLICT (key) DO NOTHING;