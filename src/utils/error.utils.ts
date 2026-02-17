/**
 * Custom error classes for authentication-related errors.
 * These classes extend the built-in Error class and provide
 */
export class AuthError extends Error {
  constructor(
    message: string,
    public cause?: unknown,
  ) {
    super(message);
    this.name = "AuthError";
  }
}

/**
 * Error class representing an invalid token error.
 * This error is thrown when a JWT token (access or refresh) is missing, invalid, or cannot be verified.
 * It extends the AuthError class and includes the name of the token type (access or refresh) in the error message for clarity.
 */
export class InvalidTokenError extends AuthError {
  constructor(tokenName: "access" | "refresh", cause?: unknown) {
    super(`Invalid ${tokenName} token`, cause);
    this.name = "InvalidTokenError";
  }
}

/**
 * Error class representing an expired token error.
 * This error is thrown when a JWT token (access or refresh) has expired and is no longer valid for authentication.
 * It extends the AuthError class and includes the name of the token type (access or refresh) in the error message for clarity,
 * as well as the original error cause if available.
 * @param tokenName The name of the token type that has expired (either "access" or "refresh")
 * @param cause An optional parameter representing the original error that caused the token to be considered expired, which can provide additional context for debugging
 */
export class ExpiredTokenError extends AuthError {
  constructor(tokenName: "access" | "refresh", cause?: unknown) {
    super(`${tokenName} token expired`, cause);
    this.name = "ExpiredTokenError";
  }
}

