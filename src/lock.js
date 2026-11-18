import { useEffect } from "react";

// Freezes the page behind a popup (iOS needs position:fixed, plain overflow:hidden isn't enough).
export function useScrollLock() {
  useEffect(() => {
    const y = window.scrollY, b = document.body.style;
    const old = { position: b.position, top: b.top, width: b.width, overflow: b.overflow };
    b.position = "fixed"; b.top = `-${y}px`; b.width = "100%"; b.overflow = "hidden";
    return () => { Object.assign(b, old); window.scrollTo(0, y); };
  }, []);
}
