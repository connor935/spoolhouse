import { betterAuth } from "better-auth"
import { drizzleAdapter } from "better-auth/adapters/drizzle"
import { admin } from "better-auth/plugins"
import { nextCookies } from "better-auth/next-js"
import { db } from "@/lib/db"
import { sendMail } from "@/lib/mail"

// Registration policy: closed by default, self-hosters can open sign-up
// via ALLOW_SIGNUP=true. Admins can always create users.
export const signupAllowed = process.env.ALLOW_SIGNUP === "true"

export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: "sqlite" }),
  emailAndPassword: {
    enabled: true,
    disableSignUp: !signupAllowed,
    minPasswordLength: process.env.MINIMUM_PASSWORD_LENGTH ? parseInt(process.env.MINIMUM_PASSWORD_LENGTH) : 12,
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
