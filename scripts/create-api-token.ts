// Create a REST API token for a user headlessly (the webapp UI is the normal
// path; this is for devices/scripts and CI).
// Usage: npm run token:create -- <email> <token-name>
// Prints the plaintext token once — it is only stored hashed.
import { createHash, randomBytes } from "node:crypto"
import { eq } from "drizzle-orm"
import { db } from "../lib/db"
import { apiTokens, user } from "../lib/db/schema"

// Mirrors lib/api-auth.ts (not imported here — it pulls in "server-only").
const API_TOKEN_PREFIX = "sph_"

async function main() {
  const [email, ...nameParts] = process.argv.slice(2)
  const name = nameParts.join(" ")
  if (!email || !name) {
    console.error("Usage: npm run token:create -- <email> <token-name>")
    process.exit(1)
  }

  const [u] = await db.select().from(user).where(eq(user.email, email.toLowerCase()))
  if (!u) {
    console.error(`No user with email ${email}. Create one first (npm run admin:create).`)
    process.exit(1)
  }

  const token = API_TOKEN_PREFIX + randomBytes(32).toString("base64url")
  const tokenHash = createHash("sha256").update(token).digest("hex")
  await db.insert(apiTokens).values({
    userId: u.id,
    name,
    tokenHash,
    tokenPrefix: token.slice(0, 12),
  })

  console.log(`API token created for ${u.email}:\n\n  ${token}\n\nStore it now — it won't be shown again.`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
