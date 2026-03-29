import { jest } from "@jest/globals";
import request from "supertest";
import { makeAdvertisement } from "../../mocks/advertisement.mock.ts";
import { makeAccount } from "../../mocks/account.mock.ts";
import { Account } from "../../../src/entities/account.ts";
import type { NextFunction, Request, Response } from "express";
import { Agency } from "../../../src/entities/agency.ts";
import { QueryFailedError } from "typeorm";

let account: Account;
const FUTURE_DATE = "2099-03-25";

/* ---------------- MOCK FUNCTIONS ---------------- */
//Repository
const mockedFindAdvertisementByIdAndAgentId = jest.fn<() => Promise<unknown>>();
const mockedFindAdvertisementsByAgentId = jest.fn<() => Promise<unknown>>();
const mockedSaveAppointment =
  jest.fn<(appointment: unknown) => Promise<unknown>>();
const mockedFindAppointmentByIdForAgent = jest.fn<() => Promise<unknown>>();
const mockedFindAppointmentsByAgentId = jest.fn<() => Promise<unknown>>();
const mockedFindAppointmentsByAccount = jest.fn<() => Promise<unknown>>();
const mockedFindAppointmentByIdForAccount = jest.fn<() => Promise<unknown>>();

const mockedExistingRequestedAppointment =
  jest.fn<(advertisementId: number, accountId: number) => Promise<unknown>>();

const mockedFindAdvertisementOwnerId =
  jest.fn<(advertisementId: number) => Promise<number | null>>();
const mockedTransactionFindAdvertisementAgentId =
  jest.fn<() => Promise<number | null>>();
const mockedDeleteAdvertisementById = jest.fn<() => Promise<unknown>>();
const mockedFindAdvertisementStatusById = jest.fn<() => Promise<unknown>>();
const mockedSearchAdvertisementById = jest.fn<() => Promise<unknown>>();

//Middleware
const mockedAuthenticationMiddlewareAccount = jest.fn(
  (req: Request, _res: Response, next: NextFunction) => {
    (req as Request & { account?: Account }).account = account;
    next();
  },
);
const mockedAuthenticationMiddlewareAgent = jest.fn(
  (_req: Request, _res: Response, next: NextFunction) => next(),
);

const mockedAuthAgentFirstLoginOnly = jest.fn(
  (_req: Request, _res: Response, next: NextFunction) => next(),
);
const mockedRequireAccount =
  jest.fn<(req: Request, res: Response) => Account | null>();
const mockedValidateParams = jest.fn(() => {
  return (_req: Request, _res: Response, next: NextFunction) => next();
});
const mockedRequireAgent =
  jest.fn<(req: Request, res: Response) => unknown | null>();
const mockedRequireAdmin =
  jest.fn<(req: Request, res: Response) => Account | null>();
const mockedValidateBody = jest.fn(() => {
  return (_req: Request, _res: Response, next: NextFunction) => next();
});
const mockedUploadPhotos = jest.fn(
  (_req: Request, _res: Response, next: NextFunction) => next(),
);
const mockedUploadLogo = jest.fn(
  (_req: Request, _res: Response, next: NextFunction) => next(),
);
const mockedUploadSinglePhoto = jest.fn(
  (_req: Request, _res: Response, next: NextFunction) => next(),
);

//Utils
const mockedParsePositiveInt = jest.fn<(value: string) => number | null>();
const mockedParseJsonFields =
  jest.fn<
    (
      fields: string[],
    ) => (req: Request, res: Response, next: NextFunction) => void
  >();
const mockedParseStatus = jest.fn<(value: string) => unknown>();
//service
const mockedIsValidHourlySlotRome = jest.fn<(d: Date) => boolean>();
const mockedGetAvailableSlotsForAdvertisement =
  jest.fn<() => Promise<unknown>>();
const mockedSaveAdvertisementPhotos = jest.fn<() => Promise<unknown>>();
const mockedUpdateAdvertisementByAgent = jest.fn<() => Promise<unknown>>();

mockedParseJsonFields.mockImplementation((fields: string[]) => {
  void fields;
  return (_req: Request, _res: Response, next: NextFunction) => next();
});

/* ---------------- MOCK MODULES ---------------- */

jest.unstable_mockModule(
  "../../../src/repositories/appointment.repository.ts",
  () => ({
    findAppointmentByIdForAgent: mockedFindAppointmentByIdForAgent,
    findAppointmentsByAgentId: mockedFindAppointmentsByAgentId,
    findAppointmentsByAccount: mockedFindAppointmentsByAccount,
    findAppointmentByIdForAccount: mockedFindAppointmentByIdForAccount,
    saveAppointment: mockedSaveAppointment,
    existingRequestedAppointment: mockedExistingRequestedAppointment,
  }),
);

jest.unstable_mockModule(
  "../../../src/repositories/advertisement.repository.ts",
  () => ({
    findAdvertisementOwnerId: mockedFindAdvertisementOwnerId,
    findAdvertisementByIdAndAgentId: mockedFindAdvertisementByIdAndAgentId,
    findAdvertisementsByAgentId: mockedFindAdvertisementsByAgentId,
    transactionFindAdvertisementAgentId:
      mockedTransactionFindAdvertisementAgentId,
    deleteAdvertisementById: mockedDeleteAdvertisementById,
    findAdvertisementStatusById: mockedFindAdvertisementStatusById,
    searchAdvertisementById: mockedSearchAdvertisementById,
  }),
);

jest.unstable_mockModule(
  "../../../src/middleware/auth.account.middleware.ts",
  () => ({
    authenticationMiddlewareAccount: mockedAuthenticationMiddlewareAccount,
  }),
);
jest.unstable_mockModule(
  "../../../src/middleware/auth.agent.middleware.ts",
  () => ({
    authenticationMiddlewareAgent: mockedAuthenticationMiddlewareAgent,
    authAgentFirstLoginOnly: mockedAuthAgentFirstLoginOnly,
  }),
);

jest.unstable_mockModule("../../../src/config/multer.config.ts", () => ({
  uploadPhotos: mockedUploadPhotos,
  uploadLogo: mockedUploadLogo,
  uploadSinglePhoto: mockedUploadSinglePhoto,
}));

jest.unstable_mockModule(
  "../../../src/middleware/require.middleware.ts",
  () => ({
    requireAccount: mockedRequireAccount,
    requireAgent: mockedRequireAgent,
    requireAdmin: mockedRequireAdmin,
  }),
);

jest.unstable_mockModule(
  "../../../src/middleware/validate.middleware.js",
  () => ({
    validateParams: mockedValidateParams,
    validateBody: mockedValidateBody,
  }),
);

jest.unstable_mockModule("../../../src/utils/parse.utils.js", () => ({
  parsePositiveInt: mockedParsePositiveInt,
  parseJsonFields: mockedParseJsonFields,
  parseStatus: mockedParseStatus,
}));

jest.unstable_mockModule("../../../src/services/slots.service.js", () => ({
  isValidHourlySlotRome: mockedIsValidHourlySlotRome,
  getAvailableSlotsForAdvertisement: mockedGetAvailableSlotsForAdvertisement,
}));

jest.unstable_mockModule(
  "../../../src/services/advertisement.service.ts",
  () => ({
    saveAdvertisementPhotos: mockedSaveAdvertisementPhotos,
    updateAdvertisementByAgent: mockedUpdateAdvertisementByAgent,
  }),
);

/* --------------------IMPORT AFTER MOCKS-------------------- */

const { Status } = await import("../../../src/entities/appointment.js");
const { default: testApp } = await import("../../testApp.js");
/* ---------------- TESTS ---------------- */

describe("POST /advertisement/create_appointment/:id", () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    account = await makeAccount();
  });

  describe("W - wrong input", () => {
    it("should return 400 if advertisement id is invalid", async () => {
      mockedRequireAccount.mockReturnValue(account);
      mockedParsePositiveInt.mockReturnValue(null);

      const res = await request(testApp)
        .post("/advertisement/create_appointment/abc")
        .send({ date: FUTURE_DATE, time: "10:00" });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe("Invalid advertisement id");
    });

    it("should return 400 if date or time is missing", async () => {
      mockedRequireAccount.mockReturnValue(account);
      mockedParsePositiveInt.mockReturnValue(12);

      const res = await request(testApp)
        .post("/advertisement/create_appointment/12")
        .send({ date: FUTURE_DATE });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe("date and time are required");
    });

    it("should return 400 if date or time format is invalid", async () => {
      mockedRequireAccount.mockReturnValue(account);
      mockedParsePositiveInt.mockReturnValue(12);

      const res = await request(testApp)
        .post("/advertisement/create_appointment/12")
        .send({ date: "not-a-date", time: "10:00" });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe("Invalid date or time format");
    });
  });

  describe("C - corner cases", () => {
    it("should return 401 if requireAccount fails", async () => {
      mockedRequireAccount.mockImplementation((_req, res) => {
        res.status(401).json({ error: "Unauthorized: account not logged in" });
        return null;
      });

      const res = await request(testApp)
        .post("/advertisement/create_appointment/12")
        .send({ date: FUTURE_DATE, time: "10:00" });

      expect(res.status).toBe(401);
      expect(res.body.error).toBe("Unauthorized: account not logged in");
    });

    it("should return 404 if advertisement owner is not found", async () => {
      mockedRequireAccount.mockReturnValue(account);
      mockedParsePositiveInt.mockReturnValue(12);
      mockedIsValidHourlySlotRome.mockReturnValue(true);
      mockedFindAdvertisementOwnerId.mockResolvedValue(null);

      const res = await request(testApp)
        .post("/advertisement/create_appointment/12")
        .send({ date: FUTURE_DATE, time: "10:00" });

      expect(res.status).toBe(404);
      expect(res.body.error).toBe("Advertisement owner  not found");
    });

    it("should return 409 if a pending appointment already exists", async () => {
      mockedRequireAccount.mockReturnValue(account);
      mockedParsePositiveInt.mockReturnValue(12);
      mockedIsValidHourlySlotRome.mockReturnValue(true);

      const advertisement = await makeAdvertisement({
        id: 12,
        agent: {
          id: 99,
          firstName: "",
          lastName: "",
          username: "",
          password: "",
          createdAt: new Date(),
          updatedAt: new Date(),
          phoneNumber: "",
          isAdmin: false,
          isPasswordChange: false,
          advertisements: [],
          offers: [],
          appointments: [],
          agency: new Agency(),
          administrator: null,
          agents: [],
        },
      });

      mockedFindAdvertisementOwnerId.mockResolvedValue(advertisement.agent.id);
      mockedExistingRequestedAppointment.mockResolvedValue({ id: 1 });

      const res = await request(testApp)
        .post("/advertisement/create_appointment/12")
        .send({ date: FUTURE_DATE, time: "10:00" });

      expect(res.status).toBe(409);
      expect(res.body.error).toBe(
        "You already have a pending appointment request for this advertisement",
      );
    });
  });

  describe("E - edge cases", () => {
    it("should return 400 if slot is not a valid Rome hourly slot", async () => {
      mockedRequireAccount.mockReturnValue(account);
      mockedParsePositiveInt.mockReturnValue(12);
      mockedIsValidHourlySlotRome.mockReturnValue(false);

      const res = await request(testApp)
        .post("/advertisement/create_appointment/12")
        .send({ date: FUTURE_DATE, time: "10:30" });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe(
        "Invalid slot (must be a valid working-hour hourly slot in Europe/Rome)",
      );
    });

    it("should return 400 if appointment is in the past", async () => {
      mockedRequireAccount.mockReturnValue(account);
      mockedParsePositiveInt.mockReturnValue(12);
      mockedIsValidHourlySlotRome.mockReturnValue(true);

      const res = await request(testApp)
        .post("/advertisement/create_appointment/12")
        .send({ date: "2020-01-01", time: "10:00" });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe("appointmentAt must be in the future");
    });
  });

  describe("N - normal case", () => {
    it("should create appointment successfully", async () => {
      mockedRequireAccount.mockReturnValue(account);
      mockedParsePositiveInt.mockReturnValue(12);
      mockedIsValidHourlySlotRome.mockReturnValue(true);

      const advertisement = await makeAdvertisement({
        id: 12,
        agent: {
          id: 99,
          firstName: "",
          lastName: "",
          username: "",
          password: "",
          createdAt: new Date(),
          updatedAt: new Date(),
          phoneNumber: "",
          isAdmin: false,
          isPasswordChange: false,
          advertisements: [],
          offers: [],
          appointments: [],
          agency: new Agency(),
          administrator: null,
          agents: [],
        },
      });

      mockedFindAdvertisementOwnerId.mockResolvedValue(advertisement.agent.id);
      mockedExistingRequestedAppointment.mockResolvedValue(null);

      mockedSaveAppointment.mockImplementation(async (appointment) => {
        const typedAppointment = appointment as {
          status: string;
          appointmentAt: Date;
          advertisementId: number;
          agentId: number;
          accountId: number;
        };

        return {
          ...typedAppointment,
          id: 55,
        };
      });

      const res = await request(testApp)
        .post("/advertisement/create_appointment/12")
        .send({ date: FUTURE_DATE, time: "10:00" });

      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({
        message: "Appointment requested successfully",
        appointmentId: 55,
        status: Status.REQUESTED,
        advertisementId: 12,
        agentId: advertisement.agent.id,
        accountId: account.id,
      });
    });
  });

  describe("T - technical case", () => {
    it("should return 409 if saveAppointment fails with unique violation", async () => {
      mockedRequireAccount.mockReturnValue(account);
      mockedParsePositiveInt.mockReturnValue(12);
      mockedIsValidHourlySlotRome.mockReturnValue(true);

      const advertisement = await makeAdvertisement({
        id: 12,
        agent: {
          id: 99,
          firstName: "",
          lastName: "",
          username: "",
          password: "",
          createdAt: new Date(),
          updatedAt: new Date(),
          phoneNumber: "",
          isAdmin: false,
          isPasswordChange: false,
          advertisements: [],
          offers: [],
          appointments: [],
          agency: new Agency(),
          administrator: null,
          agents: [],
        },
      });

      mockedFindAdvertisementOwnerId.mockResolvedValue(advertisement.agent.id);
      mockedExistingRequestedAppointment.mockResolvedValue(null);
      mockedSaveAppointment.mockRejectedValue(
        new QueryFailedError("INSERT INTO appointment ...", [], {
          code: "23505",
        } as Error & { code: string }),
      );

      const res = await request(testApp)
        .post("/advertisement/create_appointment/12")
        .send({ date: FUTURE_DATE, time: "10:00" });

      expect(res.status).toBe(409);
      expect(res.body.error).toBe("Slot already taken");
    });
  });
});
