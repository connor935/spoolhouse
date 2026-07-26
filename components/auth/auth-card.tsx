import { Boxes } from 'lucide-react';

export function AuthCard({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex items-center justify-center gap-3">
          <div className="bg-accent text-accent-foreground flex h-10 w-10 items-center justify-center rounded-md">
            <Boxes className="h-5 w-5" />
          </div>
          <h1 className="text-xl font-semibold tracking-tight">Spoolhouse</h1>
        </div>
        <div className="border-border bg-card rounded-lg border p-6">
          <h2 className="text-lg font-semibold">{title}</h2>
          {description && (
            <p className="text-muted-foreground mt-1 text-sm">{description}</p>
          )}
          <div className="mt-5">{children}</div>
        </div>
      </div>
    </div>
  );
}
