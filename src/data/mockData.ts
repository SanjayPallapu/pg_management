import { Room } from '@/types';

// Generate all 23 rooms with capacities and mock data
export const mockRooms: Room[] = [
  // 1st Floor (101-109)
  { id: 'mock-101', roomNo: '101', status: 'Occupied', capacity: 2, tenants: [
    { id: '1', name: 'Rahul Sharma', phone: '9876543210', startDate: '2024-01-01', monthlyRent: 4000, paymentStatus: 'Paid' },
    { id: '2', name: 'Amit Kumar', phone: '9876543211', startDate: '2024-01-15', monthlyRent: 4000, paymentStatus: 'Paid' }
  ], rentAmount: 8000, floor: 1, notes: 'Good tenants' },
  
  { id: 'mock-102', roomNo: '102', status: 'Partially Occupied', capacity: 4, tenants: [
    { id: '3', name: 'Priya Singh', phone: '9876543212', startDate: '2024-02-01', monthlyRent: 2000, paymentStatus: 'Pending' }
  ], rentAmount: 8000, floor: 1, notes: '3 beds available' },
  
  { id: 'mock-103', roomNo: '103', status: 'Vacant', capacity: 3, tenants: [], rentAmount: 7500, floor: 1 },
  { id: 'mock-104', roomNo: '104', status: 'Vacant', capacity: 3, tenants: [], rentAmount: 7500, floor: 1 },
  { id: 'mock-105', roomNo: '105', status: 'Vacant', capacity: 4, tenants: [], rentAmount: 8000, floor: 1 },
  { id: 'mock-106', roomNo: '106', status: 'Vacant', capacity: 4, tenants: [], rentAmount: 8000, floor: 1 },
  { id: 'mock-107', roomNo: '107', status: 'Vacant', capacity: 3, tenants: [], rentAmount: 7500, floor: 1 },
  { id: 'mock-108', roomNo: '108', status: 'Vacant', capacity: 3, tenants: [], rentAmount: 7500, floor: 1 },
  { id: 'mock-109', roomNo: '109', status: 'Vacant', capacity: 2, tenants: [], rentAmount: 6000, floor: 1 },

  // 2nd Floor (201-209)
  { id: 'mock-201', roomNo: '201', status: 'Occupied', capacity: 3, tenants: [
    { id: '4', name: 'Ravi Mehta', phone: '9876543216', startDate: '2024-01-01', monthlyRent: 3000, paymentStatus: 'Paid' },
    { id: '5', name: 'Deepika Roy', phone: '9876543217', startDate: '2024-02-01', monthlyRent: 3000, paymentStatus: 'Pending' },
    { id: '6', name: 'Suresh Jain', phone: '9876543218', startDate: '2024-01-15', monthlyRent: 3000, paymentStatus: 'Paid' }
  ], rentAmount: 9000, floor: 2 },
  
  { id: 'mock-202', roomNo: '202', status: 'Vacant', capacity: 4, tenants: [], rentAmount: 10000, floor: 2 },
  { id: 'mock-203', roomNo: '203', status: 'Vacant', capacity: 3, tenants: [], rentAmount: 9000, floor: 2 },
  { id: 'mock-204', roomNo: '204', status: 'Vacant', capacity: 3, tenants: [], rentAmount: 9000, floor: 2 },
  { id: 'mock-205', roomNo: '205', status: 'Vacant', capacity: 5, tenants: [], rentAmount: 12500, floor: 2 },
  { id: 'mock-206', roomNo: '206', status: 'Vacant', capacity: 4, tenants: [], rentAmount: 10000, floor: 2 },
  { id: 'mock-207', roomNo: '207', status: 'Vacant', capacity: 3, tenants: [], rentAmount: 9000, floor: 2 },
  { id: 'mock-208', roomNo: '208', status: 'Vacant', capacity: 3, tenants: [], rentAmount: 9000, floor: 2 },
  { id: 'mock-209', roomNo: '209', status: 'Vacant', capacity: 2, tenants: [], rentAmount: 6500, floor: 2 },

  // 3rd Floor (301-305)
  { id: 'mock-301', roomNo: '301', status: 'Partially Occupied', capacity: 5, tenants: [
    { id: '7', name: 'Arjun Singh', phone: '9876543222', startDate: '2024-01-01', monthlyRent: 2500, paymentStatus: 'Paid' },
    { id: '8', name: 'Ritika Verma', phone: '9876543223', startDate: '2024-02-01', monthlyRent: 2500, paymentStatus: 'Pending' }
  ], rentAmount: 12500, floor: 3, notes: '3 beds available' },
  
  { id: 'mock-302', roomNo: '302', status: 'Vacant', capacity: 5, tenants: [], rentAmount: 12500, floor: 3 },
  { id: 'mock-303', roomNo: '303', status: 'Vacant', capacity: 2, tenants: [], rentAmount: 7000, floor: 3 },
  { id: 'mock-304', roomNo: '304', status: 'Vacant', capacity: 2, tenants: [], rentAmount: 7000, floor: 3 },
  { id: 'mock-305', roomNo: '305', status: 'Vacant', capacity: 2, tenants: [], rentAmount: 7000, floor: 3 }
];
