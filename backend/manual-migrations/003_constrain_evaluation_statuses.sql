-- VIVORA Lab manual migration: align AI evaluation statuses with process states.
-- Apply manually in the dedicated VIVORA Lab Supabase SQL Editor if migration 001
-- was already applied before status 'not_configured' was removed from the schema.
-- Do not run this against the team or production Supabase project.
--
-- This intentionally avoids DROP/TRUNCATE/DELETE. PostgreSQL will enforce this
-- additional CHECK for new/updated rows while leaving any old rows untouched.
-- If old rows with status = 'not_configured' exist, inspect them manually and
-- decide whether they should become status = 'failed' with
-- error_code = 'AI_PROVIDER_NOT_CONFIGURED'.

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.submission_evaluations'::regclass
      and conname = 'submission_evaluations_status_process_state_check'
  ) then
    alter table public.submission_evaluations
      add constraint submission_evaluations_status_process_state_check
      check (status in ('pending', 'processing', 'completed', 'failed'))
      not valid;
  end if;
end $$;
