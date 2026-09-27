-- =====================================================================
-- EduCore — database for Supabase
-- Paste this whole file into Supabase → SQL Editor → New query → Run.
-- It is safe to run again (after an update of EduCore, for example).
-- =====================================================================

-- ---------- Accounts ----------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  name text not null default '',
  role text not null default 'pending' check (role in ('student', 'parent', 'teacher', 'school', 'owner', 'pending')),
  requested_role text,
  org text,
  prefs jsonb not null default '{}'::jsonb,
  disabled boolean not null default false,
  created_at timestamptz not null default now()
);

-- Accounts the school admin or the owner has prepared: whoever signs up with this email gets this role.
create table if not exists public.invites (
  id bigserial primary key,
  email text not null,
  name text,
  role text not null check (role in ('student', 'parent', 'teacher', 'school')),
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now()
);

-- Role of the signed-in user (null when blocked or not signed in).
create or replace function public.my_role() returns text
language sql stable security definer set search_path = public as $$
  select case when p.disabled then null else p.role end from public.profiles p where p.id = auth.uid()
$$;

create or replace function public.is_active() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(public.my_role() in ('student', 'parent', 'teacher', 'school', 'owner'), false)
$$;

-- New sign-up → profile. Role: from an invite; otherwise student/parent as chosen;
-- teacher and school admin sign-ups wait for the owner's approval ("pending").
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  inv public.invites%rowtype;
  req text := coalesce(new.raw_user_meta_data ->> 'role', 'student');
  r text;
  invited boolean;
begin
  select * into inv from public.invites where lower(email) = lower(new.email) order by created_at desc limit 1;
  invited := found;
  if invited then
    r := inv.role;
  elsif req in ('student', 'parent') then
    r := req;
  else
    r := 'pending';
  end if;
  insert into public.profiles (id, email, name, role, requested_role, org)
  values (
    new.id,
    lower(new.email),
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'name'), ''), inv.name, split_part(new.email, '@', 1)),
    r,
    req,
    nullif(trim(new.raw_user_meta_data ->> 'org'), '')
  )
  on conflict (id) do nothing;
  if invited then
    delete from public.invites where lower(email) = lower(new.email);
  end if;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Only the owner may change roles or block accounts (and not their own role).
-- Changes made in the SQL Editor (no signed-in user) are allowed.
create or replace function public.guard_profile() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then
    return new;
  end if;
  if new.id <> old.id or new.email <> old.email or new.created_at <> old.created_at then
    raise exception 'not allowed';
  end if;
  if new.role is distinct from old.role or new.disabled is distinct from old.disabled then
    if public.my_role() is distinct from 'owner' then
      raise exception 'only the owner can change roles';
    end if;
    if old.id = auth.uid() then
      raise exception 'you cannot change your own role';
    end if;
  end if;
  return new;
end $$;

drop trigger if exists profiles_guard on public.profiles;
create trigger profiles_guard before update on public.profiles
  for each row execute function public.guard_profile();

-- ---------- School data ----------
create table if not exists public.assignments (
  id text primary key,
  title jsonb not null,
  subject text,
  teacher text,
  due timestamptz,
  type text,
  weight text,
  cls text,
  instructions text,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now()
);

create table if not exists public.attendance (
  day date not null,
  class_name text not null,
  student_id text not null,
  status text not null check (status in ('present', 'late', 'absent')),
  updated_by uuid default auth.uid(),
  updated_at timestamptz not null default now(),
  primary key (day, class_name, student_id)
);

create table if not exists public.gb_columns (
  class_name text not null,
  id text not null,
  title text,
  title_l jsonb,
  date timestamptz,
  type text,
  from_assignment text,
  removed boolean not null default false,
  is_seed boolean not null default false,
  created_by uuid default auth.uid(),
  primary key (class_name, id)
);

create table if not exists public.marks (
  class_name text not null,
  student_id text not null,
  column_id text not null,
  grade smallint check (grade between 2 and 5),
  updated_by uuid default auth.uid(),
  updated_at timestamptz not null default now(),
  primary key (class_name, student_id, column_id)
);

create table if not exists public.grade_log (
  id text primary key,
  student_id text not null,
  subject text,
  work jsonb,
  grade smallint check (grade between 2 and 5),
  at timestamptz not null default now(),
  created_by uuid default auth.uid()
);

create table if not exists public.submissions (
  assignment_id text not null,
  student_id text not null,
  user_id uuid default auth.uid(),
  student_name text,
  files jsonb not null default '[]'::jsonb,
  comment text,
  at timestamptz not null default now(),
  grade smallint check (grade between 2 and 5),
  feedback text,
  graded_at timestamptz,
  graded_by uuid,
  primary key (assignment_id, student_id)
);

create table if not exists public.announcements (
  id text primary key,
  title text not null,
  body text not null,
  audience text not null,
  author text,
  author_id uuid default auth.uid(),
  at timestamptz not null default now()
);

create table if not exists public.messages (
  id text primary key,
  owner uuid not null default auth.uid(),
  to_name text,
  role text,
  subject text,
  body text,
  at timestamptz not null default now()
);

create table if not exists public.reads (
  user_id uuid not null default auth.uid(),
  kind text not null check (kind in ('n', 'm')),
  item_id text not null,
  primary key (user_id, kind, item_id)
);

create table if not exists public.students_added (
  id text primary key,
  data jsonb not null,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now()
);

create table if not exists public.student_overrides (
  student_id text primary key,
  class_name text,
  archived boolean not null default false,
  updated_by uuid default auth.uid(),
  updated_at timestamptz not null default now()
);

create table if not exists public.teachers_added (
  id text primary key,
  data jsonb not null,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now()
);

create table if not exists public.teacher_overrides (
  teacher_id text primary key,
  patch jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.tutors (
  class_name text primary key,
  teacher_id text not null
);


create table if not exists public.timetable (
  class_name text not null,
  day text not null check (day in ('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday')),
  period smallint not null check (period between 1 and 7),
  subject text,
  teacher_id text,
  teacher_name text,
  room text,
  cleared boolean not null default false,
  updated_by uuid default auth.uid(),
  updated_at timestamptz not null default now(),
  primary key (class_name, day, period)
);

create table if not exists public.meeting_slots (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  teacher_name text,
  starts_at timestamptz not null,
  duration_min smallint not null default 10 check (duration_min between 5 and 60),
  location text,
  booked_by uuid references public.profiles (id) on delete set null,
  booked_name text,
  child text,
  note text,
  booked_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.behavior (
  id uuid primary key default gen_random_uuid(),
  student_id text not null,
  class_name text,
  kind text not null check (kind in ('praise', 'remark')),
  category text,
  note text,
  author text,
  author_id uuid default auth.uid(),
  at timestamptz not null default now()
);

create table if not exists public.final_grades (
  term text not null,
  class_name text not null,
  student_id text not null,
  subject text not null,
  grade smallint not null check (grade between 2 and 5),
  confirmed_by uuid default auth.uid(),
  confirmed_at timestamptz not null default now(),
  primary key (term, class_name, student_id, subject)
);

create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  sender uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  recipient uuid not null references public.profiles (id) on delete cascade,
  body text not null check (length(body) between 1 and 4000),
  created_at timestamptz not null default now(),
  read_at timestamptz
);
create index if not exists chat_messages_pair on public.chat_messages (recipient, sender, created_at);

-- Who may write to whom: students and parents → teachers, school admins, owner; staff → anyone active.
create or replace function public.can_chat(other uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((
    select case
      when public.my_role() in ('teacher', 'school', 'owner') then p.role in ('student', 'parent', 'teacher', 'school', 'owner')
      when public.my_role() in ('student', 'parent') then p.role in ('teacher', 'school', 'owner')
      else false end
    from public.profiles p where p.id = other and not p.disabled and p.id <> auth.uid()
  ), false)
$$;

-- People I can write to (only name and role are shown).
create or replace function public.chat_contacts() returns table (id uuid, name text, role text)
language sql stable security definer set search_path = public as $$
  select p.id, p.name, p.role from public.profiles p
  where public.is_active() and public.can_chat(p.id)
  order by p.name
$$;

create or replace function public.chat_mark_read(other uuid) returns void
language sql security definer set search_path = public as $$
  update public.chat_messages set read_at = now()
  where recipient = auth.uid() and sender = other and read_at is null
$$;

-- A parent books a free slot (true = booked, false = already taken or in the past).
create or replace function public.book_slot(slot uuid, child_name text, note_text text) returns boolean
language plpgsql security definer set search_path = public as $$
declare n int;
begin
  if public.my_role() not in ('parent', 'owner') then
    raise exception 'only parents can book';
  end if;
  update public.meeting_slots
     set booked_by = auth.uid(),
         booked_name = (select name from public.profiles where id = auth.uid()),
         child = left(child_name, 120), note = left(note_text, 500), booked_at = now()
   where id = slot and booked_by is null and starts_at > now();
  get diagnostics n = row_count;
  return n = 1;
end $$;

-- The parent who booked, the teacher or the owner can free a slot again.
create or replace function public.cancel_booking(slot uuid) returns void
language sql security definer set search_path = public as $$
  update public.meeting_slots
     set booked_by = null, booked_name = null, child = null, note = null, booked_at = null
   where id = slot and (booked_by = auth.uid() or teacher_id = auth.uid() or public.my_role() = 'owner')
$$;

-- ---------- Access rules (Row Level Security) ----------
alter table public.profiles enable row level security;
alter table public.invites enable row level security;
alter table public.assignments enable row level security;
alter table public.attendance enable row level security;
alter table public.gb_columns enable row level security;
alter table public.marks enable row level security;
alter table public.grade_log enable row level security;
alter table public.submissions enable row level security;
alter table public.announcements enable row level security;
alter table public.messages enable row level security;
alter table public.reads enable row level security;
alter table public.students_added enable row level security;
alter table public.student_overrides enable row level security;
alter table public.teachers_added enable row level security;
alter table public.teacher_overrides enable row level security;
alter table public.tutors enable row level security;
alter table public.timetable enable row level security;
alter table public.meeting_slots enable row level security;
alter table public.behavior enable row level security;
alter table public.final_grades enable row level security;
alter table public.chat_messages enable row level security;

grant usage on schema public to authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage, select on all sequences in schema public to authenticated;
revoke all on all tables in schema public from anon;

-- profiles
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles for select to authenticated
  using (id = auth.uid() or public.my_role() in ('school', 'owner'));
drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles for update to authenticated
  using (id = auth.uid() or public.my_role() = 'owner')
  with check (id = auth.uid() or public.my_role() = 'owner');

-- invites
drop policy if exists invites_all on public.invites;
create policy invites_all on public.invites for all to authenticated
  using (public.my_role() in ('school', 'owner'))
  with check (public.my_role() = 'owner' or (public.my_role() = 'school' and role in ('student', 'parent', 'teacher')));

-- assignments
drop policy if exists assignments_select on public.assignments;
create policy assignments_select on public.assignments for select to authenticated using (public.is_active());
drop policy if exists assignments_insert on public.assignments;
create policy assignments_insert on public.assignments for insert to authenticated
  with check (public.my_role() in ('teacher', 'school', 'owner') and created_by = auth.uid());
drop policy if exists assignments_delete on public.assignments;
create policy assignments_delete on public.assignments for delete to authenticated
  using (created_by = auth.uid() or public.my_role() = 'owner');

-- attendance
drop policy if exists attendance_select on public.attendance;
create policy attendance_select on public.attendance for select to authenticated using (public.is_active());
drop policy if exists attendance_insert on public.attendance;
create policy attendance_insert on public.attendance for insert to authenticated
  with check (public.my_role() in ('teacher', 'school', 'owner'));
drop policy if exists attendance_update on public.attendance;
create policy attendance_update on public.attendance for update to authenticated
  using (public.my_role() in ('teacher', 'school', 'owner'));
drop policy if exists attendance_delete on public.attendance;
create policy attendance_delete on public.attendance for delete to authenticated using (public.my_role() = 'owner');

-- gradebook columns and marks: teachers write, everyone signed in reads
drop policy if exists gb_columns_select on public.gb_columns;
create policy gb_columns_select on public.gb_columns for select to authenticated using (public.is_active());
drop policy if exists gb_columns_insert on public.gb_columns;
create policy gb_columns_insert on public.gb_columns for insert to authenticated with check (public.my_role() in ('teacher', 'owner'));
drop policy if exists gb_columns_update on public.gb_columns;
create policy gb_columns_update on public.gb_columns for update to authenticated using (public.my_role() in ('teacher', 'owner'));
drop policy if exists gb_columns_delete on public.gb_columns;
create policy gb_columns_delete on public.gb_columns for delete to authenticated using (public.my_role() = 'owner');

drop policy if exists marks_select on public.marks;
create policy marks_select on public.marks for select to authenticated using (public.is_active());
drop policy if exists marks_insert on public.marks;
create policy marks_insert on public.marks for insert to authenticated with check (public.my_role() in ('teacher', 'owner'));
drop policy if exists marks_update on public.marks;
create policy marks_update on public.marks for update to authenticated using (public.my_role() in ('teacher', 'owner'));
drop policy if exists marks_delete on public.marks;
create policy marks_delete on public.marks for delete to authenticated using (public.my_role() = 'owner');

drop policy if exists grade_log_select on public.grade_log;
create policy grade_log_select on public.grade_log for select to authenticated using (public.is_active());
drop policy if exists grade_log_insert on public.grade_log;
create policy grade_log_insert on public.grade_log for insert to authenticated with check (public.my_role() in ('teacher', 'owner'));
drop policy if exists grade_log_delete on public.grade_log;
create policy grade_log_delete on public.grade_log for delete to authenticated using (public.my_role() = 'owner');

-- submissions: a student hands in their own work (once); teachers grade it
drop policy if exists submissions_select on public.submissions;
create policy submissions_select on public.submissions for select to authenticated
  using (user_id = auth.uid() or public.my_role() in ('teacher', 'school', 'owner', 'parent'));
drop policy if exists submissions_insert on public.submissions;
create policy submissions_insert on public.submissions for insert to authenticated
  with check (public.my_role() in ('student', 'owner') and user_id = auth.uid() and grade is null and graded_at is null);
drop policy if exists submissions_update on public.submissions;
create policy submissions_update on public.submissions for update to authenticated
  using (public.my_role() in ('teacher', 'owner'));
drop policy if exists submissions_delete on public.submissions;
create policy submissions_delete on public.submissions for delete to authenticated using (public.my_role() = 'owner');

-- announcements: school admin → anyone; teacher → a class
drop policy if exists announcements_select on public.announcements;
create policy announcements_select on public.announcements for select to authenticated using (public.is_active());
drop policy if exists announcements_insert on public.announcements;
create policy announcements_insert on public.announcements for insert to authenticated
  with check (
    author_id = auth.uid()
    and (public.my_role() in ('school', 'owner') or (public.my_role() = 'teacher' and audience like 'class:%'))
  );
drop policy if exists announcements_delete on public.announcements;
create policy announcements_delete on public.announcements for delete to authenticated
  using (author_id = auth.uid() or public.my_role() in ('school', 'owner'));

-- own messages and read marks
drop policy if exists messages_own on public.messages;
create policy messages_own on public.messages for all to authenticated
  using (owner = auth.uid() and public.is_active()) with check (owner = auth.uid() and public.is_active());
drop policy if exists messages_owner_delete on public.messages;
create policy messages_owner_delete on public.messages for delete to authenticated using (public.my_role() = 'owner');
drop policy if exists reads_own on public.reads;
create policy reads_own on public.reads for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists reads_owner_delete on public.reads;
create policy reads_owner_delete on public.reads for delete to authenticated using (public.my_role() = 'owner');

-- students, teachers, form tutors: school admin writes, everyone signed in reads
do $$
declare t text;
begin
  foreach t in array array['students_added', 'student_overrides', 'teachers_added', 'teacher_overrides', 'tutors'] loop
    execute format('drop policy if exists %I on public.%I', t || '_select', t);
    execute format('create policy %I on public.%I for select to authenticated using (public.is_active())', t || '_select', t);
    execute format('drop policy if exists %I on public.%I', t || '_insert', t);
    execute format('create policy %I on public.%I for insert to authenticated with check (public.my_role() in (''school'', ''owner''))', t || '_insert', t);
    execute format('drop policy if exists %I on public.%I', t || '_update', t);
    execute format('create policy %I on public.%I for update to authenticated using (public.my_role() in (''school'', ''owner''))', t || '_update', t);
    execute format('drop policy if exists %I on public.%I', t || '_delete', t);
    execute format('create policy %I on public.%I for delete to authenticated using (public.my_role() = ''owner'')', t || '_delete', t);
  end loop;
end $$;


-- timetable: school admin edits, everyone signed in reads
drop policy if exists timetable_select on public.timetable;
create policy timetable_select on public.timetable for select to authenticated using (public.is_active());
drop policy if exists timetable_insert on public.timetable;
create policy timetable_insert on public.timetable for insert to authenticated with check (public.my_role() in ('school', 'owner'));
drop policy if exists timetable_update on public.timetable;
create policy timetable_update on public.timetable for update to authenticated using (public.my_role() in ('school', 'owner'));
drop policy if exists timetable_delete on public.timetable;
create policy timetable_delete on public.timetable for delete to authenticated using (public.my_role() = 'owner');

-- conference slots: teachers open and remove their own; booking goes through book_slot / cancel_booking
drop policy if exists slots_select on public.meeting_slots;
create policy slots_select on public.meeting_slots for select to authenticated using (public.is_active());
drop policy if exists slots_insert on public.meeting_slots;
create policy slots_insert on public.meeting_slots for insert to authenticated
  with check (public.my_role() in ('teacher', 'owner') and teacher_id = auth.uid() and booked_by is null);
drop policy if exists slots_delete on public.meeting_slots;
create policy slots_delete on public.meeting_slots for delete to authenticated
  using (teacher_id = auth.uid() or public.my_role() = 'owner');

-- behaviour notes: teachers write, author or admin removes
drop policy if exists behavior_select on public.behavior;
create policy behavior_select on public.behavior for select to authenticated using (public.is_active());
drop policy if exists behavior_insert on public.behavior;
create policy behavior_insert on public.behavior for insert to authenticated
  with check (public.my_role() in ('teacher', 'owner') and author_id = auth.uid());
drop policy if exists behavior_delete on public.behavior;
create policy behavior_delete on public.behavior for delete to authenticated
  using (author_id = auth.uid() or public.my_role() in ('school', 'owner'));

-- final grades: teachers confirm
drop policy if exists finals_select on public.final_grades;
create policy finals_select on public.final_grades for select to authenticated using (public.is_active());
drop policy if exists finals_insert on public.final_grades;
create policy finals_insert on public.final_grades for insert to authenticated with check (public.my_role() in ('teacher', 'owner'));
drop policy if exists finals_update on public.final_grades;
create policy finals_update on public.final_grades for update to authenticated using (public.my_role() in ('teacher', 'owner'));
drop policy if exists finals_delete on public.final_grades;
create policy finals_delete on public.final_grades for delete to authenticated using (public.my_role() in ('teacher', 'owner'));

-- chat: only the two people in a conversation see it
drop policy if exists chat_select on public.chat_messages;
create policy chat_select on public.chat_messages for select to authenticated
  using (public.is_active() and (sender = auth.uid() or recipient = auth.uid()));
drop policy if exists chat_insert on public.chat_messages;
create policy chat_insert on public.chat_messages for insert to authenticated
  with check (sender = auth.uid() and read_at is null and public.is_active() and public.can_chat(recipient));
drop policy if exists chat_owner_delete on public.chat_messages;

-- ---------- Live updates ----------
do $$
declare t text;
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    foreach t in array array['chat_messages', 'timetable', 'meeting_slots', 'behavior', 'final_grades', 'assignments', 'attendance', 'gb_columns', 'marks', 'grade_log', 'submissions', 'announcements',
                             'students_added', 'student_overrides', 'teachers_added', 'teacher_overrides', 'tutors'] loop
      begin
        execute format('alter publication supabase_realtime add table public.%I', t);
      exception when duplicate_object then null;
      end;
    end loop;
  end if;
end $$;

-- ---------- Files of submitted work (Storage) ----------
insert into storage.buckets (id, name, public, file_size_limit)
values ('submissions', 'submissions', false, 5242880)
on conflict (id) do update set public = false, file_size_limit = 5242880;

drop policy if exists educore_files_insert on storage.objects;
create policy educore_files_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'submissions' and (storage.foldername(name))[1] = auth.uid()::text and public.is_active());
drop policy if exists educore_files_select on storage.objects;
create policy educore_files_select on storage.objects for select to authenticated
  using (bucket_id = 'submissions' and ((storage.foldername(name))[1] = auth.uid()::text or public.my_role() in ('teacher', 'school', 'owner', 'parent')));
drop policy if exists educore_files_delete on storage.objects;
create policy educore_files_delete on storage.objects for delete to authenticated
  using (bucket_id = 'submissions' and public.my_role() = 'owner');

-- =====================================================================
-- After you have signed up on the site with your own email, make yourself the owner:
--   update public.profiles set role = 'owner' where email = 'your@email.com';
-- =====================================================================
