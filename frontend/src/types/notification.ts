export type NotificationLevel = "success" | "error" | "warning" | "info";
export type NotificationCategory = "all" | "auth" | "attendance" | "system";

export type NotificationItem = {
  id: string;
  action: string;
  category: "auth" | "attendance" | "system";
  level: NotificationLevel;
  title: string;
  message: string;
  ip_address: string | null;
  created_at: string;
  metadata: {
    role?: string;
  };
};

export type NotificationResponse = {
  data: NotificationItem[];
  meta: {
    total: number;
    unread_count: number;
    last_updated: string;
  };
};
