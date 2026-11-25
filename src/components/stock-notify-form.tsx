"use client";

import { useState } from "react";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LogoTraceLoader } from "@/components/LogoTraceLoader";
import { toast } from "@/components/ui/use-toast";
import { toastIcons } from "@/lib/toast-icons";
import { cn } from "@/lib/utils";
import { buildVariantKey } from "@/lib/stock-notify-shared";

type Props = {
  productId: string;
  productName?: string;
  variantId?: string;
  color?: string;
  size?: string;
  defaultPhone?: string;
  className?: string;
  /** Hide title/description (modal supplies its own). */
  compact?: boolean;
  /** Use toast for result instead of inline message (modal). */
  toastOnResult?: boolean;
  onSuccess?: () => void;
};

export function StockNotifyForm({
  productId,
  productName,
  variantId,
  color,
  size,
  defaultPhone = "",
  className,
  compact,
  toastOnResult,
  onSuccess,
}: Props) {
  const [phone, setPhone] = useState(defaultPhone);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ ok: boolean; text: string } | null>(null);

  const variantKey = buildVariantKey(color, size, variantId);
  const inputId = `stock-notify-phone-${productId}${variantKey ? `-${variantKey}` : ""}`;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setFeedback(null);
    try {
      const res = await fetch("/api/store/stock-alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, variantKey, phone }),
      });
      const json = (await res.json()) as { success?: boolean; message?: string; error?: string };
      if (!res.ok || !json.success) {
        const text = json.error || "Something went wrong. Try again.";
        if (toastOnResult) {
          toast.error({ title: "Couldn’t save request", description: text, icon: toastIcons.error });
        } else {
          setFeedback({ ok: false, text });
        }
        return;
      }
      const text = json.message || "Request saved. We’ll text you when it’s back.";
      if (toastOnResult) {
        toast.success({ title: "You’re on the list", description: text, icon: toastIcons.success });
        onSuccess?.();
      } else {
        setFeedback({ ok: true, text });
        onSuccess?.();
      }
    } catch {
      const text = "Something went wrong. Try again.";
      if (toastOnResult) {
        toast.error({ title: "Couldn’t save request", description: text, icon: toastIcons.error });
      } else {
        setFeedback({ ok: false, text });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={cn("space-y-5 rounded-xl border border-border/70 bg-muted/30 p-4", className)}>
      {!compact ? (
        <div className="space-y-2">
          <h3 className="flex items-center gap-2 text-base font-semibold">
            <Bell className="h-4 w-4" />
            Notify me when available
          </h3>
          {productName ? (
            <p className="text-sm text-muted-foreground">{productName}</p>
          ) : null}
          <p className="text-sm text-muted-foreground">
            We’ll text you when this item is back in stock.
          </p>
        </div>
      ) : null}

      <form onSubmit={onSubmit} className="space-y-5" noValidate>
        <div className="space-y-2.5">
          <Label htmlFor={inputId}>Phone number</Label>
          <Input
            id={inputId}
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            dir="ltr"
            placeholder="+1 555 000 0000"
            maxLength={20}
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
          />
        </div>

        {!toastOnResult && feedback ? (
          <p
            role="status"
            className={cn(
              "text-sm",
              feedback.ok ? "text-green-700 dark:text-green-400" : "text-destructive",
            )}
          >
            {feedback.text}
          </p>
        ) : null}

        <Button type="submit" className="w-full" disabled={loading || (!toastOnResult && feedback?.ok)}>
          {loading ? (
            <>
              <LogoTraceLoader
                loading
                size={18}
                strokeWidth={72}
                className="mr-2 text-current"
                ariaLabel="Saving"
              />
              Saving…
            </>
          ) : (
            <>
              <Bell className="mr-2 h-4 w-4" />
              Notify me
            </>
          )}
        </Button>
      </form>
    </div>
  );
}
