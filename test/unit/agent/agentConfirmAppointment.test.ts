import { jest } from "@jest/globals";
import request from "supertest";
import type { Request, Response, NextFunction } from "express";
import { makeAgent } from "../../mocks/agent.mock.js";
import type { Agent } from "../../../src/entities/agent.js";
import type { Appointment } from "../../../src/entities/appointment.js";
import type { Status as AppointmentStatus } from "../../../src/entities/appointment.ts";
import { Account } from "../../../src/entities/account.ts";

/* ---------------- SHARED DATA ---------------- */

const agent = await makeAgent({
  id: 10,
  username: "agentuser",
  isAdmin: false,
});

/* ---------------- MOCK FUNCTIONS ---------------- */
//Middleware
const mockedAuthenticationMiddlewareAgent = jest.fn(
  (req: Request, _res: Response, next: NextFunction) => {
    (req as Request & { agent?: Agent }).agent = agent;
    next();
  },
);
const mockedAuthAgentFirstLoginOnly = jest.fn(
  (req: Request, _res: Response, next: NextFunction) => {
    (req as Request & { agent?: Agent }).agent = agent;
    next();
  },
);

const mockedRequireAgent =
  jest.fn<(req: Request, res: Response) => Agent | null>();
const mockedRequireAccount =
  jest.fn<(req: Request, res: Response) => Account | null>();
const mockedRequireAdmin =
  jest.fn<(req: Request, res: Response) => Agent | null>();
//Utils
const mockedParsePositiveInt = jest.fn<(value: string) => number | null>();
const mockedParseStatus =
  jest.fn<(value: string) => AppointmentStatus | null>();
const mockedParseJsonFields =
  jest.fn<(fields: string[]) => (req: Request, res: Response, next: NextFunction) => void>(
    () => (_req: Request, _res: Response, next: NextFunction) => next(),
  );
//Repository
const mockedFindAppointmentByIdForAgent =
  jest.fn<
    (appointmentId: number, agentId: number) => Promise<Appointment | null>
  >();
const mockedSaveAppointment =
  jest.fn<(appointment: Appointment) => Promise<Appointment>>();
const mockedFindTakenAppointmentsForAgent =
  jest.fn<(agentId: number) => Promise<Appointment[]>>();
const mockedExistingRequestedAppointment =
  jest.fn<
    (agentId: number, appointmentId: number) => Promise<Appointment | null>
  >();
const mockedFindAppointmentByIdForAccount =
  jest.fn<
    (appointmentId: number, accountId: number) => Promise<Appointment | null>
  >();
const mockedFindAppointmentsByAccount =
  jest.fn<(accountId: number) => Promise<Appointment[]>>();
const mockedFindAppointmentsByAgentId =
  jest.fn<(agentId: number) => Promise<Appointment[]>>();


/* ---------------- MOCK MODULES ---------------- */

jest.unstable_mockModule(
  "../../../src/middleware/auth.agent.middleware.ts",
  () => ({
    authenticationMiddlewareAgent: mockedAuthenticationMiddlewareAgent,
    authAgentFirstLoginOnly: mockedAuthAgentFirstLoginOnly,
  }),
);

jest.unstable_mockModule(
  "../../../src/middleware/require.middleware.ts",
  () => ({
    requireAgent: mockedRequireAgent,
    requireAccount: mockedRequireAccount,
    requireAdmin: mockedRequireAdmin,
  }),
);

jest.unstable_mockModule("../../../src/utils/parse.utils.ts", () => ({
  parsePositiveInt: mockedParsePositiveInt,
  parseStatus: mockedParseStatus,
  parseJsonFields: mockedParseJsonFields,
}));

jest.unstable_mockModule(
  "../../../src/repositories/appointment.repository.ts",
  () => ({
    findAppointmentByIdForAgent: mockedFindAppointmentByIdForAgent,
    saveAppointment: mockedSaveAppointment,
    findTakenAppointmentsForAgent: mockedFindTakenAppointmentsForAgent,
    existingRequestedAppointment: mockedExistingRequestedAppointment,
    findAppointmentByIdForAccount: mockedFindAppointmentByIdForAccount,
    findAppointmentsByAccount: mockedFindAppointmentsByAccount,
    findAppointmentsByAgentId: mockedFindAppointmentsByAgentId,
  }),
);

/* ---------------- IMPORT AFTER MOCK ---------------- */

const { Status } = await import("../../../src/entities/appointment.ts");
const { default: testApp } = await import("../../testApp.ts");

/* ---------------- TESTS ---------------- */

describe("PATCH /appointment/agents/:id/confirm", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("W - wrong input", () => {
    it("should return 400 if appointment id is invalid", async () => {
      mockedRequireAgent.mockReturnValue(agent);
      mockedParsePositiveInt.mockReturnValue(null);

      const res = await request(testApp).patch(
        "/appointment/agents/12/confirm",
      );

      expect(res.status).toBe(400);
      expect(res.body.error).toBe("Invalid appointment id");
    });
  });

  describe("C - corner cases", () => {
    it("should return 401 if requireAgent fails", async () => {
      mockedRequireAgent.mockImplementation((_req, res) => {
        res.status(401).json({ error: "Unauthorized: agent not logged in" });
        return null;
      });

      const res = await request(testApp).patch(
        "/appointment/agents/12/confirm",
      );

      expect(res.status).toBe(401);
      expect(res.body.error).toBe("Unauthorized: agent not logged in");
      expect(mockedFindAppointmentByIdForAgent).not.toHaveBeenCalled();
      expect(mockedSaveAppointment).not.toHaveBeenCalled();
    });

    it("should return 404 if appointment is not found", async () => {
      mockedRequireAgent.mockReturnValue(agent);
      mockedParsePositiveInt.mockReturnValue(12);
      mockedFindAppointmentByIdForAgent.mockResolvedValue(null);

      const res = await request(testApp).patch(
        "/appointment/agents/12/confirm",
      );

      expect(res.status).toBe(404);
      expect(res.body.error).toBe("Appointment not found");
    });
  });

  describe("E - edge case", () => {
    it("should return 400 if appointment is not in REQUESTED status", async () => {
      mockedRequireAgent.mockReturnValue(agent);
      mockedParsePositiveInt.mockReturnValue(12);

      const appointment = {
        id: 12,
        status: Status.CONFIRMED,
        appointmentAt: new Date("2026-03-22T10:00:00.000Z"),
        advertisementId: 5,
        accountId: 7,
      } as Appointment;

      mockedFindAppointmentByIdForAgent.mockResolvedValue(appointment);

      const res = await request(testApp).patch(
        "/appointment/agents/12/confirm",
      );

      expect(res.status).toBe(400);
      expect(res.body.error).toBe(
        "Only requested appointments can be confirmed",
      );
      expect(mockedSaveAppointment).not.toHaveBeenCalled();
    });
  });

  describe("N - normal case", () => {
    it("should confirm appointment successfully", async () => {
      mockedRequireAgent.mockReturnValue(agent);
      mockedParsePositiveInt.mockReturnValue(12);

      const appointment = {
        id: 12,
        status: Status.REQUESTED,
        appointmentAt: new Date("2026-03-22T10:00:00.000Z"),
        advertisementId: 5,
        accountId: 7,
      } as Appointment;

      mockedFindAppointmentByIdForAgent.mockResolvedValue(appointment);
      mockedSaveAppointment.mockResolvedValue({
        ...appointment,
        status: Status.CONFIRMED,
      } as Appointment);

      const res = await request(testApp).patch(
        "/appointment/agents/12/confirm",
      );

      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        message: "Appointment confirmed successfully",
        appointmentId: 12,
        status: Status.CONFIRMED,
        appointmentAt: "2026-03-22T10:00:00.000Z",
        advertisementId: 5,
        accountId: 7,
      });

      expect(mockedFindAppointmentByIdForAgent).toHaveBeenCalledWith(12, 10);
      expect(mockedSaveAppointment).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 12,
          status: Status.CONFIRMED,
        }),
      );
    });
  });
});
