import Link from "next/link";
import { ArrowRight, Check, FileText } from "lucide-react";

import { Button } from "@/components/ui/button";
import { PageShell } from "@/components/page-shell";
import { safeDocumentPath } from "@/lib/invoice-format";

export default async function CheckoutSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ order?: string; doc?: string }>;
}) {
  const { order, doc } = await searchParams;
  const preInvoice = safeDocumentPath(doc);

  return (
    <PageShell className="flex min-h-[calc(100dvh-8rem)] items-center justify-center py-16">
      <section className="w-full max-w-md rounded-2xl border bg-card px-6 py-8 text-center shadow-sm sm:px-8">
        <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-primary text-primary-foreground">
          <Check className="size-5" strokeWidth={2.5} />
        </div>

        <h1 className="mt-5 text-2xl font-semibold tracking-tight">Thank you for your order</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          {preInvoice
            ? "Your order is in. The pre-invoice is ready, and you can follow it from your profile."
            : "Your order is in. You can follow it anytime from your profile."}
        </p>

        {order ? (
          <div className="mt-6 rounded-xl border bg-muted/50 px-4 py-3 text-left">
            <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
              Order number
            </p>
            <p className="mt-1 font-medium tracking-tight">{order}</p>
          </div>
        ) : null}

        <div className="mt-6 grid gap-2">
          <Button asChild={true} size="lg" className="w-full">
            <Link href="/profile?tab=orders">
              View your orders
              <ArrowRight className="size-4" />
            </Link>
          </Button>
          {preInvoice ? (
            <Button asChild={true} variant="outline" size="lg" className="w-full">
              <Link href={preInvoice}>
                <FileText className="size-4" />
                View pre-invoice
              </Link>
            </Button>
          ) : null}
          <Button asChild={true} variant="ghost" className="w-full">
            <Link href="/shop">Continue shopping</Link>
          </Button>
        </div>
      </section>
    </PageShell>
  );
}
