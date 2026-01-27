const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
  'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

const convertBelowThousand = (num: number): string => {
  if (num === 0) return '';
  if (num < 20) return ones[num];
  if (num < 100) return tens[Math.floor(num / 10)] + (num % 10 !== 0 ? ' ' + ones[num % 10] : '');
  return ones[Math.floor(num / 100)] + ' Hundred' + (num % 100 !== 0 ? ' ' + convertBelowThousand(num % 100) : '');
};

export const numberToWords = (num: number): string => {
  if (num === 0) return 'Zero';
  if (num < 0) return 'Minus ' + numberToWords(-num);

  let result = '';

  // Crore (1,00,00,000)
  if (num >= 10000000) {
    result += convertBelowThousand(Math.floor(num / 10000000)) + ' Crore ';
    num %= 10000000;
  }

  // Lakh (1,00,000)
  if (num >= 100000) {
    result += convertBelowThousand(Math.floor(num / 100000)) + ' Lakh ';
    num %= 100000;
  }

  // Thousand (1,000)
  if (num >= 1000) {
    result += convertBelowThousand(Math.floor(num / 1000)) + ' Thousand ';
    num %= 1000;
  }

  // Remaining
  if (num > 0) {
    result += convertBelowThousand(num);
  }

  return result.trim() + ' Only';
};

export const formatIndianCurrency = (num: number): string => {
  const numStr = num.toString();
  const lastThree = numStr.slice(-3);
  const remaining = numStr.slice(0, -3);
  
  if (remaining === '') return lastThree;
  
  return remaining.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + ',' + lastThree;
};
