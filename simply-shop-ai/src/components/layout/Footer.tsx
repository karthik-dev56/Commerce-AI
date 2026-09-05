import { Link } from "@tanstack/react-router";

import { DEFAULT_PRODUCT_SEARCH } from "@/lib/product-search";

const COLUMNS = [
  {
    title: "Shop",
    links: [
      { label: "All products", to: "/products" as const },
      { label: "Categories", to: "/categories" as const },
      { label: "Compare products", to: "/compare" as const },
    ],
  },
  {
    title: "Your account",
    links: [
      { label: "Orders", to: "/orders" as const },
      { label: "Account", to: "/account" as const },
      { label: "Cart", to: "/cart" as const },
    ],
  },
];

export function Footer() {
  return (
    <footer className="mt-20 border-t border-border bg-surface">
      <div className="container-page grid gap-10 py-12 md:grid-cols-4">
        <div className="md:col-span-2">
          <p className="text-base font-semibold tracking-tight">CommerceAI</p>
          <p className="mt-2 max-w-sm text-sm text-muted-foreground">
            A simpler way to shop. Tell us what you need and find the right product without
            digging through endless listings.
          </p>
        </div>
        {COLUMNS.map((column) => (
          <div key={column.title}>
            <p className="text-sm font-semibold">{column.title}</p>
            <ul className="mt-3 space-y-2">
              {column.links.map((link) => (
                <li key={link.label}>
                  <Link
                    to={link.to}
                    search={link.to === "/products" ? DEFAULT_PRODUCT_SEARCH : {}}
                    className="text-sm text-muted-foreground hover:text-foreground"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-border">
        <div className="container-page flex flex-col gap-2 py-5 text-xs text-muted-foreground md:flex-row md:items-center md:justify-between">
          <p>© {new Date().getFullYear()} CommerceAI. All prices in INR and inclusive of taxes.</p>
          <p>Secure payments · Easy returns · Nationwide delivery</p>
        </div>
      </div>
    </footer>
  );
}
