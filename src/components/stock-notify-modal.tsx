"use client";

import { Bell } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { StockNotifyForm } from "@/components/stock-notify-form";
import { useI18n } from "@/components/locale-provider";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productId: string;
  productName: string;
  variantId?: string;
  color?: string;
  size?: string;
};

export function StockNotifyModal({
  open,
  onOpenChange,
  productId,
  productName,
  variantId,
  color,
  size,
}: Props) {
  const { t } = useI18n();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={
          "gap-8 overflow-hidden border-border/50 p-6 pt-4 sm:max-w-md " +
          "bg-background/70 backdrop-blur-xl " +
          "bg-gradient-to-b from-muted/50 via-background/75 to-background/85"
        }
      >
        <DialogHeader className="gap-3 pe-8 text-start">
          <div className="flex items-center gap-2.5">
            <Bell className="h-4 w-4 shrink-0 text-foreground" aria-hidden />
            <DialogTitle className="text-lg leading-none">{t("notify.title")}</DialogTitle>
          </div>
          <DialogDescription>{t("notify.short")}</DialogDescription>
        </DialogHeader>

        <p className="truncate text-sm font-medium text-foreground">{productName}</p>

        <StockNotifyForm
          productId={productId}
          productName={productName}
          variantId={variantId}
          color={color}
          size={size}
          compact
          toastOnResult
          onSuccess={() => onOpenChange(false)}
          className="border-0 bg-transparent p-0"
        />
      </DialogContent>
    </Dialog>
  );
}
