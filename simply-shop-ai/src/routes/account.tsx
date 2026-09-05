import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";

import { OrderStatusBadge } from "@/components/commerce/OrderStatusBadge";
import { ErrorState } from "@/components/commerce/StateBlocks";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatDate, formatPrice } from "@/lib/format";
import { useAuth } from "@/hooks/useAuth";
import { customerService } from "@/services/api/customer";
import { isApiConfigured } from "@/services/api/http";
import { ordersService } from "@/services/api/orders";

export const Route = createFileRoute("/account")({
  head: () => ({
    meta: [
      { title: "Your account — CommerceAI" },
      { name: "description", content: "Manage your profile, saved addresses, orders and preferences." },
      { property: "og:title", content: "Your account — CommerceAI" },
      { property: "og:description", content: "Profile, addresses, orders and preferences." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AccountPage,
});

const PREFERENCE_LABELS: { key: keyof PreferenceKeys; label: string; description: string }[] = [
  {
    key: "personalizedRecommendations",
    label: "Personalised recommendations",
    description: "Show products based on what you browse and buy.",
  },
  {
    key: "orderUpdatesEmail",
    label: "Order updates by email",
    description: "Receive confirmations and delivery updates by email.",
  },
  {
    key: "orderUpdatesSms",
    label: "Order updates by SMS",
    description: "Receive delivery updates on your phone.",
  },
  {
    key: "marketingEmails",
    label: "Offers and promotions",
    description: "Occasional emails about sales and new arrivals.",
  },
];

interface PreferenceKeys {
  personalizedRecommendations: boolean;
  orderUpdatesEmail: boolean;
  orderUpdatesSms: boolean;
  marketingEmails: boolean;
}

function AccountPage() {
  const { user, isAuthenticated, isLoading: authLoading, signIn, signOut } = useAuth();
  const backendMode = isApiConfigured();

  const { data: customer, isLoading, isError, refetch } = useQuery({
    queryKey: ["customer"],
    queryFn: () => customerService.me(),
    enabled: !backendMode,
  });

  if (backendMode && !authLoading && !isAuthenticated) {
    return (
      <div className="container-page max-w-md py-16 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">Sign in to your account</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Sign in with Google to see your profile, orders and preferences.
        </p>
        <Button className="mt-6 w-full" onClick={signIn}>
          Sign in with Google
        </Button>
      </div>
    );
  }

  if (backendMode) {
    return (
      <div className="container-page max-w-4xl py-8 md:py-10">
        <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">Your account</h1>
        {authLoading || !user ? (
          <Skeleton className="mt-8 h-40 w-full" />
        ) : (
          <div className="mt-8 flex flex-wrap items-center gap-4 rounded-lg border border-border p-6">
            {user.picture ? (
              <img
                src={user.picture}
                alt=""
                referrerPolicy="no-referrer"
                className="h-14 w-14 rounded-full object-cover"
              />
            ) : null}
            <div className="min-w-0">
              <p className="text-lg font-medium">{user.name ?? "Signed in"}</p>
              {user.email ? (
                <p className="truncate text-sm text-muted-foreground">{user.email}</p>
              ) : null}
            </div>
            <div className="ml-auto flex gap-2">
              <Button asChild variant="outline" size="sm">
                <Link to="/orders">View orders</Link>
              </Button>
              <Button variant="ghost" size="sm" onClick={() => void signOut()}>
                Sign out
              </Button>
            </div>
          </div>
        )}
      </div>
    );
  }

  const { data: orders } = useQuery({
    queryKey: ["orders"],
    queryFn: () => ordersService.list(),
  });

  if (isError) {
    return (
      <div className="container-page py-16">
        <ErrorState onRetry={() => void refetch()} />
      </div>
    );
  }

  return (
    <div className="container-page max-w-4xl py-8 md:py-10">
      <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">Your account</h1>

      {isLoading || !customer ? (
        <Skeleton className="mt-8 h-72 w-full" />
      ) : (
        <Tabs defaultValue="profile" className="mt-8">
          <TabsList>
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="addresses">Addresses</TabsTrigger>
            <TabsTrigger value="orders">Orders</TabsTrigger>
            <TabsTrigger value="preferences">Preferences</TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="mt-6">
            <dl className="divide-y divide-border overflow-hidden rounded-lg border border-border text-sm">
              {[
                { label: "Name", value: `${customer.firstName} ${customer.lastName}` },
                { label: "Email", value: customer.email },
                { label: "Phone", value: customer.phone },
              ].map((row) => (
                <div key={row.label} className="grid grid-cols-3 gap-4 p-4">
                  <dt className="text-muted-foreground">{row.label}</dt>
                  <dd className="col-span-2 font-medium">{row.value}</dd>
                </div>
              ))}
            </dl>
          </TabsContent>

          <TabsContent value="addresses" className="mt-6">
            <div className="grid gap-4 sm:grid-cols-2">
              {customer.addresses.map((address) => (
                <div key={address.id} className="rounded-lg border border-border p-4 text-sm">
                  <p className="font-medium">{address.label ?? "Address"}</p>
                  <p className="mt-2 text-muted-foreground">
                    {address.name}
                    <br />
                    {address.addressLine1}
                    <br />
                    {address.city}, {address.state} {address.pincode}
                    <br />
                    {address.phone}
                  </p>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="orders" className="mt-6">
            <div className="space-y-3">
              {(orders ?? []).slice(0, 5).map((order) => (
                <div
                  key={order.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border p-4 text-sm"
                >
                  <div>
                    <p className="font-medium">{order.id}</p>
                    <p className="text-muted-foreground">
                      {formatDate(order.createdAt)} · {order.items.length} items ·{" "}
                      {formatPrice(order.total)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <OrderStatusBadge status={order.status} />
                    <Button asChild variant="outline" size="sm">
                      <Link to="/order/$id" params={{ id: order.id }}>
                        View
                      </Link>
                    </Button>
                  </div>
                </div>
              ))}
              <Button asChild variant="link" className="px-0">
                <Link to="/orders">See all orders</Link>
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="preferences" className="mt-6">
            <div className="divide-y divide-border overflow-hidden rounded-lg border border-border">
              {PREFERENCE_LABELS.map((preference) => (
                <div key={preference.key} className="flex items-start justify-between gap-4 p-4">
                  <div className="text-sm">
                    <p className="font-medium">{preference.label}</p>
                    <p className="mt-0.5 text-muted-foreground">{preference.description}</p>
                  </div>
                  <Switch
                    defaultChecked={customer.preferences[preference.key]}
                    aria-label={preference.label}
                    onCheckedChange={(checked) => {
                      void customerService.updatePreferences({
                        ...customer.preferences,
                        [preference.key]: checked,
                      });
                    }}
                  />
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
