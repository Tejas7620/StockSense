import { inventoryEngine } from './inventoryEngine';
import {
  Product,
  Warehouse,
  Location,
  StockQuant,
  Receipt,
  Delivery,
  InternalTransfer,
  Adjustment,
  StockLedgerEntry,
  CycleCount,
  Category,
  ReorderingRule,
  Notification,
  User,
  DashboardStats,
} from '../types';

/**
 * StockSense Centralized API Client
 * Mimics RESTful endpoints conforming to enterprise specification
 */
export const api = {
  // --- AUTH ---
  auth: {
    getCurrentUser: async (): Promise<User> => {
      return inventoryEngine.getUser();
    },
    updateProfile: async (data: Partial<User>): Promise<User> => {
      const current = inventoryEngine.getUser();
      const updated = { ...current, ...data };
      inventoryEngine.setUser(updated);
      return updated;
    },
    login: async (_email: string): Promise<User> => {
      return inventoryEngine.getUser();
    },
  },

  // --- DASHBOARD ---
  dashboard: {
    getStats: async (warehouseId?: string): Promise<DashboardStats> => {
      return inventoryEngine.getDashboardStats(warehouseId);
    },
    getStockByLocation: async () => {
      return inventoryEngine.getStockByLocationBreakdown();
    },
    getOperationsToday: async () => {
      const state = inventoryEngine.getState();
      const recentReceipts = state.receipts.slice(0, 3).map((r) => ({
        id: r.reference,
        type: 'Receipt' as const,
        product: r.items[0]?.productName || 'Multiple items',
        quantity: `+${r.items.reduce((s, i) => s + (i.receivedQty || i.orderedQty), 0)} ${r.items[0]?.uom || 'units'}`,
        status: r.status,
        time: r.date.split(' ').slice(-2).join(' '),
        rawId: r.id,
      }));

      const recentDeliveries = state.deliveries.slice(0, 3).map((d) => ({
        id: d.reference,
        type: 'Delivery' as const,
        product: d.items[0]?.productName || 'Multiple items',
        quantity: `-${d.items.reduce((s, i) => s + (i.deliveredQty || i.requestedQty), 0)} ${d.items[0]?.uom || 'units'}`,
        status: d.status,
        time: d.date.split(' ').slice(-2).join(' '),
        rawId: d.id,
      }));

      const recentTransfers = state.transfers.slice(0, 3).map((t) => ({
        id: t.reference,
        type: 'Transfer' as const,
        product: t.items[0]?.productName || 'Multiple items',
        quantity: `+${t.items.reduce((s, i) => s + i.quantity, 0)} ${t.items[0]?.uom || 'units'}`,
        status: t.status,
        time: t.date.split(' ').slice(-2).join(' '),
        rawId: t.id,
      }));

      const recentAdjustments = state.adjustments.slice(0, 3).map((a) => ({
        id: a.reference,
        type: 'Adjustment' as const,
        product: a.productName,
        quantity: `${a.variance > 0 ? '+' : ''}${a.variance} ${a.uom}`,
        status: a.status === 'Applied' ? 'Done' : 'Draft',
        time: a.date.split(' ').slice(-2).join(' '),
        rawId: a.id,
      }));

      return [...recentReceipts, ...recentDeliveries, ...recentTransfers, ...recentAdjustments].slice(0, 6);
    },
    getRecentStockMovement: async (limit = 5): Promise<StockLedgerEntry[]> => {
      return inventoryEngine.getLedger().slice(0, limit);
    },
  },

  // --- PRODUCTS ---
  products: {
    list: async (filters?: { search?: string; categoryId?: string; status?: string }): Promise<Product[]> => {
      let list = inventoryEngine.getProducts();
      if (filters?.search) {
        const query = filters.search.toLowerCase();
        list = list.filter((p) => p.name.toLowerCase().includes(query) || p.sku.toLowerCase().includes(query));
      }
      if (filters?.categoryId && filters.categoryId !== 'all') {
        list = list.filter((p) => p.categoryId === filters.categoryId);
      }
      if (filters?.status && filters.status !== 'all') {
        list = list.filter((p) => p.status === filters.status);
      }
      return list;
    },
    getById: async (id: string): Promise<Product | undefined> => {
      return inventoryEngine.getProductById(id);
    },
    create: async (data: Parameters<typeof inventoryEngine.createProduct>[0]) => {
      return inventoryEngine.createProduct(data);
    },
  },

  // --- WAREHOUSES & LOCATIONS ---
  warehouses: {
    list: async (): Promise<Warehouse[]> => {
      return inventoryEngine.getWarehouses();
    },
  },
  locations: {
    list: async (warehouseId?: string): Promise<Location[]> => {
      return inventoryEngine.getLocations(warehouseId);
    },
  },

  // --- STOCK & QUANTS ---
  stock: {
    getQuants: async (productId?: string, warehouseId?: string, locationId?: string): Promise<StockQuant[]> => {
      return inventoryEngine.getQuants(productId, warehouseId, locationId);
    },
  },

  // --- OPERATIONS ---
  receipts: {
    list: async (): Promise<Receipt[]> => {
      return inventoryEngine.getReceipts();
    },
    create: async (data: Parameters<typeof inventoryEngine.createReceipt>[0]) => {
      return inventoryEngine.createReceipt(data);
    },
    validate: async (id: string) => {
      return inventoryEngine.validateReceipt(id);
    },
  },

  deliveries: {
    list: async (): Promise<Delivery[]> => {
      return inventoryEngine.getDeliveries();
    },
    create: async (data: Parameters<typeof inventoryEngine.createDelivery>[0]) => {
      return inventoryEngine.createDelivery(data);
    },
    validate: async (id: string) => {
      return inventoryEngine.validateDelivery(id);
    },
  },

  transfers: {
    list: async (): Promise<InternalTransfer[]> => {
      return inventoryEngine.getTransfers();
    },
    createAndExecute: async (data: Parameters<typeof inventoryEngine.createAndExecuteTransfer>[0]) => {
      return inventoryEngine.createAndExecuteTransfer(data);
    },
  },

  adjustments: {
    list: async (): Promise<Adjustment[]> => {
      return inventoryEngine.getAdjustments();
    },
    apply: async (data: Parameters<typeof inventoryEngine.applyAdjustment>[0]) => {
      return inventoryEngine.applyAdjustment(data);
    },
  },

  // --- LEDGER ---
  ledger: {
    list: async (filters?: { product?: string; type?: string; warehouse?: string; user?: string }): Promise<StockLedgerEntry[]> => {
      let list = inventoryEngine.getLedger();
      if (filters?.product) {
        const query = filters.product.toLowerCase();
        list = list.filter((e) => e.productName.toLowerCase().includes(query) || e.sku.toLowerCase().includes(query));
      }
      if (filters?.type && filters.type !== 'all') {
        list = list.filter((e) => e.type === filters.type);
      }
      if (filters?.user && filters.user !== 'all') {
        list = list.filter((e) => e.user.toLowerCase().includes(filters.user!.toLowerCase()));
      }
      return list;
    },
  },

  // --- RISK & REORDER ---
  risk: {
    getRisks: async () => {
      const products = inventoryEngine.getProducts();
      return products.filter((p) => p.status === 'Out of Stock' || p.status === 'Below Minimum' || p.status === 'Low Stock' || p.status === 'High Consumption');
    },
  },
  reorder: {
    getRecommendations: async () => {
      const products = inventoryEngine.getProducts();
      const rules = inventoryEngine.getReorderRules();
      return products
        .filter((p) => p.totalStock <= p.reorderLevel)
        .map((p) => {
          const rule = rules.find((r) => r.productId === p.id);
          const target = rule ? rule.targetQuantity : p.targetLevel;
          const recommendedQty = Math.max(0, target - p.totalStock);
          return {
            product: p,
            currentStock: p.totalStock,
            minStock: p.reorderLevel,
            targetStock: target,
            recommendedQty,
          };
        });
    },
  },

  // --- CYCLE COUNTS ---
  cycleCounts: {
    list: async (): Promise<CycleCount[]> => {
      return inventoryEngine.getCycleCounts();
    },
    update: async (id: string, count: number) => {
      return inventoryEngine.updateCycleCount(id, count);
    },
    complete: async (id: string) => {
      return inventoryEngine.completeCycleCount(id);
    },
  },

  // --- CATEGORIES ---
  categories: {
    list: async (): Promise<Category[]> => {
      return inventoryEngine.getCategories();
    },
  },

  // --- REORDER RULES ---
  reorderRules: {
    list: async (): Promise<ReorderingRule[]> => {
      return inventoryEngine.getReorderRules();
    },
  },

  // --- NOTIFICATIONS ---
  notifications: {
    list: async (): Promise<Notification[]> => {
      return inventoryEngine.getNotifications();
    },
    markRead: async (id: string) => {
      inventoryEngine.markNotificationAsRead(id);
    },
    markAllRead: async () => {
      inventoryEngine.markAllNotificationsAsRead();
    },
  },
};
