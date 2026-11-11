export type CountGroup = Record<string, number>;

export type DashboardSummary = {
  counts: {
    users: CountGroup;
    departments: CountGroup;
    students: CountGroup;
    teachers: CountGroup;
    courses: CountGroup;
    class_sections: CountGroup;
    classrooms: CountGroup;
    enrollments: CountGroup;
    class_schedules: CountGroup;
  };
  trends: {
    students_last_30_days: number;
    teachers_last_30_days: number;
    enrollments_last_30_days: number;
    schedules_last_30_days: number;
  };
};
