"use client";

import { useEffect, useState } from "react";

/** True when running as iOS/Android home-screen / installed PWA. */
export function useStandalone() {
  const [standalone, setStandalone] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(display-mode: standalone)");
    const nav = window.navigator as Navigator & { standalone?: boolean };
    const sync = () => setStandalone(mq.matches || nav.standalone === true);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  return standalone;
}
