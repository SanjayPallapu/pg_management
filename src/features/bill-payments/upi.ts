import type { ParsedUpiQr } from "./types";

const MAX_TEXT_LENGTH = 120;
const UPI_ID_PATTERN = /^[a-zA-Z0-9._-]{2,128}@[a-zA-Z0-9.-]{2,64}$/;

const clean = (value: string | null, max = MAX_TEXT_LENGTH) => {
  if (!value) return null;
  const sanitized = Array.from(value)
    .filter((character) => {
      const code = character.charCodeAt(0);
      return code > 31 && code !== 127;
    })
    .join("")
    .trim()
    .slice(0, max);
  return sanitized || null;
};

export class UpiQrError extends Error {
  constructor(public readonly code: "NOT_UPI" | "INVALID_UPI" | "INVALID_CURRENCY" | "INVALID_AMOUNT") {
    super(code);
  }
}

export const parseUpiQr = (rawValue: string): ParsedUpiQr => {
  let url: URL;
  try {
    url = new URL(rawValue.trim());
  } catch {
    throw new UpiQrError("NOT_UPI");
  }
  if (url.protocol.toLowerCase() !== "upi:" || url.hostname.toLowerCase() !== "pay") {
    throw new UpiQrError("NOT_UPI");
  }
  const payeeUpiId = clean(url.searchParams.get("pa"), 196);
  if (!payeeUpiId || !UPI_ID_PATTERN.test(payeeUpiId)) throw new UpiQrError("INVALID_UPI");

  const currency = (clean(url.searchParams.get("cu"), 3) ?? "INR").toUpperCase();
  if (currency !== "INR") throw new UpiQrError("INVALID_CURRENCY");

  const rawAmount = clean(url.searchParams.get("am"), 16);
  const amount = rawAmount === null ? null : Number(rawAmount);
  if (rawAmount !== null && (!Number.isFinite(amount) || amount! <= 0 || amount! > 10_000_000 || !/^\d+(\.\d{1,2})?$/.test(rawAmount))) {
    throw new UpiQrError("INVALID_AMOUNT");
  }

  return {
    payeeUpiId,
    payeeName: clean(url.searchParams.get("pn")),
    transactionNote: clean(url.searchParams.get("tn")),
    currency: "INR",
    amount,
  };
};

export const getAmountConflict = (entered: number, qrAmount: number | null) =>
  qrAmount !== null && Math.abs(entered - qrAmount) >= 0.01 ? { entered, qrAmount } : null;

export const maskUpiId = (upiId: string) => {
  const [name, handle] = upiId.split("@");
  const visible = name.slice(0, Math.min(2, name.length));
  return `${visible}${"•".repeat(Math.max(3, name.length - visible.length))}@${handle}`;
};

export const buildUpiPaymentUri = (qr: ParsedUpiQr, amount: number, category: string, note?: string) => {
  if (!Number.isFinite(amount) || amount <= 0) throw new Error("INVALID_AMOUNT");
  const params = new URLSearchParams({
    pa: qr.payeeUpiId,
    am: amount.toFixed(2),
    cu: "INR",
    tn: clean(note || qr.transactionNote || `PG HUB ${category}`, 80) || `PG HUB ${category}`,
  });
  if (qr.payeeName) params.set("pn", qr.payeeName);
  return `upi://pay?${params.toString()}`;
};
