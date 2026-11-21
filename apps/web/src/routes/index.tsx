import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { getHealthLive, getHealthReady, NetworkError } from "../lib/api.js";

export const Route = createFileRoute("/")({
  component: StatusPage,
});

type Status = "up" | "down" | "unknown";

function toStatus(value: "up" | "down" | "not_configured" | undefined): Status {
  if (value === "up") return "up";
  if (value === "down" || value === "not_configured") return "down";
  return "unknown";
}

function StatusPage() {
  const live = useQuery({
    queryKey: ["health", "live"],
    queryFn: getHealthLive,
    refetchInterval: 5000,
    retry: 1,
  });

  const ready = useQuery({
    queryKey: ["health", "ready"],
    queryFn: getHealthReady,
    refetchInterval: 5000,
    retry: 1,
  });

  const unreachable = live.isError && live.error instanceof NetworkError;
  const apiStatus: Status = unreachable
    ? "unknown"
    : toStatus(live.data?.status === "ok" ? "up" : live.data ? "down" : undefined);

  const dbStatus: Status = unreachable
    ? "unknown"
    : toStatus(ready.data?.checks?.database);
  const redisStatus: Status = unreachable
    ? "unknown"
    : toStatus(ready.data?.checks?.redis);

  const overall: Status =
    apiStatus === "up" && dbStatus === "up" && redisStatus === "up"
      ? "up"
      : apiStatus === "unknown"
        ? "unknown"
        : "down";

  const updated = live.dataUpdatedAt
    ? new Date(live.dataUpdatedAt).toLocaleTimeString()
    : "—";

  return (
    <section className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Health</h1>
          <p className="mt-1 text-sm text-[var(--color-muted)]">
            Live status of the LearnLoop API and its dependencies.
          </p>
        </div>
        <OverallBadge status={overall} />
      </div>

      {unreachable && (
        <div
          role="alert"
          aria-live="polite"
          className="rounded-lg border border-[var(--color-down)]/30 bg-[var(--color-down)]/5 px-4 py-3 text-sm text-[var(--color-down)]"
        >
          API unreachable — cannot reach the backend. All checks marked unknown.
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface)]">
        <Row label="API" status={apiStatus} detail={live.data?.status ?? "—"} />
        <Row label="Database" status={dbStatus} detail={ready.data?.checks?.database ?? "—"} />
        <Row label="Redis" status={redisStatus} detail={ready.data?.checks?.redis ?? "—"} />
      </div>

      <p className="text-xs text-[var(--color-muted)]">
        Last updated: <span className="font-mono">{updated}</span> · auto-refreshes every 5s
      </p>
    </section>
  );
}

function Row({ label, status, detail }: { label: string; status: Status; detail: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-[var(--color-border)] px-5 py-4 last:border-b-0">
      <span className="text-sm font-medium">{label}</span>
      <div className="flex items-center gap-3">
        <span className="font-mono text-xs text-[var(--color-muted)]">{detail}</span>
        <StatusPill status={status} />
      </div>
    </div>
  );
}

function StatusPill({ status }: { status: Status }) {
  const map = {
    up: { color: "var(--color-up)", label: "Up" },
    down: { color: "var(--color-down)", label: "Down" },
    unknown: { color: "var(--color-unknown)", label: "Unknown" },
  } as const;
  const { color, label } = map[status];
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-[var(--color-border)] px-3 py-1 text-xs font-medium">
      <span
        aria-hidden="true"
        className="pulse-dot h-2 w-2 rounded-full"
        style={{ backgroundColor: color }}
      />
      <span style={{ color }}>{label}</span>
    </span>
  );
}

function OverallBadge({ status }: { status: Status }) {
  const map = {
    up: { color: "var(--color-up)", label: "All systems operational" },
    down: { color: "var(--color-down)", label: "Degraded" },
    unknown: { color: "var(--color-unknown)", label: "Unknown" },
  } as const;
  const { color, label } = map[status];
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2 text-sm font-medium">
      <span
        aria-hidden="true"
        className="pulse-dot h-2.5 w-2.5 rounded-full"
        style={{ backgroundColor: color }}
      />
      {label}
    </span>
  );
}
