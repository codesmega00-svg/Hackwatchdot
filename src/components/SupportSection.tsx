import { useState } from "react";
import { SUPPORT_WALLETS, useI18n } from "../lib/i18n";
import { useToast } from "./ui";

export default function SupportSection() {
  const { t } = useI18n();
  const toast = useToast();
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const copyToClipboard = (text: string, type: "eth" | "sol") => {
    void navigator.clipboard?.writeText(text).then(
      () => {
        setCopiedKey(type);
        toast(`${type.toUpperCase()} support address copied to clipboard!`);
        window.setTimeout(() => setCopiedKey(null), 2500);
      },
      () => toast("Clipboard access denied.")
    );
  };

  return (
    <section className="support-section" id="support">
      <div className="support-header">
        <div className="support-icon-badge" style={{ overflow: "hidden", borderRadius: "50%", padding: 0 }}>
          <img src="/hackwatch-logo.jpg" alt="HackWatch Logo" style={{ width: 44, height: 44, objectFit: "cover", display: "block" }} />
        </div>
        <div>
          <h3 className="support-title">{t("support_work_title")}</h3>
          <p className="support-desc">{t("support_work_desc")}</p>
        </div>
      </div>

      <div className="support-cards-grid">
        {/* Ethereum Support Card */}
        <div className="support-card eth-card">
          <div className="support-card-head">
            <div className="support-chain-badge eth">
              <span>🔷</span>
              <span>{t("support_eth_card")}</span>
            </div>
            <a
              href={`https://etherscan.io/address/${SUPPORT_WALLETS.eth}`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn ghost"
              style={{ padding: "2px 8px", fontSize: 11 }}
              title="View on Etherscan"
            >
              Etherscan ↗
            </a>
          </div>

          <div className="support-address-box">
            <code className="support-address-text">{SUPPORT_WALLETS.eth}</code>
          </div>

          <div className="support-card-actions">
            <button
              type="button"
              className={`btn rt ${copiedKey === "eth" ? "copied-pop" : ""}`}
              style={{ width: "100%", padding: "7px 14px", fontSize: 12 }}
              onClick={() => copyToClipboard(SUPPORT_WALLETS.eth, "eth")}
            >
              {copiedKey === "eth" ? "✓ Address Copied!" : "📋 Copy ETH Address"}
            </button>
          </div>
        </div>

        {/* Solana Support Card */}
        <div className="support-card sol-card">
          <div className="support-card-head">
            <div className="support-chain-badge sol">
              <span>🟣</span>
              <span>{t("support_sol_card")}</span>
            </div>
            <a
              href={`https://solscan.io/account/${SUPPORT_WALLETS.sol}`}
              target="_blank"
              rel="noopener noreferrer"
              className="btn ghost"
              style={{ padding: "2px 8px", fontSize: 11 }}
              title="View on Solscan"
            >
              Solscan ↗
            </a>
          </div>

          <div className="support-address-box">
            <code className="support-address-text">{SUPPORT_WALLETS.sol}</code>
          </div>

          <div className="support-card-actions">
            <button
              type="button"
              className={`btn rt ${copiedKey === "sol" ? "copied-pop" : ""}`}
              style={{ width: "100%", padding: "7px 14px", fontSize: 12, borderColor: "#a68cff", background: "linear-gradient(135deg, rgba(166, 140, 255, 0.2), rgba(255, 90, 82, 0.2))" }}
              onClick={() => copyToClipboard(SUPPORT_WALLETS.sol, "sol")}
            >
              {copiedKey === "sol" ? "✓ Address Copied!" : "📋 Copy SOL Address"}
            </button>
          </div>
        </div>
      </div>

      <div style={{ marginTop: 18, paddingTop: 16, borderTop: "1px solid rgba(255, 255, 255, 0.08)", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
        <span style={{ fontSize: 13, color: "var(--mute)" }}>
          Follow breaking alerts, live wallet movement notifications & analysis:
        </span>
        <a
          href="https://x.com/Hackwatchdot"
          target="_blank"
          rel="noopener noreferrer"
          className="btn rt"
          style={{ background: "#000", color: "#fff", borderColor: "rgba(255, 255, 255, 0.3)", display: "inline-flex", alignItems: "center", gap: 6, padding: "5px 14px", fontSize: 12.5 }}
        >
          <svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
          </svg>
          Follow @Hackwatchdot on X ↗
        </a>
      </div>
    </section>
  );
}

