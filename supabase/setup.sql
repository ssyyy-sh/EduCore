-- =====================================================================
-- EduFY — database for Supabase
-- Paste this whole file into Supabase → SQL Editor → New query → Run.
-- It is safe to run again (after an update of EduFY, for example).
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

-- Internal helpers live in a separate schema that the API does not expose.
create schema if not exists private;
grant usage on schema private to authenticated;

-- Role of the signed-in user (null when blocked or not signed in).
create or replace function private.my_role() returns text
language sql stable security definer set search_path = public as $$
  select case when p.disabled then null else p.role end from public.profiles p where p.id = auth.uid()
$$;

create or replace function private.is_active() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(private.my_role() in ('student', 'parent', 'teacher', 'school', 'owner'), false)
$$;


-- ---------- Links: which student card / classes an account belongs to ----------
-- student → their own card; parent → each child's card; teacher → a staff card with classes and subject.
-- A link with only an email waits until someone signs up with that email.
create table if not exists public.account_links (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references public.profiles (id) on delete cascade,
  email text,
  kind text not null check (kind in ('student', 'parent', 'teacher')),
  student_id text,
  student_name text,
  class_name text,
  teacher_id text,
  teacher_name text,
  subject text,
  classes text[] not null default '{}',
  account_name text,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  check (profile_id is not null or email is not null),
  check ((kind = 'teacher' and teacher_id is not null) or (kind <> 'teacher' and student_id is not null))
);
create unique index if not exists account_links_unique
  on public.account_links ((coalesce(profile_id::text, lower(email))), kind, (coalesce(student_id, teacher_id)));
create index if not exists account_links_profile on public.account_links (profile_id);

-- One-time codes the school gives to a student or a parent (valid 14 days).
create table if not exists public.link_codes (
  code text primary key,
  kind text not null check (kind in ('student', 'parent')),
  student_id text not null,
  student_name text,
  class_name text,
  created_by uuid default auth.uid(),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '14 days',
  used_by uuid,
  used_at timestamptz
);

create or replace function private.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(private.my_role() in ('school', 'owner'), false)
$$;

-- Student cards of my account: my own (student) or my children's (parent).
create or replace function private.my_student_ids() returns setof text
language sql stable security definer set search_path = public as $$
  select student_id from public.account_links where profile_id = auth.uid() and kind in ('student', 'parent') and private.is_active()
$$;

create or replace function private.my_self_ids() returns setof text
language sql stable security definer set search_path = public as $$
  select student_id from public.account_links where profile_id = auth.uid() and kind = 'student' and private.is_active()
$$;

create or replace function private.my_family_classes() returns setof text
language sql stable security definer set search_path = public as $$
  select class_name from public.account_links
  where profile_id = auth.uid() and kind in ('student', 'parent') and class_name is not null and private.is_active()
$$;

create or replace function private.my_teacher_classes() returns setof text
language sql stable security definer set search_path = public as $$
  select unnest(classes) from public.account_links where profile_id = auth.uid() and kind = 'teacher' and private.is_active()
$$;

-- Does the signed-in teacher teach this class? (The owner may act in any class.)
create or replace function private.teaches(cls text) returns boolean
language sql stable security definer set search_path = public as $$
  select case
    when private.my_role() = 'owner' then true
    when private.my_role() = 'teacher' then coalesce(cls in (select private.my_teacher_classes()), false)
    else false end
$$;

-- May I see data about this student? Admins: everyone; teachers: their classes; students/parents: their cards.
create or replace function private.sees_student(sid text, cls text) returns boolean
language sql stable security definer set search_path = public as $$
  select private.is_admin() or coalesce(sid in (select private.my_student_ids()), false) or private.teaches(cls)
$$;

create or replace function private.sees_announcement(aud text, author uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select private.is_active() and (
    private.is_admin() or author = auth.uid() or aud = 'all'
    or (aud = 'students' and private.my_role() = 'student')
    or (aud = 'parents' and private.my_role() = 'parent')
    or (aud = 'teachers' and private.my_role() = 'teacher')
    or (aud like 'class:%' and (substr(aud, 7) in (select private.my_family_classes()) or private.teaches(substr(aud, 7))))
  )
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
  -- Links the school prepared for this email (child's card, teacher's classes).
  update public.account_links
     set profile_id = new.id, account_name = coalesce(nullif(trim(new.raw_user_meta_data ->> 'name'), ''), account_name)
   where profile_id is null and lower(email) = lower(new.email);
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
    if private.my_role() is distinct from 'owner' then
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

-- Who may write to whom: anyone ↔ school admins; teachers ↔ teachers; teachers ↔ students and parents of their classes.
create or replace function private.can_chat(other uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((
    select case
      when p.id = auth.uid() or p.disabled or p.role = 'pending' then false
      when private.my_role() in ('school', 'owner') then true
      when p.role in ('school', 'owner') then private.my_role() in ('student', 'parent', 'teacher')
      when private.my_role() = 'teacher' and p.role = 'teacher' then true
      when private.my_role() = 'teacher' and p.role in ('student', 'parent') then exists (
        select 1 from public.account_links l where l.profile_id = p.id and l.kind in ('student', 'parent') and private.teaches(l.class_name))
      when private.my_role() in ('student', 'parent') and p.role = 'teacher' then exists (
        select 1 from public.account_links l where l.profile_id = p.id and l.kind = 'teacher'
          and l.classes && array(select private.my_family_classes()))
      else false end
    from public.profiles p where p.id = other
  ), false)
$$;

-- People I can write to (only name and role are shown).
create or replace function public.chat_contacts() returns table (id uuid, name text, role text)
language sql stable security definer set search_path = public as $$
  select p.id, p.name, p.role from public.profiles p
  where private.is_active() and private.can_chat(p.id)
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
  if private.my_role() not in ('parent', 'owner') then
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
   where id = slot and (booked_by = auth.uid() or teacher_id = auth.uid() or private.my_role() = 'owner')
$$;

alter table public.grade_log add column if not exists class_name text;
alter table public.gb_columns add column if not exists subject text;
alter table public.submissions add column if not exists class_name text;

-- Keep links up to date when the school moves a student or changes a teacher's classes.
create or replace function private.sync_student_class() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.class_name is not null and (tg_op = 'INSERT' or new.class_name is distinct from old.class_name) then
    update public.account_links set class_name = new.class_name where student_id = new.student_id and kind in ('student', 'parent');
  end if;
  return new;
end $$;
drop trigger if exists student_overrides_sync on public.student_overrides;
create trigger student_overrides_sync after insert or update on public.student_overrides
  for each row execute function private.sync_student_class();

create or replace function private.sync_teacher_card() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.patch ? 'classes' then
    update public.account_links set classes = array(select jsonb_array_elements_text(new.patch -> 'classes'))
     where kind = 'teacher' and teacher_id = new.teacher_id;
  end if;
  if new.patch ? 'subject' then
    update public.account_links set subject = new.patch ->> 'subject' where kind = 'teacher' and teacher_id = new.teacher_id;
  end if;
  return new;
end $$;
drop trigger if exists teacher_overrides_sync on public.teacher_overrides;
create trigger teacher_overrides_sync after insert or update on public.teacher_overrides
  for each row execute function private.sync_teacher_card();

-- A link made with an email of an existing account is attached to that account at once.
create or replace function private.resolve_link_profile() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  p public.profiles%rowtype;
begin
  if new.profile_id is null and new.email is not null then
    select * into p from public.profiles where lower(email) = lower(trim(new.email)) limit 1;
    if found then
      new.profile_id := p.id;
      new.account_name := coalesce(new.account_name, p.name);
    end if;
  end if;
  if new.email is not null then
    new.email := lower(trim(new.email));
  end if;
  return new;
end $$;
drop trigger if exists account_links_resolve on public.account_links;
create trigger account_links_resolve before insert on public.account_links
  for each row execute function private.resolve_link_profile();

-- A student or parent enters the code from the school.
create or replace function public.redeem_link_code(c text) returns json
language plpgsql security definer set search_path = public as $$
declare
  lc public.link_codes%rowtype;
  r text := private.my_role();
  nm text;
begin
  if r is null or r not in ('student', 'parent') then
    return json_build_object('ok', false, 'error', 'role');
  end if;
  select * into lc from public.link_codes where code = upper(trim(c)) for update;
  if not found or lc.used_by is not null or lc.expires_at < now() then
    return json_build_object('ok', false, 'error', 'invalid');
  end if;
  if lc.kind <> r then
    return json_build_object('ok', false, 'error', 'kind');
  end if;
  -- A student account belongs to one student card.
  if r = 'student' and exists (select 1 from public.account_links where profile_id = auth.uid() and kind = 'student' and student_id <> lc.student_id) then
    return json_build_object('ok', false, 'error', 'already');
  end if;
  select name into nm from public.profiles where id = auth.uid();
  insert into public.account_links (profile_id, kind, student_id, student_name, class_name, account_name, created_by)
  values (auth.uid(), lc.kind, lc.student_id, lc.student_name, lc.class_name, nm, lc.created_by)
  on conflict do nothing;
  update public.link_codes set used_by = auth.uid(), used_at = now() where code = lc.code;
  return json_build_object('ok', true, 'student_name', lc.student_name, 'class_name', lc.class_name);
end $$;

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
alter table public.account_links enable row level security;
alter table public.link_codes enable row level security;

grant usage on schema public to authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage, select on all sequences in schema public to authenticated;
revoke all on all tables in schema public from anon;

-- profiles
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles for select to authenticated
  using (id = auth.uid() or private.my_role() in ('school', 'owner'));
drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles for update to authenticated
  using (id = auth.uid() or private.my_role() = 'owner')
  with check (id = auth.uid() or private.my_role() = 'owner');

-- invites
drop policy if exists invites_all on public.invites;
create policy invites_all on public.invites for all to authenticated
  using (private.my_role() in ('school', 'owner'))
  with check (private.my_role() = 'owner' or (private.my_role() = 'school' and role in ('student', 'parent', 'teacher')));

-- assignments
drop policy if exists assignments_select on public.assignments;
create policy assignments_select on public.assignments for select to authenticated
  using (private.is_active() and (cls is null or created_by = auth.uid() or private.is_admin() or private.teaches(cls) or cls in (select private.my_family_classes())));
drop policy if exists assignments_insert on public.assignments;
create policy assignments_insert on public.assignments for insert to authenticated
  with check (private.my_role() in ('teacher', 'school', 'owner') and created_by = auth.uid());
drop policy if exists assignments_delete on public.assignments;
create policy assignments_delete on public.assignments for delete to authenticated
  using (created_by = auth.uid() or private.my_role() = 'owner');

-- attendance
drop policy if exists attendance_select on public.attendance;
create policy attendance_select on public.attendance for select to authenticated using (private.sees_student(student_id, class_name));
drop policy if exists attendance_insert on public.attendance;
create policy attendance_insert on public.attendance for insert to authenticated
  with check (private.is_admin() or private.teaches(class_name));
drop policy if exists attendance_update on public.attendance;
create policy attendance_update on public.attendance for update to authenticated
  using (private.is_admin() or private.teaches(class_name));
drop policy if exists attendance_delete on public.attendance;
create policy attendance_delete on public.attendance for delete to authenticated using (private.my_role() = 'owner');

-- gradebook columns and marks: teachers write, everyone signed in reads
drop policy if exists gb_columns_select on public.gb_columns;
create policy gb_columns_select on public.gb_columns for select to authenticated
  using (private.is_admin() or private.teaches(class_name) or class_name in (select private.my_family_classes()));
drop policy if exists gb_columns_insert on public.gb_columns;
create policy gb_columns_insert on public.gb_columns for insert to authenticated with check (private.teaches(class_name));
drop policy if exists gb_columns_update on public.gb_columns;
create policy gb_columns_update on public.gb_columns for update to authenticated using (private.teaches(class_name));
drop policy if exists gb_columns_delete on public.gb_columns;
create policy gb_columns_delete on public.gb_columns for delete to authenticated using (private.my_role() = 'owner');

drop policy if exists marks_select on public.marks;
create policy marks_select on public.marks for select to authenticated using (private.sees_student(student_id, class_name));
drop policy if exists marks_insert on public.marks;
create policy marks_insert on public.marks for insert to authenticated with check (private.teaches(class_name));
drop policy if exists marks_update on public.marks;
create policy marks_update on public.marks for update to authenticated using (private.teaches(class_name));
drop policy if exists marks_delete on public.marks;
create policy marks_delete on public.marks for delete to authenticated using (private.my_role() = 'owner');

drop policy if exists grade_log_select on public.grade_log;
create policy grade_log_select on public.grade_log for select to authenticated using (private.sees_student(student_id, class_name));
drop policy if exists grade_log_insert on public.grade_log;
create policy grade_log_insert on public.grade_log for insert to authenticated with check (private.teaches(class_name));
drop policy if exists grade_log_delete on public.grade_log;
create policy grade_log_delete on public.grade_log for delete to authenticated using (private.my_role() = 'owner');

-- submissions: a student hands in their own work (once); teachers grade it
drop policy if exists submissions_select on public.submissions;
create policy submissions_select on public.submissions for select to authenticated
  using (user_id = auth.uid() or private.sees_student(student_id, class_name));
drop policy if exists submissions_insert on public.submissions;
create policy submissions_insert on public.submissions for insert to authenticated
  with check (
    user_id = auth.uid() and grade is null and graded_at is null
    and (private.my_role() = 'owner' or (private.my_role() = 'student' and student_id in (select private.my_self_ids())))
  );
drop policy if exists submissions_update on public.submissions;
create policy submissions_update on public.submissions for update to authenticated
  using (private.teaches(class_name));
drop policy if exists submissions_delete on public.submissions;
create policy submissions_delete on public.submissions for delete to authenticated using (private.my_role() = 'owner');

-- announcements: school admin → anyone; teacher → a class
drop policy if exists announcements_select on public.announcements;
create policy announcements_select on public.announcements for select to authenticated using (private.sees_announcement(audience, author_id));
drop policy if exists announcements_insert on public.announcements;
create policy announcements_insert on public.announcements for insert to authenticated
  with check (
    author_id = auth.uid()
    and (private.is_admin() or (private.my_role() = 'teacher' and audience like 'class:%' and private.teaches(substr(audience, 7))))
  );
drop policy if exists announcements_delete on public.announcements;
create policy announcements_delete on public.announcements for delete to authenticated
  using (author_id = auth.uid() or private.my_role() in ('school', 'owner'));

-- own messages and read marks
drop policy if exists messages_own on public.messages;
create policy messages_own on public.messages for all to authenticated
  using (owner = auth.uid() and private.is_active()) with check (owner = auth.uid() and private.is_active());
drop policy if exists messages_owner_delete on public.messages;
create policy messages_owner_delete on public.messages for delete to authenticated using (private.my_role() = 'owner');
drop policy if exists reads_own on public.reads;
create policy reads_own on public.reads for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists reads_owner_delete on public.reads;
create policy reads_owner_delete on public.reads for delete to authenticated using (private.my_role() = 'owner');

-- Current class of a student added in the app (after moves).
create or replace function private.student_class(sid text) returns text
language sql stable security definer set search_path = public as $$
  select coalesce((select o.class_name from public.student_overrides o where o.student_id = sid),
                  (select s.data ->> 'className' from public.students_added s where s.id = sid))
$$;

-- students, teachers, form tutors: school admin writes; teachers read students of their classes; families their children
do $$
declare t text;
begin
  foreach t in array array['students_added', 'student_overrides', 'teachers_added', 'teacher_overrides', 'tutors'] loop
    execute format('drop policy if exists %I on public.%I', t || '_select', t);
    execute format('create policy %I on public.%I for select to authenticated using (%s)', t || '_select', t,
      case t
        when 'students_added' then 'private.is_admin() or private.teaches(private.student_class(id)) or id in (select private.my_student_ids())'
        when 'student_overrides' then 'private.is_admin() or private.teaches(coalesce(class_name, private.student_class(student_id))) or student_id in (select private.my_student_ids())'
        else 'private.is_active()' end);
    execute format('drop policy if exists %I on public.%I', t || '_insert', t);
    execute format('create policy %I on public.%I for insert to authenticated with check (private.my_role() in (''school'', ''owner''))', t || '_insert', t);
    execute format('drop policy if exists %I on public.%I', t || '_update', t);
    execute format('create policy %I on public.%I for update to authenticated using (private.my_role() in (''school'', ''owner''))', t || '_update', t);
    execute format('drop policy if exists %I on public.%I', t || '_delete', t);
    execute format('create policy %I on public.%I for delete to authenticated using (private.my_role() = ''owner'')', t || '_delete', t);
  end loop;
end $$;


-- timetable: school admin edits, everyone signed in reads
drop policy if exists timetable_select on public.timetable;
create policy timetable_select on public.timetable for select to authenticated using (private.is_active());
drop policy if exists timetable_insert on public.timetable;
create policy timetable_insert on public.timetable for insert to authenticated with check (private.my_role() in ('school', 'owner'));
drop policy if exists timetable_update on public.timetable;
create policy timetable_update on public.timetable for update to authenticated using (private.my_role() in ('school', 'owner'));
drop policy if exists timetable_delete on public.timetable;
create policy timetable_delete on public.timetable for delete to authenticated using (private.my_role() = 'owner');

-- conference slots: teachers open and remove their own; booking goes through book_slot / cancel_booking
drop policy if exists slots_select on public.meeting_slots;
create policy slots_select on public.meeting_slots for select to authenticated
  using (private.is_admin() or teacher_id = auth.uid() or booked_by = auth.uid() or (private.my_role() = 'parent' and booked_by is null));
drop policy if exists slots_insert on public.meeting_slots;
create policy slots_insert on public.meeting_slots for insert to authenticated
  with check (private.my_role() in ('teacher', 'owner') and teacher_id = auth.uid() and booked_by is null);
drop policy if exists slots_delete on public.meeting_slots;
create policy slots_delete on public.meeting_slots for delete to authenticated
  using (teacher_id = auth.uid() or private.my_role() = 'owner');

-- behaviour notes: teachers write, author or admin removes
drop policy if exists behavior_select on public.behavior;
create policy behavior_select on public.behavior for select to authenticated using (private.sees_student(student_id, class_name));
drop policy if exists behavior_insert on public.behavior;
create policy behavior_insert on public.behavior for insert to authenticated
  with check (private.teaches(class_name) and author_id = auth.uid());
drop policy if exists behavior_delete on public.behavior;
create policy behavior_delete on public.behavior for delete to authenticated
  using (author_id = auth.uid() or private.my_role() in ('school', 'owner'));

-- final grades: teachers confirm
drop policy if exists finals_select on public.final_grades;
create policy finals_select on public.final_grades for select to authenticated using (private.sees_student(student_id, class_name));
drop policy if exists finals_insert on public.final_grades;
create policy finals_insert on public.final_grades for insert to authenticated with check (private.teaches(class_name));
drop policy if exists finals_update on public.final_grades;
create policy finals_update on public.final_grades for update to authenticated using (private.teaches(class_name));
drop policy if exists finals_delete on public.final_grades;
create policy finals_delete on public.final_grades for delete to authenticated using (private.teaches(class_name));

-- chat: only the two people in a conversation see it
drop policy if exists chat_select on public.chat_messages;
create policy chat_select on public.chat_messages for select to authenticated
  using (private.is_active() and (sender = auth.uid() or recipient = auth.uid()));
drop policy if exists chat_insert on public.chat_messages;
create policy chat_insert on public.chat_messages for insert to authenticated
  with check (sender = auth.uid() and read_at is null and private.is_active() and private.can_chat(recipient));
drop policy if exists chat_owner_delete on public.chat_messages;

-- links and codes: people see their own links; the school admin and the owner manage them
drop policy if exists links_select on public.account_links;
create policy links_select on public.account_links for select to authenticated using (profile_id = auth.uid() or private.is_admin());
drop policy if exists links_write on public.account_links;
create policy links_write on public.account_links for all to authenticated using (private.is_admin()) with check (private.is_admin());
drop policy if exists codes_admin on public.link_codes;
create policy codes_admin on public.link_codes for all to authenticated using (private.is_admin()) with check (private.is_admin());

-- ---------- Live updates ----------
do $$
declare t text;
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    foreach t in array array['account_links', 'chat_messages', 'timetable', 'meeting_slots', 'behavior', 'final_grades', 'assignments', 'attendance', 'gb_columns', 'marks', 'grade_log', 'submissions', 'announcements',
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
  with check (bucket_id = 'submissions' and (storage.foldername(name))[1] = auth.uid()::text and private.is_active());
drop policy if exists educore_files_select on storage.objects;
create policy educore_files_select on storage.objects for select to authenticated
  using (bucket_id = 'submissions' and (
    (storage.foldername(name))[1] = auth.uid()::text
    or private.is_admin()
    or exists (select 1 from public.submissions s
               where s.user_id::text = (storage.foldername(name))[1] and private.sees_student(s.student_id, s.class_name))
  ));
drop policy if exists educore_files_delete on storage.objects;
create policy educore_files_delete on storage.objects for delete to authenticated
  using (bucket_id = 'submissions' and private.my_role() = 'owner');

-- ---------- Who may call which function ----------
-- Helpers: only used inside access rules, never through the API.
revoke all on function private.my_role() from public, anon;
revoke all on function private.is_active() from public, anon;
revoke all on function private.can_chat(uuid) from public, anon;
revoke all on function private.is_admin() from public, anon;
revoke all on function private.my_student_ids() from public, anon;
revoke all on function private.my_self_ids() from public, anon;
revoke all on function private.my_family_classes() from public, anon;
revoke all on function private.my_teacher_classes() from public, anon;
revoke all on function private.teaches(text) from public, anon;
revoke all on function private.student_class(text) from public, anon;
revoke all on function private.sees_student(text, text) from public, anon;
revoke all on function private.sees_announcement(text, uuid) from public, anon;
revoke all on function private.sync_student_class() from public, anon, authenticated;
revoke all on function private.sync_teacher_card() from public, anon, authenticated;
revoke all on function private.resolve_link_profile() from public, anon, authenticated;
grant execute on function private.is_admin() to authenticated;
grant execute on function private.my_student_ids() to authenticated;
grant execute on function private.my_self_ids() to authenticated;
grant execute on function private.my_family_classes() to authenticated;
grant execute on function private.my_teacher_classes() to authenticated;
grant execute on function private.teaches(text) to authenticated;
grant execute on function private.student_class(text) to authenticated;
grant execute on function private.sees_student(text, text) to authenticated;
grant execute on function private.sees_announcement(text, uuid) to authenticated;
grant execute on function private.my_role() to authenticated;
grant execute on function private.is_active() to authenticated;
grant execute on function private.can_chat(uuid) to authenticated;
-- Triggers: run by the database itself, nobody calls them directly.
revoke all on function public.handle_new_user() from public, anon, authenticated;
revoke all on function public.guard_profile() from public, anon, authenticated;
-- Actions the app calls: signed-in users only (each checks the caller's role itself).
revoke all on function public.book_slot(uuid, text, text) from public, anon;
revoke all on function public.cancel_booking(uuid) from public, anon;
revoke all on function public.chat_contacts() from public, anon;
revoke all on function public.chat_mark_read(uuid) from public, anon;
revoke all on function public.redeem_link_code(text) from public, anon;
grant execute on function public.redeem_link_code(text) to authenticated;
grant execute on function public.book_slot(uuid, text, text) to authenticated;
grant execute on function public.cancel_booking(uuid) to authenticated;
grant execute on function public.chat_contacts() to authenticated;
grant execute on function public.chat_mark_read(uuid) to authenticated;
-- Older versions of this file kept the helpers in the public schema.
drop function if exists public.can_chat(uuid);
drop function if exists public.is_active();
drop function if exists public.my_role();

-- =====================================================================
-- After you have signed up on the site with your own email, make yourself the owner:
--   update public.profiles set role = 'owner' where email = 'your@email.com';
-- =====================================================================
