#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import * as z from "zod/v4";
import { MoneyMoneyError } from "./errors.js";
import { exportAccounts } from "./tools/accounts.js";
import { exportCategories } from "./tools/categories.js";
import { exportTransactions, searchTransactions } from "./tools/transactions.js";
import { exportPortfolio } from "./tools/portfolio.js";
import { createBankTransfer } from "./tools/transfer.js";

/** Validate YYYY-MM-DD is a real date */
function isValidDate(s: string): boolean {
  const [y, m, d] = s.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d;
}

const server = new McpServer({
  name: "moneymoney-mcp",
  version: "0.3.0",
});

// --- export_accounts ---
server.registerTool(
  "export_accounts",
  {
    title: "Export Accounts",
    description:
      "Returns all accounts from MoneyMoney with name, type, balance, and currency. IBANs and account numbers are masked by default.",
    inputSchema: z.object({
      includeSensitive: z
        .boolean()
        .optional()
        .default(false)
        .describe(
          "Include full IBANs and account numbers (default: masked)",
        ),
    }),
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      openWorldHint: false,
    },
  },
  async ({ includeSensitive }) => {
    try {
      const accounts = await exportAccounts(includeSensitive);
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({ accounts }, null, 2),
          },
        ],
      };
    } catch (e) {
      return errorResult(e);
    }
  },
);

// --- export_categories ---
server.registerTool(
  "export_categories",
  {
    title: "Export Categories",
    description:
      "Returns all transaction categories from MoneyMoney as a hierarchical tree.",
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      openWorldHint: false,
    },
  },
  async () => {
    try {
      const categories = await exportCategories();
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({ categories }, null, 2),
          },
        ],
      };
    } catch (e) {
      return errorResult(e);
    }
  },
);

// --- export_transactions ---
server.registerTool(
  "export_transactions",
  {
    title: "Export Transactions",
    description:
      "Returns transactions from MoneyMoney. Default limit is 200 — use search_transactions for targeted lookups in high-volume accounts. Set toFile=true to dump all transactions to a temp file (returns file path only — use Grep/Read to search it).",
    inputSchema: z.object({
      account: z
        .string()
        .optional()
        .describe(
          "Filter by account: UUID, IBAN, account number, name, or group name",
        ),
      category: z
        .string()
        .optional()
        .describe(
          "Filter by category: UUID, name, or group. Nested names separated with backslash",
        ),
      fromDate: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/)
        .refine((s) => isValidDate(s), "Invalid date")
        .optional()
        .describe("Start date (YYYY-MM-DD)"),
      toDate: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/)
        .refine((s) => isValidDate(s), "Invalid date")
        .optional()
        .describe("End date (YYYY-MM-DD)"),
      limit: z
        .number()
        .int()
        .min(1)
        .optional()
        .default(200)
        .describe("Max transactions to return (default: 200). Ignored when toFile=true."),
      toFile: z
        .boolean()
        .optional()
        .default(false)
        .describe(
          "Write ALL transactions to a temp JSON file instead of returning them inline. Returns only the file path and summary. Use Grep/Read to search the file. Local-only feature.",
        ),
    }),
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      openWorldHint: false,
    },
  },
  async ({ account, category, fromDate, toDate, limit, toFile }) => {
    try {
      const result = await exportTransactions({
        account,
        category,
        fromDate,
        toDate,
        limit,
        toFile,
      });
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    } catch (e) {
      return errorResult(e);
    }
  },
);

// --- search_transactions ---
server.registerTool(
  "search_transactions",
  {
    title: "Search Transactions",
    description:
      "Search across ALL transactions in MoneyMoney by text and/or amount. Use this to find specific payments, verify invoices were paid, or locate transactions by recipient name. At least one search filter (search, amountMin, or amountMax) is required. Combine with account/date filters to narrow scope.",
    inputSchema: z.object({
      account: z
        .string()
        .optional()
        .describe(
          "Filter by account: UUID, IBAN, account number, name, or group name",
        ),
      category: z
        .string()
        .optional()
        .describe(
          "Filter by category: UUID, name, or group. Nested names separated with backslash",
        ),
      fromDate: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/)
        .refine((s) => isValidDate(s), "Invalid date")
        .optional()
        .describe("Start date (YYYY-MM-DD)"),
      toDate: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/)
        .refine((s) => isValidDate(s), "Invalid date")
        .optional()
        .describe("End date (YYYY-MM-DD)"),
      search: z
        .string()
        .min(2)
        .optional()
        .describe(
          "Case-insensitive text search across transaction name, purpose, booking text, account number, and end-to-end reference",
        ),
      amountMin: z
        .number()
        .nonnegative()
        .optional()
        .describe(
          "Minimum absolute amount (matches both debits and credits)",
        ),
      amountMax: z
        .number()
        .nonnegative()
        .optional()
        .describe(
          "Maximum absolute amount (matches both debits and credits)",
        ),
    }),
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      openWorldHint: false,
    },
  },
  async ({ account, category, fromDate, toDate, search, amountMin, amountMax }) => {
    if (!search && amountMin === undefined && amountMax === undefined) {
      return {
        content: [
          {
            type: "text" as const,
            text: "At least one search filter is required: search, amountMin, or amountMax. Use export_transactions for unfiltered browsing.",
          },
        ],
        isError: true,
      };
    }
    try {
      const result = await searchTransactions({
        account,
        category,
        fromDate,
        toDate,
        search,
        amountMin,
        amountMax,
      });
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    } catch (e) {
      return errorResult(e);
    }
  },
);

// --- export_portfolio ---
server.registerTool(
  "export_portfolio",
  {
    title: "Export Portfolio",
    description:
      "Returns securities and investment portfolio data from MoneyMoney.",
    inputSchema: z.object({
      account: z
        .string()
        .optional()
        .describe(
          "Filter by account: UUID, IBAN, account number, name, or group name",
        ),
      assetClass: z
        .string()
        .optional()
        .describe("Filter by asset class: UUID or name"),
    }),
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      openWorldHint: false,
    },
  },
  async ({ account, assetClass }) => {
    try {
      const positions = await exportPortfolio({ account, assetClass });
      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({ positions }, null, 2),
          },
        ],
      };
    } catch (e) {
      return errorResult(e);
    }
  },
);

// --- create_bank_transfer ---
server.registerTool(
  "create_bank_transfer",
  {
    title: "Create Bank Transfer",
    description:
      "Opens a pre-filled bank transfer window in MoneyMoney for the user to review and confirm. The transfer is NOT sent automatically — the user must approve it in MoneyMoney (including TAN confirmation).",
    inputSchema: z.object({
      fromAccount: z
        .string()
        .trim()
        .min(1)
        .optional()
        .describe(
          "Source account: UUID, IBAN, account number, or name",
        ),
      recipientName: z
        .string()
        .trim()
        .min(1)
        .optional()
        .describe("Recipient name"),
      iban: z
        .string()
        .trim()
        .min(1)
        .optional()
        .describe("Recipient IBAN"),
      bic: z
        .string()
        .trim()
        .min(1)
        .optional()
        .describe("Recipient BIC (usually auto-detected from IBAN)"),
      amount: z
        .number()
        .positive()
        .finite()
        .optional()
        .describe("Transfer amount in EUR"),
      purpose: z
        .string()
        .trim()
        .min(1)
        .optional()
        .describe("Payment purpose / remittance text"),
      endToEndReference: z
        .string()
        .trim()
        .min(1)
        .optional()
        .describe("SEPA end-to-end reference"),
      purposeCode: z
        .string()
        .trim()
        .min(1)
        .optional()
        .describe("SEPA purpose code"),
      instant: z
        .boolean()
        .optional()
        .default(false)
        .describe("Use instant transfer (Echtzeitüberweisung)"),
      scheduledDate: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/)
        .refine((s) => isValidDate(s), "Invalid date")
        .optional()
        .describe("Scheduled date for future transfer (YYYY-MM-DD)"),
    }),
    annotations: {
      readOnlyHint: false,
      destructiveHint: true,
      openWorldHint: false,
    },
  },
  async (params) => {
    try {
      const message = await createBankTransfer(params);
      return {
        content: [{ type: "text" as const, text: message }],
      };
    } catch (e) {
      return errorResult(e);
    }
  },
);

// --- Error helper ---
function errorResult(e: unknown) {
  const code = e instanceof MoneyMoneyError ? e.code : "UNKNOWN";
  const message =
    e instanceof Error ? e.message : "Unknown error";
  return {
    content: [{ type: "text" as const, text: `[${code}] ${message}` }],
    isError: true,
  };
}

// --- Start server ---
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("MoneyMoney MCP server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
