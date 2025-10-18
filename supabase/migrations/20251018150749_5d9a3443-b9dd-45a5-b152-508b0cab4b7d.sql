-- Assign admin role to admin@gmail.com
INSERT INTO user_roles (user_id, role)
VALUES ('dd09a018-51c2-4483-989a-f148f5615144', 'admin'::app_role)
ON CONFLICT (user_id, role) DO NOTHING;