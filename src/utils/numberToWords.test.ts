import { describe, it, expect } from 'vitest';
import { numberToWords, formatIndianCurrency } from './numberToWords';

describe('numberToWords', () => {
  it('should convert 0 to Zero', () => {
    expect(numberToWords(0)).toBe('Zero');
  });

  it('should convert below 20 correctly', () => {
    expect(numberToWords(15)).toBe('Fifteen Only');
    expect(numberToWords(1)).toBe('One Only');
  });

  it('should convert tens correctly', () => {
    expect(numberToWords(45)).toBe('Forty Five Only');
    expect(numberToWords(99)).toBe('Ninety Nine Only');
  });

  it('should convert hundreds correctly', () => {
    expect(numberToWords(100)).toBe('One Hundred Only');
    expect(numberToWords(512)).toBe('Five Hundred Twelve Only');
  });

  it('should convert thousands correctly', () => {
    expect(numberToWords(1000)).toBe('One Thousand Only');
    expect(numberToWords(12500)).toBe('Twelve Thousand Five Hundred Only');
  });

  it('should convert lakhs correctly', () => {
    expect(numberToWords(100000)).toBe('One Lakh Only');
    expect(numberToWords(150000)).toBe('One Lakh Fifty Thousand Only');
  });

  it('should convert crores correctly', () => {
    expect(numberToWords(10000000)).toBe('One Crore Only');
    expect(numberToWords(120000000)).toBe('Twelve Crore Only');
  });
});

describe('formatIndianCurrency', () => {
  it('should format numbers with Indian comma grouping style', () => {
    expect(formatIndianCurrency(150000)).toBe('1,50,000');
    expect(formatIndianCurrency(123456789)).toBe('12,34,56,789');
    expect(formatIndianCurrency(500)).toBe('500');
  });
});
