"use client";

import { useEffect } from "react";

const LIGHT_ICON = "/favicon-light.png";
const DARK_ICON = "/favicon-dark.png";

/**
 * Swaps the document favicon to match the device color scheme
 * (prefers-color-scheme), independent of the in-app theme toggle.
 */
export function ThemeFavicon() {
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");

    const sync = () => {
      const href = mq.matches ? DARK_ICON : LIGHT_ICON;

      const ensureLink = (rel: string) => {
        let link = document.querySelector<HTMLLinkElement>(
          `link[rel="${rel}"][data-theme-favicon="true"]`,
        );
        if (!link) {
          link = document.createElement("link");
          link.rel = rel;
          link.setAttribute("data-theme-favicon", "true");
          document.head.appendChild(link);
        }
        link.type = "image/png";
        link.removeAttribute("media");
        link.href = `${href}?v=device-scheme`;
      };

      ensureLink("icon");
      ensureLink("shortcut icon");
    };

    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  return null;
}
