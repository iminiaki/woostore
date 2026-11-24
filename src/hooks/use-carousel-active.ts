"use client";

import { useEffect, useState, type RefObject } from "react";

/** Sync active dot index to the card most visible in a horizontal scroller. */
export function useCarouselActive(
  scrollerRef: RefObject<HTMLElement | null>,
  itemCount: number,
) {
  const [active, setActive] = useState(0);

  useEffect(() => {
    const root = scrollerRef.current;
    if (!root || itemCount < 1) {
      setActive(0);
      return;
    }

    const cards = Array.from(root.children) as HTMLElement[];
    if (!cards.length) return;

    const ratios = new Map<Element, number>();

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          ratios.set(entry.target, entry.intersectionRatio);
        }
        let bestIdx = 0;
        let bestRatio = -1;
        cards.forEach((card, i) => {
          const r = ratios.get(card) ?? 0;
          if (r > bestRatio) {
            bestRatio = r;
            bestIdx = i;
          }
        });
        setActive(bestIdx);
      },
      {
        root,
        threshold: [0, 0.25, 0.5, 0.75, 1],
      },
    );

    for (const card of cards) io.observe(card);
    return () => io.disconnect();
  }, [scrollerRef, itemCount]);

  return active;
}

export function scrollCarouselToIndex(
  scroller: HTMLElement | null,
  index: number,
) {
  if (!scroller) return;
  const target = scroller.children[index] as HTMLElement | undefined;
  if (!target) return;
  const first = scroller.children[0] as HTMLElement;
  const left = target.offsetLeft - first.offsetLeft;
  scroller.scrollTo({ left, behavior: "smooth" });
}
