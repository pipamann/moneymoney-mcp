import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { escapeAppleScript, runMoneyMoneyCommand } from "../applescript.js";
import { formatDate, parsePlist } from "../plist.js";

interface RawTransaction {
  id?: number;
  accountNumber?: string;
  accountUuid?: string;
  amount?: number;
  bankCode?: string;
  booked?: boolean;
  bookingDate?: string | Date;
  bookingText?: string;
  categoryUuid?: string;
  checkmark?: boolean;
  currency?: string;
  endToEndReference?: string;
  name?: string;
  purpose?: string;
  valueDate?: string | Date;
}

interface RawTransactionExport {
  creator?: string;
  transactions?: RawTransaction[];
}

export interface Transaction {
  id: number | undefined;
  date: string | undefined;
  valueDate: string | undefined;
  name: string;
  amount: number;
  currency: string | undefined;
  purpose: string | undefined;
  bookingText: string | undefined;
  categoryUuid: string | undefined;
  accountUuid: string | undefined;
  checkmark: boolean;
  booked: boolean;
}

export interface TransactionsResult {
  transactions: Transaction[];
  totalCount: number;
  returned: number;
  truncated: boolean;
}

export interface ToFileResult {
  filePath: string;
  totalCount: number;
  account: string | undefined;
  fromDate: string | undefined;
  toDate: string | undefined;
}

async function fetchRawTransactions(params: {
  account?: string;
  category?: string;
  fromDate?: string;
  toDate?: string;
}): Promise<RawTransaction[]> {
  const parts: string[] = ["export transactions"];

  if (params.account) {
    parts.push(`from account "${escapeAppleScript(params.account)}"`);
  }
  if (params.category) {
    parts.push(`from category "${escapeAppleScript(params.category)}"`);
  }

  // MoneyMoney requires date parameters when account/category filters are used
  const fromDate = params.fromDate ?? "2000-01-01";
  const toDate = params.toDate ?? new Date().toISOString().split("T")[0];
  parts.push(`from date "${escapeAppleScript(fromDate)}"`);
  parts.push(`to date "${escapeAppleScript(toDate)}"`);

  parts.push('as "plist"');

  const xml = await runMoneyMoneyCommand(parts.join(" "));
  const data = parsePlist(xml) as RawTransactionExport;

  return Array.isArray(data?.transactions) ? data.transactions : [];
}

function mapTransaction(t: RawTransaction): Transaction {
  return {
    id: t.id,
    date: formatDate(t.bookingDate),
    valueDate: formatDate(t.valueDate),
    name: t.name ?? "",
    amount: t.amount ?? 0,
    currency: t.currency,
    purpose: t.purpose,
    bookingText: t.bookingText,
    categoryUuid: t.categoryUuid,
    accountUuid: t.accountUuid,
    checkmark: t.checkmark ?? false,
    booked: t.booked ?? true,
  };
}

export async function exportTransactions(params: {
  account?: string;
  category?: string;
  fromDate?: string;
  toDate?: string;
  limit?: number;
  toFile?: boolean;
}): Promise<TransactionsResult | ToFileResult> {
  const raw = await fetchRawTransactions(params);

  if (params.toFile) {
    const transactions = raw.map(mapTransaction);
    const filePath = join(tmpdir(), `moneymoney-export-${Date.now()}.json`);
    await writeFile(filePath, JSON.stringify(transactions, null, 2));
    return {
      filePath,
      totalCount: transactions.length,
      account: params.account,
      fromDate: params.fromDate,
      toDate: params.toDate,
    };
  }

  const limit = params.limit ?? 200;
  const totalCount = raw.length;
  const truncated = totalCount > limit;
  const sliced = truncated ? raw.slice(0, limit) : raw;
  const transactions = sliced.map(mapTransaction);

  return {
    transactions,
    totalCount,
    returned: transactions.length,
    truncated,
  };
}

export interface SearchResult {
  transactions: Transaction[];
  totalScanned: number;
  matchCount: number;
}

export async function searchTransactions(params: {
  account?: string;
  category?: string;
  fromDate?: string;
  toDate?: string;
  search?: string;
  amountMin?: number;
  amountMax?: number;
}): Promise<SearchResult> {
  const raw = await fetchRawTransactions(params);
  const searchLower = params.search?.toLowerCase();

  const matched = raw.filter((t) => {
    if (searchLower) {
      const haystack = [
        t.name,
        t.purpose,
        t.bookingText,
        t.accountNumber,
        t.endToEndReference,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      if (!haystack.includes(searchLower)) return false;
    }

    const amount = t.amount ?? 0;
    const absAmount = Math.abs(amount);
    if (params.amountMin !== undefined && absAmount < params.amountMin) return false;
    if (params.amountMax !== undefined && absAmount > params.amountMax) return false;

    return true;
  });

  return {
    transactions: matched.map(mapTransaction),
    totalScanned: raw.length,
    matchCount: matched.length,
  };
}
