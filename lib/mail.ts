import nodemailer from "nodemailer"

type Mail = {
  to: string
  subject: string
  text: string
}

// SMTP when configured; console fallback so dev works without a mail server.
export async function sendMail({ to, subject, text }: Mail) {
  if (!process.env.SMTP_HOST) {
    console.warn(`[mail fallback] To: ${to}\nSubject: ${subject}\n${text}`)
    return
  }
  const transport = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT ?? 587),
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: process.env.SMTP_USER
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
      : undefined,
  })
  await transport.sendMail({
    from: process.env.MAIL_FROM ?? process.env.SMTP_USER,
    to,
    subject,
    text,
  })
}
