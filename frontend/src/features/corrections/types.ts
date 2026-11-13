export type AttendanceCorrection = {
  id: number;
  attendance_id: number;
  attendance?: {
    id: number;
    status: string;
    student?: {
      student_code: string;
      user?: {
        name: string;
      };
    };
    session?: {
      session_date: string;
      class_section?: {
        section_code: string;
        course?: {
          course_code: string;
          name: string;
        };
      };
    };
  } | null;
  requested_by: number;
  requester?: {
    name: string;
    email: string;
  } | null;
  reviewed_by: number | null;
  reviewer?: {
    name: string;
    email: string;
  } | null;
  reason: string;
  requested_status: "present" | "late" | "absent" | "excused";
  status: "pending" | "approved" | "rejected";
  reviewed_at: string | null;
  review_note: string | null;
  created_at: string;
  updated_at: string;
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

