import { toPng } from 'html-to-image';
import type { ReceiptData } from '@/components/ReceiptTemplate';

export const generateReceiptImage = async (element: HTMLElement): Promise<string> => {
  // Wait for images to load
  const images = element.querySelectorAll('img');
  await Promise.all(
    Array.from(images).map(
      (img) =>
        new Promise((resolve) => {
          if (img.complete) {
            resolve(true);
          } else {
            img.onload = () => resolve(true);
            img.onerror = () => resolve(false);
          }
        })
    )
  );

  // Generate PNG with high quality
  const dataUrl = await toPng(element, {
    quality: 1.0,
    pixelRatio: 2, // High DPI for sharp text
    cacheBust: true,
    backgroundColor: '#ffffff',
  });

  return dataUrl;
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
