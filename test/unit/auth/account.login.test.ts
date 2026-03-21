import { jest } from "@jest/globals";
import request from "supertest";
import bcrypt from "bcryptjs";

import { makeAccount } from "../../mocks/account.mock.js";
import { validLoginAccountPayload } from "../../mocks/login.payload.mock.js";

import type { Account } from "../../../src/entities/account.js";
import type { RefreshToken } from "../../../src/entities/refreshToken.js";

/* ---------------- MOCK FUNCTIONS ---------------- */

const mockedFindAccountByEmail = jest.fn<() => Promise<Account | null>>();
const mockedFindAccountById = jest.fn<() => Promise<Account | null>>();
const mockedSaveAccount = jest.fn<() => Promise<Account>>();
const mokedCreateAccount = jest.fn<() => Account>();

const mokedSetFirstLoginAccessCookie = jest.fn();

const mockedGenerateAccessToken = jest.fn<(payload: unknown) => string>();
const mockedGenerateRefreshToken = jest.fn<(payload: unknown) => string>();
const mockedHashRefreshToken = jest.fn<(token: string) => string>();
const mockedVerifyAccessToken = jest.fn<(token: string) => unknown>();
const mockedGenerateResetToken = jest.fn<(payload: unknown) => string>();
const mockedVerifyRefreshToken = jest.fn<(token: string) => unknown>();
const mockedFindRefreshTokenBySubject =
  jest.fn<() => Promise<RefreshToken | null>>();
const mockedRevokeRefreshToken = jest.fn<() => Promise<void>>();
const mockedCreateRefreshToken = jest.fn<(token: string) => RefreshToken>();
const mockedSaveRefreshToken =
  jest.fn<(token: RefreshToken) => Promise<RefreshToken>>();

const mockedSetAuthCookies = jest.fn();
const mockedClearAuthCookies = jest.fn();

/* ---------------- MOCK MODULES ---------------- */

jest.unstable_mockModule(
  "../../../src/repositories/account.repository.js",
  () => ({
    findAccountByEmail: mockedFindAccountByEmail,
    createAccount: mokedCreateAccount,
    saveAccount: mockedSaveAccount,
    findAccountById: mockedFindAccountById,
  }),
);

jest.unstable_mockModule("../../../src/utils/auth.utils.js", () => ({
  generateAccessToken: mockedGenerateAccessToken,
  generateRefreshToken: mockedGenerateRefreshToken,
  hashRefreshToken: mockedHashRefreshToken,
  verifyAccessToken: mockedVerifyAccessToken,
  verifyRefreshToken: mockedVerifyRefreshToken,
  generateResetToken: mockedGenerateResetToken,
}));

jest.unstable_mockModule("../../../src/utils/cookie.utils.js", () => ({
  setAuthCookies: mockedSetAuthCookies,
  clearAuthCookies: mockedClearAuthCookies,
  setFirstLoginAccessCookie: mokedSetFirstLoginAccessCookie,
}));

jest.unstable_mockModule(
  "../../../src/repositories/refreshToken.repository.js",
  () => ({
    findRefreshTokenBySubject: mockedFindRefreshTokenBySubject,
    createRefreshToken: mockedCreateRefreshToken,
    saveRefreshToken: mockedSaveRefreshToken,
  }),
);

jest.unstable_mockModule("../../../src/services/auth.service.js", () => ({
  revokeRefreshToken: mockedRevokeRefreshToken,
}));

/* ---------------- IMPORT AFTER MOCK ---------------- */

const { Type } = await import("../../../src/entities/refreshToken.js");
const { default: testApp } = await import("../../testApp.js");

/* ---------------- TESTS ---------------- */

describe("POST /auth/account/login", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("validazione input", () => {
    it("should return 400 if email is missing", async () => {
      const res = await request(testApp).post("/auth/account/login").send({
        password: "Password123",
      });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe("Email is required");
    });

    it("should return 400 if password is missing", async () => {
      const res = await request(testApp).post("/auth/account/login").send({
        email: "lucialuciaverdi@example.com",
      });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe("Password is required");
    });
  });

  describe("business logic", () => {
    it("should return 401 if account does not exist", async () => {
      mockedFindAccountByEmail.mockResolvedValue(null);

      const res = await request(testApp)
        .post("/auth/account/login")
        .send(validLoginAccountPayload);

      expect(res.status).toBe(401);
      expect(res.body.error).toBe("credenziali errate");
    });

    it("should login successfully if credentials are valid", async () => {
      const account = await makeAccount({
        password: await bcrypt.hash("Password1234", 10),
      });

      const refreshToken: RefreshToken = {
        id: "hashed-refresh-token",
        subjectId: account.id,
        type: Type.ACCOUNT,
        expiresAt: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000),
        createdAt: new Date(),
      };

      mockedFindAccountByEmail.mockResolvedValue(account);
      mockedGenerateAccessToken.mockReturnValue("mockedAccessToken");
      mockedGenerateRefreshToken.mockReturnValue("mockedRefreshToken");
      mockedHashRefreshToken.mockReturnValue("hashedMockedRefreshToken");
      mockedCreateRefreshToken.mockReturnValue(refreshToken);
      mockedSaveRefreshToken.mockResolvedValue(refreshToken);

      const res = await request(testApp)
        .post("/auth/account/login")
        .send(validLoginAccountPayload);

      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({
        id: account.id,
        email: account.email,
        firstName: account.firstName,
        lastName: account.lastName,
        createdAt: account.createdAt.toISOString(),
      });
      expect(mockedSetAuthCookies).toHaveBeenCalledWith(
        expect.anything(),
        "mockedAccessToken",
        "mockedRefreshToken",
      );
    });
  });
});
