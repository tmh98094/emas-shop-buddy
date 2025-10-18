-- Assign admin role to the first user (test@gmail.com)
-- This is the initial admin setup for user ID: 47457e23-631d-471f-a134-37184b1e26cf
INSERT INTO user_roles (user_id, role)
VALUES ('47457e23-631d-471f-a134-37184b1e26cf', 'admin'::app_role)
ON CONFLICT (user_id, role) DO NOTHING;