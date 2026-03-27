#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import * as z from "zod/v4";
import { MoneyMoneyError } from "./errors.js";
import { exportAccounts } from "./tools/accounts.js";
import { exportCategories } from "./tools/categories.js";
import { exportTransactions } from "./tools/transactions.js";
import { exportPortfolio } from "./tools/portfolio.js";

/** Validate YYYY-MM-DD is a real date */
function isValidDate(s: string): boolean {
  const [y, m, d] = s.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d;
}

const server = new McpServer({
  name: "moneymoney-mcp",
  version: "0.1.0",
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
      "Returns transactions from MoneyMoney with optional filters for account, category, and date range. Results are limited to 500 by default; use fromDate/toDate to narrow the window.",
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
        .max(5000)
        .optional()
        .default(500)
        .describe("Max transactions to return (default: 500, max: 5000)"),
    }),
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      openWorldHint: false,
    },
  },
  async ({ account, category, fromDate, toDate, limit }) => {
    try {
      const result = await exportTransactions({
        account,
        category,
        fromDate,
        toDate,
        limit,
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
