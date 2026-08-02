import { describe, expect, it } from "vitest";
import { buildUpiPaymentUri, getAmountConflict, isLikelyPersonalUpiQr, maskUpiId, parseUpiQr, UpiQrError } from "./upi";
import { DuplicatePaymentGuard, resolveUpiOutcome } from "./paymentOutcome";

describe("UPI QR parsing", () => {
  it("parses and sanitizes supported UPI fields", () => {
    const result = parseUpiQr("upi://pay?pa=merchant%40okaxis&pn=PG%20Shop&tn=Electricity&cu=INR&am=1250.50");
    expect(result).toMatchObject({ payeeUpiId: "merchant@okaxis", payeeName: "PG Shop", transactionNote: "Electricity", currency: "INR", amount: 1250.5 });
    expect(maskUpiId(result.payeeUpiId)).toBe("me••••••@okaxis");
  });

  it("rejects non-UPI and malformed payees", () => {
    expect(() => parseUpiQr("https://example.com/pay")).toThrowError(UpiQrError);
    expect(() => parseUpiQr("upi://pay?pa=not-an-id")).toThrowError(UpiQrError);
  });

  it("rejects unsupported currency and unsafe amounts", () => {
    expect(() => parseUpiQr("upi://pay?pa=a1%40okaxis&cu=USD")).toThrowError(UpiQrError);
    expect(() => parseUpiQr("upi://pay?pa=a1%40okaxis&am=-1")).toThrowError(UpiQrError);
  });

  it("builds a clean payment URI using the confirmed amount", () => {
    const qr = parseUpiQr("upi://pay?pa=merchant%40okaxis&pn=Shop&am=10");
    const uri = new URL(buildUpiPaymentUri(qr, 20, "Utilities", "Water bill"));
    expect(uri.searchParams.get("am")).toBe("20.00");
    expect(uri.searchParams.get("tn")).toBe("Water bill");
    expect(uri.searchParams.get("pa")).toBe("merchant@okaxis");
  });

  it("preserves PSP and merchant QR parameters required by UPI apps", () => {
    const qr = parseUpiQr("upi://pay?pa=merchant%40okaxis&pn=Shop&mc=5812&tr=REF123&mode=02&orgid=000000&sign=signed-value&am=10&cu=INR");
    const uri = new URL(buildUpiPaymentUri(qr, 10, "Utilities"));
    expect(Object.fromEntries(uri.searchParams)).toMatchObject({
      pa: "merchant@okaxis",
      mc: "5812",
      tr: "REF123",
      mode: "02",
      orgid: "000000",
      sign: "signed-value",
      am: "10",
      cu: "INR",
    });
    expect(isLikelyPersonalUpiQr(qr)).toBe(false);
  });

  it("identifies personal QR codes that need the manual UPI ID fallback", () => {
    expect(isLikelyPersonalUpiQr(parseUpiQr("upi://pay?pa=person%40ybl&pn=Person"))).toBe(true);
    expect(isLikelyPersonalUpiQr(parseUpiQr("upi://pay?pa=person%40ybl&pn=Person&mc=0000"))).toBe(true);
    expect(isLikelyPersonalUpiQr(parseUpiQr("upi://pay?pa=person%40ybl&pn=Person&mode=02&orgid=400011"))).toBe(true);
  });
});

describe("payment decisions", () => {
  it("detects QR amount conflicts", () => {
    expect(getAmountConflict(500, 600)).toEqual({ entered: 500, qrAmount: 600 });
    expect(getAmountConflict(500, 500)).toBeNull();
    expect(getAmountConflict(500, null)).toBeNull();
  });

  it("maps every result without assuming success", () => {
    expect(resolveUpiOutcome("success")).toMatchObject({ method: "UPI", status: "Paid" });
    expect(resolveUpiOutcome("failed")).toMatchObject({ method: "UPI", status: "Failed" });
    expect(resolveUpiOutcome("pending")).toMatchObject({ method: "UPI", status: "Pending" });
    expect(resolveUpiOutcome("cancel")).toEqual({ shouldRecord: false });
  });

  it("records the exact cash fallback semantics", () => {
    expect(resolveUpiOutcome("cash")).toEqual({ shouldRecord: true, method: "Cash", status: "Paid", note: "UPI attempted, payment completed using cash" });
  });

  it("blocks duplicate in-flight records and permits retry after failure", () => {
    const guard = new DuplicatePaymentGuard();
    expect(guard.begin("tx-1")).toBe(true);
    expect(guard.begin("tx-1")).toBe(false);
    guard.end("tx-1");
    expect(guard.begin("tx-1")).toBe(true);
  });
});
