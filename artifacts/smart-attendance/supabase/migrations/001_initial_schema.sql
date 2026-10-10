-- =========================================================
-- SMART ATTENDANCE - INITIAL DATABASE SCHEMA
-- Person 1: Backend / Supabase
-- =========================================================

-- Enable UUID generation
create extension if not exists "pgcrypto";


-- =========================================================
-- 1. PROFILES
-- Connected directly to Supabase auth.users
-- =========================================================

create table if not exists public.profiles (
    id uuid primary key references auth.users(id) on delete cascade,

    email text unique not null,

    role text not null default 'employee'
        check (role in ('employee', 'admin')),

    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);


-- =========================================================
-- 2. SITES
-- Stores registered attendance locations / geofences
-- =========================================================

create table if not exists public.sites (
    id uuid primary key default gen_random_uuid(),

    name text not null,

    latitude double precision not null,
    longitude double precision not null,

    -- Radius in meters
    allowed_radius integer not null default 100
        check (allowed_radius > 0),

    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);


-- =========================================================
-- 3. EMPLOYEES
-- Employee information linked to profiles and sites
-- =========================================================

create table if not exists public.employees (
    id uuid primary key default gen_random_uuid(),

    profile_id uuid unique not null
        references public.profiles(id)
        on delete cascade,

    employee_code text unique not null,

    full_name text not null,

    department text,

    site_id uuid
        references public.sites(id)
        on delete set null,

    is_active boolean not null default true,

    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);


-- =========================================================
-- 4. ATTENDANCE
-- Stores employee check-in/check-out details
-- =========================================================

create table if not exists public.attendance (
    id uuid primary key default gen_random_uuid(),

    employee_id uuid not null
        references public.employees(id)
        on delete cascade,

    site_id uuid
        references public.sites(id)
        on delete set null,

    attendance_date date not null default current_date,

    check_in timestamptz,
    check_out timestamptz,

    -- Check-in GPS
    check_in_latitude double precision,
    check_in_longitude double precision,
    check_in_accuracy double precision,

    -- Check-out GPS
    check_out_latitude double precision,
    check_out_longitude double precision,
    check_out_accuracy double precision,

    -- Paths of photos stored in Supabase Storage
    check_in_photo_path text,
    check_out_photo_path text,

    -- OpenCV / face verification result
    check_in_face_verified boolean not null default false,
    check_out_face_verified boolean not null default false,

    check_in_face_confidence double precision,
    check_out_face_confidence double precision,

    status text not null default 'present'
        check (
            status in (
                'present',
                'absent',
                'late',
                'half_day'
            )
        ),

    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),

    -- Prevent multiple attendance rows for same employee/date
    unique (employee_id, attendance_date),

    -- Check-out cannot occur before check-in
    check (
        check_out is null
        or check_in is null
        or check_out >= check_in
    )
);


-- =========================================================
-- 5. LEAVE REQUESTS
-- =========================================================

create table if not exists public.leave_requests (
    id uuid primary key default gen_random_uuid(),

    employee_id uuid not null
        references public.employees(id)
        on delete cascade,

    start_date date not null,
    end_date date not null,

    reason text not null,

    status text not null default 'pending'
        check (
            status in (
                'pending',
                'approved',
                'rejected'
            )
        ),

    admin_comment text,

    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),

    check (end_date >= start_date)
);


-- =========================================================
-- INDEXES
-- Improve common queries
-- =========================================================

create index if not exists idx_employees_profile_id
on public.employees(profile_id);

create index if not exists idx_employees_site_id
on public.employees(site_id);

create index if not exists idx_attendance_employee_id
on public.attendance(employee_id);

create index if not exists idx_attendance_date
on public.attendance(attendance_date);

create index if not exists idx_attendance_site_id
on public.attendance(site_id);

create index if not exists idx_leave_employee_id
on public.leave_requests(employee_id);

create index if not exists idx_leave_status
on public.leave_requests(status);


-- =========================================================
-- UPDATED_AT TRIGGER
-- Automatically updates updated_at column
-- =========================================================

create or replace function public.update_updated_at_column()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
    new.updated_at = now();
    return new;
end;
$$;


drop trigger if exists update_profiles_updated_at
on public.profiles;

create trigger update_profiles_updated_at
before update on public.profiles
for each row
execute function public.update_updated_at_column();


drop trigger if exists update_sites_updated_at
on public.sites;

create trigger update_sites_updated_at
before update on public.sites
for each row
execute function public.update_updated_at_column();


drop trigger if exists update_employees_updated_at
on public.employees;

create trigger update_employees_updated_at
before update on public.employees
for each row
execute function public.update_updated_at_column();


drop trigger if exists update_attendance_updated_at
on public.attendance;

create trigger update_attendance_updated_at
before update on public.attendance
for each row
execute function public.update_updated_at_column();


drop trigger if exists update_leave_requests_updated_at
on public.leave_requests;

create trigger update_leave_requests_updated_at
before update on public.leave_requests
for each row
execute function public.update_updated_at_column();


-- =========================================================
-- ENABLE ROW LEVEL SECURITY
-- Policies will be added in the next migration.
-- =========================================================

alter table public.profiles enable row level security;
alter table public.sites enable row level security;
alter table public.employees enable row level security;
alter table public.attendance enable row level security;
alter table public.leave_requests enable row level security;