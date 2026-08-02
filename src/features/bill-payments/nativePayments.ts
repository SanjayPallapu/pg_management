import { Capacitor, registerPlugin } from "@capacitor/core";
import { BarcodeFormat, BarcodeScanner } from "@capacitor-mlkit/barcode-scanning";
import { FilePicker } from "@capawesome/capacitor-file-picker";

interface UpiApp { packageName: string; label: string }
interface UpiPaymentPlugin {
  getCompatibleApps(options: { uri: string }): Promise<{ apps: UpiApp[] }>;
  launch(options: { uri: string; packageName?: string; forceChooser?: boolean }): Promise<{ returned: boolean }>;
}

const UpiPayment = registerPlugin<UpiPaymentPlugin>("UpiPayment");

export class NativePaymentError extends Error {
  constructor(public readonly code: "UNSUPPORTED" | "PERMISSION_DENIED" | "CANCELLED" | "INVALID_QR" | "NO_UPI_APP" | "OFFLINE", message?: string) {
    super(message || code);
  }
}

const firstRawValue = (barcodes: Array<{ rawValue: string }>) => {
  const value = barcodes.find((barcode) => barcode.rawValue.trim())?.rawValue;
  if (!value) throw new NativePaymentError("INVALID_QR");
  return value;
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

export const scanUpiQrFromGallery = async () => {
  if (!Capacitor.isNativePlatform()) throw new NativePaymentError("UNSUPPORTED", "Gallery scanning is available in the Android app.");
  try {
    const picked = await FilePicker.pickImages({ limit: 1, skipTranscoding: true });
    const path = picked.files[0]?.path;
    if (!path) throw new NativePaymentError("CANCELLED");
    const result = await BarcodeScanner.readBarcodesFromImage({ path, formats: [BarcodeFormat.QrCode] });
    return firstRawValue(result.barcodes);
  } catch (error) {
    if (error instanceof NativePaymentError) throw error;
    throw new NativePaymentError("CANCELLED");
  }
};

export const openCameraSettings = () => BarcodeScanner.openSettings();

export const getCompatibleUpiApps = async (uri: string) => {
  if (!Capacitor.isNativePlatform()) return [] as UpiApp[];
  const { apps } = await UpiPayment.getCompatibleApps({ uri });
  return apps;
};

export const launchUpiPayment = async (uri: string, packageName?: string) => {
  if (!navigator.onLine) throw new NativePaymentError("OFFLINE");
  if (!Capacitor.isNativePlatform()) throw new NativePaymentError("UNSUPPORTED", "UPI apps can only be opened from the Android app.");
  try {
    return await UpiPayment.launch({ uri, packageName, forceChooser: !packageName });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes("NO_UPI_APP")) throw new NativePaymentError("NO_UPI_APP");
    throw error;
  }
};
