"use client";

import { Search } from "@/components/search";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { PageShell } from "@/components/page-shell";

export default function SearchPage() {
  return (
    <PageShell>
      <div className="mb-6">
        <Breadcrumbs items={[{ label: "Search" }]} />
      </div>
      <div className="mx-auto max-w-xl space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">Search Products</h1>
          <p className="text-muted-foreground">Find exactly what you&apos;re looking for</p>
        </div>
        <Search variant="panel" />
      </div>
    </PageShell>
  );
}
