-- Step 1 of user onboarding. Run this statement and commit it before 005.
alter type public.app_role add value if not exists 'pending';
