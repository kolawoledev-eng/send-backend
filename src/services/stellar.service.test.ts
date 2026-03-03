import { describe, it, expect, vi } from "vitest";
import { StellarService } from "./stellar.service.js";

describe("StellarService", () => {
  const service = new StellarService();

  describe("isValidPublicKey", () => {
    it("accepts valid G... key", () => {
      expect(service.isValidPublicKey("GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF")).toBe(true);
    });

    it("rejects invalid key", () => {
      expect(service.isValidPublicKey("invalid")).toBe(false);
      expect(service.isValidPublicKey("")).toBe(false);
    });
  });
});
