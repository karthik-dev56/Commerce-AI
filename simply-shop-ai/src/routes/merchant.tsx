import { useQueries } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { RefreshCw } from "lucide-react";
import { useEffect } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAuth } from "@/hooks/useAuth";
import { formatPrice } from "@/lib/format";
import { growthService } from "@/services/api/growth";
import { ApiError } from "@/services/api/http";

export const Route = createFileRoute("/merchant")({
  head: () => ({
    meta: [
      { title: "Merchant Growth — CommerceAI" },
      {
        name: "description",
        content: "Growth analytics and audit trail for the CommerceAI growth engine.",
      },
      { property: "og:title", content: "Merchant Growth — CommerceAI" },
      { property: "og:description", content: "Growth analytics and audit trail." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: MerchantPage,
});

function statusOf(error: unknown): number | undefined {
  return error instanceof ApiError ? error.status : undefined;
}

function formatDateTime(iso?: string): string {
  if (!iso) return "—";
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? iso : date.toLocaleString("en-IN");
}

function metaString(
  metadata: Record<string, unknown> | undefined,
  key: string,
): string | undefined {
  const value = metadata?.[key];
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function metaNumber(metadata: Record<string, unknown> | undefined, key: string): number | undefined {
  const value = metadata?.[key];
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function formatEventType(type?: string): string {
  if (!type) return "—";
  return type
    .replace(/[_-]/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatCurrencyValue(amount?: number, currency?: string): string {
  if (amount === undefined) return "—";
  const code = currency?.toUpperCase();
  if (code && code !== "INR") return `${amount} ${code}`;
  return formatPrice(amount);
}

function KpiCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-2 text-2xl font-semibold tracking-tight">{value}</p>
    </div>
  );
}

function MerchantPage() {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading: authLoading, signIn } = useAuth();

  const [analyticsQuery, auditQuery] = useQueries({
    queries: [
      {
        queryKey: ["growth", "analytics"],
        queryFn: () => growthService.analytics(),
        enabled: isAuthenticated,
        retry: false,
      },
      {
        queryKey: ["growth", "audit"],
        queryFn: () => growthService.audit(),
        enabled: isAuthenticated,
        retry: false,
      },
    ],
  });

  const forbidden =
    statusOf(analyticsQuery.error) === 403 || statusOf(auditQuery.error) === 403;
  const unauthorized =
    statusOf(analyticsQuery.error) === 401 || statusOf(auditQuery.error) === 401;

  useEffect(() => {
    if (!forbidden) return;
    const timer = window.setTimeout(() => void navigate({ to: "/", replace: true }), 2500);
    return () => window.clearTimeout(timer);
  }, [forbidden, navigate]);

  if (authLoading) {
    return (
      <div className="container-page py-10">
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (!isAuthenticated || unauthorized) {
    return (
      <div className="container-page max-w-md py-16 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">Sign in to continue</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          This dashboard is available to the store owner only.
        </p>
        <Button className="mt-6 w-full" onClick={signIn}>
          Sign in with Google
        </Button>
      </div>
    );
  }

  if (forbidden) {
    return (
      <div className="container-page max-w-md py-16 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">This area is restricted</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Your account doesn&apos;t have access to the growth dashboard. Taking you back to the
          store.
        </p>
        <Button className="mt-6" variant="outline" onClick={() => void navigate({ to: "/" })}>
          Back to store
        </Button>
      </div>
    );
  }

  const analytics = analyticsQuery.data;
  const audit = auditQuery.data ?? [];
  const klaviyoEvents = audit.filter((event) => event.event === "KLAVIYO_EVENT_CREATED");
  const nonKlaviyoAudit = audit.filter((event) => event.event !== "KLAVIYO_EVENT_CREATED");
  const loading = analyticsQuery.isLoading || auditQuery.isLoading;
  const failed = analyticsQuery.isError || auditQuery.isError;

  const refresh = () => {
    void analyticsQuery.refetch();
    void auditQuery.refetch();
  };

  const chartData = analytics
    ? [
        { name: "Upsell", value: analytics.upsells },
        { name: "Cross-sell", value: analytics.crossSells },
        { name: "Bundle", value: analytics.bundles },
        { name: "Failures", value: analytics.failures },
      ]
    : [];

  return (
    <div className="container-page py-8 md:py-10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">Merchant Growth</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Measure how your AI agent turns product discovery into incremental revenue.
          </p>
          <p className="mt-3 inline-flex items-center gap-2 rounded-full border border-border px-3 py-1 text-xs text-muted-foreground">
            <span className="h-2 w-2 rounded-full bg-primary" aria-hidden />
            AI Growth Engine • Connected
          </p>
        </div>
        <Button variant="outline" size="sm" className="gap-2" onClick={refresh} disabled={loading}>
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {failed ? (
        <div className="mt-8 rounded-lg border border-border p-6 text-sm text-muted-foreground">
          We couldn&apos;t load growth data right now. Try refreshing.
        </div>
      ) : loading || !analytics ? (
        <Skeleton className="mt-8 h-40 w-full" />
      ) : (
        <>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard label="Growth Offers" value={String(analytics.totalOffers)} />
            <KpiCard
              label="Acceptance Rate"
              value={`${Math.round(
                (analytics.acceptanceRate > 1
                  ? analytics.acceptanceRate
                  : analytics.acceptanceRate * 100) * 10,
              ) / 10}%`}
            />
            <KpiCard label="Influenced Revenue" value={formatPrice(analytics.influencedRevenue)} />
            <KpiCard label="Upsells" value={String(analytics.upsells)} />
            <KpiCard label="Cross-sells" value={String(analytics.crossSells)} />
            <KpiCard label="Bundles" value={String(analytics.bundles)} />
            <KpiCard label="Failures" value={String(analytics.failures)} />
            <KpiCard label="Accepted Offers" value={String(analytics.acceptedOffers)} />
            <KpiCard label="Klaviyo Recovery Events" value={String(klaviyoEvents.length)} />
          </div>

          <section className="mt-10">
            <h2 className="text-lg font-semibold tracking-tight">Growth performance</h2>
            <div className="mt-4 h-64 rounded-lg border border-border p-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                  <XAxis dataKey="name" tickLine={false} axisLine={false} fontSize={12} />
                  <YAxis allowDecimals={false} tickLine={false} axisLine={false} fontSize={12} />
                  <RechartsTooltip cursor={{ opacity: 0.1 }} />
                  <Bar dataKey="value" fill="currentColor" className="fill-primary" radius={4} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>
        </>
      )}

      <section className="mt-10">
        <h2 className="text-lg font-semibold tracking-tight">Growth activity / audit trail</h2>
        {loading ? (
          <Skeleton className="mt-4 h-48 w-full" />
        ) : audit.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">No growth events recorded yet.</p>
        ) : (
          <div className="mt-4 space-y-8">
            {nonKlaviyoAudit.length > 0 && (
              <div className="overflow-x-auto rounded-lg border border-border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Event</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead>Base product</TableHead>
                      <TableHead>Recommended product</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead>Offer ID</TableHead>
                      <TableHead>Timestamp</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {nonKlaviyoAudit.map((event) => (
                      <TableRow key={event.id}>
                        <TableCell className="whitespace-nowrap font-medium">{event.event}</TableCell>
                        <TableCell>{event.action ?? "—"}</TableCell>
                        <TableCell>{event.baseProduct ?? "—"}</TableCell>
                        <TableCell>{event.recommendedProduct ?? "—"}</TableCell>
                        <TableCell>
                          {event.amount === undefined ? "—" : formatPrice(event.amount)}
                        </TableCell>
                        <TableCell className="max-w-xs">{event.reason ?? "—"}</TableCell>
                        <TableCell className="whitespace-nowrap">{event.offerId ?? "—"}</TableCell>
                        <TableCell className="whitespace-nowrap">
                          {formatDateTime(event.timestamp)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            {klaviyoEvents.length > 0 && (
              <div>
                <h3 className="mb-3 text-sm font-medium uppercase tracking-wide text-muted-foreground">
                  Klaviyo recovery
                </h3>
                <div className="overflow-x-auto rounded-lg border border-border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Event</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Cart ID</TableHead>
                        <TableHead>Event ID</TableHead>
                        <TableHead>Cart Value</TableHead>
                        <TableHead>Timestamp</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {klaviyoEvents.map((event) => {
                        const type = metaString(event.metadata, "type") ?? event.action;
                        const cartId = metaString(event.metadata, "cartId");
                        const eventId =
                          metaString(event.metadata, "klaviyoEventId") ?? event.offerId ?? event.id;
                        const amount = event.amount ?? metaNumber(event.metadata, "amount");
                        const currency = event.currency ?? metaString(event.metadata, "currency");
                        const itemCount = metaNumber(event.metadata, "itemCount");
                        return (
                          <TableRow key={event.id}>
                            <TableCell className="whitespace-nowrap font-medium">
                              Klaviyo Recovery
                            </TableCell>
                            <TableCell>{formatEventType(type)}</TableCell>
                            <TableCell className="whitespace-nowrap">{cartId ?? "—"}</TableCell>
                            <TableCell className="whitespace-nowrap">{eventId ?? "—"}</TableCell>
                            <TableCell className="whitespace-nowrap">
                              {formatCurrencyValue(amount, currency)}
                              {itemCount !== undefined && (
                                <span className="ml-2 text-xs text-muted-foreground">
                                  ({itemCount} items)
                                </span>
                              )}
                            </TableCell>
                            <TableCell className="whitespace-nowrap">
                              {formatDateTime(event.timestamp)}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
