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
  if (params.fromDate) {
    parts.push(`from date "${escapeAppleScript(params.fromDate)}"`);
  }
  if (params.toDate) {
    parts.push(`to date "${escapeAppleScript(params.toDate)}"`);
  }
  parts.push('as "plist"');

  const xml = await runMoneyMoneyCommand(parts.join(" "));
  const data = parsePlist(xml) as RawTransactionExport;

  return Array.isArray(data?.transactions) ? data.transactions : [];
}

export async function exportTransactions(params: {
  account?: string;
  category?: string;
  fromDate?: string;
  toDate?: string;
  limit?: number;
}): Promise<TransactionsResult> {
  const limit = params.limit ?? 200;

  const raw = await fetchRawTransactions(params);

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
