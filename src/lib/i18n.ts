import { useState, createContext, useContext, ReactNode, createElement } from "react";

export type Lang = "en" | "es" | "zh" | "ja" | "ko" | "ru";

export const LANGUAGES: { code: Lang; label: string; flag: string }[] = [
  { code: "en", label: "English", flag: "🇺🇸" },
  { code: "zh", label: "中文", flag: "🇨🇳" },
  { code: "es", label: "Español", flag: "🇪🇸" },
  { code: "ja", label: "日本語", flag: "🇯🇵" },
  { code: "ko", label: "한국어", flag: "🇰🇷" },
  { code: "ru", label: "Русский", flag: "🇷🇺" },
];

export const TRANSLATIONS: Record<Lang, Record<string, string>> = {
  en: {
    // Announcement Bar
    announcement_alert: "🚨 LIVE INVESTIGATION: Tracking $6.3B Binance EIP-7702 Breach & Onchain Movements",
    announcement_support: "Support independent security tracking:",
    copy_eth: "Copy ETH",
    copy_sol: "Copy SOL",
    copied: "Copied to clipboard!",
    eth_label: "ETH",
    sol_label: "SOL",

    // Header & Nav
    nav_sections: "Sections",
    nav_live: "Live",
    nav_fasttx: "Fast Tx (677)",
    nav_flow: "Etherscan Flow",
    nav_arkham: "Arkham Entity",
    nav_exploit: "Exploit Contract",
    nav_tokens: "Tokens",
    nav_pressure: "Pressure",
    nav_sales: "Sales",
    nav_trail: "Trail",
    nav_timeline: "Timeline",
    nav_chat: "Chat",
    detailed: "Detailed",
    simple: "Simple",
    theme_dark: "Dark",
    theme_light: "Light",
    theme_toggle: "Theme",
    watching_live: "watching live",
    real_time_streaming: "REAL-TIME STREAMING",
    share_x: "Share on X",
    repost_x: "Repost on X",
    copy_link: "Copy link",
    how_to_read: "How to read this",

    // KPIs
    kpi_total_hack: "Total hack, all chains",
    kpi_stolen_eth: "Stolen on Ethereum",
    kpi_still_held: "Still held",
    kpi_sold_so_far: "Sold so far",
    kpi_eth_held: "ETH held",
    kpi_last_sale: "Last sale",
    kpi_binance_rep: "at live Binance prices, plus 18,270 BTC below",

    // Footer & Support
    support_work_title: "Support HackWatch Independent Onchain Research",
    support_work_desc: "We run continuous mempool listeners, decompilation analysis, and real-time transaction tracers tracking the largest hack in history 24/7. No VC, no ads. Community supported.",
    support_eth_card: "Ethereum (ERC-20 / ETH)",
    support_sol_card: "Solana (SOL / SPL)",
    footer_source: "Source: public onchain records · prices: Binance spot markets. Every row links to Etherscan or mempool.space for independent verification.",
  },

  zh: {
    // Announcement Bar
    announcement_alert: "🚨 实时追踪：币安 63 亿美元 EIP-7702 漏洞及黑客链上资产异动",
    announcement_support: "支持独立链上安全研究：",
    copy_eth: "复制 ETH",
    copy_sol: "复制 SOL",
    copied: "已复制到剪贴板！",
    eth_label: "ETH",
    sol_label: "SOL",

    // Header & Nav
    nav_sections: "导航目录",
    nav_live: "实时监控",
    nav_fasttx: "快转 & 677 钱包",
    nav_flow: "Etherscan 资金流向",
    nav_arkham: "Arkham 实体档案",
    nav_exploit: "漏洞合约 (#code)",
    nav_tokens: "被盗代币",
    nav_pressure: "抛压分析",
    nav_sales: "链上抛售",
    nav_trail: "资金流向",
    nav_timeline: "攻击时间线",
    nav_chat: "分析社群",
    detailed: "详细模式",
    simple: "精简模式",
    theme_dark: "深色",
    theme_light: "浅色",
    theme_toggle: "外观模式",
    watching_live: "人正在实时围观",
    real_time_streaming: "实时毫秒级流",
    share_x: "分享到 X",
    repost_x: "转发到 X",
    copy_link: "复制链接",
    how_to_read: "如何解读本数据",

    // KPIs
    kpi_total_hack: "全链被盗总金额",
    kpi_stolen_eth: "以太坊链上被盗",
    kpi_still_held: "黑客当前持有",
    kpi_sold_so_far: "已完成变现抛售",
    kpi_eth_held: "持有 ETH 现值",
    kpi_last_sale: "最新一笔抛售",
    kpi_binance_rep: "币安实时现货计价，另有 18,270 枚 BTC",

    // Footer & Support
    support_work_title: "赞助支持 HackWatch 独立链上安全研究",
    support_work_desc: "我们全天候 24/7 运行 mempool 监听节点、反编译引擎与资产流向追踪工具，全程无风投、无广告，完全由社区赞助支持。",
    support_eth_card: "以太坊地址 (ETH / ERC-20)",
    support_sol_card: "Solana 地址 (SOL / SPL)",
    footer_source: "数据来源：以太坊公链实时账本 · 价格来源：币安现货。每条交易均直链 Etherscan，支持链上逐笔核查。",
  },

  es: {
    // Announcement Bar
    announcement_alert: "🚨 INVESTIGACIÓN EN VIVO: Rastreando $6.3B del exploit EIP-7702 de Binance",
    announcement_support: "Apoye la investigación de seguridad onchain:",
    copy_eth: "Copiar ETH",
    copy_sol: "Copiar SOL",
    copied: "¡Copiado al portapapeles!",
    eth_label: "ETH",
    sol_label: "SOL",

    // Header & Nav
    nav_sections: "Secciones",
    nav_live: "En vivo",
    nav_fasttx: "Transacciones Rápidas (677)",
    nav_flow: "Flujo Etherscan",
    nav_arkham: "Entidad Arkham",
    nav_exploit: "Contrato del Exploit",
    nav_tokens: "Tokens",
    nav_pressure: "Presión",
    nav_sales: "Ventas",
    nav_trail: "Rastreo",
    nav_timeline: "Cronología",
    nav_chat: "Chat",
    detailed: "Detallado",
    simple: "Simple",
    theme_dark: "Oscuro",
    theme_light: "Claro",
    theme_toggle: "Tema",
    watching_live: "mirando en vivo",
    real_time_streaming: "TRANSMISIÓN EN TIEMPO REAL",
    share_x: "Compartir en X",
    repost_x: "Republicar en X",
    copy_link: "Copiar enlace",
    how_to_read: "Cómo leer esto",

    // KPIs
    kpi_total_hack: "Robo total, todas las cadenas",
    kpi_stolen_eth: "Robado en Ethereum",
    kpi_still_held: "Aún en billeteras",
    kpi_sold_so_far: "Vendido hasta ahora",
    kpi_eth_held: "ETH en posesión",
    kpi_last_sale: "Última venta",
    kpi_binance_rep: "a precios spot de Binance, más 18,270 BTC",

    // Footer & Support
    support_work_title: "Apoya la Investigación Independiente de HackWatch",
    support_work_desc: "Monitoreamos mempool, descompilamos contratos y rastreamos movimientos onchain 24/7 sin publicidad ni fondos de riesgo. Apoyado por la comunidad.",
    support_eth_card: "Ethereum (ERC-20 / ETH)",
    support_sol_card: "Solana (SOL / SPL)",
    footer_source: "Fuente: registros públicos onchain · precios: Binance spot. Cada fila enlaza a Etherscan o mempool.space.",
  },

  ja: {
    // Announcement Bar
    announcement_alert: "🚨 リアルタイム速報: Binance 63億ドル EIP-7702 エクスプロイト追跡中",
    announcement_support: "独立したオンチェーン調査を支援:",
    copy_eth: "ETHをコピー",
    copy_sol: "SOLをコピー",
    copied: "クリップボードにコピーしました！",
    eth_label: "ETH",
    sol_label: "SOL",

    // Header & Nav
    nav_sections: "セクション",
    nav_live: "ライブ監視",
    nav_fasttx: "高速送金 (677)",
    nav_flow: "Etherscan フロー",
    nav_arkham: "Arkham エンティティ",
    nav_exploit: "エクスプロイト契約 (#code)",
    nav_tokens: "盗難トークン",
    nav_pressure: "売り圧力",
    nav_sales: "売却履歴",
    nav_trail: "資金追跡",
    nav_timeline: "タイムライン",
    nav_chat: "チャット",
    detailed: "詳細",
    simple: "シンプル",
    theme_dark: "ダーク",
    theme_light: "ライト",
    theme_toggle: "テーマ",
    watching_live: "人が閲覧中",
    real_time_streaming: "リアルタイム配信中",
    share_x: "Xでシェア",
    repost_x: "Xでリポスト",
    copy_link: "リンクをコピー",
    how_to_read: "データの見方",

    // KPIs
    kpi_total_hack: "全チェーン被害総額",
    kpi_stolen_eth: "Ethereumでの被害額",
    kpi_still_held: "未換金保有額",
    kpi_sold_so_far: "DEX売却済み",
    kpi_eth_held: "保有ETH価値",
    kpi_last_sale: "直近の売却",
    kpi_binance_rep: "Binance現物価格ベース、別途 18,270 BTC",

    // Footer & Support
    support_work_title: "HackWatch オンチェーンセキュリティ調査を支援",
    support_work_desc: "24時間365日、mempoolの監視、スマートコントラクトの逆コンパイル、資金流出をリアルタイムで追跡しています。広告なし、コミュニティ支援で運営。",
    support_eth_card: "Ethereum アドレス (ETH / ERC-20)",
    support_sol_card: "Solana アドレス (SOL / SPL)",
    footer_source: "情報源: パブリックオンチェーンデータ · 価格: Binanceスポット。全取引行はEtherscanへリンクされています。",
  },

  ko: {
    // Announcement Bar
    announcement_alert: "🚨 실시간 조사: 바이낸스 63억 달러 EIP-7702 해킹 온체인 자금 추적",
    announcement_support: "독립 보안 연구 지원:",
    copy_eth: "ETH 복사",
    copy_sol: "SOL 복사",
    copied: "클립보드에 복사되었습니다!",
    eth_label: "ETH",
    sol_label: "SOL",

    // Header & Nav
    nav_sections: "메뉴",
    nav_live: "실시간 감시",
    nav_fasttx: "실시간 전송 (677)",
    nav_flow: "Etherscan 흐름",
    nav_arkham: "Arkham 엔티티",
    nav_exploit: "익스플로잇 컨트랙트",
    nav_tokens: "도난 토큰",
    nav_pressure: "매도 압력",
    nav_sales: "매도 기록",
    nav_trail: "자금 흐름",
    nav_timeline: "타임라인",
    nav_chat: "채팅",
    detailed: "상세보기",
    simple: "간단히",
    theme_dark: "다크",
    theme_light: "라이트",
    theme_toggle: "테마",
    watching_live: "명 실시간 시청 중",
    real_time_streaming: "실시간 스트리밍",
    share_x: "X에 공유",
    repost_x: "X에 리포스트",
    copy_link: "링크 복사",
    how_to_read: "데이터 보는 법",

    // KPIs
    kpi_total_hack: "전체 체인 총 해킹액",
    kpi_stolen_eth: "이더리움 도난액",
    kpi_still_held: "현재 보유 잔액",
    kpi_sold_so_far: "현재까지 매도액",
    kpi_eth_held: "보유 ETH 가치",
    kpi_last_sale: "최근 매도",
    kpi_binance_rep: "바이낸스 실시간 시세 반영 (BTC 18,270개 별도)",

    // Footer & Support
    support_work_title: "HackWatch 온체인 리서치 후원",
    support_work_desc: "역대 최대 규모의 해킹 자금 이동을 24시간 실시간 멤풀 감시 및 역컴파일 분석을 통해 추적하고 있습니다. 광고 없는 커뮤니티 후원 프로젝트입니다.",
    support_eth_card: "이더리움 지갑 (ETH / ERC-20)",
    support_sol_card: "솔라나 지갑 (SOL / SPL)",
    footer_source: "출처: 퍼블릭 온체인 데이터 · 가격: 바이낸스 현물 시장. 모든 항목은 Etherscan 검증 링크를 제공합니다.",
  },

  ru: {
    // Announcement Bar
    announcement_alert: "🚨 РАССЛЕДОВАНИЕ: Отслеживание эксплойта Binance EIP-7702 на $6.3B",
    announcement_support: "Поддержать независимое ончейн-исследование:",
    copy_eth: "Копировать ETH",
    copy_sol: "Копировать SOL",
    copied: "Скопировано в буфер!",
    eth_label: "ETH",
    sol_label: "SOL",

    // Header & Nav
    nav_sections: "Разделы",
    nav_live: "Прямой эфир",
    nav_fasttx: "Быстрые переводы (677)",
    nav_flow: "Поток Etherscan",
    nav_arkham: "Профиль Arkham",
    nav_exploit: "Контракт эксплойта",
    nav_tokens: "Токены",
    nav_pressure: "Давление",
    nav_sales: "Продажи",
    nav_trail: "След",
    nav_timeline: "Хронология",
    nav_chat: "Чат",
    detailed: "Подробный",
    simple: "Простой",
    theme_dark: "Тёмная",
    theme_light: "Светлая",
    theme_toggle: "Тема",
    watching_live: "смотрят прямо сейчас",
    real_time_streaming: "ПРЯМОЙ ЭФИР В РЕАЛЬНОМ ВРЕМЕНИ",
    share_x: "Поделиться в X",
    repost_x: "Репост в X",
    copy_link: "Копировать ссылку",
    how_to_read: "Как читать данные",

    // KPIs
    kpi_total_hack: "Всего украдено (все сети)",
    kpi_stolen_eth: "Украдено на Ethereum",
    kpi_still_held: "В кошельках хакера",
    kpi_sold_so_far: "Продано через DEX",
    kpi_eth_held: "Баланс в ETH",
    kpi_last_sale: "Последняя продажа",
    kpi_binance_rep: "по спотовым ценам Binance, плюс 18,270 BTC",

    // Footer & Support
    support_work_title: "Поддержать независимый проект HackWatch",
    support_work_desc: "Мы круглосуточно отслеживаем мемпул, декомпилируем контракты и мониторим вывод средств крупнейшего взлома в истории. Без венчуров и рекламы.",
    support_eth_card: "Ethereum (ERC-20 / ETH)",
    support_sol_card: "Solana (SOL / SPL)",
    footer_source: "Источник: публичные ончейн-записи · котировки: Binance. Каждая транзакция проверяема на Etherscan.",
  },
};

export const SUPPORT_WALLETS = {
  eth: "0x24fe2677F951493eE42550Aa05c55c713de5c556",
  sol: "j97dcwBGKVgUPAtkegjviNaBB27SPz4Thbtsgg83Djq",
};

const LANG_KEY = "hackwatch.lang";

type I18nContextType = {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: string, fallback?: string) => string;
};

const I18nContext = createContext<I18nContextType>({
  lang: "en",
  setLang: () => {},
  t: (k, fb) => fb || k,
});

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => {
    const saved = localStorage.getItem(LANG_KEY) as Lang;
    return saved && TRANSLATIONS[saved] ? saved : "en";
  });

  const setLang = (next: Lang) => {
    setLangState(next);
    localStorage.setItem(LANG_KEY, next);
  };

  const t = (key: string, fallback?: string): string => {
    return TRANSLATIONS[lang]?.[key] || TRANSLATIONS.en[key] || fallback || key;
  };

  return createElement(
    I18nContext.Provider,
    { value: { lang, setLang, t } },
    children
  );
}

export function useI18n() {
  return useContext(I18nContext);
}
