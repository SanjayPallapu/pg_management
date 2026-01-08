export interface Room {
  id?: string;
  roomNo: string;
  status: 'Vacant' | 'Occupied' | 'Partially Occupied';
  capacity: number;
  tenants: Tenant[];
  rentAmount: number;
  notes?: string;
  floor: 1 | 2 | 3;
}

export interface Tenant {
  id: string;
  name: string;
  phone: string;
  startDate: string;
  endDate?: string;
  monthlyRent: number;
  paymentStatus: 'Paid' | 'Pending';
  paymentDate?: string;
  securityDepositAmount?: number | null;
  securityDepositDate?: string | null;
  securityDepositMode?: 'upi' | 'cash' | null;
  isLocked?: boolean;
}

export interface PaymentEntry {
  amount: number;
  date: string;
  type: 'partial' | 'full' | 'remaining';
  mode: 'upi' | 'cash';
}

export interface TenantPayment {
  id: string;
  tenantId: string;
  month: number;
  year: number;
  paymentStatus: 'Paid' | 'Pending' | 'Partial';
  paymentDate?: string;
  amount: number;
  amountPaid: number;
  paymentEntries: PaymentEntry[];
  whatsappSent?: boolean;
  whatsappSentAt?: string;
  notes?: string;
}

export interface DashboardStats {
  totalRooms: number;
  occupiedCount: number;
  vacantCount: number;
  rentCollected: number;
  pendingRent: number;
}
