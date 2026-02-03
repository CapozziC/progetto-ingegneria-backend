export class AuthError extends Error {
  constructor(
    message: string,
    public cause?: unknown,
  ) {
    super(message);
    this.name = "AuthError";
  }
}
export class InvalidTokenError extends AuthError {
  constructor(tokenName: "access" | "refresh", cause?: unknown) {
    super(`Invalid ${tokenName} token`, cause);
    this.name = "InvalidTokenError";
  }
}

export class ExpiredTokenError extends AuthError {
  constructor(tokenName: "access" | "refresh", cause?: unknown) {
    super(`${tokenName} token expired`, cause);
    this.name = "ExpiredTokenError";
  }
}