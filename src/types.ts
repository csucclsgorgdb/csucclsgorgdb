export type UserRole = 'super_admin' | 'admin' | 'staff_finance' | 'staff_attendance';

export interface Profile {
  id: string;
  email: string;
  role: UserRole;
  organization_id: string | null;
  organization_name?: string;
  full_name: string;
  avatar_url?: string;
  background_color?: string;
}

export interface Organization {
  id: string;
  name: string;
  created_at: string;
}

export interface Student {
  id: string;
  student_id: string;
  full_name: string;
  college: string;
  course: string;
  program: string;
  year_level: number;
  email: string;
  department?: string;
  organization_id: string;
  created_at: string;
}

export interface Event {
  id: string;
  name: string;
  description: string;
  start_date: string;
  end_date: string;
  is_one_day: boolean;
  participants_filter: {
    college?: string;
    course?: string;
    program?: string;
    year_level?: number;
    department?: 'Education' | 'Indus Tech';
  };
  status: 'pending' | 'ongoing' | 'done';
  organization_id: string;
  created_at: string;
}

export interface Attendance {
  id: string;
  event_id: string;
  student_id: string;
  time_in: string | null;
  time_out: string | null;
  status: 'absent' | 'in_venue' | 'present';
  day_number: number;
  organization_id: string;
}

export interface FinanceRecord {
  id: string;
  student_id: string;
  amount: number;
  receipt_number: string;
  academic_year: string;
  semester: string;
  payment_date: string;
  organization_id: string;
  notes?: string;
}
