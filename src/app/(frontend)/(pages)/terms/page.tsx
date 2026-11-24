import { Breadcrumbs } from "@/components/breadcrumbs";
import { PageShell } from "@/components/page-shell";

export default function TermsPage() {
  return (
    <PageShell className="space-y-6">
      <div className="mb-6">
        <Breadcrumbs items={[{ label: "Terms & Conditions" }]} />
      </div>
      <h1 className="text-3xl font-semibold">Terms & Conditions</h1>
      <p className="max-w-3xl text-muted-foreground">
        These terms govern your use of our website and services.
      </p>
    </PageShell>
  );
}
