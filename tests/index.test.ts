import { describe, it, expect } from "bun:test";
import { defineEnv, createSchema } from "../src/index.ts";
import type { ValidationFailure } from "../src/index.ts";

describe("envcheck", () => {
  it("returns success with empty env for empty schema", () => {
    const schema = createSchema({});
    const result = defineEnv(schema, { source: {}, onError: "return" });
    
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.env).toEqual({});
    }
  });

  it("coerces string values to number, boolean, json, url, and email types", () => {
    const schema = createSchema({
      PORT: { type: "number" },
      DEBUG: { type: "boolean" },
      CONFIG: { type: "json" },
      API_URL: { type: "url" },
      CONTACT: { type: "email" },
    });

    const source = {
      PORT: "8080",
      DEBUG: "false",
      CONFIG: '{"enabled": true}',
      API_URL: "https://api.example.com/v1",
      CONTACT: "user@example.com",
    };

    const env = defineEnv(schema, { source });
    
    expect(env.PORT).toBe(8080);
    expect(env.DEBUG).toBe(false);
    expect(env.CONFIG).toEqual({ enabled: true });
    expect(env.API_URL).toBe("https://api.example.com/v1");
    expect(env.CONTACT).toBe("user@example.com");
  });

  it("applies default values when environment variables are absent", () => {
    const schema = createSchema({
      PORT: { type: "number", default: 3000 },
      NODE_ENV: { type: "string", default: "development" },
      DEBUG: { type: "boolean", default: false },
    });

    const env = defineEnv(schema, { source: {} });
    
    expect(env.PORT).toBe(3000);
    expect(env.NODE_ENV).toBe("development");
    expect(env.DEBUG).toBe(false);
  });

  it("throws error when required variables are missing", () => {
    const schema = createSchema({
      DATABASE_URL: { type: "string", required: true },
      API_KEY: { type: "string", required: true },
    });

    expect(() => {
      defineEnv(schema, { source: {} });
    }).toThrow();
  });

  it("collects multiple validation errors with constraints when onError is 'return'", () => {
    const schema = createSchema({
      PORT: { type: "number", min: 1, max: 65535 },
      ENV: { type: "string", enum: ["development", "production", "test"] },
      RATE: { type: "number", min: 0, max: 100 },
    });

    const source = {
      PORT: "999999",
      ENV: "staging",
      RATE: "-5",
    };

    const result = defineEnv(schema, { source, onError: "return" });
    
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.errors.length).toBe(3);
      expect(result.errors.some((e: ValidationError) => e.key === "PORT")).toBe(true);
      expect(result.errors.some((e: ValidationError) => e.key === "ENV")).toBe(true);
      expect(result.errors.some((e: ValidationError) => e.key === "RATE")).toBe(true);
    }
  });
});