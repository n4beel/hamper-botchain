import { decodeErrorResult, formatEther } from "viem";
import { hamperAbi } from "./botchain/abi";

export function describeError(err: unknown): string {
  if (!err) return "Transaction failed.";

  const errorObj = err as {
    data?: `0x${string}`;
    error?: { data?: `0x${string}` };
    cause?: { data?: `0x${string}` };
    message?: string;
  };

  const hexData =
    errorObj.data ||
    errorObj.error?.data ||
    errorObj.cause?.data;

  if (hexData && typeof hexData === "string" && hexData.startsWith("0x")) {
    try {
      const decoded = decodeErrorResult({
        abi: hamperAbi,
        data: hexData,
      });

      switch (decoded.errorName) {
        case "Overfunds": {
          const roomVal = decoded.args?.[0] as bigint;
          const formatted = formatEther(roomVal);
          return `This wish needs at most ${formatted} BOT more.`;
        }
        case "NotFunded":
          return "This wish isn't fully funded.";
        case "NotRefundable":
          return "Funded wishes aren't refunded.";
        case "Closed":
          return "This gift list has closed.";
        case "HostCannotGive":
          return "The host cannot contribute to their own list.";
        case "BadDuration":
          return "List duration must be between 1 day and 365 days.";
        case "BadWishes":
          return "Must have 1 to 10 wishes with targets greater than 0.";
        case "BadTitle":
          return "List title must be between 1 and 48 characters.";
        case "BadLabel":
          return "Wish label must be between 1 and 32 characters.";
        case "ZeroValue":
          return "Contribution amount must be greater than zero.";
        case "NoteTooLong":
          return "Note must be 64 characters or fewer.";
        case "WishFull":
          return "This wish is already fully funded or claimed.";
        case "OnlyHost":
          return "Only the list host can perform this action.";
        case "AlreadyClaimed":
          return "This wish has already been claimed.";
        case "NotClosed":
          return "Refunds are only available after the list deadline has passed.";
        case "NoSuchList":
          return "List not found.";
        case "NoSuchWish":
          return "Wish not found.";
        case "NoSuchGift":
          return "Gift record not found.";
        case "AlreadyRefunded":
          return "This gift has already been refunded.";
        case "NothingToWithdraw":
          return "No pending balance available to withdraw.";
        case "TransferFailed":
          return "BOT transfer failed.";
        case "ReentrancyGuardReentrantCall":
          return "Reentrant call blocked.";
        default:
          return `Contract error: ${decoded.errorName}`;
      }
    } catch {}
  }

  const msg = errorObj.message || String(err);
  if (msg.includes("User rejected")) {
    return "Transaction was cancelled in wallet.";
  }
  if (msg.includes("insufficient funds")) {
    return "Insufficient balance to pay gas and deposit.";
  }

  return "Transaction reverted. Please check parameters and try again.";
}
