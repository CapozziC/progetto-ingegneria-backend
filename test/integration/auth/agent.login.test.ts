import { jest } from "@jest/globals";
import request from "supertest";
import bcrypt from "bcryptjs";

import { makeAgent } from "../../mocks/agent.mock.js";
import { validLoginAgentPayload } from "../../mocks/login.payload.mock.js";

import type { Agent } from "../../../src/entities/agent.js";
import type { RefreshToken } from "../../../src/entities/refreshToken.js";

/* ---------------- MOCK FUNCTIONS ---------------- */

const mockedFindAgentsByAgencyIdAndUsername =
  jest.fn<() => Promise<Agent | null>>();

const mockedFindAgentById = jest.fn<() => Promise<Agent | null>>();
const mockedFindAgentByUsername = jest.fn<() => Promise<Agent | null>>();
const mockedSaveAgent = jest.fn<() => Promise<Agent>>();

const mockedGenerateAccessToken = jest.fn<(payload: unknown) => string>();
const mockedGenerateRefreshToken = jest.fn<(payload: unknown) => string>();

const mockedHashRefreshToken = jest.fn<(token: string) => string>();
const mockedVerifyAccessToken = jest.fn<(token: string) => unknown>();
const mockedVerifyRefreshToken = jest.fn<(token: string) => unknown>();
const mockedFindRefreshTokenBySubject =
  jest.fn<() => Promise<RefreshToken | null>>();

const mockedSetAuthCookies = jest.fn();
const mockedSetFirstLoginAccessCookie = jest.fn();

const mockedCreateRefreshToken = jest.fn<(token: string) => RefreshToken>();
const mockedSaveRefreshToken =
  jest.fn<(token: RefreshToken) => Promise<RefreshToken>>();

const mockedRevokeRefreshToken = jest.fn<() => Promise<void>>();

/* ---------------- MOCK MODULES ---------------- */

jest.unstable_mockModule(
  "../../../src/repositories/agent.repository.js",
  () => ({
    findAgentsByAgencyIdAndUsername: mockedFindAgentsByAgencyIdAndUsername,
    findAgentById: mockedFindAgentById,
    findAgentByUsername: mockedFindAgentByUsername,
    saveAgent: mockedSaveAgent,
  }),
);

jest.unstable_mockModule("../../../src/utils/auth.utils.js", () => ({
  generateAccessToken: mockedGenerateAccessToken,
  generateRefreshToken: mockedGenerateRefreshToken,
  hashRefreshToken: mockedHashRefreshToken,
  verifyAccessToken: mockedVerifyAccessToken,
  verifyRefreshToken: mockedVerifyRefreshToken,
}));

jest.unstable_mockModule("../../../src/utils/cookie.utils.js", () => ({
  setAuthCookies: mockedSetAuthCookies,
  setFirstLoginAccessCookie: mockedSetFirstLoginAccessCookie,
  clearAuthCookies: jest.fn(),
}));

jest.unstable_mockModule(
  "../../../src/repositories/refreshToken.repository.js",
  () => ({
    createRefreshToken: mockedCreateRefreshToken,
    saveRefreshToken: mockedSaveRefreshToken,
    findRefreshTokenBySubject: mockedFindRefreshTokenBySubject,
  }),
);

jest.unstable_mockModule("../../../src/services/auth.service.js", () => ({
  revokeRefreshToken: mockedRevokeRefreshToken,
}));

/* ---------------- IMPORT AFTER MOCK ---------------- */

const { Type } = await import("../../../src/entities/refreshToken.js");
const { default: testApp } = await import("../../testApp.js");

/* ---------------- TESTS ---------------- */

describe("POST /auth/agent/login", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("validazione input", () => {
    it("should return 400 if agencyId is invalid", async () => {
      const res = await request(testApp).post("/auth/agent/login").send({
        agencyId: 0,
        username: "mario",
        password: "Password123",
      });

      expect(res.status).toBe(400);
    });
  });

  describe("business logic", () => {
    it("should return 404 if agent does not exist", async () => {
      mockedFindAgentsByAgencyIdAndUsername.mockResolvedValue(null);

      const res = await request(testApp)
        .post("/auth/agent/login")
        .send(validLoginAgentPayload);

      expect(res.status).toBe(404);
      expect(res.body.error).toBe("Agent not found");
    });

    it("should return 401 if password is incorrect", async () => {
      const agent = await makeAgent({
        password: await bcrypt.hash("AnotherPassword123", 10),
      });

      mockedFindAgentsByAgencyIdAndUsername.mockResolvedValue(agent);

      const res = await request(testApp)
        .post("/auth/agent/login")
        .send(validLoginAgentPayload);

      expect(res.status).toBe(401);
    });

    it("should require password change on first login", async () => {
      const agent = await makeAgent({
        isPasswordChange: false,
      });

      mockedFindAgentsByAgencyIdAndUsername.mockResolvedValue(agent);
      mockedGenerateAccessToken.mockReturnValue("first-login-token");

      const res = await request(testApp)
        .post("/auth/agent/login")
        .send(validLoginAgentPayload);

      expect(res.status).toBe(200);
      expect(mockedSetFirstLoginAccessCookie).toHaveBeenCalled();
      expect(mockedSetAuthCookies).not.toHaveBeenCalled();
    });

    it("should login successfully with valid credentials", async () => {
      const agent = await makeAgent({
        isPasswordChange: true,
      });

      const refreshTokenEntry: RefreshToken = {
        id: "hashed-refresh-token",
        subjectId: agent.id,
        type: Type.AGENT,
        expiresAt: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000),
        createdAt: new Date(),
      };

      mockedFindAgentsByAgencyIdAndUsername.mockResolvedValue(agent);
      mockedGenerateAccessToken.mockReturnValue("access-token");
      mockedGenerateRefreshToken.mockReturnValue("refresh-token");
      mockedHashRefreshToken.mockReturnValue("hashed-refresh-token");
      mockedCreateRefreshToken.mockReturnValue(refreshTokenEntry);
      mockedSaveRefreshToken.mockResolvedValue(refreshTokenEntry);
      mockedRevokeRefreshToken.mockResolvedValue(undefined);

      const res = await request(testApp)
        .post("/auth/agent/login")
        .send(validLoginAgentPayload);

      expect(res.status).toBe(200);
      expect(mockedSetAuthCookies).toHaveBeenCalled();
    });
  });
});
