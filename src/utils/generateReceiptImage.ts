import { toPng } from 'html-to-image';
import type { ReceiptData } from '@/components/ReceiptTemplate';

export const generateReceiptImage = async (element: HTMLElement): Promise<string> => {
  // Clone the element and position it for capture
  const clone = element.cloneNode(true) as HTMLElement;
  clone.style.position = 'absolute';
  clone.style.left = '0';
  clone.style.top = '0';
  clone.style.zIndex = '-1';
  clone.style.pointerEvents = 'none';
  
  document.body.appendChild(clone);

  try {
    // Wait a bit for rendering
    await new Promise(resolve => setTimeout(resolve, 100));

    // Generate PNG with high quality
    const dataUrl = await toPng(clone, {
      quality: 1.0,
      pixelRatio: 2,
      cacheBust: true,
      backgroundColor: '#ffffff',
      width: 500,
      style: {
        transform: 'scale(1)',
        transformOrigin: 'top left',
      }
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
