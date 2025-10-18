# Admin Account Setup

To create your first admin user, run the following SQL command in your Lovable Cloud backend:

## Step 1: Sign up as a user
First, create a user account through the `/auth` page in your application.

## Step 2: Make the user an admin
Once you have your user account, go to Lovable Cloud backend and run this SQL:

```sql
-- Replace 'your-user-email@example.com' with the email you signed up with
INSERT INTO user_roles (user_id, role)
SELECT id, 'admin'::app_role
FROM auth.users
WHERE email = 'your-user-email@example.com';
```

## Alternative: Use User ID directly
If you know your user ID:

```sql
-- Replace 'your-user-id' with your actual user ID
INSERT INTO user_roles (user_id, role)
VALUES ('your-user-id', 'admin'::app_role);
```

## Verify Admin Access
After running the SQL, you can verify by querying:

```sql
SELECT u.email, ur.role
FROM auth.users u
JOIN user_roles ur ON ur.user_id = u.id
WHERE ur.role = 'admin';
```

## Access Admin Panel
Once you're an admin, navigate to `/admin` to access the admin dashboard.

**Note**: The first admin must be created manually through SQL. After that, admins can create other admin users through the admin panel (coming soon).
