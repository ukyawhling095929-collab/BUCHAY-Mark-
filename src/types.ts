/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Store {
  id: string;
  name: string;
  location: string;
  phone: string;
}

export interface Product {
  id: string;
  name: string;
  sku: string;
  baseCost: number;
  category: string;
  customMargin?: number; // Optional product-specific margin
  stock: number;
}

export interface Region {
  id: string;
  name: string;
  markupPercentage: number; // Regional markup
}

export interface Customer {
  id: string;
  name: string;
  regionId: string;
  specialDiscount: number; // Customer specific discount or adjustment
  tier: 'Standard' | 'Silver' | 'Gold' | 'Platinum';
}

export interface Sale {
  id: string;
  date: string;
  customerId: string;
  customerName: string;
  storeId: string;
  items: {
    productId: string;
    quantity: number;
    name?: string;
    price: number;
    cost: number;
    total: number;
  }[];
  total: number;
}

export interface PricingRule {
  productId: string;
  regionId?: string;
  customerId?: string;
  customPrice?: number;
  targetMargin: number; // e.g., 0.2 for 20%
}
