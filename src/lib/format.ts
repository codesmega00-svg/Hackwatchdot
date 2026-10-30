export function compact(n: number, digits = 2): string {
  const abs = Math.abs(n);
  const sign = n < 0 ? "-" : "";
  if (abs >= 1e12) return `${sign}${(abs / 1e12).toFixed(digits)}T`;
  if (abs >= 1e9) return `${sign}${(abs / 1e9).toFixed(digits)}B`;
  if (abs >= 1e6) return `${sign}${(abs / 1e6).toFixed(digits)}M`;
  if (abs >= 1e3) return `${sign}${(abs / 1e3).toFixed(abs >= 1e5 ? 0 : 1)}K`;
  if (abs >= 1) return `${sign}${abs.toFixed(digits)}`;
  return `${sign}${abs.toPrecision(2)}`;
}

export function usd(n: number, digits = 2): string {
  if (!Number.isFinite(n)) return "—";
  const sign = n < 0 ? "-" : "";
  return `${sign}$${compact(Math.abs(n), digits)}`;
}

export function usdFull(n: number): string {
  if (!Number.isFinite(n)) return "—";
  return n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: Math.abs(n) < 100 ? 2 : 0,
  });
}

export function amount(n: number): string {
  if (!Number.isFinite(n)) return "—";
  const abs = Math.abs(n);
  if (abs >= 1e9) return compact(n, 2);
  if (abs >= 1e6) return compact(n, 2);
  if (abs >= 1e3) return n.toLocaleString("en-US", { maximumFractionDigits: 0 });
  if (abs >= 1) return n.toLocaleString("en-US", { maximumFractionDigits: 2 });
  if (abs >= 0.0001) return n.toLocaleString("en-US", { maximumFractionDigits: 6 });
  return n.toPrecision(3);
}

export function price(n: number): string {
  if (!Number.isFinite(n) || n === 0) return "—";
  if (n >= 1000) return n.toLocaleString("en-US", { maximumFractionDigits: 0 });
  if (n >= 1) return n.toLocaleString("en-US", { maximumFractionDigits: 2 });
  if (n >= 0.01) return n.toFixed(4);
  return n.toPrecision(4);
}

export function pct(n: number, digits = 1): string {
  if (!Number.isFinite(n)) return "—";
  return `${n.toFixed(digits)}%`;
}

export function pctChange(n: number, digits = 2): string {
  if (!Number.isFinite(n)) return "—";
  return `${n >= 0 ? "+" : ""}${n.toFixed(digits)}%`;
}

export function shortAddr(a: string, head = 6, tail = 4): string {
  if (!a) return "—";
  if (a.length <= head + tail + 1) return a;
  return `${a.slice(0, head)}…${a.slice(-tail)}`;
}

export function timeAgo(ts: number): string {
  const s = Math.max(0, Math.floor((Date.now() - ts) / 1000));
  if (s < 10) return "just now";
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export function clock(ts: number): string {
  return new Date(ts).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

export function relative(iso: string): string {
  const d = new Date(iso).getTime();
  if (!Number.isFinite(d)) return "";
  return timeAgo(d);
}

export function shortHash(h: string): string {
  return h ? `${h.slice(0, 10)}…${h.slice(-6)}` : "—";
}

export function formatFullTime(ts: string | number | null | undefined): {
  local: string;
  utc: string;
  relative: string;
  iso: string;
} {
  if (!ts) {
    return {
      local: "Just now (Pending)",
      utc: "Pending Block",
      relative: "just now",
      iso: "",
    };
  }
  const d = typeof ts === "number" ? new Date(ts) : new Date(ts);
  const timeMs = d.getTime();
  if (isNaN(timeMs)) {
    return { local: "—", utc: "—", relative: "—", iso: "" };
  }
  const local = d.toLocaleTimeString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  const utc = d.toISOString().replace("T", " ").replace(/\.\d+Z$/, " UTC");
  return {
    local,
    utc,
    relative: timeAgo(timeMs),
    iso: d.toISOString(),
  };
}
