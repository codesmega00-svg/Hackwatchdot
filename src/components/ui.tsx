import { createContext, useContext, useEffect, useRef, useState } from "react";
import { useTick } from "../lib/useLive";
import { timeAgo } from "../lib/format";
import { kindMeta } from "../lib/data";

export const ToastCtx = createContext<(msg: string) => void>(() => {});
export const useToast = () => useContext(ToastCtx);

export function Kpi(props: { label: string; value: React.ReactNode; sub?: React.ReactNode; hot?: boolean }) {
  const [flash, setFlash] = useState(false);
  const prevVal = useRef(props.value);

  useEffect(() => {
    if (prevVal.current !== props.value) {
      prevVal.current = props.value;
      setFlash(true);
      const timer = window.setTimeout(() => setFlash(false), 1200);
      return () => window.clearTimeout(timer);
    }
  }, [props.value]);

  return (
    <div className={props.hot ? "kpi hot" : "kpi"}>
      <span className="l">{props.label}</span>
      <div className={`v ${flash ? "val-flash" : ""}`}>{props.value}</div>
      {props.sub ? <div className="s">{props.sub}</div> : null}
    </div>
  );
}

export function Bar({ value, cls = "" }: { value: number; cls?: string }) {
  const v = Math.max(0, Math.min(100, Number.isFinite(value) ? value : 0));
  return (
    <div className={`bar ${cls}`} role="presentation">
      <i style={{ width: `${v}%` }} />
    </div>
  );
}

export function LiveBadge({
  status,
  updatedAt,
  error,
  refresh,
}: {
  status: "loading" | "live" | "error";
  updatedAt: number | null;
  error: string | null;
  refresh: () => void;
}) {
  useTick(1000);
  const stale = updatedAt ? Date.now() - updatedAt > 45_000 : false;
  const cls = status === "error" ? "live err" : status === "live" && !stale ? "live" : "live stale";
  const label =
    status === "loading"
      ? "Connecting to Binance…"
      : status === "error"
        ? "Binance feed retrying"
        : updatedAt
          ? `Binance live · ${timeAgo(updatedAt)}`
          : "Binance live";
  return (
    <button
      type="button"
      className={cls}
      onClick={refresh}
      title={error ? `${error} — click to retry` : "Prices update from Binance every 20 seconds. Click to refresh now."}
      style={{ cursor: "pointer", font: "inherit" }}
    >
      <span className="dot" />
      <span>{label}</span>
    </button>
  );
}

export function Seg<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
  label: string;
}) {
  return (
    <div className="seg" role="group" aria-label={label}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          className={o.value === value ? "on" : ""}
          aria-pressed={o.value === value}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function KindBadge({ kind }: { kind: string }) {
  const m = kindMeta(kind);
  return <span className={`bd ${m.cls}`}>{m.label}</span>;
}

export function SectionTitle({
  kicker,
  title,
  sub,
  right,
  extra,
}: {
  kicker?: string;
  title: React.ReactNode;
  sub?: React.ReactNode;
  right?: React.ReactNode;
  extra?: React.ReactNode;
}) {
  return (
    <div style={{ marginBottom: 14 }}>
      {kicker ? <div className="kicker">{kicker}</div> : null}
      <div style={{ display: "flex", gap: 14, alignItems: "flex-end", justifyContent: "space-between", flexWrap: "wrap" }}>
        <div>
          <h2>{title}</h2>
          {sub ? <p className="sub" style={{ marginBottom: 0 }}>{sub}</p> : null}
        </div>
        {right}
      </div>
      {extra}
    </div>
  );
}

export function Stat({ label, value, sub }: { label: string; value: React.ReactNode; sub?: React.ReactNode }) {
  return (
    <div>
      <span className="dim" style={{ fontFamily: "var(--mono)", fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase" }}>
        {label}
      </span>
      <div className="mono" style={{ fontSize: 15, color: "var(--text)", marginTop: 2 }}>{value}</div>
      {sub ? <div style={{ fontSize: 11.5, color: "var(--dim)" }}>{sub}</div> : null}
    </div>
  );
}
