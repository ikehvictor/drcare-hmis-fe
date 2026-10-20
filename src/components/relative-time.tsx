"use client";

import { useEffect, useState } from "react";
import { formatDate, formatRelative } from "@/lib/format";

// Shows the absolute date on first render, then switches to "5 min ago" in the browser.
export function RelativeTime({ iso }: { iso: string }) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- the clock is only read in the browser
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(t);
  }, []);
  return <time dateTime={iso}>{now === null ? formatDate(iso) : formatRelative(iso, now)}</time>;
}
