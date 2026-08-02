import type { ParsedUpiQr } from "./types";

const MAX_TEXT_LENGTH = 120;
const MAX_QR_LENGTH = 4096;
const MAX_QR_PARAMETERS = 32;
const UPI_ID_PATTERN = /^[a-zA-Z0-9._-]{2,128}@[a-zA-Z0-9.-]{2,64}$/;
const PARAMETER_KEY_PATTERN = /^[a-z][a-z0-9._-]{0,31}$/;

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
  const normalizedValue = rawValue.trim();
  if (!normalizedValue || normalizedValue.length > MAX_QR_LENGTH) throw new UpiQrError("NOT_UPI");
  let url: URL;
  try {
    url = new URL(normalizedValue);
  } catch {
    throw new UpiQrError("NOT_UPI");
  }
  if (url.protocol.toLowerCase() !== "upi:" || url.hostname.toLowerCase() !== "pay") {
    throw new UpiQrError("NOT_UPI");
  }
  const paymentParameters: Record<string, string> = {};
  let parameterCount = 0;
  for (const [rawKey, rawParameter] of url.searchParams.entries()) {
    if (parameterCount >= MAX_QR_PARAMETERS) break;
    const key = rawKey.toLowerCase();
    const value = clean(rawParameter, 512);
    if (!PARAMETER_KEY_PATTERN.test(key) || !value) continue;
    paymentParameters[key] = value;
    parameterCount += 1;
  }

  const payeeUpiId = clean(paymentParameters.pa ?? null, 196);
  if (!payeeUpiId || !UPI_ID_PATTERN.test(payeeUpiId)) throw new UpiQrError("INVALID_UPI");

  const currency = (clean(paymentParameters.cu ?? null, 3) ?? "INR").toUpperCase();
  if (currency !== "INR") throw new UpiQrError("INVALID_CURRENCY");

  const rawAmount = clean(paymentParameters.am ?? null, 16);
  const amount = rawAmount === null ? null : Number(rawAmount);
  if (rawAmount !== null && (!Number.isFinite(amount) || amount! <= 0 || amount! > 10_000_000 || !/^\d+(\.\d{1,2})?$/.test(rawAmount))) {
    throw new UpiQrError("INVALID_AMOUNT");
  }

  return {
    payeeUpiId,
    payeeName: clean(paymentParameters.pn ?? null),
    transactionNote: clean(paymentParameters.tn ?? null),
    currency: "INR",
    amount,
    paymentParameters,
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
  const params = new URLSearchParams(qr.paymentParameters);
  params.set("pa", qr.payeeUpiId);
  if (!params.has("cu")) params.set("cu", "INR");
  if (qr.amount === null || Math.abs(qr.amount - amount) >= 0.01) params.set("am", amount.toFixed(2));
  if (note?.trim()) params.set("tn", clean(note, 80) || `PG HUB ${category}`);
  else if (!params.has("tn")) params.set("tn", `PG HUB ${category}`);
  if (qr.payeeName && !params.has("pn")) params.set("pn", qr.payeeName);
  return `upi://pay?${params.toString()}`;
};
