import "server-only"

import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"

// Authoritative session checks — call one of these at the top of every
// protected page and every server action.

export async function requireUser() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) redirect("/login")
  return session.user
}

export async function requireAdmin() {
  const user = await requireUser()
  if (user.role !== "admin") redirect("/")
  return user
}
