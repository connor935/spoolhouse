import { betterAuth } from "better-auth"
import { drizzleAdapter } from "better-auth/adapters/drizzle"
import { admin } from "better-auth/plugins"
import { nextCookies } from "better-auth/next-js"
import { db } from "@/lib/db"
import { sendMail } from "@/lib/mail"

// Registration policy: closed by default, self-hosters can open sign-up
// via ALLOW_SIGNUP=true. Admins can always create users.
export const signupAllowed = process.env.ALLOW_SIGNUP === "true"

// Single source of truth for password length; client forms receive this as a
// prop from server components (process.env is not available in the browser).
export const passwordMinLength = process.env.MINIMUM_PASSWORD_LENGTH
  ? parseInt(process.env.MINIMUM_PASSWORD_LENGTH)
  : 12

// Origins allowed to call the auth API (better-auth rejects others with
// "Invalid origin"). BETTER_AUTH_URL is always trusted; add more (e.g. the LAN
// IP and localhost when the app is reached via several hosts) as a
// comma-separated TRUSTED_ORIGINS env.
const trustedOrigins = [
  ...(process.env.BETTER_AUTH_URL ? [process.env.BETTER_AUTH_URL] : []),
  ...(process.env.TRUSTED_ORIGINS ?? "")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean),
].filter((o, i, a) => a.indexOf(o) === i)

export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: "sqlite" }),
  trustedOrigins,
  emailAndPassword: {
    enabled: true,
    disableSignUp: !signupAllowed,
    minPasswordLength: passwordMinLength,
    sendResetPassword: async ({ user, url }) => {
      await sendMail({
        to: user.email,
        subject: "Spoolhouse — reset your password",
        text: `Hi ${user.name},\n\nreset your Spoolhouse password here:\n${url}\n\nIf you didn't request this, you can ignore this mail.`,
      })
    },
  },
  // nextCookies must stay the last plugin
  plugins: [admin(), nextCookies()],
})
