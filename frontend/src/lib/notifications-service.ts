import { apiRequest } from "@/lib/api";

export type NotificationItem = {
  id: string;
  type: string;
  title: string;
  message: string;
  entityType: string | null;
  entityId: string | null;
  isRead: boolean;
  createdAt: string;
  readAt: string | null;
};

type NotificationsResponse = {
  success: boolean;
  items: NotificationItem[];
  unreadCount: number;
};

type NotificationResponse = {
  success: boolean;
  notification: NotificationItem;
};

export async function getNotifications(limit = 12) {
  return apiRequest<NotificationsResponse>(`/api/v1/notifications?limit=${limit}`);
}

export async function markNotificationRead(notificationId: string) {
  const response = await apiRequest<NotificationResponse>(`/api/v1/notifications/${notificationId}/read`, {
    method: "PUT"
  });
  return response.notification;
}

export async function markAllNotificationsRead() {
  await apiRequest<{ success: boolean; message: string }>("/api/v1/notifications/read-all", {
    method: "PUT"
  });
}
