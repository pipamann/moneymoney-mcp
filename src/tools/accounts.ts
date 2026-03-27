import { runMoneyMoneyCommand } from "../applescript.js";
import { maskSensitive, parsePlist } from "../plist.js";

interface RawAccount {
  name?: string;
  accountNumber?: string; // Actually contains IBAN
  bankCode?: string; // Actually contains BIC
  currency?: string;
  balance?: unknown[][]; // [[amount, currency]]
  portfolio?: boolean;
  uuid?: string;
  group?: boolean;
  owner?: string;
  type?: number;
}

export interface Account {
  name: string;
  iban: string | undefined;
  bic: string | undefined;
  balance: number | undefined;
  currency: string | undefined;
  portfolio: boolean;
  owner: string | undefined;
  uuid: string | undefined;
}

export async function exportAccounts(
  includeSensitive: boolean,
): Promise<Account[]> {
  const xml = await runMoneyMoneyCommand("export accounts");
  const raw = parsePlist(xml) as RawAccount[];

  if (!Array.isArray(raw)) return [];

  return raw
    .filter((a) => !a.group)
    .map((a) => {
      // balance is [[amount, currency]] — extract first entry
      const balanceEntry = Array.isArray(a.balance) && Array.isArray(a.balance[0])
        ? a.balance[0]
        : undefined;
      const balanceAmount = balanceEntry && typeof balanceEntry[0] === "number"
        ? balanceEntry[0]
        : undefined;

      return {
        name: a.name ?? "Unknown",
        iban: includeSensitive ? a.accountNumber : maskSensitive(a.accountNumber),
        bic: a.bankCode,
        balance: balanceAmount,
        currency: a.currency,
        portfolio: a.portfolio ?? false,
        owner: a.owner,
        uuid: a.uuid,
      };
    });
}
