/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from 'react';
import { 
  LayoutDashboard, 
  Package, 
  MapPin, 
  Users, 
  Calculator, 
  TrendingUp, 
  Search,
  Plus,
  ChevronRight,
  DollarSign,
  Percent,
  Info,
  X,
  Trash2,
  Edit2,
  Save
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell
} from 'recharts';

import { Product, Region, Customer, Store, Sale } from './types';
import { INITIAL_PRODUCTS, INITIAL_REGIONS, INITIAL_CUSTOMERS, INITIAL_STORES } from './constants';
import { TRANSLATIONS, Language } from './translations';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Persistence helpers
const STORAGE_KEYS = {
  PRODUCTS: 'wholesale_products',
  REGIONS: 'wholesale_regions',
  CUSTOMERS: 'wholesale_customers',
  MARGIN: 'wholesale_margin'
};

export default function App() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'sales' | 'products' | 'regions' | 'customers' | 'stores' | 'history'>('dashboard');
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [language, setLanguage] = useState<Language>(() => {
    const saved = localStorage.getItem('wholesale_lang');
    return (saved as Language) || 'en';
  });

  const t = TRANSLATIONS[language];
  
  // State with LocalStorage initialization
  const [products, setProducts] = useState<Product[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.PRODUCTS);
    return saved ? JSON.parse(saved) : INITIAL_PRODUCTS;
  });
  const [regions, setRegions] = useState<Region[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.REGIONS);
    return saved ? JSON.parse(saved) : INITIAL_REGIONS;
  });
  const [customers, setCustomers] = useState<Customer[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.CUSTOMERS);
    return saved ? JSON.parse(saved) : INITIAL_CUSTOMERS;
  });
  const [stores, setStores] = useState<Store[]>(() => {
    const saved = localStorage.getItem('wholesale_stores');
    return saved ? JSON.parse(saved) : INITIAL_STORES;
  });
  const [currentStoreId, setCurrentStoreId] = useState<string>(() => {
    const saved = localStorage.getItem('wholesale_current_store');
    return saved || INITIAL_STORES[0]?.id || '';
  });
  const [defaultMargin, setDefaultMargin] = useState<number>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.MARGIN);
    return saved ? parseInt(saved) : 20;
  });

  const [sales, setSales] = useState<Sale[]>(() => {
    const saved = localStorage.getItem('wholesale_sales');
    return saved ? JSON.parse(saved) : [];
  });

  const [cart, setCart] = useState<{productId: string, quantity: number}[]>([]);
  const [selectedSaleCustomer, setSelectedSaleCustomer] = useState<string>(customers[0]?.id || '');

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState<'product' | 'region' | 'customer' | 'store' | null>(null);
  const [editingItem, setEditingItem] = useState<any>(null);

  // Sync with LocalStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products));
    localStorage.setItem(STORAGE_KEYS.REGIONS, JSON.stringify(regions));
    localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(customers));
    localStorage.setItem('wholesale_stores', JSON.stringify(stores));
    localStorage.setItem('wholesale_current_store', currentStoreId);
    localStorage.setItem(STORAGE_KEYS.MARGIN, defaultMargin.toString());
    localStorage.setItem('wholesale_sales', JSON.stringify(sales));
    localStorage.setItem('wholesale_lang', language);
  }, [products, regions, customers, stores, currentStoreId, defaultMargin, sales, language]);

  // Calculation Logic
  const calculatePrice = (cost: number, margin: number, regionMarkup: number = 0, customerDiscount: number = 0) => {
    const basePrice = cost / (1 - margin / 100);
    const regionalPrice = basePrice * (1 + regionMarkup / 100);
    const finalPrice = regionalPrice * (1 - customerDiscount / 100);
    return finalPrice;
  };

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         p.sku.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || p.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const categories = useMemo(() => {
    return ['All', ...Array.from(new Set(products.map(p => p.category)))];
  }, [products]);

  const getFinalPriceForCustomer = (productId: string, customerId: string) => {
    const product = products.find(p => p.id === productId);
    const customer = customers.find(c => c.id === customerId);
    if (!product || !customer) return 0;

    const region = regions.find(r => r.id === customer.regionId);
    const margin = product.customMargin || defaultMargin;
    
    return calculatePrice(
      product.baseCost, 
      margin, 
      region?.markupPercentage || 0, 
      customer.specialDiscount
    );
  };

  const addToCart = (productId: string) => {
    const product = products.find(p => p.id === productId);
    if (!product || product.stock <= 0) return;

    setCart(prev => {
      const existing = prev.find(item => item.productId === productId);
      if (existing) {
        if (existing.quantity >= product.stock) return prev;
        return prev.map(item => item.productId === productId ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { productId, quantity: 1 }];
    });
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(item => item.productId !== productId));
  };

  const completeSale = () => {
    if (cart.length === 0) return;
    
    const customer = customers.find(c => c.id === selectedSaleCustomer);
    const newSale: Sale = {
      id: Date.now().toString(),
      date: new Date().toISOString(),
      customerId: selectedSaleCustomer,
      customerName: customer?.name || 'Unknown',
      storeId: currentStoreId,
      items: cart.map(item => {
        const p = products.find(prod => prod.id === item.productId);
        const price = getFinalPriceForCustomer(item.productId, selectedSaleCustomer);
        return {
          ...item,
          name: p?.name,
          price,
          cost: p?.baseCost || 0,
          total: price * item.quantity
        };
      }),
      total: cart.reduce((sum, item) => sum + (getFinalPriceForCustomer(item.productId, selectedSaleCustomer) * item.quantity), 0)
    };

    setSales([newSale, ...sales]);

    // Update stock
    setProducts(prev => prev.map(p => {
      const cartItem = cart.find(item => item.productId === p.id);
      if (cartItem) {
        return { ...p, stock: Math.max(0, p.stock - cartItem.quantity) };
      }
      return p;
    }));

    setCart([]);
    setActiveTab('dashboard');
  };

  const filteredSales = useMemo(() => {
    return sales.filter(s => currentStoreId === 'all' || s.storeId === currentStoreId);
  }, [sales, currentStoreId]);

  const stats = useMemo(() => {
    const totalRevenue = filteredSales.reduce((sum, sale) => sum + sale.total, 0);
    const totalCost = filteredSales.reduce((sum, sale) => sum + sale.items.reduce((s, item) => s + (item.cost * item.quantity), 0), 0);
    const totalProfit = totalRevenue - totalCost;
    
    return {
      totalProducts: products.length,
      revenue: totalRevenue.toFixed(2),
      profit: totalProfit.toFixed(2),
      salesCount: filteredSales.length
    };
  }, [products, filteredSales]);

  const chartData = useMemo(() => {
    return products.slice(0, 8).map(p => ({
      name: p.name.split(' ').slice(0, 2).join(' '),
      cost: p.baseCost,
      price: calculatePrice(p.baseCost, p.customMargin || defaultMargin)
    }));
  }, [products, defaultMargin]);

  // Handlers
  const handleSaveProduct = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const customMarginStr = formData.get('customMargin') as string;
    
    const baseCost = parseFloat((formData.get('baseCost') as string).replace(',', '.'));
    const stock = parseInt(formData.get('stock') as string, 10) || 0;
    const customMargin = (customMarginStr !== "" && customMarginStr !== null) ? parseFloat(customMarginStr.replace(',', '.')) : undefined;

    if (isNaN(baseCost)) return;

    const newProduct: Product = {
      id: editingItem?.id || Date.now().toString(),
      name: formData.get('name') as string,
      sku: formData.get('sku') as string,
      baseCost,
      category: formData.get('category') as string,
      customMargin: isNaN(customMargin as number) ? undefined : customMargin,
      stock,
    };

    setProducts(prev => {
      if (editingItem) {
        return prev.map(p => p.id === editingItem.id ? newProduct : p);
      }
      return [...prev, newProduct];
    });
    closeModal();
  };

  const handleSaveStore = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const newStore: Store = {
      id: editingItem?.id || `store-${Date.now()}`,
      name: formData.get('name') as string,
      location: formData.get('location') as string,
      phone: formData.get('phone') as string,
    };

    setStores(prev => {
      if (editingItem) {
        return prev.map(s => s.id === editingItem.id ? newStore : s);
      }
      return [...prev, newStore];
    });
    closeModal();
  };

  const handleSaveRegion = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const markupPercentage = parseFloat((formData.get('markupPercentage') as string).replace(',', '.'));
    
    if (isNaN(markupPercentage)) return;

    const newRegion: Region = {
      id: editingItem?.id || `reg-${Date.now()}`,
      name: formData.get('name') as string,
      markupPercentage,
    };

    setRegions(prev => {
      if (editingItem) {
        return prev.map(r => r.id === editingItem.id ? newRegion : r);
      }
      return [...prev, newRegion];
    });
    closeModal();
  };

  const handleSaveCustomer = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const specialDiscount = parseFloat((formData.get('specialDiscount') as string).replace(',', '.'));

    if (isNaN(specialDiscount)) return;

    const newCustomer: Customer = {
      id: editingItem?.id || `cust-${Date.now()}`,
      name: formData.get('name') as string,
      regionId: formData.get('regionId') as string,
      specialDiscount,
      tier: formData.get('tier') as Customer['tier'],
    };

    setCustomers(prev => {
      if (editingItem) {
        return prev.map(c => c.id === editingItem.id ? newCustomer : c);
      }
      return [...prev, newCustomer];
    });
    closeModal();
  };

  const deleteItem = (id: string, type: 'product' | 'region' | 'customer' | 'store') => {
    if (type === 'product') setProducts(products.filter(p => p.id !== id));
    if (type === 'region') setRegions(regions.filter(r => r.id !== id));
    if (type === 'customer') setCustomers(customers.filter(c => c.id !== id));
    if (type === 'store') setStores(stores.filter(s => s.id !== id));
  };

  const openModal = (type: 'product' | 'region' | 'customer' | 'store', item: any = null) => {
    setModalType(type);
    setEditingItem(item);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setModalType(null);
    setEditingItem(null);
  };

  // Calculator State
  const [calcProduct, setCalcProduct] = useState(products[0]?.id || '');
  const [calcRegion, setCalcRegion] = useState(regions[0]?.id || '');
  const [calcCustomer, setCalcCustomer] = useState(customers[0]?.id || '');

  const calculatedResult = useMemo(() => {
    const p = products.find(p => p.id === calcProduct);
    const r = regions.find(r => r.id === calcRegion);
    const c = customers.find(c => c.id === calcCustomer);
    if (!p) return null;
    
    const price = calculatePrice(
      p.baseCost, 
      p.customMargin || defaultMargin, 
      r?.markupPercentage || 0, 
      c?.specialDiscount || 0
    );
    const profit = price - p.baseCost;
    const actualMargin = (profit / price) * 100;

    return { price, profit, actualMargin };
  }, [calcProduct, calcRegion, calcCustomer, products, regions, customers, defaultMargin]);

  return (
    <div className="min-h-screen bg-[#F5F5F5] text-[#212121] font-sans">
      {/* Sidebar (Desktop) */}
      <aside className="fixed left-0 top-0 h-full w-64 bg-white border-r border-[#E0E0E0] z-20 hidden lg:flex flex-col">
        <div className="p-6 border-b border-[#E0E0E0] bg-[#4CAF50]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center">
              <TrendingUp className="text-[#4CAF50] w-6 h-6" />
            </div>
            <h1 className="font-bold text-xl tracking-tight text-white">Wholesale Master</h1>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          <NavItem icon={<LayoutDashboard size={20} />} label={t.dashboard} active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} />
          <NavItem icon={<TrendingUp size={20} />} label={t.sales} active={activeTab === 'sales'} onClick={() => setActiveTab('sales')} />
          <NavItem icon={<TrendingUp size={20} />} label={t.history} active={activeTab === 'history'} onClick={() => setActiveTab('history')} />
          <NavItem icon={<Package size={20} />} label={t.products} active={activeTab === 'products'} onClick={() => setActiveTab('products')} />
          <NavItem icon={<MapPin size={20} />} label={t.regions} active={activeTab === 'regions'} onClick={() => setActiveTab('regions')} />
          <NavItem icon={<Users size={20} />} label={t.customers} active={activeTab === 'customers'} onClick={() => setActiveTab('customers')} />
          <NavItem icon={<MapPin size={20} />} label={t.stores} active={activeTab === 'stores'} onClick={() => setActiveTab('stores')} />
        </nav>

        <div className="p-4 space-y-4">
          <div className="flex items-center justify-between px-2">
            <span className="text-xs font-bold text-[#6B7280] uppercase">Language</span>
            <div className="flex gap-1">
              {(['en', 'zh', 'my'] as Language[]).map((lang) => (
                <button
                  key={lang}
                  onClick={() => setLanguage(lang)}
                  className={cn(
                    "w-8 h-8 rounded-lg text-[10px] font-bold flex items-center justify-center transition-all",
                    language === lang ? "bg-[#1A1A1A] text-white" : "bg-[#F3F4F6] text-[#6B7280] hover:bg-[#E5E7EB]"
                  )}
                >
                  {lang.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
        </div>
      </aside>

      {/* Bottom Navigation (Mobile) */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#E0E0E0] z-40 lg:hidden flex items-center justify-around px-2 py-1 pb-safe">
        <MobileNavItem icon={<LayoutDashboard size={20} />} label={t.dashboard} active={activeTab === 'dashboard'} onClick={() => { setActiveTab('dashboard'); setIsMoreMenuOpen(false); }} />
        <MobileNavItem icon={<TrendingUp size={20} />} label={t.sales} active={activeTab === 'sales'} onClick={() => { setActiveTab('sales'); setIsMoreMenuOpen(false); }} />
        <div className="relative">
          <button onClick={() => openModal('product')} className="bg-[#4CAF50] text-white p-3 rounded-full -mt-8 shadow-lg active:scale-95 transition-transform">
            <Plus size={24} />
          </button>
        </div>
        <MobileNavItem icon={<TrendingUp size={20} />} label={t.history} active={activeTab === 'history'} onClick={() => { setActiveTab('history'); setIsMoreMenuOpen(false); }} />
        <MobileNavItem icon={<X size={20} className={cn(isMoreMenuOpen && "rotate-45")} />} label={t.more} active={isMoreMenuOpen} onClick={() => setIsMoreMenuOpen(!isMoreMenuOpen)} />
      </nav>

      {/* More Menu (Mobile) */}
      <AnimatePresence>
        {isMoreMenuOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setIsMoreMenuOpen(false)}
              className="fixed inset-0 bg-black/20 backdrop-blur-sm z-30 lg:hidden"
            />
            <motion.div 
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              className="fixed bottom-16 left-4 right-4 bg-white rounded-2xl shadow-2xl z-40 lg:hidden p-4 overflow-hidden"
            >
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => { setActiveTab('products'); setIsMoreMenuOpen(false); }} className="flex items-center gap-3 p-4 rounded-xl bg-[#F5F5F5] active:bg-[#EEEEEE]">
                  <Package size={20} className="text-[#4CAF50]" />
                  <span className="font-bold text-sm">{t.products}</span>
                </button>
                <button onClick={() => { setActiveTab('customers'); setIsMoreMenuOpen(false); }} className="flex items-center gap-3 p-4 rounded-xl bg-[#F5F5F5] active:bg-[#EEEEEE]">
                  <Users size={20} className="text-[#4CAF50]" />
                  <span className="font-bold text-sm">{t.customers}</span>
                </button>
                <button onClick={() => { setActiveTab('regions'); setIsMoreMenuOpen(false); }} className="flex items-center gap-3 p-4 rounded-xl bg-[#F5F5F5] active:bg-[#EEEEEE]">
                  <MapPin size={20} className="text-[#4CAF50]" />
                  <span className="font-bold text-sm">{t.regions}</span>
                </button>
                <button onClick={() => { setActiveTab('stores'); setIsMoreMenuOpen(false); }} className="flex items-center gap-3 p-4 rounded-xl bg-[#F5F5F5] active:bg-[#EEEEEE]">
                  <MapPin size={20} className="text-[#4CAF50]" />
                  <span className="font-bold text-sm">{t.stores}</span>
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="lg:ml-64 p-4 md:p-8 pb-24 lg:pb-8">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div className="flex items-center justify-between md:block">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-bold px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full">မင်္ဂလာပါ (Mingalaba)</span>
                <select 
                  value={currentStoreId} 
                  onChange={(e) => setCurrentStoreId(e.target.value)}
                  className="text-xs font-bold bg-white border border-[#E5E7EB] rounded-lg px-2 py-0.5 focus:outline-none"
                >
                  <option value="all">{t.allStores}</option>
                  {stores.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-[#1A1A1A]">
                {t.greeting}, {t[activeTab]}
              </h2>
            </div>
            
            {/* Language Switcher (Mobile) */}
            <div className="flex lg:hidden gap-1">
              {(['en', 'zh', 'my'] as Language[]).map((lang) => (
                <button
                  key={lang}
                  onClick={() => setLanguage(lang)}
                  className={cn(
                    "w-7 h-7 rounded-lg text-[9px] font-bold flex items-center justify-center transition-all",
                    language === lang ? "bg-[#1A1A1A] text-white" : "bg-white border border-[#E0E0E0] text-[#6B7280]"
                  )}
                >
                  {lang.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="relative flex-1 sm:flex-none">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF]" size={18} />
              <input 
                type="text" placeholder={t.quickSearch} value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 bg-white border border-[#E5E7EB] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1A1A1A]/10 w-full sm:w-64"
              />
            </div>
            <button 
              onClick={() => {
                const type = activeTab === 'dashboard' ? 'product' : activeTab === 'stores' ? 'store' : activeTab.slice(0, -1) as any;
                openModal(type);
              }}
              className="hidden sm:flex bg-[#4CAF50] text-white px-4 py-2 rounded-lg items-center justify-center gap-2 hover:bg-[#43a047] transition-colors shadow-sm"
            >
              <Plus size={18} />
              <span>{t.addNew} {activeTab === 'dashboard' ? t.product : t[activeTab.slice(0, -1) as keyof typeof t]}</span>
            </button>
          </div>
        </header>

        <AnimatePresence mode="wait">
          {activeTab === 'dashboard' && (
            <motion.div key="dashboard" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard label={t.totalProducts} value={stats.totalProducts} icon={<Package className="text-blue-500" />} />
                <StatCard label={t.revenue} value={`$${stats.revenue}`} icon={<DollarSign className="text-emerald-500" />} />
                <StatCard label={t.profit} value={`$${stats.profit}`} icon={<TrendingUp className="text-orange-500" />} />
                <StatCard label={t.salesCount} value={stats.salesCount} icon={<Users className="text-purple-500" />} />
              </div>

              {/* Pricing Strategy Banner */}
              <div className="bg-[#212121] text-white p-8 rounded-2xl relative overflow-hidden shadow-lg">
                <div className="relative z-10 max-w-2xl">
                  <h3 className="text-2xl font-bold mb-2">{t.dynamicPricingStrategy}</h3>
                  <p className="text-white/70 mb-6">
                    Your current target margin is set to <span className="text-[#4CAF50] font-bold">{defaultMargin}%</span>. 
                    This automatically adjusts prices across {regions.length} regions and {customers.length} customer accounts.
                  </p>
                  <div className="flex flex-wrap gap-4">
                    <div className="bg-white/10 backdrop-blur-md px-4 py-2 rounded-xl border border-white/10">
                      <p className="text-[10px] uppercase font-bold text-white/50 mb-1">Break-even Point</p>
                      <p className="font-mono font-bold">$0.00 Margin</p>
                    </div>
                    <div className="bg-white/10 backdrop-blur-md px-4 py-2 rounded-xl border border-white/10">
                      <p className="text-[10px] uppercase font-bold text-white/50 mb-1">Optimal Range</p>
                      <p className="font-mono font-bold">15% - 35%</p>
                    </div>
                  </div>
                </div>
                <div className="absolute right-[-20px] bottom-[-20px] opacity-10">
                  <TrendingUp size={240} />
                </div>
              </div>

              {/* Quick Start Guide */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-emerald-50 border border-emerald-100 p-6 rounded-2xl">
                  <div className="w-10 h-10 bg-emerald-500 text-white rounded-full flex items-center justify-center font-bold mb-4">1</div>
                  <h4 className="font-bold text-[#1A1A1A] mb-2">Set Margin</h4>
                  <p className="text-sm text-[#6B7280]">Use the sidebar slider to set your global target profit margin.</p>
                </div>
                <div className="bg-blue-50 border border-blue-100 p-6 rounded-2xl">
                  <div className="w-10 h-10 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold mb-4">2</div>
                  <h4 className="font-bold text-[#1A1A1A] mb-2">Add Data</h4>
                  <p className="text-sm text-[#6B7280]">Populate your products, regions, and customer tiers in the management tabs.</p>
                </div>
                <div className="bg-purple-50 border border-purple-100 p-6 rounded-2xl">
                  <div className="w-10 h-10 bg-purple-500 text-white rounded-full flex items-center justify-center font-bold mb-4">3</div>
                  <h4 className="font-bold text-[#1A1A1A] mb-2">Calculate</h4>
                  <p className="text-sm text-[#6B7280]">Use the calculator to see final prices adjusted for region and customer.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-[#E0E0E0] shadow-sm">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="font-bold text-lg">{t.costVsSellingPrice}</h3>
                    <div className="flex items-center gap-4 text-xs font-medium text-[#757575]">
                      <div className="flex items-center gap-1.5"><div className="w-3 h-3 bg-[#E0E0E0] rounded-full" /><span>Cost</span></div>
                      <div className="flex items-center gap-1.5"><div className="w-3 h-3 bg-[#4CAF50] rounded-full" /><span>Price</span></div>
                    </div>
                  </div>
                  <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F5F5F5" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#757575' }} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#757575' }} />
                        <Tooltip cursor={{ fill: '#F5F5F5' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }} />
                        <Bar dataKey="cost" fill="#E0E0E0" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="price" fill="#4CAF50" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-xl border border-[#E0E0E0] shadow-sm">
                  <h3 className="font-bold text-lg mb-6">{t.quickPriceCalculator}</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="text-xs font-bold text-[#757575] uppercase block mb-1.5">{t.product}</label>
                      <select 
                        value={calcProduct} onChange={(e) => setCalcProduct(e.target.value)}
                        className="w-full p-2.5 bg-[#F5F5F5] border border-[#E0E0E0] rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#4CAF50]"
                      >
                        {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-bold text-[#757575] uppercase block mb-1.5">{t.region}</label>
                      <select 
                        value={calcRegion} onChange={(e) => setCalcRegion(e.target.value)}
                        className="w-full p-2.5 bg-[#F5F5F5] border border-[#E0E0E0] rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#4CAF50]"
                      >
                        {regions.map(r => <option key={r.id} value={r.id}>{r.name} (+{r.markupPercentage}%)</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-bold text-[#757575] uppercase block mb-1.5">{t.customer}</label>
                      <select 
                        value={calcCustomer} onChange={(e) => setCalcCustomer(e.target.value)}
                        className="w-full p-2.5 bg-[#F5F5F5] border border-[#E0E0E0] rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#4CAF50]"
                      >
                        {customers.map(c => <option key={c.id} value={c.id}>{c.name} (-{c.specialDiscount}%)</option>)}
                      </select>
                    </div>
                    {calculatedResult && (
                      <div className="pt-4 border-t border-[#EEEEEE]">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm text-[#757575]">{t.finalPrice}</span>
                          <span className="text-2xl font-bold text-[#4CAF50]">${calculatedResult.price.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-[#757575]">{t.profitMargin}</span>
                          <span className="text-sm font-bold text-[#4CAF50]">
                            {calculatedResult.actualMargin.toFixed(1)}% (${calculatedResult.profit.toFixed(2)})
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Recent Sales */}
              <div className="bg-white rounded-xl border border-[#E0E0E0] shadow-sm overflow-hidden">
                <div className="p-6 border-b border-[#E0E0E0] flex items-center justify-between">
                  <h3 className="font-bold text-lg">Recent Sales</h3>
                  <button onClick={() => setActiveTab('sales')} className="text-sm font-bold text-[#4CAF50] hover:underline">View All</button>
                </div>
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[#F5F5F5] border-b border-[#E0E0E0]">
                      <th className="px-6 py-4 text-xs font-bold text-[#757575] uppercase tracking-wider">Date</th>
                      <th className="px-6 py-4 text-xs font-bold text-[#757575] uppercase tracking-wider">Customer</th>
                      <th className="px-6 py-4 text-xs font-bold text-[#757575] uppercase tracking-wider">Store</th>
                      <th className="px-6 py-4 text-xs font-bold text-[#757575] uppercase tracking-wider text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#EEEEEE]">
                    {filteredSales.slice(0, 5).map((sale) => (
                      <tr key={sale.id} className="hover:bg-[#F9FAFB] transition-colors">
                        <td className="px-6 py-4 text-sm">{new Date(sale.date).toLocaleDateString()}</td>
                        <td className="px-6 py-4 text-sm font-bold">{sale.customerName}</td>
                        <td className="px-6 py-4 text-sm text-[#757575]">
                          {stores.find(s => s.id === sale.storeId)?.name || 'Unknown'}
                        </td>
                        <td className="px-6 py-4 text-sm font-bold text-right text-[#4CAF50]">${sale.total.toFixed(2)}</td>
                      </tr>
                    ))}
                    {filteredSales.length === 0 && (
                      <tr>
                        <td colSpan={4} className="px-6 py-8 text-center text-[#757575] text-sm italic">No sales found for this selection.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}

          {activeTab === 'sales' && (
            <motion.div key="sales" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="grid grid-cols-1 lg:grid-cols-3 gap-8 pb-16 lg:pb-0">
              <div className="lg:col-span-2 space-y-6">
                <div className="bg-white p-4 md:p-6 rounded-2xl border border-[#E0E0E0] shadow-sm">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                    <h3 className="font-bold text-lg">{t.selectCustomer}</h3>
                    <select 
                      value={selectedSaleCustomer} 
                      onChange={(e) => setSelectedSaleCustomer(e.target.value)}
                      className="p-2.5 bg-[#F5F5F5] border border-[#E0E0E0] rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#4CAF50] w-full sm:w-64"
                    >
                      {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
                    {products.map(product => {
                      const price = getFinalPriceForCustomer(product.id, selectedSaleCustomer);
                      const cartItem = cart.find(item => item.productId === product.id);
                      const availableStock = product.stock - (cartItem?.quantity || 0);

                      return (
                        <button 
                          key={product.id} 
                          onClick={() => addToCart(product.id)}
                          disabled={availableStock <= 0}
                          className="flex flex-col text-left p-3 border border-[#EEEEEE] rounded-xl hover:border-[#4CAF50] hover:shadow-md transition-all group relative bg-white disabled:opacity-50"
                        >
                          <div className="w-full aspect-square bg-[#F5F5F5] rounded-lg mb-2 flex items-center justify-center text-[#212121] font-bold text-xl group-hover:bg-[#4CAF50]/10 transition-colors">
                            {product.name.charAt(0)}
                          </div>
                          <div className="flex-1">
                            <p className="font-bold text-xs line-clamp-2 mb-1">{product.name}</p>
                            <p className="text-[10px] font-bold text-[#4CAF50]">${price.toFixed(2)}</p>
                          </div>
                          {cartItem && (
                            <div className="absolute top-2 right-2 bg-[#4CAF50] text-white w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shadow-sm">
                              {cartItem.quantity}
                            </div>
                          )}
                          <div className={cn(
                            "text-[9px] font-bold mt-1",
                            availableStock <= 0 ? "text-red-500" : availableStock < 10 ? "text-orange-500" : "text-emerald-500"
                          )}>
                            {availableStock <= 0 ? t.outOfStock : `${t.stock}: ${availableStock}`}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Cart Sidebar (Desktop) */}
              <div className="hidden lg:block space-y-6">
                <CartView 
                  cart={cart} 
                  products={products} 
                  selectedSaleCustomer={selectedSaleCustomer} 
                  getFinalPriceForCustomer={getFinalPriceForCustomer}
                  removeFromCart={removeFromCart}
                  completeSale={completeSale}
                  t={t}
                />
              </div>

              {/* Cart Toggle (Mobile) */}
              <div className="lg:hidden fixed bottom-20 right-4 z-30">
                <button 
                  onClick={() => setIsCartOpen(true)}
                  className="bg-[#1A1A1A] text-white p-4 rounded-full shadow-2xl flex items-center gap-2 active:scale-95 transition-transform"
                >
                  <TrendingUp size={24} />
                  {cart.length > 0 && (
                    <span className="bg-[#4CAF50] text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                      {cart.reduce((sum, i) => sum + i.quantity, 0)}
                    </span>
                  )}
                </button>
              </div>

              {/* Cart Slide-over (Mobile) */}
              <AnimatePresence>
                {isCartOpen && (
                  <>
                    <motion.div 
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                      onClick={() => setIsCartOpen(false)}
                      className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 lg:hidden"
                    />
                    <motion.div 
                      initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
                      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                      className="fixed top-0 right-0 bottom-0 w-[85%] max-w-sm bg-white z-50 lg:hidden shadow-2xl p-6 flex flex-col"
                    >
                      <div className="flex items-center justify-between mb-6">
                        <h3 className="font-bold text-xl flex items-center gap-2">
                          <TrendingUp size={24} className="text-[#4CAF50]" />
                          {t.cart}
                        </h3>
                        <button onClick={() => setIsCartOpen(false)} className="p-2 hover:bg-[#F5F5F5] rounded-full transition-colors">
                          <X size={24} />
                        </button>
                      </div>
                      <div className="flex-1 overflow-y-auto">
                        <CartView 
                          cart={cart} 
                          products={products} 
                          selectedSaleCustomer={selectedSaleCustomer} 
                          getFinalPriceForCustomer={getFinalPriceForCustomer}
                          removeFromCart={removeFromCart}
                          completeSale={() => { completeSale(); setIsCartOpen(false); }}
                          t={t}
                          isMobile
                        />
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </motion.div>
          )}

          {activeTab === 'history' && (
            <motion.div key="history" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-6">
              <div className="bg-white rounded-xl border border-[#E0E0E0] shadow-sm overflow-hidden overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[600px]">
                  <thead>
                    <tr className="bg-[#F5F5F5] border-b border-[#E0E0E0]">
                      <th className="px-6 py-4 text-xs font-bold text-[#757575] uppercase tracking-wider">ID</th>
                      <th className="px-6 py-4 text-xs font-bold text-[#757575] uppercase tracking-wider">{t.date}</th>
                      <th className="px-6 py-4 text-xs font-bold text-[#757575] uppercase tracking-wider">{t.customer}</th>
                      <th className="px-6 py-4 text-xs font-bold text-[#757575] uppercase tracking-wider">{t.items}</th>
                      <th className="px-6 py-4 text-xs font-bold text-[#757575] uppercase tracking-wider text-right">{t.total}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#EEEEEE]">
                    {[...sales].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((sale) => (
                      <tr key={sale.id} className="hover:bg-[#F9FAFB] transition-colors">
                        <td className="px-6 py-4 text-xs font-mono text-[#757575]">{sale.id.slice(-6)}</td>
                        <td className="px-6 py-4 text-sm">{new Date(sale.date).toLocaleString()}</td>
                        <td className="px-6 py-4 text-sm font-bold">{sale.customerName}</td>
                        <td className="px-6 py-4 text-sm text-[#757575]">
                          {sale.items.reduce((sum, i) => sum + i.quantity, 0)} {t.items}
                        </td>
                        <td className="px-6 py-4 text-sm font-bold text-right text-[#4CAF50]">${sale.total.toFixed(2)}</td>
                      </tr>
                    ))}
                    {sales.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-6 py-12 text-center text-[#757575] italic">{t.noHistory}</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}

          {activeTab === 'products' && (
            <motion.div key="products" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
              <div className="flex flex-wrap gap-2">
                {categories.map(cat => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={cn(
                      "px-4 py-2 rounded-lg text-sm font-bold transition-all",
                      selectedCategory === cat 
                        ? "bg-[#4CAF50] text-white shadow-sm" 
                        : "bg-white text-[#757575] border border-[#E0E0E0] hover:border-[#4CAF50]"
                    )}
                  >
                    {cat}
                  </button>
                ))}
              </div>
              <div className="bg-white rounded-xl border border-[#E0E0E0] shadow-sm overflow-hidden">
                <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#F5F5F5] border-b border-[#E0E0E0]">
                    <th className="px-6 py-4 text-xs font-bold text-[#757575] uppercase tracking-wider">{t.product}</th>
                    <th className="px-6 py-4 text-xs font-bold text-[#757575] uppercase tracking-wider">{t.sku}</th>
                    <th className="px-6 py-4 text-xs font-bold text-[#757575] uppercase tracking-wider">{t.stock}</th>
                    <th className="px-6 py-4 text-xs font-bold text-[#757575] uppercase tracking-wider">{t.baseCost}</th>
                    <th className="px-6 py-4 text-xs font-bold text-[#757575] uppercase tracking-wider">{t.profitMargin}</th>
                    <th className="px-6 py-4 text-xs font-bold text-[#757575] uppercase tracking-wider">{t.targetPrice}</th>
                    <th className="px-6 py-4 text-xs font-bold text-[#757575] uppercase tracking-wider text-right">{t.actions}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EEEEEE]">
                  {filteredProducts.map((product) => (
                    <tr key={product.id} className="hover:bg-[#F9FAFB] transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-[#F5F5F5] rounded-lg flex items-center justify-center text-[#212121] font-bold">{product.name.charAt(0)}</div>
                          <div><p className="font-bold text-sm">{product.name}</p><p className="text-xs text-[#757575]">{product.category}</p></div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm font-mono text-[#757575]">{product.sku}</td>
                      <td className="px-6 py-4">
                        <span className={cn(
                          "text-xs font-bold px-2 py-1 rounded-lg",
                          product.stock <= 0 ? "bg-red-100 text-red-600" : product.stock < 10 ? "bg-orange-100 text-orange-600" : "bg-emerald-100 text-emerald-600"
                        )}>
                          {product.stock}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm font-semibold">${product.baseCost.toFixed(2)}</td>
                      <td className="px-6 py-4">
                        <span className={cn(
                          "text-xs font-bold px-2 py-1 rounded-lg",
                          product.customMargin ? "bg-[#4CAF50]/10 text-[#4CAF50]" : "bg-[#757575]/10 text-[#757575]"
                        )}>
                          {product.customMargin || defaultMargin}%
                        </span>
                      </td>
                      <td className="px-6 py-4"><span className="text-sm font-bold text-[#212121]">${calculatePrice(product.baseCost, product.customMargin || defaultMargin).toFixed(2)}</span></td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2 transition-opacity">
                          <button onClick={() => openModal('product', product)} className="p-2 text-[#757575] hover:text-[#212121] hover:bg-[#F5F5F5] rounded-lg transition-all"><Edit2 size={16} /></button>
                          <button onClick={() => deleteItem(product.id, 'product')} className="p-2 text-[#757575] hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"><Trash2 size={16} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
            </motion.div>
          )}

          {activeTab === 'regions' && (
            <motion.div key="regions" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {regions.map(region => (
                <div key={region.id} className="bg-white p-6 rounded-2xl border border-[#E5E7EB] shadow-sm hover:border-[#1A1A1A] transition-all group">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-12 h-12 bg-[#F3F4F6] rounded-xl flex items-center justify-center group-hover:bg-[#1A1A1A] transition-colors">
                      <MapPin className="text-[#1A1A1A] group-hover:text-white transition-colors" size={24} />
                    </div>
                    <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg">+{region.markupPercentage}% {t.markup}</span>
                  </div>
                  <h3 className="font-bold text-lg mb-1">{region.name}</h3>
                  <p className="text-sm text-[#6B7280] mb-4">Regional pricing adjustment for logistics and demand.</p>
                  <div className="pt-4 border-t border-[#F3F4F6] flex items-center justify-between">
                    <button onClick={() => deleteItem(region.id, 'region')} className="text-xs font-bold text-red-400 hover:text-red-600 uppercase">{t.delete}</button>
                    <button onClick={() => openModal('region', region)} className="text-sm font-bold text-[#1A1A1A] hover:underline">{t.edit} {t.region}</button>
                  </div>
                </div>
              ))}
            </motion.div>
          )}

          {activeTab === 'customers' && (
            <motion.div key="customers" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="bg-white rounded-2xl border border-[#E5E7EB] shadow-sm overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#F9FAFB] border-b border-[#E5E7EB]">
                    <th className="px-6 py-4 text-xs font-bold text-[#6B7280] uppercase tracking-wider">{t.customer}</th>
                    <th className="px-6 py-4 text-xs font-bold text-[#6B7280] uppercase tracking-wider">{t.region}</th>
                    <th className="px-6 py-4 text-xs font-bold text-[#6B7280] uppercase tracking-wider">{t.tier}</th>
                    <th className="px-6 py-4 text-xs font-bold text-[#6B7280] uppercase tracking-wider">{t.specialDiscount}</th>
                    <th className="px-6 py-4 text-xs font-bold text-[#6B7280] uppercase tracking-wider text-right">{t.actions}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F3F4F6]">
                  {customers.map((customer) => (
                    <tr key={customer.id} className="hover:bg-[#F9FAFB] transition-colors group">
                      <td className="px-6 py-4"><p className="font-bold text-sm">{customer.name}</p></td>
                      <td className="px-6 py-4"><span className="text-xs font-medium px-2 py-1 bg-[#F3F4F6] rounded-lg">{regions.find(r => r.id === customer.regionId)?.name}</span></td>
                      <td className="px-6 py-4"><TierBadge tier={customer.tier} /></td>
                      <td className="px-6 py-4"><span className="text-sm font-bold text-orange-600">-{customer.specialDiscount}%</span></td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2 transition-opacity">
                          <button onClick={() => openModal('customer', customer)} className="p-2 text-[#6B7280] hover:text-[#1A1A1A] hover:bg-[#F3F4F6] rounded-lg transition-all"><Edit2 size={16} /></button>
                          <button onClick={() => deleteItem(customer.id, 'customer')} className="p-2 text-[#6B7280] hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"><Trash2 size={16} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </motion.div>
          )}
          {activeTab === 'stores' && (
            <motion.div key="stores" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-6">
              <div className="bg-white rounded-xl border border-[#E0E0E0] shadow-sm overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[#F5F5F5] border-b border-[#E0E0E0]">
                      <th className="px-6 py-4 text-xs font-bold text-[#757575] uppercase tracking-wider">{t.stores}</th>
                      <th className="px-6 py-4 text-xs font-bold text-[#757575] uppercase tracking-wider">Location</th>
                      <th className="px-6 py-4 text-xs font-bold text-[#757575] uppercase tracking-wider">Phone</th>
                      <th className="px-6 py-4 text-xs font-bold text-[#757575] uppercase tracking-wider text-right">{t.actions}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#EEEEEE]">
                    {stores.map((store) => (
                      <tr key={store.id} className="hover:bg-[#F9FAFB] transition-colors group">
                        <td className="px-6 py-4 font-bold text-sm">{store.name}</td>
                        <td className="px-6 py-4 text-sm text-[#757575]">{store.location}</td>
                        <td className="px-6 py-4 text-sm text-[#757575]">{store.phone}</td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2 transition-opacity">
                            <button onClick={() => openModal('store', store)} className="p-2 text-[#757575] hover:text-[#212121] hover:bg-[#F5F5F5] rounded-lg transition-all"><Edit2 size={16} /></button>
                            <button onClick={() => deleteItem(store.id, 'store' as any)} className="p-2 text-[#757575] hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"><Trash2 size={16} /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Modal Overlay */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={closeModal} className="absolute inset-0 bg-[#1A1A1A]/40 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="relative bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden">
              <div className="p-6 border-b border-[#F3F4F6] flex items-center justify-between">
                <h3 className="text-xl font-bold tracking-tight">
                  {editingItem ? t.edit : t.addNew} {
                    modalType === 'product' ? t.product : 
                    modalType === 'region' ? t.region : 
                    modalType === 'customer' ? t.customer : 
                    t.stores
                  }
                </h3>
                <button onClick={closeModal} className="p-2 hover:bg-[#F3F4F6] rounded-full transition-colors"><X size={20} /></button>
              </div>
              
              <form onSubmit={modalType === 'product' ? handleSaveProduct : modalType === 'region' ? handleSaveRegion : modalType === 'customer' ? handleSaveCustomer : handleSaveStore} className="p-6 space-y-4">
                {modalType === 'product' && (
                  <>
                    <Input label={t.productName} name="name" defaultValue={editingItem?.name} required />
                    <Input label={t.sku} name="sku" defaultValue={editingItem?.sku} required />
                    <div className="grid grid-cols-2 gap-4">
                      <Input label={`${t.baseCost} ($)`} name="baseCost" type="number" step="0.01" defaultValue={editingItem?.baseCost} required />
                      <Input label={`${t.profitMargin} (%)`} name="customMargin" type="number" step="0.1" defaultValue={editingItem?.customMargin} placeholder={`${defaultMargin}% (Default)`} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <Input label={t.category} name="category" defaultValue={editingItem?.category} required />
                      <Input label={t.stock} name="stock" type="number" defaultValue={editingItem?.stock || 0} required />
                    </div>
                  </>
                )}
                {modalType === 'region' && (
                  <>
                    <Input label={`${t.region} ${t.category}`} name="name" defaultValue={editingItem?.name} required />
                    <Input label={`${t.markup} (%)`} name="markupPercentage" type="number" step="0.1" defaultValue={editingItem?.markupPercentage} required />
                  </>
                )}
                {modalType === 'customer' && (
                  <>
                    <Input label={`${t.customer} ${t.category}`} name="name" defaultValue={editingItem?.name} required />
                    <div>
                      <label className="text-xs font-bold text-[#6B7280] uppercase block mb-1.5">{t.region}</label>
                      <select name="regionId" defaultValue={editingItem?.regionId} className="w-full p-2.5 bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1A1A1A]/10">
                        {regions.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-bold text-[#6B7280] uppercase block mb-1.5">{t.tier}</label>
                      <select name="tier" defaultValue={editingItem?.tier || 'Standard'} className="w-full p-2.5 bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1A1A1A]/10">
                        <option value="Standard">Standard</option>
                        <option value="Silver">Silver</option>
                        <option value="Gold">Gold</option>
                        <option value="Platinum">Platinum</option>
                      </select>
                    </div>
                    <Input label={`${t.specialDiscount} (%)`} name="specialDiscount" type="number" step="0.1" defaultValue={editingItem?.specialDiscount || 0} required />
                  </>
                )}
                {modalType === 'store' && (
                  <>
                    <Input label="Store Name" name="name" defaultValue={editingItem?.name} required />
                    <Input label="Location" name="location" defaultValue={editingItem?.location} required />
                    <Input label="Phone" name="phone" defaultValue={editingItem?.phone} required />
                  </>
                )}
                <div className="pt-4">
                  <button type="submit" className="w-full bg-[#4CAF50] text-white py-3 rounded-lg font-bold hover:bg-[#43a047] transition-colors flex items-center justify-center gap-2 shadow-sm">
                    <Save size={18} />
                    <span>{t.save} {modalType === 'product' ? t.product : modalType === 'region' ? t.region : modalType === 'customer' ? t.customer : t.stores}</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function CartView({ cart, products, selectedSaleCustomer, getFinalPriceForCustomer, removeFromCart, completeSale, setCart, t, isMobile }: any) {
  return (
    <div className={cn("bg-white rounded-xl border-[#E0E0E0] shadow-sm", !isMobile && "p-6 border sticky top-8")}>
      <div className="flex items-center justify-between mb-6">
        <h3 className="font-bold text-lg flex items-center gap-2">
          <TrendingUp size={20} className="text-[#4CAF50]" />
          {t.cart}
        </h3>
        {cart.length > 0 && (
          <button onClick={() => setCart([])} className="text-[10px] font-bold text-red-500 hover:underline uppercase tracking-tight">
            {t.clearCart}
          </button>
        )}
      </div>
      <div className="space-y-4 max-h-[400px] overflow-y-auto mb-6 pr-2">
        {cart.length === 0 ? (
          <p className="text-center text-[#757575] py-8 text-sm">{t.emptyCart}</p>
        ) : (
          cart.map((item: any) => {
            const p = products.find((prod: any) => prod.id === item.productId);
            const price = getFinalPriceForCustomer(item.productId, selectedSaleCustomer);
            return (
              <div key={item.productId} className="flex justify-between items-center text-sm">
                <div className="flex-1">
                  <p className="font-bold">{p?.name}</p>
                  <p className="text-xs text-[#757575]">{item.quantity} x ${price.toFixed(2)}</p>
                </div>
                <button onClick={() => removeFromCart(item.productId)} className="text-red-400 hover:text-red-600 p-1">
                  <X size={16} />
                </button>
              </div>
            );
          })
        )}
      </div>
      <div className="pt-4 border-t border-[#EEEEEE] space-y-4">
        <div className="flex justify-between items-center">
          <span className="font-bold text-[#757575]">{t.total}</span>
          <span className="text-2xl font-bold text-[#4CAF50]">
            ${cart.reduce((sum: number, item: any) => sum + (getFinalPriceForCustomer(item.productId, selectedSaleCustomer) * item.quantity), 0).toFixed(2)}
          </span>
        </div>
        <button 
          onClick={completeSale}
          disabled={cart.length === 0}
          className="w-full bg-[#4CAF50] text-white py-3 rounded-lg font-bold hover:bg-[#43a047] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          <Save size={18} />
          {t.completeSale}
        </button>
      </div>
    </div>
  );
}

function MobileNavItem({ icon, label, active, onClick }: { icon: React.ReactNode, label: string, active: boolean, onClick: () => void }) {
  return (
    <button onClick={onClick} className={cn("flex flex-col items-center justify-center gap-1 px-2 py-1 transition-all", active ? "text-[#4CAF50]" : "text-[#757575]")}>
      {icon}
      <span className="text-[10px] font-bold uppercase tracking-tight">{label}</span>
    </button>
  );
}

function NavItem({ icon, label, active, onClick }: { icon: React.ReactNode, label: string, active: boolean, onClick: () => void }) {
  return (
    <button onClick={onClick} className={cn("w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200", active ? "bg-[#4CAF50]/10 text-[#4CAF50]" : "text-[#757575] hover:bg-[#F5F5F5] hover:text-[#212121]")}>
      {icon}
      <span className="font-semibold text-sm">{label}</span>
    </button>
  );
}

function StatCard({ label, value, icon }: { label: string, value: string | number, icon: React.ReactNode }) {
  return (
    <div className="bg-white p-6 rounded-xl border border-[#E0E0E0] shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-4">
        <div className="p-2.5 bg-[#F5F5F5] rounded-lg">{icon}</div>
        <Info size={16} className="text-[#BDBDBD]" />
      </div>
      <p className="text-xs font-bold text-[#757575] uppercase tracking-wider mb-1">{label}</p>
      <h4 className="text-2xl font-bold text-[#212121]">{value}</h4>
    </div>
  );
}

function TierBadge({ tier }: { tier: Customer['tier'] }) {
  const colors = {
    Standard: 'bg-slate-100 text-slate-600',
    Silver: 'bg-zinc-100 text-zinc-600',
    Gold: 'bg-amber-100 text-amber-600',
    Platinum: 'bg-indigo-100 text-indigo-600'
  };
  return <span className={cn("text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-lg", colors[tier])}>{tier}</span>;
}

function Input({ label, ...props }: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      <label className="text-xs font-bold text-[#6B7280] uppercase block mb-1.5">{label}</label>
      <input 
        {...props}
        className="w-full p-2.5 bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1A1A1A]/10 transition-all"
      />
    </div>
  );
}
