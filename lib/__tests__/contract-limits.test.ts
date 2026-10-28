import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import {
  MIN_DURATION_SECS,
  MAX_DURATION_SECS,
  MIN_WISHES,
  MAX_WISHES,
  MAX_TITLE,
  MAX_LABEL,
  MAX_NOTE,
  MAX_PAGE,
} from "../limits";

describe("Contract limits match Solidity constants", () => {
  it("matches constants defined in Hamper.sol", () => {
    const sol = readFileSync("contracts/src/Hamper.sol", "utf8");

    expect(sol).toContain(`MIN_DURATION = 1 days;`);
    expect(MIN_DURATION_SECS).toBe(86400);

    expect(sol).toContain(`MAX_DURATION = 365 days;`);
    expect(MAX_DURATION_SECS).toBe(365 * 86400);

    expect(sol).toContain(`MIN_WISHES = 1;`);
    expect(MIN_WISHES).toBe(1);

    expect(sol).toContain(`MAX_WISHES = 10;`);
    expect(MAX_WISHES).toBe(10);

    expect(sol).toContain(`MAX_TITLE = 48;`);
    expect(MAX_TITLE).toBe(48);

    expect(sol).toContain(`MAX_LABEL = 32;`);
    expect(MAX_LABEL).toBe(32);

    expect(sol).toContain(`MAX_NOTE = 64;`);
    expect(MAX_NOTE).toBe(64);

    expect(sol).toContain(`MAX_PAGE = 50;`);
    expect(MAX_PAGE).toBe(50);
  });
});
