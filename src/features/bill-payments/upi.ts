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
  
  if (!/^upi:\/\/pay(?:\?|$)/i.test(normalizedValue)) throw new UpiQrError("NOT_UPI");

  const qIndex = normalizedValue.indexOf("?");
  const searchStr = qIndex === -1 ? "" : normalizedValue.slice(qIndex + 1);
  const searchParams = new URLSearchParams(searchStr);
  const paymentParameters: Record<string, string> = {};
  let parameterCount = 0;
  for (const [rawKey, rawParameter] of searchParams.entries()) {
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

export const isLikelyPersonalUpiQr = (qr: ParsedUpiQr) => {
  const { mc } = qr.paymentParameters;
  return !mc || mc === "0000";
};

export const maskUpiId = (upiId: string) => {
  const [name, handle] = upiId.split("@");
  const visible = name.slice(0, Math.min(2, name.length));
  return `${visible}${"•".repeat(Math.max(3, name.length - visible.length))}@${handle}`;
};

export const buildUpiPaymentUri = (qr: ParsedUpiQr, amount: number, category: string, note?: string) => {
  if (!Number.isFinite(amount) || amount <= 0) throw new Error("INVALID_AMOUNT");
  const params = new URLSearchParams();
  
  // Set required parameters in standard NPCI order: pa, pn, am, cu, tn
  params.set("pa", qr.payeeUpiId);
  if (qr.payeeName) {
    params.set("pn", qr.payeeName);
  }

  // Retain additional valid parameters from QR (excluding pa, pn, am, cu, tn)
  for (const [k, v] of Object.entries(qr.paymentParameters)) {
    const keyLower = k.toLowerCase();
    if (!["pa", "pn", "am", "cu", "tn"].includes(keyLower) && v) {
      params.set(keyLower, v);
    }
  }

  params.set("am", amount.toFixed(2));
  params.set("cu", "INR");

  const resolvedNote = note?.trim() ? clean(note, 80) : (qr.transactionNote ? clean(qr.transactionNote, 80) : `PG HUB ${category}`);
  if (resolvedNote) {
    params.set("tn", resolvedNote);
  }

  // URLSearchParams uses '+' for spaces, which triggers security declines in PhonePe/GooglePay. Use %20 instead.
  return `upi://pay?${params.toString().replace(/\+/g, "%20")}`;
};
