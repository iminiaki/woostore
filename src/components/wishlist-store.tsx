"use client";

import React, { createContext, useContext, useEffect, useMemo, useReducer, useState } from "react";
import type { Product } from "@/types";

const STORAGE_KEY = "lastore-wishlist";

type WishlistAction =
  | { type: "hydrate"; items: Product[] }
  | { type: "add"; product: Product }
  | { type: "remove"; productId: string }
  | { type: "clear" };

interface WishlistState {
  items: Product[];
}

const WishlistContext = createContext<{
  state: WishlistState;
  dispatch: React.Dispatch<WishlistAction>;
  isInWishlist: (productId: string) => boolean;
} | null>(null);

function withoutCatalogGraph(product: Product): Product {
  const { relatedProducts: _related, crossSells: _cross, ...rest } = product;
  return rest;
}

function wishlistReducer(state: WishlistState, action: WishlistAction): WishlistState {
  switch (action.type) {
    case "hydrate":
      return { items: action.items };
    case "add": {
      const product = withoutCatalogGraph(action.product);
      if (state.items.some((item) => item.id === product.id)) return state;
      return { items: [...state.items, product] };
    }
    case "remove":
      return { items: state.items.filter((item) => item.id !== action.productId) };
    case "clear":
      return { items: [] };
    default:
      return state;
  }
}

function readWishlist(): Product[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function WishlistProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(wishlistReducer, { items: [] });
  const [ready, setReady] = useState(false);

  useEffect(() => {
    dispatch({ type: "hydrate", items: readWishlist() });
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state.items));
    } catch {
      // The wishlist still works for this visit if storage is full.
    }
  }, [state.items, ready]);

  const isInWishlist = useMemo(
    () => (productId: string) => state.items.some((item) => item.id === productId),
    [state.items],
  );

  const value = useMemo(() => ({ state, dispatch, isInWishlist }), [state, isInWishlist]);

  return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>;
}

export function useWishlist() {
  const ctx = useContext(WishlistContext);
  if (!ctx) {
    return {
      state: { items: [] as Product[] },
      dispatch: (() => undefined) as React.Dispatch<WishlistAction>,
      isInWishlist: () => false,
    };
  }
  return ctx;
}
