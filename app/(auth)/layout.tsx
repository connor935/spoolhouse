// Signed-out pages (login, signup, password reset): no shell, one centred
// card under the scale-ruler edge of the Auth board.
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="bg-background relative flex min-h-dvh items-center justify-center px-4 py-10">
      <div aria-hidden className="ruler absolute inset-x-0 top-0 h-3" />
      {children}
    </main>
  );
}
