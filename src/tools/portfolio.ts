import { escapeAppleScript, runMoneyMoneyCommand } from "../applescript.js";
import { formatDate, parsePlist } from "../plist.js";

interface RawPosition {
  name?: string;
  isin?: string;
  wkn?: string;
  quantity?: number;
  amount?: number;
  currency?: string;
  price?: number;
  priceCurrency?: string;
  purchasePrice?: number;
  exchangeRate?: number;
  tradeTimestamp?: string;
  market?: string;
  uuid?: string;
}

export interface PortfolioPosition {
  name: string;
  isin: string | undefined;
  wkn: string | undefined;
  quantity: number | undefined;
  marketValue: number | undefined;
  currency: string | undefined;
  price: number | undefined;
  priceCurrency: string | undefined;
  purchasePrice: number | undefined;
  tradeDate: string | undefined;
  market: string | undefined;
}

export async function exportPortfolio(params: {
  account?: string;
  assetClass?: string;
}): Promise<PortfolioPosition[]> {
  const parts: string[] = ['export portfolio'];

  if (params.account) {
    parts.push(`from account "${escapeAppleScript(params.account)}"`);
  }
  if (params.assetClass) {
    parts.push(`from asset class "${escapeAppleScript(params.assetClass)}"`);
  }
  parts.push('as "plist"');

  const xml = await runMoneyMoneyCommand(parts.join(" "));
  const raw = parsePlist(xml) as RawPosition[];

  if (!Array.isArray(raw)) return [];

  return raw.map((p) => ({
    name: p.name ?? "Unknown",
    isin: p.isin,
    wkn: p.wkn,
    quantity: p.quantity,
    marketValue: p.amount,
    currency: p.currency,
    price: p.price,
    priceCurrency: p.priceCurrency,
    purchasePrice: p.purchasePrice,
    tradeDate: formatDate(p.tradeTimestamp),
    market: p.market,
  }));
}
