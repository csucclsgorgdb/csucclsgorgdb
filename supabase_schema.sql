-- SQL Schema for Organization Automated System
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Organizations Table
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Profiles Table (Extends Supabase Auth)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('super_admin', 'admin', 'staff_finance', 'staff_attendance')),
  organization_id UUID REFERENCES organizations(id),
  full_name TEXT,
  avatar_url TEXT,
  background_color TEXT DEFAULT '#f3f4f6',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Students Table
CREATE TABLE students (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  college TEXT,
  course TEXT,
  program TEXT,
  year_level INTEGER,
  email TEXT,
  department TEXT,
  organization_id UUID REFERENCES organizations(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Events Table
CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  start_date DATE NOT NULL,
  end_date DATE,
  is_one_day BOOLEAN DEFAULT TRUE,
  participants_filter JSONB DEFAULT '{}',
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'ongoing', 'done')),
  organization_id UUID REFERENCES organizations(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Attendance Table
CREATE TABLE attendance (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  time_in TIMESTAMP WITH TIME ZONE,
  time_out TIMESTAMP WITH TIME ZONE,
  status TEXT DEFAULT 'absent' CHECK (status IN ('absent', 'in_venue', 'present')),
  day_number INTEGER DEFAULT 1,
  organization_id UUID REFERENCES organizations(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Finance Records Table
CREATE TABLE finance_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  student_id UUID REFERENCES students(id) ON DELETE CASCADE,
  amount DECIMAL(10, 2) NOT NULL,
  receipt_number TEXT UNIQUE NOT NULL,
  academic_year TEXT NOT NULL,
  semester TEXT NOT NULL,
  payment_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  organization_id UUID REFERENCES organizations(id),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE finance_records ENABLE ROW LEVEL SECURITY;

-- Basic RLS Policies
-- 1. Organizations
DROP POLICY IF EXISTS "Public read organizations" ON organizations;
DROP POLICY IF EXISTS "Super admins manage organizations" ON organizations;
CREATE POLICY "Public read organizations" ON organizations FOR SELECT USING (true);
CREATE POLICY "Super admins manage organizations" ON organizations FOR ALL USING (
  (auth.jwt() ->> 'email') IN ('adminsystem@gmail.com', 'daviesialongo37@gmail.com')
);

-- 2. Profiles
DROP POLICY IF EXISTS "Users can read their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
DROP POLICY IF EXISTS "Super admins can read all profiles" ON profiles;
DROP POLICY IF EXISTS "Super admins can update all profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can read their organization staff" ON profiles;

CREATE POLICY "Users can read their own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can insert their own profile" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update their own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Super admins can read all profiles" ON profiles FOR SELECT USING (
  (auth.jwt() ->> 'email') IN ('adminsystem@gmail.com', 'daviesialongo37@gmail.com')
);
CREATE POLICY "Super admins can update all profiles" ON profiles FOR UPDATE USING (
  (auth.jwt() ->> 'email') IN ('adminsystem@gmail.com', 'daviesialongo37@gmail.com')
);
CREATE POLICY "Admins can read their organization staff" ON profiles FOR SELECT USING (
  organization_id IN (
    SELECT organization_id FROM profiles WHERE id = auth.uid() AND role = 'admin'
  )
);

-- 3. Students
DROP POLICY IF EXISTS "Org members can read students" ON students;
DROP POLICY IF EXISTS "Admins can manage students" ON students;
DROP POLICY IF EXISTS "Super admins manage all students" ON students;

CREATE POLICY "Super admins manage all students" ON students FOR ALL USING (
  (auth.jwt() ->> 'email') IN ('adminsystem@gmail.com', 'daviesialongo37@gmail.com')
);
CREATE POLICY "Admins can manage students" ON students FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin' AND organization_id = students.organization_id)
);
CREATE POLICY "Org members can read students" ON students FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND organization_id = students.organization_id)
);

-- 4. Events
DROP POLICY IF EXISTS "Org members can read events" ON events;
DROP POLICY IF EXISTS "Admins and attendance staff can manage events" ON events;
DROP POLICY IF EXISTS "Super admins manage all events" ON events;

CREATE POLICY "Super admins manage all events" ON events FOR ALL USING (
  (auth.jwt() ->> 'email') IN ('adminsystem@gmail.com', 'daviesialongo37@gmail.com')
);
CREATE POLICY "Admins and attendance staff can manage events" ON events FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'staff_attendance') AND organization_id = events.organization_id)
);
CREATE POLICY "Org members can read events" ON events FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND organization_id = events.organization_id)
);

-- 5. Attendance
DROP POLICY IF EXISTS "Org members can read attendance" ON attendance;
DROP POLICY IF EXISTS "Admins and attendance staff can manage attendance" ON attendance;
DROP POLICY IF EXISTS "Super admins manage all attendance" ON attendance;

CREATE POLICY "Super admins manage all attendance" ON attendance FOR ALL USING (
  (auth.jwt() ->> 'email') IN ('adminsystem@gmail.com', 'daviesialongo37@gmail.com')
);
CREATE POLICY "Admins and attendance staff can manage attendance" ON attendance FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'staff_attendance') AND organization_id = attendance.organization_id)
);
CREATE POLICY "Org members can read attendance" ON attendance FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND organization_id = attendance.organization_id)
);

-- 6. Finance
DROP POLICY IF EXISTS "Org members can read finance" ON finance_records;
DROP POLICY IF EXISTS "Admins and finance staff can manage finance" ON finance_records;
DROP POLICY IF EXISTS "Super admins manage all finance" ON finance_records;

CREATE POLICY "Super admins manage all finance" ON finance_records FOR ALL USING (
  (auth.jwt() ->> 'email') IN ('adminsystem@gmail.com', 'daviesialongo37@gmail.com')
);
CREATE POLICY "Admins and finance staff can manage finance" ON finance_records FOR ALL USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'staff_finance') AND organization_id = finance_records.organization_id)
);
CREATE POLICY "Org members can read finance" ON finance_records FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND organization_id = finance_records.organization_id)
);
