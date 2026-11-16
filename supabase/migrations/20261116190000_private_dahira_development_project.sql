-- Private five-year development project. Access restricted at database level to the verified owner.
create table if not exists public.private_development_projects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  project_key text not null default 'daara-jazbul-quluub-2027-2031',
  project_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(owner_id, project_key)
);
alter table public.private_development_projects enable row level security;
revoke all on public.private_development_projects from anon;
grant select, insert, update, delete on public.private_development_projects to authenticated;
drop policy if exists "owner only private development project" on public.private_development_projects;
create policy "owner only private development project"
on public.private_development_projects for all to authenticated
using (auth.uid() = owner_id and auth.uid() = 'af676419-4711-48e6-8caf-5099b823facf'::uuid)
with check (auth.uid() = owner_id and auth.uid() = 'af676419-4711-48e6-8caf-5099b823facf'::uuid);
