import Link from "next/link";
import { Button } from "@/components/ui/button";
import { PageShell } from "@/components/page-shell";

export default async function CheckoutSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ order?: string }>;
}) {
  const { order } = await searchParams;

  return (
    <PageShell className="py-24 text-center space-y-4">
      <h1 className="text-2xl font-semibold">Thank you for your order</h1>
      {order ? (
        <p className="text-muted-foreground">
          Order <span className="font-medium text-foreground">{order}</span> has been placed.
        </p>
      ) : (
        <p className="text-muted-foreground">Your order has been placed successfully.</p>
      )}
      <div className="flex justify-center gap-3 pt-4">
        <Button asChild={true}>
          <Link href="/shop">Continue shopping</Link>
        </Button>
      </div>
    </PageShell>
  );
}
