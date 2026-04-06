import { ensureCrmAuthSchema } from "@/lib/crm-auth";
import { withDbClient } from "@/lib/db";

type Queryable = {
  query<T>(text: string, params?: unknown[]): Promise<{ rows: T[] }>;
};

type NotificationEvent =
  | { type: "created"; notification: ReturnType<typeof mapNotificationRow>; userId: string }
  | { type: "read"; notificationId: string; userId: string }
  | { type: "read_all"; userId: string };

type NotificationListener = (event: NotificationEvent) => void;

type NotificationRow = {
  id: string;
  type: string;
  title: string;
  message: string;
  entity_type: string | null;
  entity_id: string | null;
  is_read: boolean;
  created_at: string;
  read_at: string | null;
};

export type CreateNotificationInput = {
  userId: number;
  type: string;
  title: string;
  message: string;
  entityType?: string | null;
  entityId?: string | number | null;
};

type NotificationPubSub = {
  subscribe: (userId: string, listener: NotificationListener) => () => void;
  publish: (event: NotificationEvent) => void;
};

function getNotificationPubSub(): NotificationPubSub {
  const globalKey = "__crmNotificationPubSub";
  const globalStore = globalThis as typeof globalThis & {
    __crmNotificationPubSub?: NotificationPubSub;
  };

  if (globalStore.__crmNotificationPubSub) {
    return globalStore.__crmNotificationPubSub;
  }

  const listeners = new Map<string, Set<NotificationListener>>();

  globalStore.__crmNotificationPubSub = {
    subscribe(userId, listener) {
      const bucket = listeners.get(userId) || new Set<NotificationListener>();
      bucket.add(listener);
      listeners.set(userId, bucket);

      return () => {
        const current = listeners.get(userId);
        if (!current) {
          return;
        }
        current.delete(listener);
        if (!current.size) {
          listeners.delete(userId);
        }
      };
    },
    publish(event) {
      const bucket = listeners.get(event.userId);
      if (!bucket?.size) {
        return;
      }
      bucket.forEach((listener) => listener(event));
    }
  };

  return globalStore.__crmNotificationPubSub;
}

function mapNotificationRow(row: NotificationRow) {
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    message: row.message,
    entityType: row.entity_type,
    entityId: row.entity_id,
    isRead: row.is_read,
    createdAt: row.created_at,
    readAt: row.read_at
  };
}

export function subscribeToNotificationEvents(userId: string, listener: NotificationListener) {
  return getNotificationPubSub().subscribe(userId, listener);
}

export async function ensureCrmNotificationsSchema() {
  await ensureCrmAuthSchema();

  await withDbClient(async (client) => {
    await client.query(`
      create table if not exists crm_notifications (
        id bigserial primary key,
        user_id bigint not null references users(id) on delete cascade,
        type varchar(80) not null,
        title varchar(180) not null,
        message text not null,
        entity_type varchar(80),
        entity_id bigint,
        is_read boolean not null default false,
        read_at timestamptz,
        created_at timestamptz not null default now()
      )
    `);
    await client.query(`
      create index if not exists idx_crm_notifications_user_created
      on crm_notifications(user_id, created_at desc)
    `);
    await client.query(`
      create index if not exists idx_crm_notifications_user_unread
      on crm_notifications(user_id, is_read, created_at desc)
    `);
  });
}

export async function createNotification(input: CreateNotificationInput, client?: Queryable) {
  await ensureCrmNotificationsSchema();

  const run = async (dbClient: Queryable) => {
    const result = await dbClient.query<NotificationRow>(
      `
        insert into crm_notifications (
          user_id,
          type,
          title,
          message,
          entity_type,
          entity_id
        )
        values ($1, $2, $3, $4, $5, $6)
        returning
          id::text as id,
          type,
          title,
          message,
          entity_type,
          entity_id::text as entity_id,
          is_read,
          created_at::text as created_at,
          read_at::text as read_at
      `,
      [input.userId, input.type, input.title, input.message, input.entityType || null, input.entityId ? Number(input.entityId) : null]
    );

    const notification = mapNotificationRow(result.rows[0]);
    getNotificationPubSub().publish({
      type: "created",
      userId: String(input.userId),
      notification
    });
    return notification;
  };

  if (client) {
    return run(client);
  }

  return withDbClient(run);
}

export async function createNotifications(inputs: CreateNotificationInput[], client?: Queryable) {
  const uniqueInputs = inputs.filter(
    (item, index, items) =>
      item.userId > 0 &&
      items.findIndex((candidate) => candidate.userId === item.userId && candidate.type === item.type && candidate.entityId === item.entityId) === index
  );

  if (!uniqueInputs.length) {
    return [];
  }

  if (client) {
    return Promise.all(uniqueInputs.map((item) => createNotification(item, client)));
  }

  return Promise.all(uniqueInputs.map((item) => createNotification(item)));
}

export async function listNotifications(userId: string, limit = 12) {
  await ensureCrmNotificationsSchema();

  return withDbClient(async (client) => {
    const [itemsResult, unreadResult] = await Promise.all([
      client.query<NotificationRow>(
        `
          select
            id::text as id,
            type,
            title,
            message,
            entity_type,
            entity_id::text as entity_id,
            is_read,
            created_at::text as created_at,
            read_at::text as read_at
          from crm_notifications
          where user_id = $1
          order by created_at desc
          limit $2
        `,
        [Number(userId), limit]
      ),
      client.query<{ count: string }>(
        `
          select count(*)::text as count
          from crm_notifications
          where user_id = $1 and is_read = false
        `,
        [Number(userId)]
      )
    ]);

    return {
      items: itemsResult.rows.map(mapNotificationRow),
      unreadCount: Number(unreadResult.rows[0]?.count ?? 0)
    };
  });
}

export async function markNotificationRead(notificationId: string, userId: string) {
  await ensureCrmNotificationsSchema();

  return withDbClient(async (client) => {
    const result = await client.query<NotificationRow>(
      `
        update crm_notifications
        set
          is_read = true,
          read_at = coalesce(read_at, now())
        where id = $1
          and user_id = $2
        returning
          id::text as id,
          type,
          title,
          message,
          entity_type,
          entity_id::text as entity_id,
          is_read,
          created_at::text as created_at,
          read_at::text as read_at
      `,
      [Number(notificationId), Number(userId)]
    );

    if (!result.rows.length) {
      throw new Error("Notification not found.");
    }

    const notification = mapNotificationRow(result.rows[0]);
    getNotificationPubSub().publish({
      type: "read",
      userId: String(userId),
      notificationId: String(notificationId)
    });
    return notification;
  });
}

export async function markAllNotificationsRead(userId: string) {
  await ensureCrmNotificationsSchema();

  return withDbClient(async (client) => {
    await client.query(
      `
        update crm_notifications
        set
          is_read = true,
          read_at = coalesce(read_at, now())
        where user_id = $1
          and is_read = false
      `,
      [Number(userId)]
    );
    getNotificationPubSub().publish({
      type: "read_all",
      userId: String(userId)
    });
  });
}
