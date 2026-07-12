import { auth } from "@/lib/auth"
import { subscribe } from "@/lib/events"

export const dynamic = "force-dynamic"

// GET /api/events — SSE stream of payload-free "your data changed" signals.
// Browser-facing (session cookie, not an API token): proxy.ts exempts /api/,
// so auth happens here and returns 401 instead of redirecting. Clients react
// with router.refresh() (components/live-refresh.tsx); the events carry no
// data on purpose. Not part of the token REST API (docs/api.md has a note).
export async function GET(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers })
  if (!session) return new Response("Unauthorized", { status: 401 })
  const userId = session.user.id

  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    start(controller) {
      let closed = false

      const cleanup = () => {
        if (closed) return
        closed = true
        clearInterval(keepAlive)
        unsubscribe()
        try {
          controller.close()
        } catch {
          // already closed by the runtime
        }
      }

      const send = (chunk: string) => {
        if (closed) return
        try {
          controller.enqueue(encoder.encode(chunk))
        } catch {
          cleanup()
        }
      }

      const unsubscribe = subscribe(userId, () => send("data: changed\n\n"))
      // Comment frames keep the connection alive through reverse-proxy idle
      // timeouts (typically 60s).
      const keepAlive = setInterval(() => send(": keep-alive\n\n"), 20_000)

      request.signal.addEventListener("abort", cleanup)
      // Flushes the headers immediately and sets a fast client reconnect.
      send("retry: 3000\n\n")
    },
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-store, no-transform",
      Connection: "keep-alive",
      // Tell nginx-style proxies not to buffer the stream.
      "X-Accel-Buffering": "no",
    },
  })
}
