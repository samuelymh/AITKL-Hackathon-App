import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll, jest } from "@jest/globals";
import { createMocks } from "node-mocks-http";
import { GET as getEncounters, POST as createEncounter } from "@/app/api/v1/encounters/route";
import { GET as getEncounter, PUT as updateEncounter } from "@/app/api/v1/encounters/[encounterId]/route";
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";
import Encounter from "@/lib/models/Encounter";
import { Counter } from "@/lib/models/Counter";

// Mock the middleware to return a valid authorization context
jest.mock("@/lib/middleware/api-wrapper", () => ({
  withEncounterAuth: (handler: any) => async (req: any, params: any) => {
    const mockContext = {
      authGrant: {
        userId: { _id: new mongoose.Types.ObjectId() },
        organizationId: { _id: new mongoose.Types.ObjectId() },
      },
      practitioner: { _id: new mongoose.Types.ObjectId() },
    };
    return handler(req, params, mockContext);
  },
  withEncounterAuthAndBody: (handler: any) => async (req: any, params: any) => {
    const mockContext = {
      authGrant: {
        userId: { _id: new mongoose.Types.ObjectId() },
        organizationId: { _id: new mongoose.Types.ObjectId() },
      },
      practitioner: { _id: new mongoose.Types.ObjectId() },
    };
    const body = req.body || {};
    return handler(req, params, mockContext, body);
  },
}));

// Mock the encounter auth middleware
jest.mock("@/lib/middleware/encounter-auth", () => ({
  EncounterAuthMiddleware: {
    validateEncounterAccess: jest.fn().mockResolvedValue(true),
    validateEncounterAuthorization: jest.fn().mockResolvedValue({
      authGrant: {
        userId: { _id: new mongoose.Types.ObjectId() },
        organizationId: { _id: new mongoose.Types.ObjectId() },
      },
      practitioner: { _id: new mongoose.Types.ObjectId() },
    }),
  },
}));

// Mock the audit logger
jest.mock("@/lib/services/audit-logger", () => ({
  auditLogger: {
    log: jest.fn(),
  },
}));

describe("Encounter API Endpoints", () => {
  let mongoServer: MongoMemoryServer;
  let testUserId: mongoose.Types.ObjectId;
  let testOrganizationId: mongoose.Types.ObjectId;
  let testPractitionerId: mongoose.Types.ObjectId;
  let testEncounterId: string;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    // Clear all data before each test
    await Encounter.deleteMany({});
    await Counter.deleteMany({});

    // Set up test data
    testUserId = new mongoose.Types.ObjectId();
    testOrganizationId = new mongoose.Types.ObjectId();
    testPractitionerId = new mongoose.Types.ObjectId();

    // Create a test encounter
    const encounter = new Encounter({
      userId: testUserId,
      organizationId: testOrganizationId,
      attendingPractitionerId: testPractitionerId,
      authorizationGrantId: new mongoose.Types.ObjectId(),
      encounter: {
        encounterNumber: "000001",
        chiefComplaint: "Test complaint",
        notes: {
          __enc_notes: true,
          value: "Test notes",
        },
        encounterDate: new Date(),
        encounterType: "ROUTINE",
        vitals: {
          bloodPressure: "120/80",
          heartRate: "72",
          temperature: "98.6",
        },
      },
      auditCreatedBy: testPractitionerId,
      auditCreatedDateTime: new Date(),
      auditVersion: 1,
    });

    const savedEncounter = await encounter.save();
    testEncounterId = savedEncounter._id.toString();
  });

  describe("POST /api/v1/encounters", () => {
    it("should create a new encounter successfully", async () => {
      const { req, res } = createMocks({
        method: "POST",
        body: {
          userId: testUserId.toString(),
          organizationId: testOrganizationId.toString(),
          chiefComplaint: "Routine checkup",
          notes: "Patient feeling well",
          startDateTime: new Date().toISOString(),
          type: "ROUTINE",
          vitals: {
            bloodPressure: "120/80",
            heartRate: "72",
          },
        },
      });

      const response = await createEncounter(req, res);
      const responseData = await response.json();

      expect(response.status).toBe(201);
      expect(responseData.success).toBe(true);
      expect(responseData.data.encounter).toBeDefined();
      expect(responseData.data.encounter.encounter.chiefComplaint).toBe("Routine checkup");
    });

    it("should generate atomic encounter numbers", async () => {
      const requests = Array.from({ length: 5 }, (_, i) => ({
        req: createMocks({
          method: "POST",
          body: {
            userId: testUserId.toString(),
            organizationId: testOrganizationId.toString(),
            chiefComplaint: `Test complaint ${i}`,
            notes: `Test notes ${i}`,
            type: "ROUTINE",
          },
        }).req,
        res: createMocks().res,
      }));

      // Execute all requests concurrently to test atomic behavior
      const responses = await Promise.all(requests.map(({ req, res }) => createEncounter(req, res)));

      const encounterNumbers = await Promise.all(
        responses.map(async (response) => {
          const data = await response.json();
          return data.data.encounter.encounter.encounterNumber;
        })
      );

      // All encounter numbers should be unique
      const uniqueNumbers = new Set(encounterNumbers);
      expect(uniqueNumbers.size).toBe(5);
    });
  });

  describe("GET /api/v1/encounters", () => {
    it("should retrieve encounters with pagination", async () => {
      const { req, res } = createMocks({
        method: "GET",
        query: {
          userId: testUserId.toString(),
          organizationId: testOrganizationId.toString(),
          practitionerId: testPractitionerId.toString(),
          page: "1",
          limit: "10",
        },
      });

      const response = await getEncounters(req, res);
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.success).toBe(true);
      expect(responseData.data.encounters).toHaveLength(1);
      expect(responseData.data.pagination).toBeDefined();
      expect(responseData.data.pagination.total).toBe(1);
    });

    it("should filter encounters by date range", async () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      const { req, res } = createMocks({
        method: "GET",
        query: {
          userId: testUserId.toString(),
          organizationId: testOrganizationId.toString(),
          practitionerId: testPractitionerId.toString(),
          startDate: yesterday.toISOString(),
          endDate: tomorrow.toISOString(),
        },
      });

      const response = await getEncounters(req, res);
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.data.encounters).toHaveLength(1);
    });
  });

  describe("GET /api/v1/encounters/[encounterId]", () => {
    it("should retrieve a specific encounter", async () => {
      const { req, res } = createMocks({
        method: "GET",
        query: {
          practitionerId: testPractitionerId.toString(),
          userId: testUserId.toString(),
          organizationId: testOrganizationId.toString(),
        },
      });

      const response = await getEncounter(req, {
        params: { encounterId: testEncounterId },
      });
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.success).toBe(true);
      expect(responseData.data.encounter._id).toBe(testEncounterId);
    });

    it("should return 404 for non-existent encounter", async () => {
      const nonExistentId = new mongoose.Types.ObjectId().toString();
      const { req, res } = createMocks({
        method: "GET",
        query: {
          practitionerId: testPractitionerId.toString(),
          userId: testUserId.toString(),
          organizationId: testOrganizationId.toString(),
        },
      });

      const response = await getEncounter(req, {
        params: { encounterId: nonExistentId },
      });

      expect(response.status).toBe(404);
    });
  });

  describe("PUT /api/v1/encounters/[encounterId]", () => {
    it("should update encounter notes and vitals", async () => {
      const { req, res } = createMocks({
        method: "PUT",
        body: {
          notes: "Updated notes",
          vitals: {
            bloodPressure: "130/85",
            heartRate: "75",
            temperature: "99.1",
          },
        },
      });

      const response = await updateEncounter(req, {
        params: { encounterId: testEncounterId },
      });
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.success).toBe(true);
      expect(responseData.data.encounter.encounter.notes.value).toBe("Updated notes");
      expect(responseData.data.encounter.encounter.vitals.bloodPressure).toBe("130/85");
    });

    it("should increment audit version on update", async () => {
      const originalEncounter = await Encounter.findById(testEncounterId);
      const originalVersion = originalEncounter?.auditVersion || 0;

      const { req, res } = createMocks({
        method: "PUT",
        body: {
          notes: "Updated notes",
        },
      });

      const response = await updateEncounter(req, {
        params: { encounterId: testEncounterId },
      });
      const responseData = await response.json();

      expect(response.status).toBe(200);
      expect(responseData.data.encounter.auditVersion).toBe(originalVersion + 1);
    });

    it("should return 404 for non-existent encounter", async () => {
      const nonExistentId = new mongoose.Types.ObjectId().toString();
      const { req, res } = createMocks({
        method: "PUT",
        body: {
          notes: "Updated notes",
        },
      });

      const response = await updateEncounter(req, {
        params: { encounterId: nonExistentId },
      });

      expect(response.status).toBe(404);
    });
  });

  describe("Error Handling", () => {
    it("should handle missing required parameters", async () => {
      const { req, res } = createMocks({
        method: "GET",
        query: {
          // Missing required parameters
        },
      });

      const response = await getEncounters(req, res);

      expect(response.status).toBe(400);
    });

    it("should handle database errors gracefully", async () => {
      // Mock a database error
      const originalFind = Encounter.find;
      Encounter.find = jest.fn().mockRejectedValue(new Error("Database error"));

      const { req, res } = createMocks({
        method: "GET",
        query: {
          userId: testUserId.toString(),
          organizationId: testOrganizationId.toString(),
          practitionerId: testPractitionerId.toString(),
        },
      });

      const response = await getEncounters(req, res);

      expect(response.status).toBe(500);

      // Restore original method
      Encounter.find = originalFind;
    });
  });

  describe("Performance and Atomic Operations", () => {
    it("should handle concurrent encounter creation without duplicate numbers", async () => {
      // Reset counter
      await Counter.deleteMany({});

      const concurrentRequests = 10;
      const requests = Array.from(
        { length: concurrentRequests },
        (_, i) =>
          createMocks({
            method: "POST",
            body: {
              userId: testUserId.toString(),
              organizationId: testOrganizationId.toString(),
              chiefComplaint: `Concurrent test ${i}`,
              type: "ROUTINE",
            },
          }).req
      );

      const responses = await Promise.all(requests.map((req) => createEncounter(req, createMocks().res)));

      const encounters = await Promise.all(
        responses.map(async (res) => {
          const data = await res.json();
          return data.data.encounter;
        })
      );

      // Check that all encounter numbers are unique
      const encounterNumbers = encounters.map((e) => e.encounter.encounterNumber);
      const uniqueNumbers = new Set(encounterNumbers);

      expect(uniqueNumbers.size).toBe(concurrentRequests);
      expect(responses.every((res) => res.status === 201)).toBe(true);
    });
  });
});
