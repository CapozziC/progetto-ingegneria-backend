import { jest } from "@jest/globals";
import request from "supertest";
import type { Request, Response, NextFunction } from "express";

import { makeAccount } from "../../mocks/account.mock.js";
import { makeAdvertisement } from "../../mocks/advertisement.mock.js";

import type { Account } from "../../../src/entities/account.js";
import type { Offer } from "../../../src/entities/offer.js";
import { Agency } from "../../../src/entities/agency.ts";
import { Advertisement } from "../../../src/entities/advertisement.js";
import { Status as OfferStatus } from "../../../src/entities/offer.js";

/* ---------------- SHARED DATA ---------------- */

let account: Account;

/* ---------------- MOCK FUNCTIONS ---------------- */

const mockedAuthenticationMiddlewareAccount = jest.fn(
  (req: Request, _res: Response, next: NextFunction) => {
    (req as Request & { account?: Account }).account = account;
    next();
  },
);

const mockedValidateBody = jest.fn(() => {
  return (_req: Request, _res: Response, next: NextFunction) => next();
});

const mockedValidateParams = jest.fn(() => {
  return (_req: Request, _res: Response, next: NextFunction) => next();
});

const mockedRequireAccount =
  jest.fn<(req: Request, res: Response) => Account | null>();
const mockedRequireAgent =
  jest.fn<(req: Request, res: Response) => unknown | null>();
const mockedRequireAdmin =
  jest.fn<(req: Request, res: Response) => unknown | null>();

const mockedParsePositiveInt = jest.fn<(value: string) => number | null>();
const mockedParseStatus = jest.fn<(value: string) => unknown>();

const mockedSearchAdvertisementById =
  jest.fn<(advertisementId: number) => Promise<Advertisement | null>>();
const mockedFindAdvertisementWithOfferId =
  jest.fn<(offerId: number) => Promise<{ advertisementId: number } | null>>();

const mockedFindAdvertisementOwnerId =
  jest.fn<(advertisementId: number) => Promise<number | null>>();
const mockedFindAdvertisementByIdAndAgentId =
  jest.fn<() => Promise<Advertisement | null>>();
const mockedFindAdvertisementsByAgentId = jest.fn<() => Promise<unknown>>();
const mockedTransactionFindAdvertisementAgentId =
  jest.fn<() => Promise<unknown>>();
const mockedDeleteAdvertisementById = jest.fn<() => Promise<boolean>>();
const mockedFindAdvertisementStatusById =
  jest.fn<() => Promise<string | null>>();
const mockedAdvertisementRepository = {
  findOne: jest.fn(),
};

const mockedExistPendingOfferByAdvertisementIdAndAccountId =
  jest.fn<
    (advertisementId: number, accountId: number) => Promise<Offer | null>
  >();
const mockedFindOfferByIdForAgent = jest.fn<() => Promise<Offer | null>>();
const mockedFindAgentNegotiations = jest.fn<() => Promise<unknown>>();
const mockedFindAgentNegotiationDetail = jest.fn<() => Promise<unknown>>();
const mockedFindAccountNegotiations = jest.fn<() => Promise<unknown>>();
const mockedFindAccountNegotiationDetail = jest.fn<() => Promise<unknown>>();
const mockedCreateCounterOffer = jest.fn<() => Promise<unknown>>();
const mockedRejectOfferById = jest.fn<() => Promise<void>>();
const mockedFindLatestPendingAccountOfferForAdvertisementAndAccount =
  jest.fn<() => Promise<Offer | null>>();

const mockedCreateOffer =
  jest.fn<
    (data: {
      price: number;
      advertisementId: number;
      accountId: number;
      agentId: number;
    }) => Offer
  >();

const mockedSaveOffer = jest.fn<(offer: Offer) => Promise<Offer>>();

/* ---------------- MOCK MODULES ---------------- */

jest.unstable_mockModule(
  "../../../src/middleware/auth.account.middleware.js",
  () => ({
    authenticationMiddlewareAccount: mockedAuthenticationMiddlewareAccount,
  }),
);

jest.unstable_mockModule(
  "../../../src/middleware/validate.middleware.js",
  () => ({
    validateBody: mockedValidateBody,
    validateParams: mockedValidateParams,
  }),
);

jest.unstable_mockModule(
  "../../../src/middleware/require.middleware.js",
  () => ({
    requireAccount: mockedRequireAccount,
    requireAgent: mockedRequireAgent,
    requireAdmin: mockedRequireAdmin,
  }),
);

jest.unstable_mockModule(
  "../../../src/repositories/advertisement.repository.js",
  () => ({
    AdvertisementRepository: mockedAdvertisementRepository,
    searchAdvertisementById: mockedSearchAdvertisementById,
    findAdvertisementOwnerId: mockedFindAdvertisementOwnerId,
    findAdvertisementByIdAndAgentId: mockedFindAdvertisementByIdAndAgentId,
    findAdvertisementsByAgentId: mockedFindAdvertisementsByAgentId,
    transactionFindAdvertisementAgentId:
      mockedTransactionFindAdvertisementAgentId,
    deleteAdvertisementById: mockedDeleteAdvertisementById,
    findAdvertisementStatusById: mockedFindAdvertisementStatusById,
  }),
);

jest.unstable_mockModule(
  "../../../src/repositories/offer.repository.js",
  () => ({
    existPendingOfferByAdvertisementIdAndAccountId:
      mockedExistPendingOfferByAdvertisementIdAndAccountId,
    findOfferByIdForAgent: mockedFindOfferByIdForAgent,
    findAgentNegotiations: mockedFindAgentNegotiations,
    findAgentNegotiationDetail: mockedFindAgentNegotiationDetail,
    findAccountNegotiations: mockedFindAccountNegotiations,
    findAccountNegotiationDetail: mockedFindAccountNegotiationDetail,
    createCounterOffer: mockedCreateCounterOffer,
    rejectOfferById: mockedRejectOfferById,
    findLatestPendingAccountOfferForAdvertisementAndAccount:
      mockedFindLatestPendingAccountOfferForAdvertisementAndAccount,
    createOffer: mockedCreateOffer,
    saveOffer: mockedSaveOffer,
    findAdvertisementWithOfferId: mockedFindAdvertisementWithOfferId,
  }),
);

/* ---------------- EXTRA MOCKS NEEDED BY OTHER ROUTES ---------------- */

const mockedAuthenticationMiddlewareAgent = jest.fn(
  (_req: Request, _res: Response, next: NextFunction) => next(),
);

const mockedUploadPhotos = jest.fn(
  (_req: Request, _res: Response, next: NextFunction) => next(),
);

const mockedUploadSinglePhoto = jest.fn(
  (_req: Request, _res: Response, next: NextFunction) => next(),
);
const mockedUploadLogo = jest.fn(
  (_req: Request, _res: Response, next: NextFunction) => next(),
);

const mockedParseJsonFields = jest.fn(() => {
  return (_req: Request, _res: Response, next: NextFunction) => next();
});

const mockedAuthAgentFirstLoginOnly = jest.fn(
  (_req: Request, _res: Response, next: NextFunction) => next(),
);

jest.unstable_mockModule(
  "../../../src/middleware/auth.agent.middleware.js",
  () => ({
    authenticationMiddlewareAgent: mockedAuthenticationMiddlewareAgent,
    authAgentFirstLoginOnly: mockedAuthAgentFirstLoginOnly,
  }),
);

jest.unstable_mockModule("../../../src/config/multer.config.js", () => ({
  uploadPhotos: mockedUploadPhotos,
  uploadSinglePhoto: mockedUploadSinglePhoto,
  uploadLogo: mockedUploadLogo,
}));

jest.unstable_mockModule("../../../src/utils/parse.utils.js", () => ({
  parsePositiveInt: mockedParsePositiveInt,
  parseJsonFields: mockedParseJsonFields,
  parseStatus: mockedParseStatus,
}));

/* ---------------- IMPORT AFTER MOCK ---------------- */

const { Type } = await import("../../../src/entities/advertisement.js");
const { default: testApp } = await import("../../testApp.js");

/* ---------------- TESTS ---------------- */

describe("POST /advertisement/create_offer/:id", () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    account = await makeAccount();
  });

  describe("Validazione input", () => {
    it("should return 400 if advertisement id is invalid", async () => {
      mockedRequireAccount.mockReturnValue(account);
      mockedParsePositiveInt.mockReturnValue(null);

      const res = await request(testApp)
        .post("/advertisement/create_offer/abc")
        .send({ price: 120000 });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe("Invalid advertisement id");
    });

    it("should return 400 if price is missing", async () => {
      mockedRequireAccount.mockReturnValue(account);
      mockedParsePositiveInt.mockReturnValue(12);

      const advertisement = await makeAdvertisement({
        id: 12,
        type: Type.SALE,
      });

      mockedSearchAdvertisementById.mockResolvedValue(advertisement);

      const res = await request(testApp)
        .post("/advertisement/create_offer/12")
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.error).toBe("Invalid price");
    });

    it("should return 400 if price is not a positive number", async () => {
      mockedRequireAccount.mockReturnValue(account);
      mockedParsePositiveInt.mockReturnValue(12);

      const advertisement = await makeAdvertisement({
        id: 12,
        type: Type.SALE,
      });

      mockedSearchAdvertisementById.mockResolvedValue(advertisement);

      const res = await request(testApp)
        .post("/advertisement/create_offer/12")
        .send({ price: -10 });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe("Invalid price");
    });
  });

  describe("business logic", () => {
    it("should return 401 if requireAccount fails", async () => {
      mockedRequireAccount.mockImplementation((_req, res) => {
        res.status(401).json({ error: "Unauthorized: account not logged in" });
        return null;
      });

      const res = await request(testApp)
        .post("/advertisement/create_offer/12")
        .send({ price: 120000 });

      expect(res.status).toBe(401);
      expect(res.body.error).toBe("Unauthorized: account not logged in");
      expect(mockedCreateOffer).not.toHaveBeenCalled();
      expect(mockedSaveOffer).not.toHaveBeenCalled();
    });

    it("should return 404 if advertisement is not found", async () => {
      mockedRequireAccount.mockReturnValue(account);
      mockedParsePositiveInt.mockReturnValue(12);
      mockedSearchAdvertisementById.mockResolvedValue(null);

      const res = await request(testApp)
        .post("/advertisement/create_offer/12")
        .send({ price: 120000 });

      expect(res.status).toBe(404);
      expect(res.body.error).toBe("Advertisement not found");
    });

    it("should return 404 if advertisement owner is not found", async () => {
      mockedRequireAccount.mockReturnValue(account);
      mockedParsePositiveInt.mockReturnValue(12);

      const advertisement = await makeAdvertisement({
        id: 12,
        type: Type.SALE,
      });

      mockedSearchAdvertisementById.mockResolvedValue(advertisement);
      mockedFindAdvertisementOwnerId.mockResolvedValue(null);

      const res = await request(testApp)
        .post("/advertisement/create_offer/12")
        .send({ price: 120000 });

      expect(res.status).toBe(404);
      expect(res.body.error).toBe("Advertisement owner not found");
    });

    it("should return 409 if a pending offer already exists", async () => {
      mockedRequireAccount.mockReturnValue(account);
      mockedParsePositiveInt.mockReturnValue(12);

      const advertisement = await makeAdvertisement({
        id: 12,
        type: Type.SALE,
        agent: {
          id: 99,
          firstName: "Agent",
          lastName: "Smith",
          username: "agent.smith",
          password: "hashedpassword",
          isAdmin: false,
          createdAt: new Date(),
          updatedAt: new Date(),
          phoneNumber: "",
          isPasswordChange: false,
          advertisements: [],
          offers: [],
          appointments: [],
          agency: new Agency(),
          administrator: null,
          agents: [],
        },
      });

      mockedSearchAdvertisementById.mockResolvedValue(advertisement);
      mockedFindAdvertisementOwnerId.mockResolvedValue(99);
      mockedExistPendingOfferByAdvertisementIdAndAccountId.mockResolvedValue(
        {} as Offer,
      );

      const res = await request(testApp)
        .post("/advertisement/create_offer/12")
        .send({ price: 120000 });

      expect(res.status).toBe(409);
      expect(res.body.error).toBe(
        "You already have a pending offer for this advertisement",
      );
    });
  });

  describe("business logic", () => {
    it("should return 409 if advertisement is not for sale", async () => {
      mockedRequireAccount.mockReturnValue(account);
      mockedParsePositiveInt.mockReturnValue(12);

      const advertisement = await makeAdvertisement({
        id: 12,
        type: Type.RENT,
      });

      mockedSearchAdvertisementById.mockResolvedValue(advertisement);

      const res = await request(testApp)
        .post("/advertisement/create_offer/12")
        .send({ price: 120000 });

      expect(res.status).toBe(409);
      expect(res.body.error).toBe(
        "Offers can only be made for sale advertisements",
      );
    });
  });
  describe("business logic", () => {
    it("should create offer successfully", async () => {
      mockedRequireAccount.mockReturnValue(account);
      mockedParsePositiveInt.mockReturnValue(12);

      const advertisement = await makeAdvertisement({
        id: 12,
        type: Type.SALE,
        agent: {
          id: 99,
          firstName: "Agent",
          lastName: "Smith",
          username: "agent.smith",
          password: "hashedpassword",
          isAdmin: false,
          createdAt: new Date(),
          updatedAt: new Date(),
          phoneNumber: "",
          isPasswordChange: false,
          advertisements: [],
          offers: [],
          appointments: [],
          agency: new Agency(),
          administrator: null,
          agents: [],
        },
      });

      const createdOffer = {
        id: 55,
        price: 120000,
        status: OfferStatus.PENDING,
        advertisementId: 12,
        accountId: account.id,
        agentId: 99,
      } as Offer;

      mockedSearchAdvertisementById.mockResolvedValue(advertisement);
      mockedFindAdvertisementOwnerId.mockResolvedValue(99);
      mockedExistPendingOfferByAdvertisementIdAndAccountId.mockResolvedValue(
        null,
      );
      mockedCreateOffer.mockReturnValue(createdOffer);
      mockedSaveOffer.mockResolvedValue(createdOffer);

      const res = await request(testApp)
        .post("/advertisement/create_offer/12")
        .send({ price: 120000 });

      expect(res.status).toBe(201);
      expect(res.body.offer).toEqual({
        id: 55,
        price: 120000,
        status: OfferStatus.PENDING,
        advertisementId: 12,
        accountId: account.id,
        agentId: 99,
      });
      expect(mockedCreateOffer).toHaveBeenCalledWith({
        price: 120000,
        advertisementId: 12,
        accountId: account.id,
        agentId: 99,
      });
      expect(mockedSaveOffer).toHaveBeenCalledWith(createdOffer);
    });
  });
});
