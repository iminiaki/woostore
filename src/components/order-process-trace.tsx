"use client"

import { useMemo } from "react"

import { useI18n } from "@/components/locale-provider"
import { formatLocaleNumber } from "@/i18n/languages"
import type { MessageKey } from "@/i18n/messages"
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
  type CustomerOrder,
  type CustomerOrderDocument,
  type CustomerOrderStatus,
  type CustomerOrderStatusEvent,
} from "@/lib/customer-order"

type Copy = (key: MessageKey, vars?: Record<string, string | number>) => string

function invoiceLang(code: string) {
  return code.toLowerCase().startsWith("fa") ? "fa" : "en"
}

function statusLabel(t: Copy, status: CustomerOrderStatus) {
  return t(`status.${status}` as MessageKey)
}

function docKind(t: Copy, kind: CustomerOrderDocument["kind"]) {
  return t(kind === "invoice" ? "doc.invoice" : "doc.proforma")
}

function docStatus(t: Copy, status: CustomerOrderDocument["status"]) {
  if (status === "void") return t("doc.void")
  if (status === "superseded") return t("doc.superseded")
  return t("doc.issued")
}

function payMethod(t: Copy, value?: string | null) {
  if (!value) return t("pay.none")
  if (value === "cod") return t("pay.cod")
  if (value === "card") return t("pay.card")
  if (value === "wallet") return t("pay.wallet")
  if (value === "wallet+cod") return t("pay.both")
  return value
}
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

function runningTitle(status: CustomerOrderStatus, t: Copy) {
  const key = `trace.run.${status}` as MessageKey
  return t(key)
}

function doneTitle(status: CustomerOrderStatus, t: Copy) {
  return t(`trace.done.${status}` as MessageKey)
}

function pendingTitle(status: CustomerOrderStatus, t: Copy) {
  if (status === "pending" || status === "processing" || status === "completed") {
    return t(`trace.next.${status}` as MessageKey)
  }
  return statusLabel(t, status)
}

function detailFor(
  status: CustomerOrderStatus,
  order: CustomerOrder,
  phase: "done" | "running" | "pending",
  t: Copy,
) {
  if (status === "pending") {
    if (phase === "done") return t("trace.pay.done", { method: payMethod(t, order.paymentMethod) })
    if (phase === "running") return t("trace.pay.run")
    return t("trace.pay.next")
  }
  if (status === "processing") {
    if (phase === "done") return t("trace.pack.done")
    if (phase === "running") return t("trace.pack.run")
    return t("trace.pack.next")
  }
  if (status === "on-hold") {
    return phase === "running" ? t("trace.hold.run") : t("trace.hold.done")
  }
  if (status === "completed") {
    return phase === "done" ? t("trace.complete.done") : t("trace.complete.next")
  }
  if (status === "cancelled") return t("trace.cancelled")
  if (status === "failed") return t("trace.failed")
  if (status === "refunded") return t("trace.refunded")
  return statusLabel(t, status)
}

/** Build progress from live statusHistory + current status + documents. */
export function buildOrderSteps(order: CustomerOrder, t: Copy, localeCode: string): ProcessStep[] {
  const lang = invoiceLang(localeCode)
  const history = order.statusHistory?.length
    ? order.statusHistory
    : [{ status: order.status, at: order.createdAt, note: t("trace.placed") }]

  const current = order.status
  const placedAt = formatDate(order.createdAt, lang)
  const itemCount = order.items.reduce((sum, item) => sum + item.quantity, 0)

  const steps: ProcessStep[] = [
    {
      id: "placed",
      title: t("trace.placed"),
      description: placedAt,
      icon: ClipboardList,
      detail: t("trace.placedDetail", {
        number: order.orderNumber,
        count: t(itemCount === 1 ? "orders.item" : "orders.items", {
          count: formatLocaleNumber(itemCount, localeCode),
        }),
      }),
    },
  ]

  // Terminal path: show reached happy milestones then the terminal error.
  if (TERMINAL.includes(current)) {
    if (hasReached(history, "processing") || current === "refunded") {
      const at = lastEventAt(history, "processing") || order.createdAt
      steps.push({
        id: "processing",
        title: doneTitle("processing", t),
        description: formatDate(at, lang),
        icon: Truck,
        detail: detailFor("processing", order, "done", t),
      })
    }
    if (hasReached(history, "completed") && current === "refunded") {
      const at = lastEventAt(history, "completed") || order.updatedAt || order.createdAt
      steps.push({
        id: "completed",
        title: doneTitle("completed", t),
        description: formatDate(at, lang),
        icon: PackageCheck,
        detail: detailFor("completed", order, "done", t),
      })
    }

    const terminalAt = lastEventAt(history, current) || order.updatedAt || order.createdAt
    steps.push({
      id: current,
      title: doneTitle(current, t),
      description: formatDate(terminalAt, lang),
      status: "error",
      icon: STATUS_ICON[current],
      detail: detailFor(current, order, "done", t),
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
          title: doneTitle("pending", t),
          description: formatDate(order.createdAt, lang),
          icon: CreditCard,
          detail: detailFor("pending", order, "done", t),
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
            ? runningTitle(stage, t)
            : phase === "done"
              ? doneTitle(stage, t)
              : pendingTitle(stage, t),
        description: at && phase !== "pending" ? formatDate(at, lang) : undefined,
        status: phase === "running" ? "running" : phase === "pending" ? "pending" : undefined,
        icon: phase === "done" && stage === "completed" ? PackageCheck : STATUS_ICON[stage],
        detail: detailFor(stage, order, phase, t),
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
          ? t("trace.issuedOne", { name: docKind(t, docs[0]!.kind) })
          : t("trace.issuedMany", { count: formatLocaleNumber(docs.length, localeCode) }),
      icon: FileText,
      description: docs.map((doc) => doc.number).join(" · "),
      detail: docs
        .map(
          (doc) =>
            `${docKind(t, doc.kind)} ${doc.number} — ${docStatus(t, doc.status)}${
              doc.issuedAt ? ` · ${formatDate(doc.issuedAt, lang)}` : ""
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
  const { t, active } = useI18n()
  const steps = useMemo(() => buildOrderSteps(order, t, active.code), [order, t, active.code])

  return (
    <div className={cn(showTitle ? "space-y-4" : undefined, className)}>
      {showTitle ? (
        <h2 className="text-base font-semibold tracking-tight">{t("trace.progress")}</h2>
      ) : null}
      <Trace aria-label={t("trace.progress")}>
        {steps.map((step) => (
          <StepRow key={`${step.id}-${step.title}-${step.description || ""}`} step={step} />
        ))}
      </Trace>
    </div>
  )
}
