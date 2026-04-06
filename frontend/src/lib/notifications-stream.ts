import { getStoredToken } from "@/lib/auth";
import { apiBaseUrl } from "@/lib/api";
import type { NotificationItem } from "@/lib/notifications-service";

type NotificationStreamEvent =
  | { type: "snapshot"; items: NotificationItem[]; unreadCount: number }
  | { type: "created"; notification: NotificationItem; userId: string }
  | { type: "read"; notificationId: string; userId: string }
  | { type: "read_all"; userId: string };

type NotificationStreamHandlers = {
  onEvent: (event: NotificationStreamEvent) => void;
  onError?: (error: Error) => void;
};

function parseSseChunk(chunk: string) {
  const lines = chunk.split("\n");
  let eventName = "message";
  const dataLines: string[] = [];

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();
    if (!line) {
      continue;
    }
    if (line.startsWith("event:")) {
      eventName = line.slice(6).trim();
      continue;
    }
    if (line.startsWith("data:")) {
      dataLines.push(line.slice(5).trim());
    }
  }

  if (!dataLines.length) {
    return null;
  }

  return {
    event: eventName,
    data: JSON.parse(dataLines.join("\n")) as NotificationStreamEvent | { items: NotificationItem[]; unreadCount: number }
  };
}

export function subscribeToNotificationsStream(handlers: NotificationStreamHandlers) {
  const token = getStoredToken();
  const controller = new AbortController();
  let retryTimer: number | null = null;
  let stopped = false;

  const connect = async () => {
    try {
      const response = await fetch(`${apiBaseUrl}/api/v1/notifications/stream`, {
        method: "GET",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        signal: controller.signal
      });

      if (!response.ok || !response.body) {
        throw new Error(`Notification stream failed with status ${response.status}.`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (!stopped) {
        const { done, value } = await reader.read();
        if (done) {
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split("\n\n");
        buffer = parts.pop() || "";

        for (const part of parts) {
          const parsed = parseSseChunk(part);
          if (!parsed || parsed.event === "heartbeat") {
            continue;
          }
          if (parsed.event === "snapshot") {
            const snapshot = parsed.data as { items: NotificationItem[]; unreadCount: number };
            handlers.onEvent({ type: "snapshot", items: snapshot.items, unreadCount: snapshot.unreadCount });
            continue;
          }
          handlers.onEvent(parsed.data as NotificationStreamEvent);
        }
      }
    } catch (error) {
      if (stopped || controller.signal.aborted) {
        return;
      }
      handlers.onError?.(error instanceof Error ? error : new Error("Notification stream disconnected."));
      retryTimer = window.setTimeout(() => {
        void connect();
      }, 3000);
    }
  };

  void connect();

  return () => {
    stopped = true;
    controller.abort();
    if (retryTimer !== null) {
      window.clearTimeout(retryTimer);
    }
  };
}
