import type { ReactNode } from "react";

import { CompareBar } from "@/components/commerce/CompareBar";
import { Footer } from "./Footer";
import { Header } from "./Header";

export function SiteLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1">{children}</main>
      <Footer />
      <CompareBar />
    </div>
  );
}
