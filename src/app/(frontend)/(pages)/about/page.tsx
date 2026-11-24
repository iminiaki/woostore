import { Breadcrumbs } from "@/components/breadcrumbs";
import { PageShell } from "@/components/page-shell";

export default function AboutPage() {
  return (
    <PageShell className="space-y-6">
      <div className="mb-6">
        <Breadcrumbs items={[{ label: "About" }]} />
      </div>
      <h1 className="text-3xl font-semibold">About Lastore</h1>
      <p className="max-w-3xl text-muted-foreground">
        We create minimal, comfortable apparel with timeless silhouettes and durable materials. Our
        goal is to make getting dressed effortless and enjoyable.
      </p>
    </PageShell>
  );
}
