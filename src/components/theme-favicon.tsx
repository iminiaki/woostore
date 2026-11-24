"use client";

import { useTheme } from "next-themes";
import { useEffect } from "react";

const LIGHT_ICON = "/favicon-light.png";
const DARK_ICON = "/favicon-dark.png";

/**
 * Swaps the document favicon to match the active site theme
 * (class-based light/dark), not only OS prefers-color-scheme.
 */
export function ThemeFavicon() {
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    const href = resolvedTheme === "dark" ? DARK_ICON : LIGHT_ICON;

    const ensureLink = (rel: string) => {
      let link = document.querySelector<HTMLLinkElement>(`link[rel="${rel}"][data-theme-favicon="true"]`);
      if (!link) {
        link = document.createElement("link");
        link.rel = rel;
        link.setAttribute("data-theme-favicon", "true");
        document.head.appendChild(link);
      }
      link.type = "image/png";
      link.href = `${href}?v=pinwheel`;
    };

    ensureLink("icon");
    ensureLink("shortcut icon");
  }, [resolvedTheme]);

  return null;
}
