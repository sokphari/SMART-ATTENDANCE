export type ClassSchedule = {
  id: number;
  class_section_id: number;
  class_section: {
    id: number;
    section_code: string;
    course?: {
      id: number;
      course_code: string;
      name: string;
    };
    semester?: {
      id: number;
      name: string;
    };
  } | null;
  classroom_id: number;
  classroom: {
    id: number;
    room_code: string;
    building?: string | null;
    floor?: string | null;
    allowed_radius_meters: number;
  } | null;
  day_of_week: number; // 1 = Monday, ..., 7 = Sunday
  start_time: string;
  end_time: string;
  effective_from: string | null;
  effective_until: string | null;
  created_at: string;
  updated_at: string;
};

export type ClassScheduleInput = {
  class_section_id: number;
  classroom_id: number;
  day_of_week: number;
  start_time: string;
  end_time: string;
  effective_from?: string | null;
  effective_until?: string | null;
};

export type ClassroomOption = {
  id: number;
  room_code: string;
  building: string | null;
  floor: string | null;
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

