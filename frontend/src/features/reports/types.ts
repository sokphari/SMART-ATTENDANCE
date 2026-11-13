export type SectionReport = {
  class_section_id: number;
  section_code: string;
  course_code: string;
  total: number;
  present: number;
  late: number;
  absent: number;
  excused: number;
  attendance_rate: number;
};

export type AttendanceReportData = {
  total: number;
  by_status: {
    present: number;
    late: number;
    absent: number;
    excused: number;
  };
  attendance_rate: number;
  by_section: SectionReport[];
};

export type SemesterOption = {
  id: number;
  name: string;
  academic_year?: { name: string } | null;
};

export type SectionOption = {
  id: number;
  section_code: string;
  course?: {
    course_code: string;
    name: string;
  };
};

