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

// Helper to convert image to base64 inline
const convertImagesToBase64 = async (element: HTMLElement): Promise<void> => {
  const images = element.querySelectorAll('img');
  
  for (const img of Array.from(images)) {
    if (img.src.startsWith('data:')) continue; // Already base64
    
    try {
      const response = await fetch(img.src);
      const blob = await response.blob();
      const base64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(blob);
      });
      img.src = base64;
    } catch (error) {
      console.error('Failed to convert image to base64:', error);
    }
  }
};

export const generateReceiptImage = async (element: HTMLElement): Promise<string> => {
  // Clone the element and position it for capture
  const clone = element.cloneNode(true) as HTMLElement;
  clone.style.position = 'fixed';
  clone.style.left = '0';
  clone.style.top = '0';
  clone.style.zIndex = '99999';
  clone.style.pointerEvents = 'none';
  clone.style.opacity = '0'; // Hide visually but keep layout
  
  document.body.appendChild(clone);

  try {
    // Convert images to base64 to ensure they render
    await convertImagesToBase64(clone);
    
    // Wait for images to fully load
    await waitForImages(clone);
    
    // Additional wait for rendering
    await new Promise(resolve => setTimeout(resolve, 200));

    // Make visible for capture
    clone.style.opacity = '1';

    // Generate PNG with high quality
    const dataUrl = await toPng(clone, {
      quality: 1.0,
      pixelRatio: 2,
      cacheBust: true,
      backgroundColor: '#ffffff',
      width: 500,
      skipFonts: true,
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
  };
};
