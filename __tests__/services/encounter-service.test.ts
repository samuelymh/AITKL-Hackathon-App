import { describe, it, expect, beforeEach, afterEach, jest } from "@jest/globals";
import mongoose from "mongoose";
import { EncounterService } from "@/lib/services/encounter-service";
import Counter from "@/lib/models/Counter";
import Encounter from "@/lib/models/Encounter";
import { NotFoundError } from "@/lib/errors/custom-errors";

// Mock the dependencies
jest.mock("@/lib/services/audit-logger", () => ({
  auditLogger: {
    log: jest.fn(),
  },
}));

describe("EncounterService", () => {
  let testUserId: string;
  let testOrganizationId: string;
  let testPractitionerId: string;
  let testEncounterId: string;

  beforeEach(async () => {
    // Set up test data IDs
    testUserId = new mongoose.Types.ObjectId().toString();
    testOrganizationId = new mongoose.Types.ObjectId().toString();
    testPractitionerId = new mongoose.Types.ObjectId().toString();

    // Mock mongoose operations
    jest.clearAllMocks();
  });

  describe("generateEncounterNumber", () => {
    it("should generate unique encounter numbers with proper format", async () => {
      const mockIncrement = jest.fn().mockResolvedValue(1);
      Counter.increment = mockIncrement;

      const encounterNumber = await EncounterService.generateEncounterNumber(testOrganizationId);

      expect(encounterNumber).toMatch(/^ENC-\d{8}-\d{4}$/);
      expect(mockIncrement).toHaveBeenCalledWith(expect.stringContaining(testOrganizationId));
    });

    it("should handle concurrent calls correctly", async () => {
      let callCount = 0;
      const mockIncrement = jest.fn().mockImplementation(() => {
        callCount++;
        return Promise.resolve(callCount);
      });
      Counter.increment = mockIncrement;

      const promises = Array.from({ length: 5 }, () => EncounterService.generateEncounterNumber(testOrganizationId));

      const results = await Promise.all(promises);
      const uniqueResults = new Set(results);

      expect(uniqueResults.size).toBe(5); // All should be unique
      expect(mockIncrement).toHaveBeenCalledTimes(5);
    });
  });

  describe("validateReferencedEntities", () => {
    it("should validate all entities exist", async () => {
      // Mock the dynamic imports and model findById methods
      const mockUser = { findById: jest.fn().mockResolvedValue({ _id: testUserId }) };
      const mockOrganization = { findById: jest.fn().mockResolvedValue({ _id: testOrganizationId }) };
      const mockPractitioner = {
        findById: jest.fn().mockResolvedValue({
          _id: testPractitionerId,
          organizationId: testOrganizationId,
        }),
      };

      // Mock dynamic imports
      jest.doMock("@/lib/models/User", () => ({ default: mockUser }), { virtual: true });
      jest.doMock("@/lib/models/Organization", () => ({ default: mockOrganization }), { virtual: true });
      jest.doMock("@/lib/models/Practitioner", () => ({ default: mockPractitioner }), { virtual: true });

      await expect(
        EncounterService.validateReferencedEntities({
          userId: testUserId,
          organizationId: testOrganizationId,
          practitionerId: testPractitionerId,
        })
      ).resolves.not.toThrow();
    });

    it("should throw NotFoundError when user does not exist", async () => {
      const mockUser = { findById: jest.fn().mockResolvedValue(null) };
      const mockOrganization = { findById: jest.fn().mockResolvedValue({ _id: testOrganizationId }) };
      const mockPractitioner = { findById: jest.fn().mockResolvedValue({ _id: testPractitionerId }) };

      jest.doMock("@/lib/models/User", () => ({ default: mockUser }), { virtual: true });
      jest.doMock("@/lib/models/Organization", () => ({ default: mockOrganization }), { virtual: true });
      jest.doMock("@/lib/models/Practitioner", () => ({ default: mockPractitioner }), { virtual: true });

      await expect(
        EncounterService.validateReferencedEntities({
          userId: testUserId,
          organizationId: testOrganizationId,
          practitionerId: testPractitionerId,
        })
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe("createEncounter", () => {
    it("should create encounter with proper data transformation", async () => {
      const mockCounter = { increment: jest.fn().mockResolvedValue(1) };
      Counter.increment = mockCounter.increment;

      const mockEncounter = {
        save: jest.fn().mockResolvedValue({
          _id: new mongoose.Types.ObjectId(),
          encounterNumber: "ENC-20241201-0001",
        }),
        populate: jest.fn().mockReturnThis(),
      };

      // Mock the Encounter constructor
      const EncounterConstructor = jest.fn().mockImplementation(() => mockEncounter);
      jest.doMock("@/lib/models/Encounter", () => ({ default: EncounterConstructor }), { virtual: true });

      const encounterData = {
        userId: testUserId,
        organizationId: testOrganizationId,
        chiefComplaint: "Test complaint",
        notes: "Test notes",
        startDateTime: new Date().toISOString(),
        type: "ROUTINE",
        vitals: {
          bloodPressure: "120/80",
          heartRate: "72",
        },
      };

      const result = await EncounterService.createEncounter(
        encounterData,
        testPractitionerId,
        new mongoose.Types.ObjectId().toString()
      );

      expect(EncounterConstructor).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: expect.any(mongoose.Types.ObjectId),
          organizationId: expect.any(mongoose.Types.ObjectId),
          attendingPractitionerId: expect.any(mongoose.Types.ObjectId),
          encounter: expect.objectContaining({
            encounterNumber: expect.stringMatching(/^ENC-\d{8}-\d{4}$/),
            chiefComplaint: "Test complaint",
            notes: {
              __enc_notes: true,
              value: "Test notes",
            },
          }),
        })
      );

      expect(mockEncounter.save).toHaveBeenCalled();
    });
  });

  describe("getEncounterById", () => {
    it("should return encounter when found", async () => {
      const mockEncounter = {
        _id: testEncounterId,
        encounter: { encounterNumber: "ENC-20241201-0001" },
      };

      const mockPopulate = jest.fn().mockResolvedValue(mockEncounter);
      const mockFindById = jest.fn().mockReturnValue({ populate: mockPopulate });

      Encounter.findById = mockFindById;

      const result = await EncounterService.getEncounterById(testEncounterId);

      expect(mockFindById).toHaveBeenCalledWith(testEncounterId);
      expect(mockPopulate).toHaveBeenCalledWith(["userId", "organizationId", "attendingPractitionerId"]);
      expect(result).toEqual(mockEncounter);
    });

    it("should throw NotFoundError when encounter not found", async () => {
      const mockPopulate = jest.fn().mockResolvedValue(null);
      const mockFindById = jest.fn().mockReturnValue({ populate: mockPopulate });

      Encounter.findById = mockFindById;

      await expect(EncounterService.getEncounterById(testEncounterId)).rejects.toThrow(NotFoundError);
    });
  });

  describe("updateEncounter", () => {
    it("should update encounter with allowed fields only", async () => {
      const mockUpdatedEncounter = {
        _id: testEncounterId,
        encounter: {
          notes: { __enc_notes: true, value: "Updated notes" },
          vitals: { bloodPressure: "130/85" },
        },
        auditVersion: 2,
      };

      const mockPopulate = jest.fn().mockResolvedValue(mockUpdatedEncounter);
      const mockFindByIdAndUpdate = jest.fn().mockReturnValue({ populate: mockPopulate });

      Encounter.findByIdAndUpdate = mockFindByIdAndUpdate;

      const updateData = {
        notes: "Updated notes",
        vitals: { bloodPressure: "130/85" },
      };

      const result = await EncounterService.updateEncounter(testEncounterId, updateData, testPractitionerId);

      expect(mockFindByIdAndUpdate).toHaveBeenCalledWith(
        testEncounterId,
        expect.objectContaining({
          "encounter.notes": {
            __enc_notes: true,
            value: "Updated notes",
          },
          "encounter.vitals": { bloodPressure: "130/85" },
          auditUpdatedBy: testPractitionerId,
          auditUpdatedDateTime: expect.any(Date),
          $inc: { auditVersion: 1 },
        }),
        { new: true, runValidators: true }
      );

      expect(result).toEqual(mockUpdatedEncounter);
    });

    it("should throw NotFoundError when encounter not found", async () => {
      const mockPopulate = jest.fn().mockResolvedValue(null);
      const mockFindByIdAndUpdate = jest.fn().mockReturnValue({ populate: mockPopulate });

      Encounter.findByIdAndUpdate = mockFindByIdAndUpdate;

      await expect(
        EncounterService.updateEncounter(testEncounterId, { notes: "Updated notes" }, testPractitionerId)
      ).rejects.toThrow(NotFoundError);
    });
  });

  describe("listEncounters", () => {
    it("should return paginated encounters with filters", async () => {
      const mockEncounters = [
        { _id: "1", encounter: { encounterDate: new Date() } },
        { _id: "2", encounter: { encounterDate: new Date() } },
      ];

      const mockQuery = {
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue(mockEncounters),
      };

      Encounter.find = jest.fn().mockReturnValue(mockQuery);
      Encounter.countDocuments = jest.fn().mockResolvedValue(2);

      const result = await EncounterService.listEncounters(
        testUserId,
        testOrganizationId,
        { type: "ROUTINE" },
        { page: 1, limit: 10 }
      );

      expect(result.encounters).toEqual(mockEncounters);
      expect(result.totalCount).toBe(2);
      expect(Encounter.find).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: expect.any(mongoose.Types.ObjectId),
          organizationId: expect.any(mongoose.Types.ObjectId),
          "encounter.encounterType": "ROUTINE",
        })
      );
    });

    it("should handle date range filtering", async () => {
      const mockQuery = {
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([]),
      };

      Encounter.find = jest.fn().mockReturnValue(mockQuery);
      Encounter.countDocuments = jest.fn().mockResolvedValue(0);

      const startDate = "2024-01-01";
      const endDate = "2024-12-31";

      await EncounterService.listEncounters(
        testUserId,
        testOrganizationId,
        { startDate, endDate },
        { page: 1, limit: 10 }
      );

      expect(Encounter.find).toHaveBeenCalledWith(
        expect.objectContaining({
          "encounter.encounterDate": {
            $gte: new Date(startDate),
            $lte: new Date(endDate),
          },
        })
      );
    });
  });
});
