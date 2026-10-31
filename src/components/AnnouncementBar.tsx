import { useState } from "react";
import { LANGUAGES, SUPPORT_WALLETS, useI18n, Lang } from "../lib/i18n";
import { useTheme } from "../lib/theme";
import { shortAddr } from "../lib/format";
import { useToast } from "./ui";

export default function AnnouncementBar() {
  const { lang, setLang, t } = useI18n();
  const { theme, toggleTheme } = useTheme();
  const toast = useToast();
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [langMenuOpen, setLangMenuOpen] = useState(false);

  const copyToClipboard = (text: string, type: "eth" | "sol") => {
    void navigator.clipboard?.writeText(text).then(
      () => {
        setCopiedKey(type);
        toast(`${type.toUpperCase()} address copied to clipboard!`);
        window.setTimeout(() => setCopiedKey(null), 2500);
      },
      () => toast("Clipboard blocked — copy text manually.")
    );
  };

  const currentLangObj = LANGUAGES.find((l) => l.code === lang) || LANGUAGES[0];

  return (
    <aside className="announcement-bar" role="banner" aria-label="Announcement & Support">
      <div className="announcement-content">
        <div className="announcement-left">
          <span className="announcement-beacon" />
          <span className="announcement-alert-text">
            {t("announcement_alert")}
          </span>
        </div>

        <div className="announcement-right">
          <div className="announcement-support-group">
            <span className="announcement-support-label">
              {t("announcement_support")}
            </span>

            {/* ETH Support Address Pill */}
            <div className="support-pill eth">
              <span className="chain-tag eth">ETH</span>
              <span className="addr-mono" title={SUPPORT_WALLETS.eth}>
                {shortAddr(SUPPORT_WALLETS.eth, 6, 4)}
              </span>
              <button
                type="button"
                className={`btn-copy-pill ${copiedKey === "eth" ? "copied-pop" : ""}`}
                onClick={() => copyToClipboard(SUPPORT_WALLETS.eth, "eth")}
                title={`Copy Ethereum address: ${SUPPORT_WALLETS.eth}`}
              >
                {copiedKey === "eth" ? "✓ Copied" : t("copy_eth")}
              </button>
              <a
                href={`https://etherscan.io/address/${SUPPORT_WALLETS.eth}`}
                target="_blank"
                rel="noopener noreferrer"
                className="pill-ext-link"
                title="View on Etherscan"
              >
                ↗
              </a>
            </div>

            {/* SOL Support Address Pill */}
            <div className="support-pill sol">
              <span className="chain-tag sol">SOL</span>
              <span className="addr-mono" title={SUPPORT_WALLETS.sol}>
                {shortAddr(SUPPORT_WALLETS.sol, 6, 4)}
              </span>
              <button
                type="button"
                className={`btn-copy-pill ${copiedKey === "sol" ? "copied-pop" : ""}`}
                onClick={() => copyToClipboard(SUPPORT_WALLETS.sol, "sol")}
                title={`Copy Solana address: ${SUPPORT_WALLETS.sol}`}
              >
                {copiedKey === "sol" ? "✓ Copied" : t("copy_sol")}
              </button>
              <a
                href={`https://solscan.io/account/${SUPPORT_WALLETS.sol}`}
                target="_blank"
                rel="noopener noreferrer"
                className="pill-ext-link"
                title="View on Solscan"
              >
                ↗
              </a>
            </div>

            {/* Follow on X Pill */}
            <a
              href="https://x.com/Hackwatchdot"
              target="_blank"
              rel="noopener noreferrer"
              className="support-pill x-follow"
              style={{
                textDecoration: "none",
                color: "#ffffff",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                background: "rgba(0, 0, 0, 0.7)",
                borderColor: "rgba(255, 255, 255, 0.2)",
              }}
              title="Follow @Hackwatchdot on X"
            >
              <svg viewBox="0 0 24 24" width="11" height="11" fill="currentColor" aria-hidden="true">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
              <span style={{ fontWeight: 600 }}>Follow @Hackwatchdot</span>
              <span style={{ opacity: 0.6, fontSize: 10 }}>↗</span>
            </a>
          </div>

          {/* Quick Controls: Lang & Theme */}
          <div className="announcement-controls-group">
            <div className="lang-switcher-wrapper">
              <button
                type="button"
                className="lang-switcher-btn"
                onClick={() => setLangMenuOpen((o) => !o)}
                aria-label="Select Language"
                aria-expanded={langMenuOpen}
              >
                <span style={{ fontSize: 13 }}>{currentLangObj.flag}</span>
                <span>{currentLangObj.label}</span>
                <span style={{ fontSize: 9, opacity: 0.7 }}>▾</span>
              </button>

              {langMenuOpen ? (
                <div className="lang-menu" role="menu">
                  {LANGUAGES.map((item) => (
                    <button
                      key={item.code}
                      type="button"
                      role="menuitem"
                      className={`lang-option ${lang === item.code ? "active" : ""}`}
                      onClick={() => {
                        setLang(item.code as Lang);
                        setLangMenuOpen(false);
                        toast(`Language switched to ${item.label}`);
                      }}
                    >
                      <span>{item.flag}</span>
                      <span>{item.label}</span>
                      {lang === item.code ? <span className="check">✓</span> : null}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>

            <button
              type="button"
              className="announcement-theme-btn"
              onClick={() => {
                toggleTheme();
                toast(theme === "dark" ? "Switched to Light Mode (Sky Horizon)" : "Switched to Dark Mode");
              }}
              aria-label="Toggle Light / Dark mode"
              title={theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
            >
              <span style={{ fontSize: 12 }}>{theme === "dark" ? "☀️" : "🌙"}</span>
              <span>{theme === "dark" ? t("theme_light") : t("theme_dark")}</span>
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}

