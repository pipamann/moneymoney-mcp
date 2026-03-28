import { escapeAppleScript, runAppleScript } from "../applescript.js";

export interface BankTransferParams {
  fromAccount?: string;
  recipientName?: string;
  iban?: string;
  bic?: string;
  amount?: number;
  purpose?: string;
  endToEndReference?: string;
  purposeCode?: string;
  instant?: boolean;
  scheduledDate?: string;
}

/**
 * Build and run a `create bank transfer` AppleScript command.
 * Always opens a pre-filled transfer window for the user to review and confirm.
 * Never sends to outbox automatically.
 */
export async function createBankTransfer(params: BankTransferParams): Promise<string> {
  if (params.instant && params.scheduledDate) {
    throw new Error("Cannot combine instant transfer with a scheduled date.");
  }
  if (params.amount !== undefined && (!Number.isFinite(params.amount) || params.amount <= 0)) {
    throw new Error("Amount must be a positive finite number.");
  }

  const parts: string[] = ["create bank transfer"];

  if (params.fromAccount) {
    parts.push(`from account "${escapeAppleScript(params.fromAccount)}"`);
  }
  if (params.recipientName) {
    parts.push(`to "${escapeAppleScript(params.recipientName)}"`);
  }
  if (params.iban) {
    parts.push(`iban "${escapeAppleScript(params.iban)}"`);
  }
  if (params.bic) {
    parts.push(`bic "${escapeAppleScript(params.bic)}"`);
  }
  if (params.amount !== undefined) {
    parts.push(`amount ${params.amount}`);
  }
  if (params.purpose) {
    parts.push(`purpose "${escapeAppleScript(params.purpose)}"`);
  }
  if (params.endToEndReference) {
    parts.push(`endtoend reference "${escapeAppleScript(params.endToEndReference)}"`);
  }
  if (params.purposeCode) {
    parts.push(`purpose code "${escapeAppleScript(params.purposeCode)}"`);
  }
  if (params.instant) {
    parts.push(`instrument code "INST"`);
  }
  if (params.scheduledDate) {
    parts.push(`scheduled date "${escapeAppleScript(params.scheduledDate)}"`);
  }

  const script = `tell application "MoneyMoney" to ${parts.join(" ")}`;
  await runAppleScript(script);
  return "Transfer window opened in MoneyMoney. Please review and confirm.";
}
