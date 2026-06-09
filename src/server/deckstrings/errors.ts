export type DeckstringErrorCode =
  | "empty_input"
  | "code_not_found"
  | "invalid_code";

export class DeckstringError extends Error {
  readonly code: DeckstringErrorCode;

  constructor(code: DeckstringErrorCode, message: string) {
    super(message);
    this.name = "DeckstringError";
    this.code = code;
  }
}
