"use client";

import { Search } from "@/components/search";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { PageShell } from "@/components/page-shell";
import { useI18n } from "@/components/locale-provider";

export default function SearchPage() {
  const { t } = useI18n();
  return (
    <PageShell>
      <div className="mb-6">
        <Breadcrumbs items={[{ label: t("search.breadcrumb") }]} />
      </div>
      <div className="mx-auto max-w-xl space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">{t("search.pageTitle")}</h1>
          <p className="text-muted-foreground">{t("search.pageHint")}</p>
        </div>
        <Search variant="panel" />
      </div>
    </PageShell>
  );
}
