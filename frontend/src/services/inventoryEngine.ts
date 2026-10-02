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
  ProductStatus,
  AdjustmentReason,
  ReceiptItem,
  DeliveryItem,
  TransferItem,
} from '../types';

import {
  initialUser,
  initialWarehouses,
  initialLocations,
  initialCategories,
  initialProducts,
  initialStockQuants,
  initialReceipts,
  initialDeliveries,
  initialTransfers,
  initialAdjustments,
  initialLedger,
  initialCycleCounts,
  initialReorderRules,
  initialNotifications,
} from '../data/initialData';

import { backendApi, BackendDocument } from './backendApi';

const STORAGE_KEY = 'stocksense_state_v1';

export interface InventoryState {
  user: User;
  warehouses: Warehouse[];
  locations: Location[];
  categories: Category[];
  products: Product[];
  quants: StockQuant[];
  receipts: Receipt[];
  deliveries: Delivery[];
  transfers: InternalTransfer[];
  adjustments: Adjustment[];
  ledger: StockLedgerEntry[];
  cycleCounts: CycleCount[];
  reorderRules: ReorderingRule[];
  notifications: Notification[];
}

type Listener = () => void;

class InventoryEngine {
  private state: InventoryState;
  private listeners: Set<Listener> = new Set();
  private isSyncing = false;

  constructor() {
    this.state = this.loadState();
    // Automatically trigger initial backend synchronization
    this.syncWithBackend().catch(() => {
      // Fallback already initialized with robust default demo data
    });
  }

  private loadState(): InventoryState {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
    return this.getInitialState();
  }

  private getInitialState(): InventoryState {
    return {
      user: { ...initialUser },
      warehouses: JSON.parse(JSON.stringify(initialWarehouses)),
      locations: JSON.parse(JSON.stringify(initialLocations)),
      categories: JSON.parse(JSON.stringify(initialCategories)),
      products: JSON.parse(JSON.stringify(initialProducts)),
      quants: JSON.parse(JSON.stringify(initialStockQuants)),
      receipts: JSON.parse(JSON.stringify(initialReceipts)),
      deliveries: JSON.parse(JSON.stringify(initialDeliveries)),
      transfers: JSON.parse(JSON.stringify(initialTransfers)),
      adjustments: JSON.parse(JSON.stringify(initialAdjustments)),
      ledger: JSON.parse(JSON.stringify(initialLedger)),
      cycleCounts: JSON.parse(JSON.stringify(initialCycleCounts)),
      reorderRules: JSON.parse(JSON.stringify(initialReorderRules)),
      notifications: JSON.parse(JSON.stringify(initialNotifications)),
    };
  }

  private persist() {
    this.notify();
  }

  public subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    this.listeners.forEach((listener) => {
      try {
        listener();
      } catch (err) {
        console.error('Error in state listener:', err);
      }
    });
  }

  public resetToDefault() {
    this.state = this.getInitialState();
    this.persist();
    this.syncWithBackend().catch(() => {});
  }

  public addWarehouse(data: { name: string; code: string; address?: string }): Warehouse {
    const newWh: Warehouse = {
      id: `wh-${Date.now()}`,
      code: data.code.toUpperCase(),
      name: data.name,
      address: data.address || 'Standard logistics facility',
      locationCount: 1,
      status: 'Active',
    };
    this.state.warehouses.push(newWh);
    this.state.locations.push({
      id: `loc-${Date.now()}`,
      warehouseId: newWh.id,
      warehouseName: newWh.name,
      code: `${newWh.code}-R1`,
      name: `${newWh.name} Rack 1`,
      type: 'Internal',
      status: 'Active',
    });
    this.persist();
    return newWh;
  }

  public addLocation(data: { warehouseId: string; name: string; code: string; type?: Location['type'] }): Location {
    const wh = this.state.warehouses.find((w) => w.id === data.warehouseId);
    const newLoc: Location = {
      id: `loc-${Date.now()}`,
      warehouseId: data.warehouseId,
      warehouseName: wh?.name || 'Warehouse',
      code: data.code.toUpperCase(),
      name: data.name,
      type: data.type || 'Internal',
      status: 'Active',
    };
    this.state.locations.push(newLoc);
    if (wh) {
      wh.locationCount = (wh.locationCount || 0) + 1;
    }
    this.persist();
    return newLoc;
  }

  public addCategory(data: { name: string; code: string; description?: string }): Category {
    const newCat: Category = {
      id: `cat-${Date.now()}`,
      name: data.name,
      code: data.code.toUpperCase(),
      description: data.description || '',
      productCount: 0,
    };
    this.state.categories.push(newCat);
    this.persist();
    return newCat;
  }

  public addReorderRule(data: { productId: string; warehouseId: string; minQuantity: number; targetQuantity: number }): ReorderingRule | null {
    const prod = this.getProductById(data.productId);
    const wh = this.state.warehouses.find((w) => w.id === data.warehouseId);
    if (!prod || !wh) return null;

    const newRule: ReorderingRule = {
      id: `rr-${Date.now()}`,
      productId: prod.id,
      productName: prod.name,
      sku: prod.sku,
      uom: prod.uom,
      warehouseId: wh.id,
      warehouseName: wh.name,
      minQuantity: data.minQuantity,
      targetQuantity: data.targetQuantity,
      active: true,
    };
    this.state.reorderRules.push(newRule);
    this.persist();
    return newRule;
  }

  public toggleReorderRule(ruleId: string): boolean {
    const rule = this.state.reorderRules.find((r) => r.id === ruleId);
    if (!rule) return false;
    rule.active = !rule.active;
    this.persist();
    return rule.active;
  }

  public resolveBackendProductId(prodIdOrSku: string): number {
    if (!prodIdOrSku) return 1;
    const direct = parseInt(prodIdOrSku, 10);
    if (!isNaN(direct) && direct > 0 && String(direct) === prodIdOrSku) {
      return direct;
    }
    const found = this.state.products.find(
      (p) => p.id === prodIdOrSku || (p.sku && p.sku.toLowerCase() === prodIdOrSku.toLowerCase()) || (p.name && p.name.toLowerCase() === prodIdOrSku.toLowerCase())
    );
    if (found) {
      const pNum = parseInt(found.id, 10);
      if (!isNaN(pNum) && pNum > 0) return pNum;
      const sku = (found.sku || '').toUpperCase();
      if (sku.includes('STL') || found.id.includes('steel')) return 1;
      if (sku.includes('CPR') || found.id.includes('copper')) return 2;
      if (sku.includes('BRG') || found.id.includes('bearing')) return 3;
      if (sku.includes('PLS') || found.id.includes('plastic')) return 4;
      if (sku.includes('CHR') || found.id.includes('chair')) return 5;
      if (sku.includes('PKG') || found.id.includes('box')) return 6;
    }
    const s = prodIdOrSku.toLowerCase();
    if (s.includes('steel') || s.includes('stl')) return 1;
    if (s.includes('copper') || s.includes('cpr')) return 2;
    if (s.includes('bearing') || s.includes('brg')) return 3;
    if (s.includes('plastic') || s.includes('pls')) return 4;
    if (s.includes('chair') || s.includes('chr')) return 5;
    if (s.includes('pack') || s.includes('pkg') || s.includes('box')) return 6;
    return 1;
  }

  public resolveBackendLocationId(locIdOrCode: string): number {
    if (!locIdOrCode) return 1;
    const direct = parseInt(locIdOrCode, 10);
    if (!isNaN(direct) && direct > 0 && String(direct) === locIdOrCode) {
      return direct;
    }
    const found = this.state.locations.find(
      (l) => l.id === locIdOrCode || (l.code && l.code.toLowerCase() === locIdOrCode.toLowerCase()) || (l.name && l.name.toLowerCase() === locIdOrCode.toLowerCase())
    );
    if (found) {
      const lNum = parseInt(found.id, 10);
      if (!isNaN(lNum) && lNum > 0) return lNum;
      const c = (found.code || '').toUpperCase();
      if (c === 'WH-RA' || c === 'RACK-A' || found.id.includes('rack-a')) return 1;
      if (c === 'WH-RB' || c === 'RACK-B' || found.id.includes('rack-b')) return 2;
      if (c === 'WH-PA' || c === 'WH-RC' || c === 'RACK-C' || found.id.includes('rack-c')) return 3;
      if (c === 'WH-PA-P1' || c === 'RACK-P1' || found.id.includes('p1')) return 4;
      if (c === 'WH-PA-P2' || c === 'RACK-P2' || found.id.includes('p2')) return 5;
      if (c === 'WH2-RC' || found.id.includes('wh2')) return 6;
    }
    const s = locIdOrCode.toLowerCase();
    if (s.includes('rack-b') || s.includes('wh-rb')) return 2;
    if (s.includes('rack-c') || s.includes('wh-rc') || s.includes('wh-pa')) return 3;
    if (s.includes('p1')) return 4;
    if (s.includes('p2')) return 5;
    if (s.includes('wh2') || s.includes('rc')) return 6;
    return 1;
  }

  public resolveBackendCategoryId(catIdOrCode: string): number {
    if (!catIdOrCode) return 1;
    const direct = parseInt(catIdOrCode, 10);
    if (!isNaN(direct) && direct > 0 && String(direct) === catIdOrCode) return direct;
    const found = this.state.categories.find(
      (c) => c.id === catIdOrCode || c.name.toLowerCase() === catIdOrCode.toLowerCase()
    );
    if (found) {
      const cNum = parseInt(found.id, 10);
      if (!isNaN(cNum) && cNum > 0) return cNum;
      const n = found.name.toLowerCase();
      if (n.includes('raw')) return 1;
      if (n.includes('comp')) return 2;
      if (n.includes('finish') || n.includes('furn')) return 3;
      if (n.includes('pack')) return 4;
    }
    const s = catIdOrCode.toLowerCase();
    if (s.includes('comp')) return 2;
    if (s.includes('furn') || s.includes('finish')) return 3;
    if (s.includes('pack')) return 4;
    return 1;
  }

  // ==========================================
  // AUTHORITATIVE BACKEND SYNCHRONIZATION
  // ==========================================

  public async syncWithBackend(): Promise<void> {
    if (this.isSyncing) return;
    this.isSyncing = true;

    try {
      // 1. Fetch metadata in parallel
      const [backendWarehouses, backendLocations, backendCategories] = await Promise.all([
        backendApi.warehouses.list().catch(() => null),
        backendApi.locations.list().catch(() => null),
        backendApi.categories.list().catch(() => null),
      ]);

      if (backendWarehouses && backendWarehouses.length > 0) {
        this.state.warehouses = backendWarehouses.map((w) => ({
          id: w.id.toString(),
          code: w.code,
          name: w.name,
          address: w.address || '',
          locationCount: 3,
          status: w.active ? 'Active' : 'Inactive',
        }));
      }

      if (backendLocations && backendLocations.length > 0) {
        this.state.locations = backendLocations.map((l) => ({
          id: l.id.toString(),
          warehouseId: l.warehouseId.toString(),
          warehouseName: l.warehouseName,
          code: l.code,
          name: l.name,
          type: l.name.includes('Production') ? 'Production' : 'Internal',
          parentLocationId: l.parentLocationId?.toString(),
          status: l.active ? 'Active' : 'Inactive',
        }));
      }

      if (backendCategories && backendCategories.length > 0) {
        this.state.categories = backendCategories.map((c) => ({
          id: c.id.toString(),
          name: c.name,
          code: c.name.substring(0, 4).toUpperCase(),
          description: c.description || '',
          productCount: 0,
        }));
      }

      // 2. Fetch products and stock quants
      const [backendProductsRes, backendStock] = await Promise.all([
        backendApi.products.list({ size: 100 }).catch(() => null),
        backendApi.stock.getAll().catch(() => null),
      ]);

      if (backendProductsRes && backendProductsRes.content) {
        this.state.products = backendProductsRes.content.map((p) => {
          const totalStock = p.totalStock ?? 0;
          return {
            id: p.id.toString(),
            name: p.name,
            sku: p.sku,
            categoryId: p.categoryId?.toString() || '1',
            categoryName: p.categoryName || 'Raw Materials',
            uom: p.unitOfMeasure,
            totalStock,
            availableStock: totalStock,
            reservedStock: 0,
            reorderLevel: p.reorderLevel ?? 50,
            targetLevel: (p.reorderLevel ?? 50) * 2.5,
            status: this.mapBackendStatusToUi(p.stockStatus, totalStock, p.reorderLevel),
            isActive: p.active,
          };
        });
      }

      if (backendStock && backendStock.length > 0) {
        this.state.quants = backendStock.map((s) => ({
          id: s.id.toString(),
          productId: s.productId.toString(),
          warehouseId: s.warehouseId.toString(),
          locationId: s.locationId.toString(),
          quantity: s.quantityOnHand,
          reservedQuantity: s.quantityReserved || 0,
        }));

        // Reconcile available and reserved stock on products
        this.state.products.forEach((p) => {
          const pQuants = this.state.quants.filter((q) => q.productId === p.id);
          const total = pQuants.reduce((sum, q) => sum + q.quantity, 0);
          const reserved = pQuants.reduce((sum, q) => sum + q.reservedQuantity, 0);
          p.totalStock = total;
          p.availableStock = Math.max(0, total - reserved);
          p.reservedStock = reserved;
          p.status = this.recalculateProductStatus(p);
        });
      }

      // 3. Fetch Operations & Ledger
      const [receiptsRes, deliveriesRes, transfersRes, adjustmentsRes, movesRes] =
        await Promise.all([
          backendApi.receipts.list('all', 0, 50).catch(() => null),
          backendApi.deliveries.list('all', 0, 50).catch(() => null),
          backendApi.transfers.list('all', 0, 50).catch(() => null),
          backendApi.adjustments.list('all', 0, 50).catch(() => null),
          backendApi.moves.list({ size: 100 }).catch(() => null),
        ]);

      if (receiptsRes && receiptsRes.content) {
        this.state.receipts = receiptsRes.content.map((doc) => this.mapDocToReceipt(doc));
      }

      if (deliveriesRes && deliveriesRes.content) {
        this.state.deliveries = deliveriesRes.content.map((doc) => this.mapDocToDelivery(doc));
      }

      if (transfersRes && transfersRes.content) {
        this.state.transfers = transfersRes.content.map((doc) => this.mapDocToTransfer(doc));
      }

      if (adjustmentsRes && adjustmentsRes.content) {
        this.state.adjustments = adjustmentsRes.content.map((doc) => this.mapDocToAdjustment(doc));
      }

      if (movesRes && movesRes.content) {
        this.state.ledger = movesRes.content.map((doc) => this.mapDocToLedger(doc));
      }

      this.persist();
    } catch (err) {
      console.warn('Backend sync failed, operating with active memory store:', err);
    } finally {
      this.isSyncing = false;
    }
  }

  // --- Document Mappers ---

  private mapBackendStatusToUi(rawStatus: string, stock: number, min: number): ProductStatus {
    if (stock <= 0) return 'Out of Stock';
    if (stock < min * 0.7) return 'Below Minimum';
    if (stock <= min) return 'Low Stock';
    return 'In Stock';
  }

  private mapDocToReceipt(doc: BackendDocument): Receipt {
    return {
      id: doc.documentId,
      reference: doc.reference,
      supplier: doc.partnerName || 'Vendor Supplier',
      warehouseId: doc.destinationWarehouseId?.toString() || '1',
      locationId: doc.destinationLocationId?.toString() || '1',
      warehouseName: doc.destinationWarehouseName || 'Main Warehouse',
      locationName: doc.destinationLocationName || 'Rack A',
      status: doc.status === 'DONE' ? 'Done' : doc.status === 'READY' ? 'Ready' : doc.status === 'CANCELED' ? 'Cancelled' : 'Draft',
      date: doc.createdAt ? new Date(doc.createdAt).toLocaleDateString() : 'Today',
      notes: doc.notes || doc.reason,
      items: (doc.lines || []).map((l) => ({
        id: l.id.toString(),
        productId: l.productId.toString(),
        productName: l.productName,
        sku: l.sku,
        uom: l.unitOfMeasure,
        orderedQty: l.quantity,
        receivedQty: doc.status === 'DONE' ? l.quantity : 0,
      })),
    };
  }

  private mapDocToDelivery(doc: BackendDocument): Delivery {
    return {
      id: doc.documentId,
      reference: doc.reference,
      customer: doc.partnerName || 'Customer Client',
      warehouseId: doc.sourceWarehouseId?.toString() || '1',
      locationId: doc.sourceLocationId?.toString() || '1',
      warehouseName: doc.sourceWarehouseName || 'Main Warehouse',
      locationName: doc.sourceLocationName || 'Rack A',
      status: doc.status === 'DONE' ? 'Done' : doc.status === 'READY' ? 'Ready' : doc.status === 'WAITING' ? 'Picked' : doc.status === 'CANCELED' ? 'Cancelled' : 'Draft',
      date: doc.createdAt ? new Date(doc.createdAt).toLocaleDateString() : 'Today',
      notes: doc.notes || doc.reason,
      items: (doc.lines || []).map((l) => ({
        id: l.id.toString(),
        productId: l.productId.toString(),
        productName: l.productName,
        sku: l.sku,
        uom: l.unitOfMeasure,
        availableQty: 100,
        requestedQty: l.quantity,
        deliveredQty: doc.status === 'DONE' ? l.quantity : 0,
      })),
    };
  }

  private mapDocToTransfer(doc: BackendDocument): InternalTransfer {
    return {
      id: doc.documentId,
      reference: doc.reference,
      status: doc.status === 'DONE' ? 'Done' : 'Draft',
      date: doc.createdAt ? new Date(doc.createdAt).toLocaleDateString() : 'Today',
      sourceWarehouseId: doc.sourceWarehouseId?.toString() || '1',
      sourceWarehouseName: doc.sourceWarehouseName || 'Main Warehouse',
      sourceLocationId: doc.sourceLocationId?.toString() || '1',
      sourceLocationName: doc.sourceLocationName || 'Rack A',
      destWarehouseId: doc.destinationWarehouseId?.toString() || '1',
      destWarehouseName: doc.destinationWarehouseName || 'Main Warehouse',
      destLocationId: doc.destinationLocationId?.toString() || '4',
      destLocationName: doc.destinationLocationName || 'Rack P1',
      notes: doc.notes || doc.reason,
      items: (doc.lines || []).map((l) => ({
        id: l.id.toString(),
        productId: l.productId.toString(),
        productName: l.productName,
        sku: l.sku,
        uom: l.unitOfMeasure,
        availableQty: l.quantity,
        quantity: l.quantity,
      })),
    };
  }

  private mapDocToAdjustment(doc: BackendDocument): Adjustment {
    const line = doc.lines?.[0];
    const rawReason = doc.reason || 'Counting Error';
    const validReason: AdjustmentReason =
      rawReason === 'Damaged' || rawReason === 'Missing' || rawReason === 'Misplaced' || rawReason === 'Counting Error'
        ? rawReason
        : 'Other';

    return {
      id: doc.documentId,
      reference: doc.reference,
      productId: line?.productId.toString() || '1',
      productName: line?.productName || 'Adjusted Item',
      sku: line?.sku || 'ADJ-SKU',
      uom: line?.unitOfMeasure || 'pcs',
      warehouseId: doc.sourceWarehouseId?.toString() || '1',
      locationId: doc.sourceLocationId?.toString() || '1',
      locationName: doc.sourceLocationName || 'Rack A',
      systemQuantity: (line?.resultingQuantity || 0) - (line?.quantity || 0),
      physicalCount: line?.resultingQuantity || 0,
      variance: line?.quantity || 0,
      reason: validReason,
      status: doc.status === 'DONE' ? 'Applied' : 'Draft',
      date: doc.createdAt ? new Date(doc.createdAt).toLocaleDateString() : 'Today',
    };
  }

  private mapDocToLedger(doc: BackendDocument): StockLedgerEntry {
    const line = doc.lines?.[0];
    let type: StockLedgerEntry['type'] = 'Receipt';
    let impact: 'IN' | 'OUT' | 'INTERNAL' = 'IN';

    if (doc.type === 'DELIVERY') {
      type = 'Delivery';
      impact = 'OUT';
    } else if (doc.type === 'INTERNAL') {
      type = 'Internal Transfer';
      impact = 'INTERNAL';
    } else if (doc.type === 'ADJUSTMENT') {
      type = 'Adjustment';
      impact = (line?.quantity || 0) >= 0 ? 'IN' : 'OUT';
    }

    return {
      id: doc.documentId,
      reference: doc.reference,
      type,
      impact,
      productId: line?.productId.toString() || '1',
      productName: line?.productName || 'Product',
      sku: line?.sku || 'SKU',
      quantity: Math.abs(line?.quantity || 0),
      uom: line?.unitOfMeasure || 'pcs',
      fromLocation: doc.sourceLocationName || 'Vendor Location',
      toLocation: doc.destinationLocationName || 'Warehouse Rack',
      user: doc.userName || 'Admin Manager',
      status: 'Done',
      timestamp: doc.createdAt ? new Date(doc.createdAt).toLocaleString() : 'Just now',
      balanceAfter: line?.resultingQuantity ?? 100,
    };
  }

  // ==========================================
  // PUBLIC GETTERS
  // ==========================================

  public getState(): InventoryState {
    return this.state;
  }

  public getUser(): User {
    return this.state.user;
  }

  public setUser(user: User) {
    this.state.user = user;
    this.persist();
  }

  public getProducts(): Product[] {
    return this.state.products;
  }

  public getProductById(id: string): Product | undefined {
    return this.state.products.find((p) => p.id === id || p.sku.toLowerCase() === id.toLowerCase());
  }

  public getWarehouses(): Warehouse[] {
    return this.state.warehouses;
  }

  public getLocations(warehouseId?: string): Location[] {
    if (!warehouseId || warehouseId === 'all') {
      return this.state.locations;
    }
    return this.state.locations.filter((l) => l.warehouseId === warehouseId);
  }

  public getQuants(productId?: string, warehouseId?: string, locationId?: string): StockQuant[] {
    return this.state.quants.filter((q) => {
      if (productId && q.productId !== productId) return false;
      if (warehouseId && warehouseId !== 'all' && q.warehouseId !== warehouseId) return false;
      if (locationId && q.locationId !== locationId) return false;
      return true;
    });
  }

  public getReceipts(): Receipt[] {
    return this.state.receipts;
  }

  public getDeliveries(): Delivery[] {
    return this.state.deliveries;
  }

  public getTransfers(): InternalTransfer[] {
    return this.state.transfers;
  }

  public getAdjustments(): Adjustment[] {
    return this.state.adjustments;
  }

  public getLedger(): StockLedgerEntry[] {
    return this.state.ledger;
  }

  public getCycleCounts(): CycleCount[] {
    return this.state.cycleCounts;
  }

  public getCategories(): Category[] {
    return this.state.categories;
  }

  public getReorderRules(): ReorderingRule[] {
    return this.state.reorderRules;
  }

  public getNotifications(): Notification[] {
    return this.state.notifications;
  }

  public markNotificationAsRead(id: string) {
    const notif = this.state.notifications.find((n) => n.id === id);
    if (notif) {
      notif.isRead = true;
      this.persist();
    }
  }

  public markAllNotificationsAsRead() {
    this.state.notifications.forEach((n) => (n.isRead = true));
    this.persist();
  }

  // --- STATS & COMPUTATIONS ---

  public getDashboardStats(warehouseFilter?: string): DashboardStats {
    let quants = this.state.quants;
    if (warehouseFilter && warehouseFilter !== 'all') {
      quants = quants.filter((q) => q.warehouseId === warehouseFilter);
    }
    const totalStockUnits = quants.reduce((sum, q) => sum + Math.max(0, q.quantity), 0);

    const products = this.state.products;
    const lowStockCount = products.filter(
      (p) => p.status === 'Low Stock' || p.status === 'Below Minimum'
    ).length;
    const outOfStockCount = products.filter((p) => p.status === 'Out of Stock' || p.totalStock <= 0).length;

    const pendingReceiptsCount = this.state.receipts.filter(
      (r) => r.status === 'Draft' || r.status === 'Ready'
    ).length;
    const pendingTransfersCount = this.state.transfers.filter(
      (t) => t.status === 'Draft' || t.status === 'Ready'
    ).length;
    const pendingDeliveriesCount = this.state.deliveries.filter(
      (d) => d.status !== 'Done' && d.status !== 'Cancelled'
    ).length;

    return {
      totalStockUnits,
      lowStockCount,
      outOfStockCount,
      pendingReceiptsCount,
      pendingTransfersCount,
      pendingDeliveriesCount,
    };
  }

  public getStockByLocationBreakdown() {
    const warehouseTotals: Record<string, { name: string; quantity: number; color: string }> = {
      '1': { name: 'Main Warehouse', quantity: 0, color: '#6D28D9' },
      '2': { name: 'Warehouse 2', quantity: 0, color: '#10B981' },
      'wh-main': { name: 'Main Warehouse', quantity: 0, color: '#6D28D9' },
      'wh-2': { name: 'Warehouse 2', quantity: 0, color: '#10B981' },
    };

    this.state.quants.forEach((q) => {
      if (warehouseTotals[q.warehouseId]) {
        warehouseTotals[q.warehouseId].quantity += q.quantity;
      }
    });

    const breakdown = Object.entries(warehouseTotals)
      .filter(([id]) => id === '1' || id === '2')
      .map(([id, data]) => ({
        id,
        name: data.name,
        quantity: data.quantity,
        percentage: 0,
        color: data.color,
      }));

    const total = breakdown.reduce((sum, item) => sum + item.quantity, 0);
    breakdown.forEach((b) => {
      b.percentage = total > 0 ? Math.round((b.quantity / total) * 100) : 0;
    });

    return {
      total,
      breakdown,
    };
  }

  private recalculateProductStatus(product: Product): ProductStatus {
    if (product.totalStock <= 0) {
      return 'Out of Stock';
    }
    if (product.totalStock < product.reorderLevel * 0.7) {
      return 'Below Minimum';
    }
    if (product.totalStock <= product.reorderLevel) {
      return 'Low Stock';
    }
    return 'In Stock';
  }

  // ==========================================
  // TRANSACTIONAL MUTATIONS CONNECTED TO BACKEND
  // ==========================================

  // --- 1. CREATE PRODUCT ---
  public createProduct(data: {
    name: string;
    sku: string;
    categoryId: string;
    uom: string;
    initialStock?: number;
    reorderLevel?: number;
    targetLevel?: number;
    warehouseId?: string;
    locationId?: string;
    description?: string;
  }): { success: boolean; product?: Product; error?: string } {
    if (!data.name || !data.sku || !data.categoryId || !data.uom) {
      return { success: false, error: 'Product name, SKU, category, and UOM are required.' };
    }

    const skuUpper = data.sku.trim().toUpperCase();
    const existing = this.state.products.find((p) => p.sku.toUpperCase() === skuUpper);
    if (existing) {
      return { success: false, error: `A product with SKU "${skuUpper}" already exists.` };
    }

    const category = this.state.categories.find((c) => c.id === data.categoryId);
    const newProduct: Product = {
      id: `prod-${Date.now()}`,
      name: data.name.trim(),
      sku: skuUpper,
      categoryId: data.categoryId,
      categoryName: category?.name || 'General',
      uom: data.uom.trim(),
      totalStock: data.initialStock || 0,
      availableStock: data.initialStock || 0,
      reservedStock: 0,
      reorderLevel: data.reorderLevel || 10,
      targetLevel: data.targetLevel || 50,
      status: 'In Stock',
      description: data.description || '',
      isActive: true,
    };
    newProduct.status = this.recalculateProductStatus(newProduct);

    this.state.products.unshift(newProduct);

    if (category) {
      category.productCount += 1;
    }

    if (data.initialStock && data.initialStock > 0 && data.locationId) {
      const location = this.state.locations.find((l) => l.id === data.locationId);
      const warehouse = this.state.warehouses.find((w) => w.id === data.warehouseId);

      this.state.quants.push({
        id: `sq-${Date.now()}`,
        productId: newProduct.id,
        warehouseId: data.warehouseId || '1',
        locationId: data.locationId,
        quantity: data.initialStock,
        reservedQuantity: 0,
      });

      this.state.ledger.unshift({
        id: `mov-${Date.now()}`,
        reference: 'INIT-STOCK',
        timestamp: new Date().toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
        type: 'Receipt',
        productId: newProduct.id,
        productName: newProduct.name,
        sku: newProduct.sku,
        fromLocation: 'Initial Inventory Balance',
        toLocation: `${warehouse?.name || 'Warehouse'} / ${location?.name || 'Rack'}`,
        quantity: data.initialStock,
        uom: newProduct.uom,
        user: this.state.user.name,
        status: 'Done',
        notes: 'Initial inventory registration',
      });
    }

    this.persist();

    // Async sync to Spring Boot
    const catId = this.resolveBackendCategoryId(data.categoryId);
    backendApi.products.create({
      name: data.name,
      sku: skuUpper,
      categoryId: catId,
      unitOfMeasure: data.uom,
      reorderLevel: data.reorderLevel || 50,
    }).then(() => this.syncWithBackend()).catch((e) => console.warn('Backend product creation sync note:', e));

    return { success: true, product: newProduct };
  }

  // --- 2. CREATE & VALIDATE RECEIPTS ---
  public createReceipt(data: {
    supplier: string;
    warehouseId: string;
    locationId: string;
    items: { productId: string; orderedQty: number }[];
    notes?: string;
  }): { success: boolean; receipt?: Receipt; error?: string } {
    if (!data.items || data.items.length === 0) {
      return { success: false, error: 'At least one item is required.' };
    }

    const warehouse = this.state.warehouses.find((w) => w.id === data.warehouseId);
    const location = this.state.locations.find((l) => l.id === data.locationId);

    const receiptItems: ReceiptItem[] = data.items.map((it) => {
      const prod = this.getProductById(it.productId);
      return {
        id: `line-${Date.now()}-${Math.random()}`,
        productId: it.productId,
        productName: prod?.name || 'Product',
        sku: prod?.sku || 'SKU',
        uom: prod?.uom || 'pcs',
        orderedQty: it.orderedQty,
        receivedQty: 0,
      };
    });

    const receipt: Receipt = {
      id: `rec-${Date.now()}`,
      reference: `WH/IN/${String(this.state.receipts.length + 1).padStart(4, '0')}`,
      supplier: data.supplier || 'Vendor',
      warehouseId: data.warehouseId,
      locationId: data.locationId,
      warehouseName: warehouse?.name || 'Main Warehouse',
      locationName: location?.name || 'Rack A',
      status: 'Draft',
      date: new Date().toLocaleDateString(),
      notes: data.notes,
      items: receiptItems,
    };

    this.state.receipts.unshift(receipt);
    this.persist();

    // Async sync to backend
    const locIdNum = this.resolveBackendLocationId(data.locationId);
    const backendItems = data.items.map((it) => ({
      productId: this.resolveBackendProductId(it.productId),
      quantity: it.orderedQty,
    }));
    backendApi.receipts.create({
      supplier: data.supplier,
      destinationLocationId: locIdNum,
      notes: data.notes,
      items: backendItems,
    }).then(() => this.syncWithBackend()).catch((e) => console.warn('Backend receipt creation sync note:', e));

    return { success: true, receipt };
  }

  public validateReceipt(receiptId: string): { success: boolean; message: string; error?: string } {
    const receipt = this.state.receipts.find((r) => r.id === receiptId);
    if (!receipt) return { success: false, message: '', error: 'Receipt not found' };
    if (receipt.status === 'Done') return { success: false, message: '', error: 'Receipt already validated' };

    receipt.status = 'Done';
    receipt.items.forEach((item) => {
      item.receivedQty = item.orderedQty;

      const quant = this.state.quants.find(
        (q) => q.productId === item.productId && q.locationId === receipt.locationId
      );
      if (quant) {
        quant.quantity += item.orderedQty;
      } else {
        this.state.quants.push({
          id: `quant-${Date.now()}`,
          productId: item.productId,
          warehouseId: receipt.warehouseId,
          locationId: receipt.locationId,
          quantity: item.orderedQty,
          reservedQuantity: 0,
        });
      }

      this.state.ledger.unshift({
        id: `led-${Date.now()}`,
        reference: receipt.reference,
        timestamp: new Date().toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
        type: 'Receipt',
        productId: item.productId,
        productName: item.productName,
        sku: item.sku,
        fromLocation: receipt.supplier || 'Vendor Location',
        toLocation: `${receipt.warehouseName} / ${receipt.locationName}`,
        quantity: item.orderedQty,
        uom: item.uom,
        user: this.state.user.name,
        status: 'Done',
        notes: receipt.notes,
      });
    });

    this.recalculateAllProductStocks();
    this.persist();

    // Async sync to backend
    if (receiptId.length > 20) {
      backendApi.receipts.validate(receiptId).then(() => this.syncWithBackend()).catch((e) => console.warn('Backend receipt validation error:', e));
    }

    return { success: true, message: `Receipt ${receipt.reference} successfully received into inventory.` };
  }

  // --- 3. CREATE & VALIDATE DELIVERIES ---
  public createDelivery(data: {
    customer: string;
    warehouseId: string;
    locationId: string;
    items: { productId: string; requestedQty: number }[];
    notes?: string;
  }): { success: boolean; delivery?: Delivery; error?: string } {
    if (!data.items || data.items.length === 0) {
      return { success: false, error: 'At least one item is required.' };
    }

    const warehouse = this.state.warehouses.find((w) => w.id === data.warehouseId);
    const location = this.state.locations.find((l) => l.id === data.locationId);

    const deliveryItems: DeliveryItem[] = data.items.map((it) => {
      const prod = this.getProductById(it.productId);
      const quant = this.state.quants.find((q) => q.productId === it.productId && q.locationId === data.locationId);
      return {
        id: `line-${Date.now()}-${Math.random()}`,
        productId: it.productId,
        productName: prod?.name || 'Product',
        sku: prod?.sku || 'SKU',
        uom: prod?.uom || 'pcs',
        availableQty: quant ? quant.quantity : 0,
        requestedQty: it.requestedQty,
        deliveredQty: 0,
      };
    });

    const delivery: Delivery = {
      id: `del-${Date.now()}`,
      reference: `WH/OUT/${String(this.state.deliveries.length + 1).padStart(4, '0')}`,
      customer: data.customer || 'Customer',
      warehouseId: data.warehouseId,
      locationId: data.locationId,
      warehouseName: warehouse?.name || 'Main Warehouse',
      locationName: location?.name || 'Rack B',
      status: 'Draft',
      date: new Date().toLocaleDateString(),
      notes: data.notes,
      items: deliveryItems,
    };

    this.state.deliveries.unshift(delivery);
    this.persist();

    // Async sync to backend
    const locIdNum = this.resolveBackendLocationId(data.locationId);
    const backendItems = data.items.map((it) => ({
      productId: this.resolveBackendProductId(it.productId),
      quantity: it.requestedQty,
    }));
    backendApi.deliveries.create({
      customer: data.customer,
      sourceLocationId: locIdNum,
      notes: data.notes,
      items: backendItems,
    }).then(() => this.syncWithBackend()).catch((e) => console.warn('Backend delivery creation sync note:', e));

    return { success: true, delivery };
  }

  public validateDelivery(deliveryId: string): { success: boolean; message: string; error?: string } {
    const delivery = this.state.deliveries.find((d) => d.id === deliveryId);
    if (!delivery) return { success: false, message: '', error: 'Delivery order not found' };
    if (delivery.status === 'Done') return { success: false, message: '', error: 'Delivery order is already validated' };

    // Stock sufficiency check
    for (const item of delivery.items) {
      const quant = this.state.quants.find((q) => q.productId === item.productId && q.locationId === delivery.locationId);
      const available = quant ? quant.quantity : 0;
      if (item.requestedQty > available) {
        return {
          success: false,
          message: '',
          error: `Insufficient stock for ${item.productName}. Available in ${delivery.locationName}: ${available} ${item.uom}, Requested: ${item.requestedQty} ${item.uom}.`,
        };
      }
    }

    delivery.status = 'Done';
    delivery.items.forEach((item) => {
      item.deliveredQty = item.requestedQty;
      const quant = this.state.quants.find((q) => q.productId === item.productId && q.locationId === delivery.locationId);
      if (quant) {
        quant.quantity = Math.max(0, quant.quantity - item.requestedQty);
      }

      this.state.ledger.unshift({
        id: `led-${Date.now()}`,
        reference: delivery.reference,
        timestamp: new Date().toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
        type: 'Delivery',
        productId: item.productId,
        productName: item.productName,
        sku: item.sku,
        fromLocation: `${delivery.warehouseName} / ${delivery.locationName}`,
        toLocation: delivery.customer || 'Customer Delivery',
        quantity: -item.requestedQty,
        uom: item.uom,
        user: this.state.user.name,
        status: 'Done',
        notes: delivery.notes,
      });
    });

    this.recalculateAllProductStocks();
    this.persist();

    // Async sync to backend
    if (deliveryId.length > 20) {
      backendApi.deliveries.validate(deliveryId).then(() => this.syncWithBackend()).catch((e) => console.warn('Backend delivery validate note:', e));
    }

    return { success: true, message: `Delivery ${delivery.reference} dispatched successfully.` };
  }

  // --- 4. INTERNAL TRANSFERS ---
  public createAndExecuteTransfer(data: {
    sourceWarehouseId: string;
    sourceLocationId: string;
    destWarehouseId: string;
    destLocationId: string;
    productId: string;
    quantity: number;
    notes?: string;
  }): { success: boolean; transfer?: InternalTransfer; message: string; error?: string } {
    if (data.sourceLocationId === data.destLocationId) {
      return { success: false, message: '', error: 'Source and destination locations cannot be identical.' };
    }

    const product = this.getProductById(data.productId);
    if (!product) return { success: false, message: '', error: 'Product not found' };

    const srcQuant = this.state.quants.find(
      (q) => q.productId === data.productId && q.locationId === data.sourceLocationId
    );
    const available = srcQuant ? srcQuant.quantity : 0;
    if (data.quantity > available) {
      return {
        success: false,
        message: '',
        error: `Insufficient stock in source location. Available: ${available} ${product.uom}, Requested: ${data.quantity} ${product.uom}.`,
      };
    }

    const srcLoc = this.state.locations.find((l) => l.id === data.sourceLocationId);
    const destLoc = this.state.locations.find((l) => l.id === data.destLocationId);

    // Atomically transfer quantities
    if (srcQuant) {
      srcQuant.quantity -= data.quantity;
    }

    const destQuant = this.state.quants.find(
      (q) => q.productId === data.productId && q.locationId === data.destLocationId
    );
    if (destQuant) {
      destQuant.quantity += data.quantity;
    } else {
      this.state.quants.push({
        id: `quant-${Date.now()}`,
        productId: data.productId,
        warehouseId: data.destWarehouseId,
        locationId: data.destLocationId,
        quantity: data.quantity,
        reservedQuantity: 0,
      });
    }

    const transfer: InternalTransfer = {
      id: `tra-${Date.now()}`,
      reference: `WH/INT/${String(this.state.transfers.length + 1).padStart(4, '0')}`,
      sourceWarehouseId: data.sourceWarehouseId,
      sourceLocationId: data.sourceLocationId,
      sourceLocationName: srcLoc?.name || 'Rack A',
      destWarehouseId: data.destWarehouseId,
      destLocationId: data.destLocationId,
      destLocationName: destLoc?.name || 'Rack P1',
      status: 'Done',
      date: new Date().toLocaleDateString(),
      notes: data.notes,
      items: [
        {
          id: `line-${Date.now()}`,
          productId: data.productId,
          productName: product.name,
          sku: product.sku,
          uom: product.uom,
          availableQty: available,
          quantity: data.quantity,
        },
      ],
    };

    this.state.transfers.unshift(transfer);

    this.state.ledger.unshift({
      id: `led-${Date.now()}`,
      reference: transfer.reference,
      timestamp: new Date().toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
      type: 'Internal Transfer',
      productId: data.productId,
      productName: product.name,
      sku: product.sku,
      fromLocation: srcLoc?.name || 'Rack A',
      toLocation: destLoc?.name || 'Rack P1',
      quantity: data.quantity,
      uom: product.uom,
      user: this.state.user.name,
      status: 'Done',
      notes: data.notes || 'Internal stock relocation',
    });

    this.recalculateAllProductStocks();
    this.persist();

    // Async sync to Spring Boot
    const srcIdNum = this.resolveBackendLocationId(data.sourceLocationId);
    const destIdNum = this.resolveBackendLocationId(data.destLocationId);
    const prodIdNum = this.resolveBackendProductId(data.productId);
    backendApi.transfers.create({
      sourceLocationId: srcIdNum,
      destinationLocationId: destIdNum,
      notes: data.notes,
      items: [{ productId: prodIdNum, quantity: data.quantity }],
    }).then((doc) => backendApi.transfers.validate(doc.documentId)).then(() => this.syncWithBackend()).catch((e) => console.warn('Backend transfer note:', e));

    return { success: true, transfer, message: `Transferred ${data.quantity} ${product.uom} to ${destLoc?.name || 'Rack P1'}.` };
  }

  public createTransfer(data: {
    sourceWarehouseId: string;
    sourceLocationId: string;
    destWarehouseId: string;
    destLocationId: string;
    items: { productId: string; quantity: number }[];
    notes?: string;
  }): { success: boolean; transfer?: InternalTransfer; error?: string } {
    if (!data.items || data.items.length === 0) {
      return { success: false, error: 'At least one item is required.' };
    }

    const srcLoc = this.state.locations.find((l) => l.id === data.sourceLocationId);
    const destLoc = this.state.locations.find((l) => l.id === data.destLocationId);

    const transferItems: TransferItem[] = data.items.map((it) => {
      const prod = this.getProductById(it.productId);
      const quant = this.state.quants.find((q) => q.productId === it.productId && q.locationId === data.sourceLocationId);
      return {
        id: `line-${Date.now()}-${Math.random()}`,
        productId: it.productId,
        productName: prod?.name || 'Product',
        sku: prod?.sku || 'SKU',
        uom: prod?.uom || 'pcs',
        availableQty: quant ? quant.quantity : 0,
        quantity: it.quantity,
      };
    });

    const transfer: InternalTransfer = {
      id: `tra-${Date.now()}`,
      reference: `WH/INT/${String(this.state.transfers.length + 1).padStart(4, '0')}`,
      sourceWarehouseId: data.sourceWarehouseId,
      sourceLocationId: data.sourceLocationId,
      sourceLocationName: srcLoc?.name || 'Rack A',
      destWarehouseId: data.destWarehouseId,
      destLocationId: data.destLocationId,
      destLocationName: destLoc?.name || 'Rack P1',
      status: 'Draft',
      date: new Date().toLocaleDateString(),
      notes: data.notes,
      items: transferItems,
    };

    this.state.transfers.unshift(transfer);
    this.persist();

    return { success: true, transfer };
  }

  public validateTransfer(transferId: string): { success: boolean; message: string; error?: string } {
    const transfer = this.state.transfers.find((t) => t.id === transferId);
    if (!transfer) return { success: false, message: '', error: 'Transfer not found' };
    if (transfer.status === 'Done') return { success: false, message: '', error: 'Transfer already completed' };

    for (const item of transfer.items) {
      const srcQuant = this.state.quants.find(
        (q) => q.productId === item.productId && q.locationId === transfer.sourceLocationId
      );
      const available = srcQuant ? srcQuant.quantity : 0;
      if (item.quantity > available) {
        return {
          success: false,
          message: '',
          error: `Insufficient stock for ${item.productName}. Available: ${available}, Requested: ${item.quantity}.`,
        };
      }
    }

    transfer.status = 'Done';
    transfer.items.forEach((item) => {
      const srcQuant = this.state.quants.find(
        (q) => q.productId === item.productId && q.locationId === transfer.sourceLocationId
      );
      if (srcQuant) {
        srcQuant.quantity -= item.quantity;
      }

      const destQuant = this.state.quants.find(
        (q) => q.productId === item.productId && q.locationId === transfer.destLocationId
      );
      if (destQuant) {
        destQuant.quantity += item.quantity;
      } else {
        this.state.quants.push({
          id: `quant-${Date.now()}`,
          productId: item.productId,
          warehouseId: transfer.destWarehouseId,
          locationId: transfer.destLocationId,
          quantity: item.quantity,
          reservedQuantity: 0,
        });
      }

      this.state.ledger.unshift({
        id: `led-${Date.now()}`,
        reference: transfer.reference,
        timestamp: new Date().toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
        type: 'Internal Transfer',
        productId: item.productId,
        productName: item.productName,
        sku: item.sku,
        fromLocation: transfer.sourceLocationName,
        toLocation: transfer.destLocationName,
        quantity: item.quantity,
        uom: item.uom,
        user: this.state.user.name,
        status: 'Done',
        notes: transfer.notes,
      });
    });

    this.recalculateAllProductStocks();
    this.persist();

    return { success: true, message: `Transfer ${transfer.reference} completed.` };
  }

  // --- 5. STOCK ADJUSTMENTS ---
  public applyAdjustment(data: {
    warehouseId: string;
    locationId: string;
    productId: string;
    physicalCount: number;
    reason: AdjustmentReason;
    notes?: string;
  }): { success: boolean; adjustment?: Adjustment; message: string; error?: string } {
    const product = this.getProductById(data.productId);
    if (!product) return { success: false, message: '', error: 'Product not found' };

    const quant = this.state.quants.find(
      (q) => q.productId === data.productId && q.locationId === data.locationId
    );
    const systemQuantity = quant ? quant.quantity : 0;
    const variance = data.physicalCount - systemQuantity;

    if (quant) {
      quant.quantity = data.physicalCount;
    } else {
      this.state.quants.push({
        id: `sq-${Date.now()}`,
        productId: data.productId,
        warehouseId: data.warehouseId,
        locationId: data.locationId,
        quantity: data.physicalCount,
        reservedQuantity: 0,
      });
    }

    const loc = this.state.locations.find((l) => l.id === data.locationId);
    const wh = this.state.warehouses.find((w) => w.id === data.warehouseId);

    const adj: Adjustment = {
      id: `adj-${Date.now()}`,
      reference: `WH/ADJ/${String(this.state.adjustments.length + 1).padStart(4, '0')}`,
      productId: data.productId,
      productName: product.name,
      sku: product.sku,
      uom: product.uom,
      warehouseId: data.warehouseId,
      locationId: data.locationId,
      locationName: loc?.name || 'Rack A',
      systemQuantity,
      physicalCount: data.physicalCount,
      variance,
      reason: data.reason,
      status: 'Applied',
      date: new Date().toLocaleDateString(),
      notes: data.notes,
    };

    this.state.adjustments.unshift(adj);

    this.state.ledger.unshift({
      id: `led-${Date.now()}`,
      reference: adj.reference,
      timestamp: new Date().toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
      type: 'Adjustment',
      productId: data.productId,
      productName: product.name,
      sku: product.sku,
      fromLocation: `${wh?.name || 'Warehouse'} / ${loc?.name || 'Rack'}`,
      toLocation: 'Inventory Reconciliation',
      quantity: variance,
      uom: product.uom,
      user: this.state.user.name,
      status: 'Done',
      notes: `${data.reason}: ${data.notes || 'Physical Count Reconciliation'}`,
    });

    this.recalculateAllProductStocks();
    this.persist();

    // Async sync to Spring Boot
    const locIdNum = this.resolveBackendLocationId(data.locationId);
    const prodIdNum = this.resolveBackendProductId(data.productId);
    const reasonCode = (data.reason || 'COUNTING_ERROR').toUpperCase().replace(/ /g, '_').replace(/-/g, '_');
    backendApi.adjustments.create({
      locationId: locIdNum,
      reason: reasonCode,
      notes: data.notes,
      items: [{ productId: prodIdNum, physicalQuantity: data.physicalCount, countedQuantity: data.physicalCount }],
    }).then((doc) => backendApi.adjustments.validate(doc.documentId)).then(() => this.syncWithBackend()).catch((e) => console.warn('Backend adjustment note:', e));

    return {
      success: true,
      adjustment: adj,
      message: `Adjustment applied. System stock updated to ${data.physicalCount} ${product.uom} (Variance: ${variance >= 0 ? '+' : ''}${variance}).`,
    };
  }

  // --- 6. CYCLE COUNTS ---
  public updateCycleCount(id: string, countedQuantity: number): { success: boolean; error?: string } {
    const item = this.state.cycleCounts.find((c) => c.id === id);
    if (!item) return { success: false, error: 'Cycle count item not found' };

    item.countedQuantity = countedQuantity;
    item.variance = countedQuantity - item.systemQuantity;
    item.status = 'Review';
    this.persist();
    return { success: true };
  }

  public completeCycleCount(id: string): { success: boolean; error?: string } {
    const item = this.state.cycleCounts.find((c) => c.id === id);
    if (!item) return { success: false, error: 'Cycle count item not found' };

    if (item.countedQuantity !== undefined && item.variance !== undefined && item.variance !== 0) {
      const location = this.state.locations.find((l) => l.id === item.locationId);
      this.applyAdjustment({
        warehouseId: location?.warehouseId || '1',
        locationId: item.locationId,
        productId: item.productId,
        physicalCount: item.countedQuantity,
        reason: 'Counting Error',
        notes: `Reconciled from Cycle Count ${item.id}`,
      });
    }

    item.status = 'Completed';
    this.persist();
    return { success: true };
  }

  // --- 7. GOLDEN DEMO SCENARIO RUNNER ---
  public runGoldenDemoStep(step: 1 | 2 | 3 | 4 | 5): { success: boolean; message: string; stateSnapshot?: any } {
    const steelRod = this.state.products.find((p) => p.sku === 'STL-001') || this.state.products[0];
    if (!steelRod) return { success: false, message: 'Steel Rod (STL-001) not found' };

    if (step === 1) {
      // Step 1: Start Steel Rod at 0 kg, then receive +100 kg at Main Warehouse / Rack A
      this.state.quants.filter((q) => q.productId === steelRod.id).forEach((q) => (q.quantity = 0));
      this.recalculateAllProductStocks();

      const receiptRes = this.createReceipt({
        supplier: 'ABC Metals',
        warehouseId: '1',
        locationId: '1',
        items: [{ productId: steelRod.id, orderedQty: 100 }],
        notes: 'Golden Demo Step 1: Inbound Replenishment Batch',
      });

      if (receiptRes.receipt) {
        this.validateReceipt(receiptRes.receipt.id);
      }

      return {
        success: true,
        message: `Step 1 Complete: Received +100 kg Steel Rod into Main Warehouse / Rack A. Total Steel Rod Stock: ${steelRod.totalStock} kg.`,
      };
    }

    if (step === 2) {
      // Step 2: Transfer 30 kg from Main Warehouse / Rack A to Production / Rack P1
      const res = this.createAndExecuteTransfer({
        sourceWarehouseId: '1',
        sourceLocationId: '1',
        destWarehouseId: '1',
        destLocationId: '4',
        productId: steelRod.id,
        quantity: 30,
        notes: 'Golden Demo Step 2: Internal Transfer to Production Rack P1',
      });

      const rackAQuant = this.state.quants.find((q) => q.productId === steelRod.id && q.locationId === '1')?.quantity || 0;
      const prodP1Quant = this.state.quants.find((q) => q.productId === steelRod.id && q.locationId === '4')?.quantity || 0;

      return {
        success: res.success,
        message: `Step 2 Complete: Transferred 30 kg to Production. Rack A = ${rackAQuant} kg, Production Rack P1 = ${prodP1Quant} kg. Total Stock = ${steelRod.totalStock} kg (Unchanged).`,
      };
    }

    if (step === 3) {
      // Step 3: Delivery 20 kg to customer -> Total becomes 80 kg
      const deliveryRes = this.createDelivery({
        customer: 'Apex Manufacturing',
        warehouseId: '1',
        locationId: '1',
        items: [{ productId: steelRod.id, requestedQty: 20 }],
        notes: 'Golden Demo Step 3: Outgoing customer delivery',
      });

      if (deliveryRes.delivery) {
        this.validateDelivery(deliveryRes.delivery.id);
      }

      return {
        success: true,
        message: `Step 3 Complete: Delivered 20 kg to Customer. Total Steel Rod Stock is now ${steelRod.totalStock} kg.`,
      };
    }

    if (step === 4) {
      // Step 4: Physical count: 77 kg -> Adjustment: -3 kg -> Final = 77 kg
      const res = this.applyAdjustment({
        warehouseId: '1',
        locationId: '1',
        productId: steelRod.id,
        physicalCount: 47, // 50 - 3 in Rack A + 30 in Production = 77 kg total!
        reason: 'Damaged',
        notes: 'Golden Demo Step 4: Physical count reconciliation (-3 kg discrepancy)',
      });

      return {
        success: res.success,
        message: `Step 4 Complete: Physical audit adjusted stock by -3 kg. Final Steel Rod Stock is now exactly ${steelRod.totalStock} kg.`,
      };
    }

    if (step === 5) {
      return {
        success: true,
        message: `Step 5: All 4 transactions (+100 Receipt, -30 Transfer, -20 Delivery, -3 Adjustment) are logged in the immutable Stock Ledger. Steel Rod final balance: ${steelRod.totalStock} kg.`,
      };
    }

    return { success: false, message: 'Invalid demo step' };
  }

  private recalculateAllProductStocks() {
    this.state.products.forEach((p) => {
      const pQuants = this.state.quants.filter((q) => q.productId === p.id);
      const total = pQuants.reduce((sum, q) => sum + q.quantity, 0);
      const reserved = pQuants.reduce((sum, q) => sum + q.reservedQuantity, 0);
      p.totalStock = total;
      p.availableStock = Math.max(0, total - reserved);
      p.reservedStock = reserved;
      p.status = this.recalculateProductStatus(p);
    });
  }
}

export const inventoryEngine = new InventoryEngine();
