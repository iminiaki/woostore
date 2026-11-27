import { Breadcrumbs } from "@/components/breadcrumbs";
import { PageShell } from "@/components/page-shell";

export default function PrivacyPage() {
  return (
    <PageShell className="space-y-6">
      <div className="mb-6">
        <Breadcrumbs items={[{ label: "Privacy Policy" }]} />
      </div>
      <h1 className="text-3xl font-semibold">Privacy Policy</h1>
      <p className="max-w-3xl text-muted-foreground">
        We respect your privacy and are committed to protecting your personal data.
      </p>
    </PageShell>
  );
}
