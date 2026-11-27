"use client";

import React, { createContext, useContext, useMemo, useReducer, useEffect, useRef, useCallback } from "react";
import type { CartItem, Product, AppliedCoupon } from "@/types";
import { toast } from "@/components/ui/use-toast";
import { getVariantPrice } from "@/lib/variant-utils";
import type { StoreCurrency } from "@/i18n/languages";
import { toastIcons } from "@/lib/toast-icons";
import { useI18n, useLocale } from "@/components/locale-provider";
import type { MessageKey } from "@/i18n/messages";

type CartToastKind = "updated" | "added" | "removed" | "coupon";

const CART_TOAST: Record<CartToastKind, { title: MessageKey; detail: MessageKey }> = {
  updated: { title: "toast.updated", detail: "toast.updatedDetail" },
  added: { title: "toast.added", detail: "toast.addedDetail" },
  removed: { title: "toast.removed", detail: "toast.removedDetail" },
  coupon: { title: "toast.coupon", detail: "toast.couponDetail" },
};

type CartAction =
  | { type: "add"; product: Product; quantity?: number; currency?: StoreCurrency }
  | { type: "remove"; variantKey: string }
  | { type: "clear" }
  | { type: "clearToast" }
  | { type: "applyCoupon"; coupon: AppliedCoupon }
  | { type: "removeCoupon" };

interface CartState {
  items: CartItem[];
  pendingToast?: { kind: CartToastKind; name: string };
  appliedCoupon: AppliedCoupon | null;
}

const CartContext = createContext<{
  state: CartState;
  dispatch: React.Dispatch<CartAction>;
  totalQuantity: number;
  subtotal: number;
  discountAmount: number;
  finalPrice: number;
} | null>(null);

function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case "add": {
      const quantity = action.quantity ?? 1;
      
      // Create a unique variant key based on product ID and selected variants
      const variantKey = `${action.product.id}-${action.product.selectedColor || 'no-color'}-${action.product.selectedSize || 'no-size'}`;
      
      const variantPrice = getVariantPrice(action.product, action.product.selectedColor, action.product.selectedSize);
      
      const existing = state.items.find((i) => i.variantKey === variantKey);
      if (existing) {
        return {
          items: state.items.map((i) =>
            i.variantKey === variantKey ? { ...i, quantity: i.quantity + quantity } : i
          ),
          pendingToast: { kind: "updated", name: action.product.name },
          appliedCoupon: state.appliedCoupon,
        };
      }
      return {
        items: [
          ...state.items,
          { 
            productId: action.product.id, 
            quantity, 
            product: action.product,
            variantKey,
            variantPrice,
            currency: action.currency || "USD",
          },
        ],
        pendingToast: { kind: "added", name: action.product.name },
        appliedCoupon: state.appliedCoupon,
      };
    }
    case "remove": {
      const removedItem = state.items.find((i) => i.variantKey === action.variantKey);
      return { 
        items: state.items.filter((i) => i.variantKey !== action.variantKey),
        pendingToast: removedItem
          ? { kind: "removed", name: removedItem.product.name }
          : undefined,
        appliedCoupon: state.appliedCoupon,
      };
    }
    case "clear": {
      return { 
        items: [],
        pendingToast: undefined,
        appliedCoupon: null,
      };
    }
    case "clearToast": {
      return { 
        ...state,
        pendingToast: undefined,
      };
    }
    case "applyCoupon": {
      return {
        ...state,
        appliedCoupon: action.coupon,
        pendingToast: { kind: "coupon", name: action.coupon.coupon.code },
      };
    }
    case "removeCoupon": {
      return {
        ...state,
        appliedCoupon: null,
      };
    }
    default:
      return state;
  }
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const { active } = useLocale();
  const { t } = useI18n();
  const currencyRef = useRef(active.currency);
  currencyRef.current = active.currency;
  const [state, rawDispatch] = useReducer(cartReducer, { 
    items: [], 
    pendingToast: undefined,
    appliedCoupon: null 
  });
  const dispatch = useCallback<React.Dispatch<CartAction>>((action) => {
    if (action.type === "add") {
      rawDispatch({ ...action, currency: action.currency || currencyRef.current });
      return;
    }
    rawDispatch(action);
  }, []);

  // Handle pending toasts after render
  useEffect(() => {
    const pending = state.pendingToast;
    if (!pending) return;
    const copy = CART_TOAST[pending.kind];
    toast({
      title: t(copy.title),
      description: t(copy.detail, { name: pending.name }),
      icon:
        pending.kind === "removed"
          ? toastIcons.remove
          : pending.kind === "coupon"
            ? toastIcons.success
            : toastIcons.cart,
    });
    dispatch({ type: "clearToast" });
  }, [state.pendingToast, t, dispatch]);

  const { totalQuantity, subtotal, discountAmount, finalPrice } = useMemo(() => {
    const totalQuantityCalc = state.items.reduce((acc, i) => acc + i.quantity, 0);
    const subtotalCalc = state.items.reduce((acc, i) => acc + i.quantity * i.variantPrice, 0);
    const discountCalc = state.appliedCoupon?.discountAmount || 0;
    const finalPriceCalc = subtotalCalc - discountCalc;
    return { 
      totalQuantity: totalQuantityCalc, 
      subtotal: subtotalCalc,
      discountAmount: discountCalc,
      finalPrice: finalPriceCalc
    };
  }, [state.items, state.appliedCoupon]);

  const value = useMemo(() => ({ 
    state, 
    dispatch, 
    totalQuantity, 
    subtotal,
    discountAmount,
    finalPrice 
  }), [state, totalQuantity, subtotal, discountAmount, finalPrice]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  // Safe fallback for SSR / partial prerender when provider isn't mounted yet
  if (!ctx) {
    return {
      state: {
        items: [] as CartItem[],
        appliedCoupon: null as AppliedCoupon | null,
      },
      dispatch: (() => undefined) as React.Dispatch<CartAction>,
      totalQuantity: 0,
      subtotal: 0,
      discountAmount: 0,
      finalPrice: 0,
    };
  }
  return ctx;
}
