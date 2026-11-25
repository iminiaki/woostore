"use client"

import { useMemo } from "react"
import {
  Ban,
  CheckCircle2,
  CircleDashed,
  ClipboardList,
  CreditCard,
  FileText,
  PackageCheck,
  PauseCircle,
  RotateCcw,
  Truck,
  XCircle,
  type LucideIcon,
} from "lucide-react"

import {
  Trace,
  TraceCollapsible,
  TraceCollapsibleContent,
  TraceCollapsibleTrigger,
  TraceDescription,
  TraceIcon,
  TraceLine,
  TraceTitle,
} from "@/components/ui/trace"
import {
  DOCUMENT_KIND_LABEL,
  DOCUMENT_STATUS_LABEL,
  ORDER_STATUS_LABEL,
  type CustomerOrder,
  type CustomerOrderStatus,
  type CustomerOrderStatusEvent,
} from "@/lib/customer-order"
import { formatDate } from "@/lib/invoice-format"
import { cn } from "@/lib/utils"

type StepStatus = "running" | "error" | "pending" | undefined

type ProcessStep = {
  id: string
  title: string
  description?: string
  status?: StepStatus
  icon: LucideIcon
  detail?: string
  defaultOpen?: boolean
}

const HAPPY_PATH: CustomerOrderStatus[] = ["pending", "processing", "completed"]
const TERMINAL: CustomerOrderStatus[] = ["cancelled", "failed", "refunded"]

const STATUS_ICON: Record<CustomerOrderStatus, LucideIcon> = {
  pending: CreditCard,
  processing: Truck,
  "on-hold": PauseCircle,
  completed: PackageCheck,
  cancelled: Ban,
  failed: XCircle,
  refunded: RotateCcw,
}

function lastEventAt(history: CustomerOrderStatusEvent[], status: CustomerOrderStatus) {
  for (let i = history.length - 1; i >= 0; i -= 1) {
    if (history[i]?.status === status) return history[i]!.at
  }
  return null
}

function hasReached(history: CustomerOrderStatusEvent[], status: CustomerOrderStatus) {
  return history.some((event) => event.status === status)
}

function runningTitle(status: CustomerOrderStatus) {
  switch (status) {
    case "pending":
      return "Awaiting payment"
    case "processing":
      return "Processing order"
    case "on-hold":
      return "Order on hold"
    case "completed":
      return "Completing order"
    case "cancelled":
      return "Cancelling order"
    case "failed":
      return "Order failing"
    case "refunded":
      return "Refunding order"
    default:
      return ORDER_STATUS_LABEL[status]
  }
}

function doneTitle(status: CustomerOrderStatus) {
  switch (status) {
    case "pending":
      return "Payment confirmed"
    case "processing":
      return "Order processed"
    case "on-hold":
      return "Hold cleared"
    case "completed":
      return "Order completed"
    case "cancelled":
      return "Order cancelled"
    case "failed":
      return "Order failed"
    case "refunded":
      return "Order refunded"
    default:
      return ORDER_STATUS_LABEL[status]
  }
}

function pendingTitle(status: CustomerOrderStatus) {
  switch (status) {
    case "pending":
      return "Confirm payment"
    case "processing":
      return "Process order"
    case "completed":
      return "Complete order"
    default:
      return ORDER_STATUS_LABEL[status]
  }
}

function detailFor(
  status: CustomerOrderStatus,
  order: CustomerOrder,
  phase: "done" | "running" | "pending",
) {
  if (status === "pending") {
    if (phase === "done") return `Paid by ${order.paymentMethod || "the selected method"}.`
    if (phase === "running") return "We are waiting for payment before preparing the order."
    return "Payment confirmation is next."
  }
  if (status === "processing") {
    if (phase === "done") return "Items were prepared for fulfillment."
    if (phase === "running") return "The store is preparing and packing your items."
    return "Fulfillment starts after payment is confirmed."
  }
  if (status === "on-hold") {
    return phase === "running"
      ? "This order is paused. We will continue once the hold is cleared."
      : "This order was briefly on hold."
  }
  if (status === "completed") {
    return phase === "done" ? "This order is complete." : "Shown when the order is marked completed."
  }
  if (status === "cancelled") return "This order was cancelled and will not be fulfilled."
  if (status === "failed") return "Checkout or payment did not complete for this order."
  if (status === "refunded") return "Payment for this order was refunded."
  return ORDER_STATUS_LABEL[status]
}

/** Build progress from live statusHistory + current status + documents. */
export function buildOrderSteps(order: CustomerOrder): ProcessStep[] {
  const history = order.statusHistory?.length
    ? order.statusHistory
    : [{ status: order.status, at: order.createdAt, note: "Order placed" }]

  const current = order.status
  const placedAt = formatDate(order.createdAt, "en")

  const steps: ProcessStep[] = [
    {
      id: "placed",
      title: "Order placed",
      description: placedAt,
      icon: ClipboardList,
      detail: `Order ${order.orderNumber} was received with ${order.items.length} item${
        order.items.length === 1 ? "" : "s"
      }.`,
    },
  ]

  // Terminal path: show reached happy milestones then the terminal error.
  if (TERMINAL.includes(current)) {
    if (hasReached(history, "processing") || current === "refunded") {
      const at = lastEventAt(history, "processing") || order.createdAt
      steps.push({
        id: "processing",
        title: doneTitle("processing"),
        description: formatDate(at, "en"),
        icon: Truck,
        detail: detailFor("processing", order, "done"),
      })
    }
    if (hasReached(history, "completed") && current === "refunded") {
      const at = lastEventAt(history, "completed") || order.updatedAt || order.createdAt
      steps.push({
        id: "completed",
        title: doneTitle("completed"),
        description: formatDate(at, "en"),
        icon: PackageCheck,
        detail: detailFor("completed", order, "done"),
      })
    }

    const terminalAt = lastEventAt(history, current) || order.updatedAt || order.createdAt
    steps.push({
      id: current,
      title: doneTitle(current),
      description: formatDate(terminalAt, "en"),
      status: "error",
      icon: STATUS_ICON[current],
      detail: detailFor(current, order, "done"),
      defaultOpen: true,
    })
  } else {
    // Happy / hold path driven by history + current status.
    const pipeline: CustomerOrderStatus[] =
      current === "on-hold"
        ? ["pending", "processing", "on-hold", "completed"]
        : [...HAPPY_PATH]

    // If checkout skipped pending (COD → processing), still show payment as done.
    const skippedPending =
      !hasReached(history, "pending") &&
      (hasReached(history, "processing") ||
        hasReached(history, "completed") ||
        current === "processing" ||
        current === "completed" ||
        current === "on-hold")

    const happyIndex = (status: CustomerOrderStatus) => {
      if (status === "on-hold") return HAPPY_PATH.indexOf("processing")
      return HAPPY_PATH.indexOf(status)
    }
    const currentIndex = happyIndex(current)

    for (const stage of pipeline) {
      if (stage === "pending" && skippedPending) {
        steps.push({
          id: "payment",
          title: doneTitle("pending"),
          description: formatDate(order.createdAt, "en"),
          icon: CreditCard,
          detail: detailFor("pending", order, "done"),
        })
        continue
      }

      if (stage === "on-hold" && current !== "on-hold" && !hasReached(history, "on-hold")) {
        continue
      }

      const stageIndex = happyIndex(stage)
      const isCurrent = current === stage
      const impliedDone = currentIndex > stageIndex || (current === "completed" && stage !== "completed")
      const logged = hasReached(history, stage)

      let phase: "done" | "running" | "pending"
      if (stage === "completed" && current === "completed") phase = "done"
      else if (isCurrent) phase = "running"
      else if (impliedDone || logged) phase = "done"
      else phase = "pending"

      const at =
        lastEventAt(history, stage) ||
        (phase === "done" || phase === "running"
          ? stage === "pending" || stage === "processing"
            ? order.createdAt
            : order.updatedAt || order.createdAt
          : null)

      steps.push({
        id: stage,
        title:
          phase === "running"
            ? runningTitle(stage)
            : phase === "done"
              ? doneTitle(stage)
              : pendingTitle(stage),
        description: at && phase !== "pending" ? formatDate(at, "en") : undefined,
        status: phase === "running" ? "running" : phase === "pending" ? "pending" : undefined,
        icon: phase === "done" && stage === "completed" ? PackageCheck : STATUS_ICON[stage],
        detail: detailFor(stage, order, phase),
        defaultOpen: phase === "running" || (stage === "completed" && phase === "done"),
      })
    }
  }

  const docs = order.documents.filter((doc) => doc.status !== "void")
  if (docs.length) {
    steps.push({
      id: "documents",
      title:
        docs.length === 1
          ? `Issued ${DOCUMENT_KIND_LABEL[docs[0]!.kind].toLowerCase()}`
          : `Issued ${docs.length} documents`,
      icon: FileText,
      description: docs.map((doc) => doc.number).join(" · "),
      detail: docs
        .map(
          (doc) =>
            `${DOCUMENT_KIND_LABEL[doc.kind]} ${doc.number} — ${DOCUMENT_STATUS_LABEL[doc.status]}${
              doc.issuedAt ? ` · ${formatDate(doc.issuedAt, "en")}` : ""
            }`,
        )
        .join("\n"),
    })
  }

  return steps
}

function StepRow({ step }: { step: ProcessStep }) {
  const Icon = step.icon
  const isCurrent = step.status === "running"
  const line = (
    <TraceLine status={step.status} className={cn(isCurrent && "text-foreground")}>
      <TraceIcon className={cn(isCurrent && "trace-status-blink text-foreground")}>
        {step.status === undefined ? (
          <CheckCircle2 className="text-foreground" />
        ) : step.status === "pending" ? (
          <CircleDashed />
        ) : (
          <Icon />
        )}
      </TraceIcon>
      <TraceTitle
        className={cn(
          step.status === undefined && "text-foreground",
          isCurrent && "trace-status-blink text-foreground",
        )}
      >
        {step.title}
      </TraceTitle>
      {step.description ? <TraceDescription>{step.description}</TraceDescription> : null}
    </TraceLine>
  )

  if (!step.detail) return line

  return (
    <TraceCollapsible defaultOpen={step.defaultOpen}>
      <TraceCollapsibleTrigger>{line}</TraceCollapsibleTrigger>
      <TraceCollapsibleContent className="whitespace-pre-line text-sm">
        {step.detail}
      </TraceCollapsibleContent>
    </TraceCollapsible>
  )
}

export function OrderProcessTrace({
  order,
  className,
  showTitle = true,
}: {
  order: CustomerOrder
  className?: string
  showTitle?: boolean
}) {
  const steps = useMemo(() => buildOrderSteps(order), [order])

  return (
    <div className={cn(showTitle ? "space-y-4" : undefined, className)}>
      {showTitle ? (
        <h2 className="text-base font-semibold tracking-tight">Order progress</h2>
      ) : null}
      <Trace aria-label="Order progress">
        {steps.map((step) => (
          <StepRow key={`${step.id}-${step.title}-${step.description || ""}`} step={step} />
        ))}
      </Trace>
    </div>
  )
}
