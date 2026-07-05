import { LoginForm } from "@/components/login-form"
import { signupAllowed } from "@/lib/auth"

export const dynamic = "force-dynamic"

export default function LoginPage() {
  return <LoginForm showSignup={signupAllowed} />
}
