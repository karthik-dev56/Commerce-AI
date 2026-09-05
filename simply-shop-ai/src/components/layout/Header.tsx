import { Link } from "@tanstack/react-router";
import { Menu, Package, ShoppingCart, User } from "lucide-react";
import { useState } from "react";

import { SmartSearchBar } from "@/components/commerce/SmartSearchBar";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useAuth } from "@/hooks/useAuth";
import { useCart } from "@/hooks/useCart";
import { DEFAULT_PRODUCT_SEARCH } from "@/lib/product-search";

const NAV_LINKS = [
  { label: "Home", to: "/" },
  { label: "Products", to: "/products" },
  { label: "Categories", to: "/categories" },
] as const;

function CartButton() {
  const { itemCount } = useCart();
  return (
    <Button asChild variant="ghost" size="sm" className="relative gap-2">
      <Link to="/cart" aria-label={`Cart, ${itemCount} items`}>
        <ShoppingCart className="h-4 w-4" />
        <span className="hidden lg:inline">Cart</span>
        {itemCount > 0 ? (
          <span className="absolute -right-1 -top-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground">
            {itemCount}
          </span>
        ) : null}
      </Link>
    </Button>
  );
}

function AccountButton() {
  const { isAuthenticated, isLoading, user, signIn } = useAuth();

  if (!isLoading && !isAuthenticated) {
    return (
      <Button variant="outline" size="sm" className="gap-2" onClick={signIn}>
        <User className="h-4 w-4" />
        <span className="hidden sm:inline">Sign in</span>
      </Button>
    );
  }

  return (
    <Button asChild variant="ghost" size="sm" className="hidden gap-2 sm:inline-flex">
      <Link to="/account">
        {user?.picture ? (
          <img
            src={user.picture}
            alt=""
            className="h-5 w-5 rounded-full object-cover"
            referrerPolicy="no-referrer"
          />
        ) : (
          <User className="h-4 w-4" />
        )}
        <span className="hidden max-w-24 truncate lg:inline">
          {user?.name?.split(" ")[0] ?? "Account"}
        </span>
      </Link>
    </Button>
  );
}

export function Header() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/85">
      <div className="container-page flex h-16 items-center gap-3">
        <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="md:hidden" aria-label="Open menu">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-72">
            <SheetHeader>
              <SheetTitle className="text-left">CommerceAI</SheetTitle>
            </SheetHeader>
            <nav className="mt-6 flex flex-col gap-1">
              {[...NAV_LINKS, { label: "Orders", to: "/orders" }, { label: "Account", to: "/account" }].map(
                (link) => (
                  <Link
                    key={link.to}
                    to={link.to}
                    onClick={() => setMenuOpen(false)}
                    search={link.to === "/products" ? DEFAULT_PRODUCT_SEARCH : {}}
                    className="rounded-md px-3 py-2.5 text-sm font-medium text-foreground hover:bg-muted"
                    activeProps={{ className: "bg-muted" }}
                  >
                    {link.label}
                  </Link>
                ),
              )}
            </nav>
          </SheetContent>
        </Sheet>

        <Link to="/" className="shrink-0 text-lg font-semibold tracking-tight">
          CommerceAI
        </Link>

        <nav className="ml-6 hidden items-center gap-1 md:flex">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              search={link.to === "/products" ? DEFAULT_PRODUCT_SEARCH : {}}
              className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              activeProps={{ className: "text-foreground" }}
              activeOptions={{ exact: link.to === "/" }}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="mx-auto hidden w-full max-w-md lg:block">
          <SmartSearchBar />
        </div>

        <div className="ml-auto flex items-center gap-1">
          <Button asChild variant="ghost" size="sm" className="hidden gap-2 sm:inline-flex">
            <Link to="/orders">
              <Package className="h-4 w-4" />
              <span className="hidden lg:inline">Orders</span>
            </Link>
          </Button>
          <AccountButton />
          <CartButton />
        </div>
      </div>

      <div className="container-page pb-3 lg:hidden">
        <SmartSearchBar />
      </div>
    </header>
  );
}
