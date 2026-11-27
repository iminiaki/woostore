import { PageShell } from "@/components/page-shell"
import { OrderComplete } from "@/components/order-complete"
import { loadOrderReceipt } from "@/lib/customer-orders"
import { safeDocumentPath } from "@/lib/invoice-format"

export default async function CheckoutSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ order?: string; doc?: string }>
}) {
  const { order, doc } = await searchParams
  const preInvoice = safeDocumentPath(doc)
  const receipt = order ? await loadOrderReceipt(order) : null

  return (
    <PageShell className="flex min-h-[calc(100dvh-8rem)] items-center justify-center py-10">
      <OrderComplete order={order} preInvoice={preInvoice} receipt={receipt} />
    </PageShell>
  )
}
