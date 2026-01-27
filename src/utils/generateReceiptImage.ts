import { toPng } from 'html-to-image';
import type { ReceiptData } from '@/components/ReceiptTemplate';

// Helper to wait for all images to load
const waitForImages = async (element: HTMLElement): Promise<void> => {
  const images = element.querySelectorAll('img');
  const imagePromises = Array.from(images).map((img) => {
    if (img.complete) return Promise.resolve();
    return new Promise<void>((resolve) => {
      img.onload = () => resolve();
      img.onerror = () => resolve(); // Resolve even on error to not block
    });
  });
  await Promise.all(imagePromises);
};

// Helper to convert image to data URL inline (required for receipt logo/images to render reliably)
const toDataUrlViaFetch = async (src: string): Promise<string> => {
  const response = await fetch(src, { cache: 'no-store' });
  const blob = await response.blob();
  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed reading image blob'));
    reader.onloadend = () => resolve(reader.result as string);
    reader.readAsDataURL(blob);
  });
};

const toDataUrlViaCanvas = async (src: string): Promise<string> => {
  return await new Promise<string>((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = image.naturalWidth || image.width;
        canvas.height = image.naturalHeight || image.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject(new Error('Canvas context not available'));
        ctx.drawImage(image, 0, 0);
        resolve(canvas.toDataURL('image/png'));
      } catch (e) {
        reject(e);
      }
    };
    image.onerror = () => reject(new Error('Failed loading image for canvas conversion'));
    image.src = src;
  });
};

const isHttpUrl = (src: string) => /^https?:\/\//i.test(src);

const convertImagesToDataUrl = async (element: HTMLElement): Promise<void> => {
  const images = Array.from(element.querySelectorAll('img'));

  for (const img of images) {
    const src = img.currentSrc || img.src;
    if (!src || src.startsWith('data:')) continue;

    // Helps some renderers fetch images without tainting the canvas
    img.setAttribute('crossorigin', 'anonymous');

    try {
      let dataUrl: string | null = null;

      // In mobile app/webview builds, image URLs can be non-http (e.g. capacitor://).
      // Fetch can't handle those reliably, but Image+Canvas usually can.
      if (!isHttpUrl(src)) {
        dataUrl = await toDataUrlViaCanvas(src);
      } else {
        // Prefer fetch for http(s), fallback to canvas if needed.
        try {
          dataUrl = await toDataUrlViaFetch(src);
        } catch {
          dataUrl = await toDataUrlViaCanvas(src);
        }
      }

      if (dataUrl) img.src = dataUrl;
    } catch (error) {
      console.error('Receipt image embed failed for:', src, error);
    }
  }
};

export const generateReceiptImage = async (element: HTMLElement): Promise<string> => {
  // Clone the element and position it for capture - completely offscreen
  const clone = element.cloneNode(true) as HTMLElement;
  clone.style.position = 'fixed';
  clone.style.left = '-9999px';
  clone.style.top = '-9999px';
  clone.style.zIndex = '-9999';
  clone.style.pointerEvents = 'none';
  clone.style.visibility = 'visible';
  clone.style.opacity = '1';

  document.body.appendChild(clone);

  try {
    // Ensure all images (logo) are inlined as data URLs before capture
    await convertImagesToDataUrl(clone);

    // Wait for images to fully load
    await waitForImages(clone);

    // Additional wait for rendering
    await new Promise((resolve) => setTimeout(resolve, 250));

    const rect = clone.getBoundingClientRect();
    const width = Math.max(1, Math.ceil(rect.width));
    const height = Math.max(1, Math.ceil(rect.height));

    // Generate PNG with high quality
    const dataUrl = await toPng(clone, {
      quality: 1.0,
      pixelRatio: 2,
      cacheBust: true,
      backgroundColor: '#ffffff',
      width,
      height,
      skipFonts: true,
      onImageErrorHandler: (event) => {
        console.error('Receipt image load error:', event);
      },
    });

    return dataUrl;
  } finally {
    // Clean up
    document.body.removeChild(clone);
  }
};

export const downloadReceiptImage = (dataUrl: string, tenantName: string): void => {
  const link = document.createElement('a');
  link.download = `receipt-${tenantName.replace(/\s+/g, '-').toLowerCase()}-${new Date().toISOString().split('T')[0]}.png`;
  link.href = dataUrl;
  link.click();
};

export const convertToReceiptData = (
  tenantName: string,
  tenantPhone: string,
  paymentMode: string,
  paymentDate: string,
  joiningDate: string,
  forMonth: string,
  roomNo: string,
  sharingType: string,
  amount: number,
  amountPaid: number,
  isFullPayment: boolean,
  remainingBalance?: number
): ReceiptData => {

    // Parse forMonth (e.g., "March 2025") to extract month and year
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const parts = forMonth?.trim().split(' ') || [];
  const monthName = parts[0] || '';
  const yearString = parts[1] || '';
  const monthIndex = monthNames.indexOf(monthName);
  const now = new Date();
  const selectedMonth = monthIndex >= 0 ? monthIndex + 1 : now.getMonth() + 1;
  const selectedYear = parseInt(yearString, 10) || now.getFullYear();

  return {
    tenant: {
      name: tenantName,
      joiningDate: joiningDate,
    },
    stay: {
      month: forMonth,
      roomNo: roomNo,
      sharingType: sharingType,
    },
    payment: {
      type: isFullPayment ? 'FULL' : 'PARTIAL',
      amount: amount,
      paid: amountPaid,
      balance: remainingBalance || 0,
      mode: paymentMode === 'upi' ? 'Online' : paymentMode === 'cash' ? 'Cash' : paymentMode,
      date: paymentDate,
    },
        selectedMonth,
    selectedYear,
  };
};
