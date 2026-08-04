import { Capacitor, registerPlugin } from "@capacitor/core";
import { BarcodeFormat, BarcodeScanner, LensFacing } from "@capacitor-mlkit/barcode-scanning";
import { FilePicker } from "@capawesome/capacitor-file-picker";
import "barcode-detector/polyfill";

export interface UpiApp { packageName: string; label: string; supportsPaymentIntent: boolean }
interface UpiPaymentPlugin {
  getCompatibleApps(options: { uri: string; includeInstalledUpiApps?: boolean }): Promise<{ apps: UpiApp[] }>;
  getInstalledUpiApps(): Promise<{ apps: UpiApp[] }>;
  launch(options: { uri: string; packageName?: string; forceChooser?: boolean }): Promise<{ returned: boolean }>;
  launchForUpiId(options: { packageName: string; upiId: string }): Promise<{ returned: boolean }>;
  launchForContact(options: { packageName: string; phoneNumber: string }): Promise<{ returned: boolean }>;
}

const UpiPayment = registerPlugin<UpiPaymentPlugin>("UpiPayment");

export class NativePaymentError extends Error {
  constructor(public readonly code: "UNSUPPORTED" | "PERMISSION_DENIED" | "CANCELLED" | "INVALID_QR" | "NO_QR" | "UNREADABLE_IMAGE" | "NO_UPI_APP" | "OFFLINE", message?: string) {
    super(message || code);
  }
}

const firstRawValue = (barcodes: Array<{ rawValue: string }>) => {
  const value = barcodes.find((barcode) => barcode.rawValue.trim())?.rawValue;
  if (!value) throw new NativePaymentError("NO_QR", "No readable QR code was found in this image.");
  return value;
};

const isMobileBrowser = () => /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

const webCameraError = (error: unknown) => {
  if (error instanceof DOMException && ["NotAllowedError", "PermissionDeniedError", "SecurityError"].includes(error.name)) {
    return new NativePaymentError("PERMISSION_DENIED");
  }
  if (!window.isSecureContext) {
    return new NativePaymentError("UNSUPPORTED", "Camera scanning on web requires HTTPS or localhost.");
  }
  return error instanceof NativePaymentError ? error : new NativePaymentError("UNSUPPORTED", "This browser could not start the camera scanner.");
};

export const isNativePaymentPlatform = () => Capacitor.isNativePlatform();

export const startWebUpiQrScan = async (
  videoElement: HTMLVideoElement,
  onScan: (rawValue: string) => void,
) => {
  if (Capacitor.isNativePlatform()) throw new NativePaymentError("UNSUPPORTED");
  if (!window.isSecureContext) throw new NativePaymentError("UNSUPPORTED", "Camera scanning on web requires HTTPS or localhost.");
  if (!navigator.mediaDevices?.getUserMedia) throw new NativePaymentError("UNSUPPORTED", "Camera scanning is not supported by this browser.");

  const supported = await BarcodeScanner.isSupported();
  if (!supported.supported) throw new NativePaymentError("UNSUPPORTED", "QR scanning is not supported by this browser.");

  let stopped = false;
  const listener = await BarcodeScanner.addListener("barcodesScanned", async ({ barcodes }) => {
    if (stopped || barcodes.length === 0) return;
    try {
      const rawValue = firstRawValue(barcodes);
      stopped = true;
      await BarcodeScanner.stopScan();
      await listener.remove();
      onScan(rawValue);
    } catch {
      // Keep the camera open when a frame does not contain a readable value.
    }
  });

  try {
    await BarcodeScanner.startScan({ formats: [BarcodeFormat.QrCode], lensFacing: LensFacing.Back, videoElement });
  } catch (error) {
    stopped = true;
    await listener.remove();
    throw webCameraError(error);
  }

  return async () => {
    if (stopped) return;
    stopped = true;
    await listener.remove();
    await BarcodeScanner.stopScan();
  };
};

export const scanUpiQr = async () => {
  if (!Capacitor.isNativePlatform()) throw new NativePaymentError("UNSUPPORTED", "QR scanning is available in the Android app.");
  const supported = await BarcodeScanner.isSupported();
  if (!supported.supported) throw new NativePaymentError("UNSUPPORTED");
  let permission = await BarcodeScanner.checkPermissions();
  if (permission.camera !== "granted" && permission.camera !== "limited") permission = await BarcodeScanner.requestPermissions();
  if (permission.camera !== "granted" && permission.camera !== "limited") throw new NativePaymentError("PERMISSION_DENIED");
  try {
    const result = await BarcodeScanner.scan({ formats: [BarcodeFormat.QrCode], autoZoom: true });
    return firstRawValue(result.barcodes);
  } catch (error) {
    if (error instanceof NativePaymentError) throw error;
    throw new NativePaymentError("CANCELLED");
  }
};

const decodeWebQrImage = async (file: File) => {
  if (!file.type.startsWith("image/")) {
    throw new NativePaymentError("UNREADABLE_IMAGE", "Choose a valid image or QR screenshot.");
  }
  try {
    const source = await createImageBitmap(file);
    try {
      const detector = new BarcodeDetector({ formats: ["qr_code"] });
      const barcodes = await detector.detect(source);
      return firstRawValue(barcodes);
    } finally {
      source.close();
    }
  } catch (error) {
    if (error instanceof NativePaymentError) throw error;

    const objectUrl = URL.createObjectURL(file);
    try {
      const image = new Image();
      image.crossOrigin = "anonymous";
      await new Promise<void>((resolve, reject) => {
        image.onload = () => resolve();
        image.onerror = () => reject(new NativePaymentError("UNREADABLE_IMAGE", "This image could not be opened. Try another screenshot."));
        image.src = objectUrl;
      });
      const canvas = document.createElement("canvas");
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;
      const context = canvas.getContext("2d", { willReadFrequently: true });
      if (!context || !canvas.width || !canvas.height) {
        throw new NativePaymentError("UNREADABLE_IMAGE", "This image could not be read.");
      }
      context.drawImage(image, 0, 0);
      const detector = new BarcodeDetector({ formats: ["qr_code"] });
      return firstRawValue(await detector.detect(canvas));
    } finally {
      URL.revokeObjectURL(objectUrl);
    }
  }
};

const nativeGalleryError = (error: unknown) => {
  if (error instanceof NativePaymentError) return error;
  const message = error instanceof Error ? error.message : String(error);
  const normalized = message.toLowerCase();
  if (normalized.includes("cancel") || normalized.includes("canceled") || normalized.includes("cancelled")) {
    return new NativePaymentError("CANCELLED");
  }
  if (normalized.includes("decode") || normalized.includes("image") || normalized.includes("file")) {
    return new NativePaymentError("UNREADABLE_IMAGE", "This image could not be read. Try a clearer screenshot.");
  }
  return new NativePaymentError("INVALID_QR", "The selected image could not be scanned.");
};

export const scanUpiQrFromGallery = async () => {
  if (!Capacitor.isNativePlatform()) {
    return await new Promise<string>((resolve, reject) => {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = "image/*";
      input.addEventListener("cancel", () => reject(new NativePaymentError("CANCELLED")), { once: true });
      input.onchange = async () => {
        const file = input.files?.[0];
        if (!file) { reject(new NativePaymentError("CANCELLED")); return; }
        try { resolve(await decodeWebQrImage(file)); }
        catch (error) { reject(error instanceof NativePaymentError ? error : new NativePaymentError("INVALID_QR")); }
      };
      input.click();
    });
  }
  try {
    const picked = await FilePicker.pickImages({ limit: 1, skipTranscoding: true });
    const path = picked.files[0]?.path;
    if (!path) throw new NativePaymentError("CANCELLED");
    const result = await BarcodeScanner.readBarcodesFromImage({ path, formats: [BarcodeFormat.QrCode] });
    return firstRawValue(result.barcodes);
  } catch (error) {
    throw nativeGalleryError(error);
  }
};

export const openCameraSettings = () => {
  if (!Capacitor.isNativePlatform()) throw new NativePaymentError("UNSUPPORTED", "Allow camera access from your browser's site settings.");
  return BarcodeScanner.openSettings();
};

export const getCompatibleUpiApps = async (uri: string, includeInstalledUpiApps = false) => {
  if (!Capacitor.isNativePlatform()) return [] as UpiApp[];
  const { apps } = await UpiPayment.getCompatibleApps({ uri, includeInstalledUpiApps });
  return apps;
};

export const getInstalledUpiApps = async () => {
  if (!Capacitor.isNativePlatform()) return [] as UpiApp[];
  const { apps } = await UpiPayment.getInstalledUpiApps();
  return apps;
};

export const launchUpiPayment = async (uri: string, packageName?: string) => {
  if (!navigator.onLine) throw new NativePaymentError("OFFLINE");
  if (!Capacitor.isNativePlatform()) {
    if (!isMobileBrowser()) throw new NativePaymentError("NO_UPI_APP", "Open PG HUB on your phone to launch a UPI app. Desktop browsers cannot open phone payment apps.");
    window.location.assign(uri);
    return { returned: false };
  }
  try {
    return await UpiPayment.launch({ uri, packageName, forceChooser: !packageName });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes("NO_UPI_APP")) throw new NativePaymentError("NO_UPI_APP");
    throw error;
  }
};

export const launchUpiAppForManualPayment = async (packageName: string, upiId: string) => {
  if (!navigator.onLine) throw new NativePaymentError("OFFLINE");
  if (!Capacitor.isNativePlatform()) throw new NativePaymentError("UNSUPPORTED");
  try {
    return await UpiPayment.launchForUpiId({ packageName, upiId });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes("NO_UPI_APP")) throw new NativePaymentError("NO_UPI_APP");
    throw error;
  }
};
