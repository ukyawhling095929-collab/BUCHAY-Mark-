import { Product, Region, Customer, Store } from './types';

export const INITIAL_PRODUCTS: Product[] = [
  { id: '1', name: 'High-Grade Arabica Coffee', sku: 'COF-001', baseCost: 12.50, category: 'Beverages', customMargin: 15, stock: 50 },
  { id: '2', name: 'Organic Extra Virgin Olive Oil 1L', sku: 'OIL-002', baseCost: 8.20, category: 'Oils', customMargin: 25, stock: 30 },
  { id: '3', name: 'Whole Bean Coffee 1kg', sku: 'COF-003', baseCost: 15.00, category: 'Beverages', customMargin: 20, stock: 100 },
  { id: '4', name: 'Sea Salt Crackers 200g', sku: 'SNK-004', baseCost: 1.20, category: 'Snacks', stock: 200 },
];

export const INITIAL_STORES: Store[] = [
  { id: 'store-1', name: 'Main Branch', location: 'Downtown', phone: '555-0101' },
  { id: 'store-2', name: 'North Warehouse', location: 'Industrial Zone', phone: '555-0102' },
];

export const INITIAL_REGIONS: Region[] = [
  { id: 'reg-1', name: 'East Coast', markupPercentage: 5 },
  { id: 'reg-2', name: 'West Coast', markupPercentage: 8 },
  { id: 'reg-3', name: 'Central', markupPercentage: 3 },
];

export const INITIAL_CUSTOMERS: Customer[] = [
  { id: 'cust-1', name: 'City Supermarket', regionId: 'reg-1', specialDiscount: 2, tier: 'Gold' },
  { id: 'cust-2', name: 'Coastal Grocers', regionId: 'reg-2', specialDiscount: 0, tier: 'Standard' },
  { id: 'cust-3', name: 'Central Mart', regionId: 'reg-3', specialDiscount: 5, tier: 'Platinum' },
];
