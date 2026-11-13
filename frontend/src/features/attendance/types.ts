export type AttendanceRecord = {
  id: number;
  attendance_session_id: number;
  session: {
    id: number;
    session_date: string;
    starts_at: string;
    late_after: string;
    closes_at: string;
    status: string;
    class_section?: {
      id: number;
      section_code: string;
      course?: {
        course_code: string;
        name: string;
      };
    };
    classroom?: {
      room_code: string;
    };
  } | null;
  student_id: number;
  student: {
    id: number;
    student_code: string;
    user?: {
      name: string;
      email: string;
    };
  } | null;
  status: "present" | "late" | "absent" | "excused";
  verification_method: "dynamic_qr" | "manual" | "system";
  latitude: number | null;
  longitude: number | null;
  gps_accuracy_meters: number | null;
  distance_meters: number | null;
  checked_in_at: string | null;
  marked_by?: {
    name: string;
  } | null;
  remarks: string | null;
  created_at: string;
  updated_at: string;
};

export type SectionOption = {
  id: number;
  section_code: string;
  course?: {
    course_code: string;
    name: string;
  };
};

export type Paginated<T> = {
  data: T[];
  meta?: {
    current_page: number;
    last_page: number;
    total: number;
    per_page: number;
  };
};

