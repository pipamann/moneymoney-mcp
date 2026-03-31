import { execFile } from "node:child_process";
import {
  AppNotRunningError,
  AppleScriptError,
  AutomationDeniedError,
  DatabaseLockedError,
  MoneyMoneyError,
  ResultTooLargeError,
} from "./errors.js";

const TIMEOUT_MS = 30_000;

/**
 * Escape a string for safe interpolation into AppleScript source.
 * Handles backslashes and double quotes.
 */
export function escapeAppleScript(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

/**
 * Classify stderr/exit code into typed errors.
 */
function classifyError(stderr: string): MoneyMoneyError {
  const lower = stderr.toLowerCase();
  if (lower.includes("locked") || lower.includes("error -2")) {
    return new DatabaseLockedError();
  }
  if (
    lower.includes("not running") ||
    lower.includes("connection is invalid") ||
    lower.includes("application isn't running")
  ) {
    return new AppNotRunningError();
  }
  if (lower.includes("not allowed") || lower.includes("not permitted")) {
    return new AutomationDeniedError();
  }
  if (lower.includes("maxbuffer length exceeded") || lower.includes("maxbuffer")) {
    return new ResultTooLargeError();
  }
  return new AppleScriptError(stderr.trim() || "Unknown AppleScript error");
}

/**
 * Simple serialization queue. Ensures only one osascript call runs at a time
 * to avoid MoneyMoney locking issues.
 */
let queue: Promise<unknown> = Promise.resolve();

function enqueue<T>(fn: () => Promise<T>): Promise<T> {
  const task = queue.then(fn, fn);
  queue = task.then(
    () => {},
    () => {},
  );
  return task;
}

/**
 * Execute an AppleScript via osascript and return stdout.
 * Calls are serialized to prevent concurrent access to MoneyMoney.
 */
export function runAppleScript(script: string): Promise<string> {
  return enqueue(
    () =>
      new Promise<string>((resolve, reject) => {
        execFile(
          "/usr/bin/osascript",
          ["-e", script],
          { timeout: TIMEOUT_MS, maxBuffer: 50 * 1024 * 1024 },
          (error, stdout, stderr) => {
            if (error) {
              reject(classifyError(stderr || error.message));
              return;
            }
            resolve(stdout);
          },
        );
      }),
  );
}

/**
 * Run a MoneyMoney AppleScript command. Wraps the command in a `tell` block.
 */
export function runMoneyMoneyCommand(command: string): Promise<string> {
  const script = `tell application "MoneyMoney" to ${command}`;
  return runAppleScript(script);
}
