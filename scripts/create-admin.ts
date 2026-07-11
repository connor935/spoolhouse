// Bootstrap an admin account (registration is disabled in the app).
// Usage: npm run admin:create -- <email> <name>
// - email exists: promotes that user to admin
// - otherwise: creates the user with a printed one-time password
import { randomBytes, randomUUID } from "node:crypto"
import { eq } from "drizzle-orm"
import { hashPassword } from "better-auth/crypto"
import { db } from "../lib/db"
import { account, user } from "../lib/db/schema"

async function main() {
  const [email, ...nameParts] = process.argv.slice(2)
  const name = nameParts.join(" ")

  if (!email || !name) {
    console.error("Usage: npm run admin:create -- <email> <name>")
    process.exit(1)
  }

  const normalizedEmail = email.toLowerCase()
  const existing = await db.select().from(user).where(eq(user.email, normalizedEmail))

  if (existing.length > 0) {
    await db.update(user).set({ role: "admin" }).where(eq(user.id, existing[0].id))
    console.log(`Promoted existing user ${normalizedEmail} to admin.`)
    return
  }

  const password = randomBytes(9).toString("base64url")
  const userId = randomUUID()
  const now = new Date()

  await db.insert(user).values({
    id: userId,
    name,
    email: normalizedEmail,
    emailVerified: true,
    role: "admin",
    createdAt: now,
    updatedAt: now,
  })
  await db.insert(account).values({
    id: randomUUID(),
    accountId: userId,
    providerId: "credential",
    userId,
    password: await hashPassword(password),
    createdAt: now,
    updatedAt: now,
  })

  console.log(`Admin account created:\n  email:    ${normalizedEmail}\n  password: ${password}\nSign in and change the password on /account.`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
