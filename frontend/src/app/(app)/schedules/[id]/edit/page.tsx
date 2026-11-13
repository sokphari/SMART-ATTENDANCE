import { ScheduleFormView } from "@/features/schedules/components/ScheduleFormView";

export const metadata = {
  title: "Edit Timetable Slot",
};

export default function EditSchedulePage() {
  return <ScheduleFormView mode="edit" />;
}

