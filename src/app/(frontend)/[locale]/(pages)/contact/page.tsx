import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { PageShell } from "@/components/page-shell";

export default function ContactPage() {
  return (
    <PageShell className="space-y-8">
      <div className="mb-6">
        <Breadcrumbs items={[{ label: "Contact" }]} />
      </div>
      <div>
        <h1 className="text-3xl font-semibold">Contact us</h1>
        <p className="text-muted-foreground">We usually respond within 1 business day.</p>
      </div>
      <form className="max-w-xl space-y-4">
        <Input placeholder="Your name" />
        <Input type="email" placeholder="Your email" />
        <Textarea placeholder="Message" rows={6} />
        <Button type="submit">Send</Button>
      </form>
    </PageShell>
  );
}
