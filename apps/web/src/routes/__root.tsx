import { HeadContent, Scripts, createRootRouteWithContext } from "@tanstack/react-router";
import type { ErrorComponentProps } from "@tanstack/react-router";
import type { QueryClient } from "@tanstack/react-query";
import { Outlet } from "@tanstack/react-router";
import { env } from "../env.js";

export interface RouterContext {
  queryClient: QueryClient;
}

export const Route = createRootRouteWithContext<RouterContext>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "LearnLoop" },
    ],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
    ],
  }),
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootComponent() {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)]">
        <div className="mx-auto flex min-h-screen max-w-3xl flex-col px-6 py-10 sm:py-16">
          <header className="mb-10 flex items-center justify-between border-b border-[var(--color-border)] pb-6">
            <div className="flex items-center gap-3">
              <span
                aria-hidden="true"
                className="grid h-8 w-8 place-items-center rounded-md bg-[var(--color-text)] text-sm font-semibold text-white"
              >
                L
              </span>
              <div>
                <p className="text-sm font-semibold tracking-tight">LearnLoop</p>
                <p className="text-xs text-[var(--color-muted)]">System status</p>
              </div>
            </div>
            <a
              href="https://github.com"
              className="text-xs text-[var(--color-muted)] transition-colors hover:text-[var(--color-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2"
            >
              docs
            </a>
          </header>
          <main id="main-content" className="flex-1">
            <Outlet />
          </main>
          <footer className="mt-10 border-t border-[var(--color-border)] pt-6 text-xs text-[var(--color-muted)]">
            API at <span className="font-mono">{env.VITE_API_URL}</span>
          </footer>
        </div>
        <Scripts />
      </body>
    </html>
  );
}

function NotFoundComponent() {
  return (
    <section className="py-16 text-center">
      <h1 className="text-3xl font-semibold tracking-tight">404</h1>
      <p className="mt-2 text-[var(--color-muted)]">This page doesn&apos;t exist.</p>
      <a
        href="/"
        className="mt-6 inline-block text-sm font-medium text-[var(--color-accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2"
      >
        Back to status
      </a>
    </section>
  );
}

function ErrorComponent({ error }: ErrorComponentProps) {
  const message = error instanceof Error ? error.message : String(error);
  return (
    <section className="py-16 text-center">
      <h1 className="text-3xl font-semibold tracking-tight">Something went wrong</h1>
      <p className="mt-2 text-[var(--color-muted)]">{message}</p>
      <a
        href="/"
        className="mt-6 inline-block text-sm font-medium text-[var(--color-accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2"
      >
        Back to status
      </a>
    </section>
  );
}
