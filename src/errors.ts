export class MoneyMoneyError extends Error {
  constructor(
    message: string,
    public readonly code: string,
  ) {
    super(message);
    this.name = "MoneyMoneyError";
  }
}

export class DatabaseLockedError extends MoneyMoneyError {
  constructor() {
    super(
      "MoneyMoney is locked. Please unlock it first.",
      "DATABASE_LOCKED",
    );
    this.name = "DatabaseLockedError";
  }
}

export class AppNotRunningError extends MoneyMoneyError {
  constructor() {
    super(
      "MoneyMoney is not running. Please start it first.",
      "APP_NOT_RUNNING",
    );
    this.name = "AppNotRunningError";
  }
}

export class AutomationDeniedError extends MoneyMoneyError {
  constructor() {
    super(
      "Automation permission denied. Please allow access in System Settings > Privacy & Security > Automation.",
      "AUTOMATION_DENIED",
    );
    this.name = "AutomationDeniedError";
  }
}

export class AppleScriptError extends MoneyMoneyError {
  constructor(message: string) {
    super(message, "APPLESCRIPT_ERROR");
    this.name = "AppleScriptError";
  }
}

export class ResultTooLargeError extends MoneyMoneyError {
  constructor() {
    super(
      "Result too large — the query returned more data than the buffer can hold. Narrow the date range with fromDate/toDate or filter by a specific account.",
      "RESULT_TOO_LARGE",
    );
    this.name = "ResultTooLargeError";
  }
}

export class PlistParseError extends MoneyMoneyError {
  constructor(detail?: string) {
    super(
      detail
        ? `Failed to parse MoneyMoney response: ${detail}`
        : "Failed to parse MoneyMoney response.",
      "PLIST_PARSE_ERROR",
    );
    this.name = "PlistParseError";
  }
}
