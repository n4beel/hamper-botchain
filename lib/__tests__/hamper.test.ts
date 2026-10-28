import { describe, expect, it } from "vitest";
import { parseEther } from "viem";
import {
  fillPercent,
  room,
  refundable,
  parseTargets,
  formatEtherClean,
  formatDurationRemaining,
} from "../hamper";
import { describeError } from "../errors";

describe("Hamper pure calculations", () => {
  it("computes fillPercent without float issues", () => {
    expect(fillPercent(0n, 100n)).toBe(0);
    expect(fillPercent(50n, 100n)).toBe(50);
    expect(fillPercent(33n, 100n)).toBe(33);
    expect(fillPercent(100n, 100n)).toBe(100);
    expect(fillPercent(120n, 100n)).toBe(100); // capped at 100
    expect(fillPercent(0n, 0n)).toBe(0);
    expect(fillPercent(10n, 0n)).toBe(0);
    // Real ether values
    expect(fillPercent(parseEther("0.25"), parseEther("1.0"))).toBe(25);
    expect(fillPercent(parseEther("0.333333333333333333"), parseEther("1.0"))).toBe(33);
  });

  it("calculates remaining room in a wish", () => {
    expect(room(100n, 40n)).toBe(60n);
    expect(room(100n, 100n)).toBe(0n);
    expect(room(100n, 120n)).toBe(0n);
    expect(room(parseEther("2.5"), parseEther("1.5"))).toBe(parseEther("1.0"));
  });

  it("determines if a wish is refundable past deadline", () => {
    const deadline = 1000n;
    const target = 100n;

    // Before deadline -> cannot refund
    expect(refundable(deadline, 50n, target, false, 999)).toBe(false);

    // After deadline and underfunded -> can refund
    expect(refundable(deadline, 50n, target, false, 1000)).toBe(true);
    expect(refundable(deadline, 50n, target, false, 1050)).toBe(true);

    // After deadline but fully funded -> can NOT refund
    expect(refundable(deadline, 100n, target, false, 1050)).toBe(false);

    // After deadline but claimed -> can NOT refund
    expect(refundable(deadline, 50n, target, true, 1050)).toBe(false);
  });

  it("parses targets correctly", () => {
    const input = ["0.5", " 1.25 ", "10", "invalid", ""];
    const parsed = parseTargets(input);
    expect(parsed[0]).toBe(parseEther("0.5"));
    expect(parsed[1]).toBe(parseEther("1.25"));
    expect(parsed[2]).toBe(parseEther("10"));
    expect(parsed[3]).toBe(0n);
    expect(parsed[4]).toBe(0n);
  });

  it("formats ether clean without trailing decimals", () => {
    expect(formatEtherClean(parseEther("1"))).toBe("1");
    expect(formatEtherClean(parseEther("1.5"))).toBe("1.5");
    expect(formatEtherClean(parseEther("0.05"))).toBe("0.05");
    expect(formatEtherClean(0n)).toBe("0");
  });

  it("formats remaining duration strings", () => {
    const now = 10000;
    expect(formatDurationRemaining(10000, now)).toBe("Closed");
    expect(formatDurationRemaining(9000, now)).toBe("Closed");
    expect(formatDurationRemaining(10000 + 86400 * 5, now)).toBe("5 days left");
    expect(formatDurationRemaining(10000 + 86400 * 1 + 3600 * 4, now)).toBe("1 day, 4h left");
    expect(formatDurationRemaining(10000 + 3600 * 2 + 60 * 15, now)).toBe("2h 15m left");
    expect(formatDurationRemaining(10000 + 60 * 25, now)).toBe("25m left");
  });

  it("describes standard contract errors", () => {
    expect(describeError({ message: "User rejected the request" })).toBe(
      "Transaction was cancelled in wallet."
    );
    expect(describeError({ message: "insufficient funds for gas * price + value" })).toBe(
      "Insufficient balance to pay gas and deposit."
    );
  });
});
