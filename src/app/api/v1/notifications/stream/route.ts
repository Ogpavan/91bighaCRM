import { AuthError, requireAuth } from "@/lib/crm-auth";
import { createCorsPreflightResponse, setCorsHeaders } from "@/lib/cors";
import { listNotifications, subscribeToNotificationEvents } from "@/lib/crm-notifications";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function encodeSse(event: string, data: unknown) {
  const payload = typeof data === "string" ? data : JSON.stringify(data);
  return new TextEncoder().encode(`event: ${event}\ndata: ${payload}\n\n`);
}

export async function OPTIONS(request: Request) {
  return createCorsPreflightResponse(request);
}

export async function GET(request: Request) {
  try {
    const auth = requireAuth(request);
    const initial = await listNotifications(auth.userId, 10);

    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(
          encodeSse("snapshot", {
            items: initial.items,
            unreadCount: initial.unreadCount
          })
        );

        const unsubscribe = subscribeToNotificationEvents(auth.userId, (event) => {
          controller.enqueue(encodeSse("notification", event));
        });

        const heartbeat = setInterval(() => {
          controller.enqueue(encodeSse("heartbeat", { at: new Date().toISOString() }));
        }, 25000);

        const close = () => {
          clearInterval(heartbeat);
          unsubscribe();
          try {
            controller.close();
          } catch {}
        };

        request.signal.addEventListener("abort", close);
      }
    });

    const headers = new Headers({
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive"
    });
    setCorsHeaders(headers, request);

    return new Response(stream, {
      status: 200,
      headers
    });
  } catch (error) {
    const status = error instanceof AuthError ? error.status : 400;
    const message = error instanceof Error ? error.message : "Unable to open notification stream.";
    const headers = new Headers({ "Content-Type": "application/json" });
    setCorsHeaders(headers, request);
    return new Response(JSON.stringify({ success: false, message }), { status, headers });
  }
}
