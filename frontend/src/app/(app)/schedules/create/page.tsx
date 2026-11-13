import { ScheduleFormView } from "@/features/schedules/components/ScheduleFormView";

export const metadata = {
  title: "Add Timetable Slot",
};

export default function CreateSchedulePage() {
  return <ScheduleFormView mode="create" />;
}

