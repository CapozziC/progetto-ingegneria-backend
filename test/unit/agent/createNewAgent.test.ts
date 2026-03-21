import { jest } from "@jest/globals";
import request from "supertest";
import { makeAgent } from "../../mocks/agent.mock.js";
import type { Agent } from "../../../src/entities/agent.js";
import type { NextFunction, Request, Response } from "express";
import type { RequestAgent } from "../../../src/types/express.js";

/* ---------------- SHARED MOCK DATA ---------------- */

const adminAgent = await makeAgent({
  id: 10,
  username: "adminuser",
  isAdmin: true,
  agency: {
    id: 5,
    name: "AgencyTest",
    email: "agency@example.com",
    phoneNumber: "+391234567890",
  } as Agent["agency"],
});

/* ---------------- MOCK FUNCTIONS ---------------- */
const mockedAuthenticationMiddlewareAgent = jest.fn(
  (req: Request, _res: Response, next: NextFunction) => {
    (req as Request & { agent?: Agent }).agent = adminAgent;
    next();
  },
);
const mockedAuthAgentFirstLoginOnly = jest.fn(
  (req: Request, _res: Response, next: NextFunction) => {
    (req as Request & { agent?: Agent }).agent = adminAgent;
    next();
  },
);

const mockedValidateBody = jest.fn(() => {
  return (_req: Request, _res: Response, next: NextFunction) => next();
});
const mockedvalidateParams = jest.fn(() => {
  return (_req: Request, _res: Response, next: NextFunction) => next();
});

const mockedRequireAdmin =
  jest.fn<(req: RequestAgent, res: Response) => Agent | null>();
const mockedRequireAccount = jest.fn<(req: unknown, res: unknown) => unknown>();
const mockedRequireAgent =
  jest.fn<(req: RequestAgent, res: unknown) => unknown>();

const mockedNormalizeUsernameBase =
  jest.fn<(firstName: string, lastName: string) => string>();
const mockedGenerateTemporaryPassword = jest.fn<() => string>();
//Repository
const mockedFindAgentsByAgencyAndUsernamePrefix =
  jest.fn<(agencyId: number, prefix: string) => Promise<Agent[]>>();
const mockedFindAgentById = jest.fn<(id: number) => Promise<Agent | null>>();
const mockedFindAgentByUsername =
  jest.fn<(username: string) => Promise<Agent | null>>();
const mockedNextUsernameFromExisting =
  jest.fn<(base: string, existingUsernames: string[]) => string>();
const mockedCreateAgent = jest.fn<(data: Partial<Agent>) => Agent>();
const mockedSaveAgent = jest.fn<(agent: Agent) => Promise<Agent>>();
const mockedFindAgentsByAgencyIdAndUsername =
  jest.fn<(agencyId: number, username: string) => Promise<Agent[]>>();
const mockedAgentUpdatePassword =
  jest.fn<(agentId: number, hashedPassword: string) => Promise<void>>();
const mockedFindAgentCreatedByAdmin =
  jest.fn<
    (
      agentId: number,
      agencyId: number,
      administratorId: number,
    ) => Promise<Agent | null>
  >();
const mockedfindAgentsCreatedByAgent =
  jest.fn<(agentId: number, agencyId: number) => Promise<Agent[]>>();
const mockedUpdateAgentPhoneNumber =
  jest.fn<(agentId: number, phoneNumber: string) => Promise<void>>();

//Service

const mockedSendAgentCreatedEmail =
  jest.fn<
    (data: {
      to: string;
      firstName: string;
      username: string;
      temporaryPassword: string;
    }) => Promise<void>
  >();

const mockedBcryptHash =
  jest.fn<(password: string, salt: number) => Promise<string>>();

/* ---------------- MOCK MODULES ---------------- */

jest.unstable_mockModule("bcryptjs", () => ({
  default: {
    hash: mockedBcryptHash,
  },
}));

jest.unstable_mockModule(
  "../../../src/middleware/auth.agent.middleware.ts",
  () => ({
    authenticationMiddlewareAgent: mockedAuthenticationMiddlewareAgent,
    authAgentFirstLoginOnly: mockedAuthAgentFirstLoginOnly,
  }),
);

jest.unstable_mockModule(
  "../../../src/middleware/validate.middleware.ts",
  () => ({
    validateBody: mockedValidateBody,
    validateParams: mockedvalidateParams,
  }),
);

jest.unstable_mockModule(
  "../../../src/middleware/require.middleware.ts",
  () => ({
    requireAdmin: mockedRequireAdmin,
    requireAccount: mockedRequireAccount,
    requireAgent: mockedRequireAgent,
  }),
);

jest.unstable_mockModule("../../../src/utils/username.utils.ts", () => ({
  normalizeUsernameBase: mockedNormalizeUsernameBase,
  nextUsernameFromExisting: mockedNextUsernameFromExisting,
}));

jest.unstable_mockModule(
  "../../../src/repositories/agent.repository.js",
  () => ({
    findAgentsByAgencyAndUsernamePrefix:
      mockedFindAgentsByAgencyAndUsernamePrefix,
    createAgent: mockedCreateAgent,
    saveAgent: mockedSaveAgent,
    findAgentById: mockedFindAgentById,
    findAgentByUsername: mockedFindAgentByUsername,
    findAgentsByAgencyIdAndUsername: mockedFindAgentsByAgencyIdAndUsername,
    agentUpdatePassword: mockedAgentUpdatePassword,
    findAgentCreatedByAdmin: mockedFindAgentCreatedByAdmin,
    findAgentsCreatedByAgent: mockedfindAgentsCreatedByAgent,
    updateAgentPhoneNumber: mockedUpdateAgentPhoneNumber,
  }),
);

jest.unstable_mockModule("../../../src/utils/password.utils.js", () => ({
  generateTemporaryPassword: mockedGenerateTemporaryPassword,
}));

jest.unstable_mockModule(
  "../../../src/services/nodemailer/createAgent.service.ts",
  () => ({
    sendAgentCreatedEmail: mockedSendAgentCreatedEmail,
  }),
);

/* ---------------- IMPORT AFTER MOCK ---------------- */

const { default: testApp } = await import("../../testApp.js");

/* ---------------- TESTS ---------------- */

describe("POST /agent/create_agent", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("validazione input", () => {
    it("should return 400 if firstName is missing", async () => {
      mockedRequireAdmin.mockReturnValue(adminAgent);

      const res = await request(testApp).post("/agent/create_agent").send({
        lastName: "Rossi",
        phoneNumber: "+393331112233",
        isAdmin: true,
      });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe("First name and last name are required");
    });

    it("should return 400 if phoneNumber is missing", async () => {
      mockedRequireAdmin.mockReturnValue(adminAgent);

      const res = await request(testApp).post("/agent/create_agent").send({
        firstName: "Mario",
        lastName: "Rossi",
        isAdmin: true,
      });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe("Phone number is required");
    });
  });

  describe("business logic", () => {
    it("should return 401 if admin is not logged in", async () => {
      mockedRequireAdmin.mockImplementation(
        (_req: RequestAgent, expressRes: Response) => {
          expressRes.status(401).json({
            error: "Unauthorized: agent not logged in",
          });
          return null;
        },
      );

      const res = await request(testApp).post("/agent/create_agent").send({
        firstName: "Mario",
        lastName: "Rossi",
        phoneNumber: "+393331112233",
        isAdmin: true,
      });

      expect(res.status).toBe(401);
      expect(res.body.error).toBe("Unauthorized: agent not logged in");
      expect(mockedCreateAgent).not.toHaveBeenCalled();
      expect(mockedSaveAgent).not.toHaveBeenCalled();
    });

    it("should create a new agent successfully", async () => {
      mockedRequireAdmin.mockReturnValue(adminAgent);
      mockedNormalizeUsernameBase.mockReturnValue("mario.rossi");
      mockedFindAgentsByAgencyAndUsernamePrefix.mockResolvedValue([]);
      mockedNextUsernameFromExisting.mockReturnValue("mario.rossi");
      mockedGenerateTemporaryPassword.mockReturnValue("TempPass123!");
      mockedBcryptHash.mockResolvedValue("hashedPassword");

      const createdAgent = await makeAgent({
        firstName: "Mario",
        lastName: "Rossi",
        username: "mario.rossi",
        password: "hashedPassword",
        phoneNumber: "+393331112233",
        isAdmin: true,
        agency: adminAgent.agency,
        administrator: adminAgent,
      });

      const savedAgent = await makeAgent({
        id: 99,
        firstName: "Mario",
        lastName: "Rossi",
        username: "mario.rossi",
        password: "hashedPassword",
        phoneNumber: "+393331112233",
        isAdmin: true,
        agency: adminAgent.agency,
        administrator: adminAgent,
      });

      mockedCreateAgent.mockReturnValue(createdAgent);
      mockedSaveAgent.mockResolvedValue(savedAgent);
      mockedSendAgentCreatedEmail.mockResolvedValue(undefined);

      const res = await request(testApp).post("/agent/create_agent").send({
        firstName: "Mario",
        lastName: "Rossi",
        phoneNumber: "+393331112233",
        isAdmin: true,
      });

      expect(res.status).toBe(201);
      expect(res.body).toEqual({
        message: "Agent created successfully",
        agentId: 99,
        username: "mario.rossi",
        temporaryPassword: "TempPass123!",
      });

      expect(mockedSendAgentCreatedEmail).toHaveBeenCalledWith({
        to: "agency@example.com",
        firstName: "Mario",
        username: "mario.rossi",
        temporaryPassword: "TempPass123!",
      });
    });
  });
});
