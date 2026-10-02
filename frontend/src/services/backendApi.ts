import { apiClient, AuthSession } from './apiClient';

export interface BackendUser {
  id: number;
  name: string;
  email: string;
  role: 'MANAGER' | 'STAFF' | string;
  active?: boolean;
}

export interface BackendCategory {
  id: number;
  name: string;
  description?: string;
  active: boolean;
}

export interface BackendWarehouse {
  id: number;
  name: string;
  code: string;
  address?: string;
  active: boolean;
}

export interface BackendLocation {
  id: number;
  name: string;
  code: string;
  warehouseId: number;
  warehouseName: string;
  parentLocationId?: number;
  parentLocationName?: string;
  active: boolean;
}

export interface BackendProduct {
  id: number;
  name: string;
  sku: string;
  categoryId: number;
  categoryName: string;
  unitOfMeasure: string;
  unitCost: number;
  reorderLevel: number;
  active: boolean;
  totalStock: number;
  stockStatus: string;
  createdAt: string;
  updatedAt: string;
}

export interface BackendStock {
  id: number;
  productId: number;
  productName: string;
  sku: string;
  locationId: number;
  locationName: string;
  locationCode: string;
  warehouseId: number;
  warehouseName: string;
  warehouseCode: string;
  quantityOnHand: number;
  quantityReserved: number;
  quantityFree: number;
  unitOfMeasure: string;
  unitCost: number;
  reorderLevel: number;
  status: string;
  updatedAt: string;
}

export interface BackendMoveLine {
  id: number;
  productId: number;
  productName: string;
  sku: string;
  unitOfMeasure: string;
  quantity: number;
  resultingQuantity?: number;
  isShort?: boolean;
}

export interface BackendDocument {
  documentId: string;
  reference: string;
  type: 'RECEIPT' | 'DELIVERY' | 'INTERNAL' | 'ADJUSTMENT';
  status: 'DRAFT' | 'WAITING' | 'READY' | 'DONE' | 'CANCELED';
  partnerName?: string;
  reason?: string;
  notes?: string;
  scheduledDate?: string;
  sourceLocationId?: number;
  sourceLocationName?: string;
  sourceLocationCode?: string;
  sourceWarehouseId?: number;
  sourceWarehouseName?: string;
  destinationLocationId?: number;
  destinationLocationName?: string;
  destinationLocationCode?: string;
  destinationWarehouseId?: number;
  destinationWarehouseName?: string;
  userId: number;
  userName: string;
  validatedById?: number;
  validatedByName?: string;
  lines: BackendMoveLine[];
  createdAt: string;
  updatedAt: string;
}

export interface BackendDashboardData {
  totalProducts: number;
  totalStockValue: number;
  lowStockCount: number;
  outOfStockCount: number;
  pendingReceipts: number;
  pendingDeliveries: number;
  pendingTransfers: number;
  pendingAdjustments: number;
  recentMovements: BackendDocument[];
  lowStockItems: Array<{
    productId: number;
    productName: string;
    sku: string;
    locationName: string;
    warehouseName: string;
    quantityOnHand: number;
    reorderLevel: number;
    status: string;
  }>;
}

export interface PagedResponse<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export interface BackendSearchResult {
  products: BackendProduct[];
  operations: BackendDocument[];
  ledger: BackendDocument[];
}

export interface BackendReorderRecommendation {
  productId: number;
  productName: string;
  sku: string;
  categoryName: string;
  warehouseName: string;
  locationName: string;
  currentStock: number;
  minStock: number;
  targetStock: number;
  recommendedQty: number;
  status: string;
}

export const backendApi = {
  // --- AUTH ---
  auth: {
    login: (credentials: { email: string; password: string }): Promise<AuthSession> =>
      apiClient.post<AuthSession>('/auth/login', credentials),

    signup: (data: { name: string; email: string; password: string }): Promise<BackendUser> =>
      apiClient.post<BackendUser>('/auth/signup', data),

    getMe: (): Promise<BackendUser> => apiClient.get<BackendUser>('/auth/me'),

    refresh: (refreshToken: string): Promise<AuthSession> =>
      apiClient.post<AuthSession>('/auth/refresh', { refreshToken }),

    forgotPassword: (email: string): Promise<string> =>
      apiClient.post<string>('/auth/forgot-password', { email }),

    verifyOtp: (email: string, otp: string): Promise<string> =>
      apiClient.post<string>('/auth/verify-otp', { email, otp }),

    resetPassword: (payload: { email: string; otp: string; newPassword: string }): Promise<string> =>
      apiClient.post<string>('/auth/reset-password', payload),

    logout: (refreshToken?: string): Promise<string> =>
      apiClient.post<string>('/auth/logout', { refreshToken }),
  },

  // --- DASHBOARD ---
  dashboard: {
    get: (): Promise<BackendDashboardData> => apiClient.get<BackendDashboardData>('/dashboard'),
  },

  // --- PRODUCTS ---
  products: {
    list: (params?: { q?: string; categoryId?: number; page?: number; size?: number; sort?: string }): Promise<PagedResponse<BackendProduct>> => {
      const qp = new URLSearchParams();
      if (params?.q) qp.append('q', params.q);
      if (params?.categoryId) qp.append('categoryId', params.categoryId.toString());
      if (params?.page !== undefined) qp.append('page', params.page.toString());
      if (params?.size !== undefined) qp.append('size', params.size.toString());
      if (params?.sort) qp.append('sort', params.sort);
      const query = qp.toString() ? `?${qp.toString()}` : '';
      return apiClient.get<PagedResponse<BackendProduct>>(`/products${query}`);
    },

    get: (id: number | string): Promise<BackendProduct> =>
      apiClient.get<BackendProduct>(`/products/${id}`),

    create: (data: {
      name: string;
      sku: string;
      categoryId: number;
      unitOfMeasure: string;
      unitCost?: number;
      reorderLevel?: number;
    }): Promise<BackendProduct> => apiClient.post<BackendProduct>('/products', data),

    update: (id: number | string, data: Partial<BackendProduct>): Promise<BackendProduct> =>
      apiClient.put<BackendProduct>(`/products/${id}`, data),

    delete: (id: number | string): Promise<void> =>
      apiClient.delete<void>(`/products/${id}`),
  },

  // --- STOCK ---
  stock: {
    getAll: (): Promise<BackendStock[]> => apiClient.get<BackendStock[]>('/stock'),
    getByProduct: (productId: number | string): Promise<BackendStock[]> =>
      apiClient.get<BackendStock[]>(`/stock/product/${productId}`),
    getByLocation: (locationId: number | string): Promise<BackendStock[]> =>
      apiClient.get<BackendStock[]>(`/stock/location/${locationId}`),
    updateQuantity: (
      stockId: number | string,
      payload: { newQuantityOnHand: number; reason?: string }
    ): Promise<BackendDocument> =>
      apiClient.patch<BackendDocument>(`/stock/${stockId}`, payload),
  },

  // --- RECEIPTS ---
  receipts: {
    list: (status?: string, page = 0, size = 50): Promise<PagedResponse<BackendDocument>> => {
      const qp = new URLSearchParams({ page: page.toString(), size: size.toString() });
      if (status && status !== 'all') qp.append('status', status);
      return apiClient.get<PagedResponse<BackendDocument>>(`/receipts?${qp.toString()}`);
    },
    get: (docId: string): Promise<BackendDocument> =>
      apiClient.get<BackendDocument>(`/receipts/${docId}`),
    create: (data: {
      supplier: string;
      destinationLocationId: number;
      scheduledDate?: string;
      notes?: string;
      items: Array<{ productId: number; quantity: number }>;
    }): Promise<BackendDocument> => apiClient.post<BackendDocument>('/receipts', data),
    markReady: (docId: string): Promise<BackendDocument> =>
      apiClient.patch<BackendDocument>(`/receipts/${docId}/mark-ready`),
    validate: (docId: string): Promise<BackendDocument> =>
      apiClient.patch<BackendDocument>(`/receipts/${docId}/validate`),
    cancel: (docId: string): Promise<BackendDocument> =>
      apiClient.patch<BackendDocument>(`/receipts/${docId}/cancel`),
  },

  // --- DELIVERIES ---
  deliveries: {
    list: (status?: string, page = 0, size = 50): Promise<PagedResponse<BackendDocument>> => {
      const qp = new URLSearchParams({ page: page.toString(), size: size.toString() });
      if (status && status !== 'all') qp.append('status', status);
      return apiClient.get<PagedResponse<BackendDocument>>(`/deliveries?${qp.toString()}`);
    },
    get: (docId: string): Promise<BackendDocument> =>
      apiClient.get<BackendDocument>(`/deliveries/${docId}`),
    create: (data: {
      customer: string;
      sourceLocationId: number;
      scheduledDate?: string;
      notes?: string;
      items: Array<{ productId: number; quantity: number }>;
    }): Promise<BackendDocument> => apiClient.post<BackendDocument>('/deliveries', data),
    checkAvailability: (docId: string): Promise<BackendDocument> =>
      apiClient.patch<BackendDocument>(`/deliveries/${docId}/check-availability`),
    validate: (docId: string): Promise<BackendDocument> =>
      apiClient.patch<BackendDocument>(`/deliveries/${docId}/validate`),
    cancel: (docId: string): Promise<BackendDocument> =>
      apiClient.patch<BackendDocument>(`/deliveries/${docId}/cancel`),
  },

  // --- TRANSFERS ---
  transfers: {
    list: (status?: string, page = 0, size = 50): Promise<PagedResponse<BackendDocument>> => {
      const qp = new URLSearchParams({ page: page.toString(), size: size.toString() });
      if (status && status !== 'all') qp.append('status', status);
      return apiClient.get<PagedResponse<BackendDocument>>(`/transfers?${qp.toString()}`);
    },
    get: (docId: string): Promise<BackendDocument> =>
      apiClient.get<BackendDocument>(`/transfers/${docId}`),
    create: (data: {
      sourceLocationId: number;
      destinationLocationId: number;
      scheduledDate?: string;
      notes?: string;
      items: Array<{ productId: number; quantity: number }>;
    }): Promise<BackendDocument> => apiClient.post<BackendDocument>('/transfers', data),
    validate: (docId: string): Promise<BackendDocument> =>
      apiClient.patch<BackendDocument>(`/transfers/${docId}/validate`),
    cancel: (docId: string): Promise<BackendDocument> =>
      apiClient.patch<BackendDocument>(`/transfers/${docId}/cancel`),
  },

  // --- ADJUSTMENTS ---
  adjustments: {
    list: (status?: string, page = 0, size = 50): Promise<PagedResponse<BackendDocument>> => {
      const qp = new URLSearchParams({ page: page.toString(), size: size.toString() });
      if (status && status !== 'all') qp.append('status', status);
      return apiClient.get<PagedResponse<BackendDocument>>(`/adjustments?${qp.toString()}`);
    },
    get: (docId: string): Promise<BackendDocument> =>
      apiClient.get<BackendDocument>(`/adjustments/${docId}`),
    create: (data: {
      locationId: number;
      reason: string;
      notes?: string;
      items: Array<{ productId: number; physicalQuantity?: number; countedQuantity?: number }>;
    }): Promise<BackendDocument> => {
      const items = data.items.map((it) => ({
        productId: it.productId,
        physicalQuantity: it.physicalQuantity ?? it.countedQuantity ?? 0,
        countedQuantity: it.countedQuantity ?? it.physicalQuantity ?? 0,
      }));
      return apiClient.post<BackendDocument>('/adjustments', { ...data, items });
    },
    validate: (docId: string): Promise<BackendDocument> =>
      apiClient.patch<BackendDocument>(`/adjustments/${docId}/validate`),
    cancel: (docId: string): Promise<BackendDocument> =>
      apiClient.patch<BackendDocument>(`/adjustments/${docId}/cancel`),
  },

  // --- STOCK LEDGER (MOVES) ---
  moves: {
    list: (params?: {
      type?: string;
      status?: string;
      productId?: number;
      search?: string;
      page?: number;
      size?: number;
    }): Promise<PagedResponse<BackendDocument>> => {
      const qp = new URLSearchParams();
      if (params?.type && params.type !== 'all') qp.append('type', params.type);
      if (params?.status && params.status !== 'all') qp.append('status', params.status);
      if (params?.productId) qp.append('productId', params.productId.toString());
      if (params?.search) qp.append('search', params.search);
      qp.append('page', (params?.page || 0).toString());
      qp.append('size', (params?.size || 50).toString());
      return apiClient.get<PagedResponse<BackendDocument>>(`/moves?${qp.toString()}`);
    },
    get: (docId: string): Promise<BackendDocument> =>
      apiClient.get<BackendDocument>(`/moves/${docId}`),
  },

  // --- WAREHOUSES & LOCATIONS ---
  warehouses: {
    list: (): Promise<BackendWarehouse[]> => apiClient.get<BackendWarehouse[]>('/warehouses'),
    get: (id: number | string): Promise<BackendWarehouse> =>
      apiClient.get<BackendWarehouse>(`/warehouses/${id}`),
    create: (data: { name: string; code: string; address?: string }): Promise<BackendWarehouse> =>
      apiClient.post<BackendWarehouse>('/warehouses', data),
    update: (id: number | string, data: Partial<BackendWarehouse>): Promise<BackendWarehouse> =>
      apiClient.put<BackendWarehouse>(`/warehouses/${id}`, data),
  },

  locations: {
    list: (warehouseId?: number | string): Promise<BackendLocation[]> => {
      const endpoint = warehouseId ? `/locations?warehouseId=${warehouseId}` : '/locations';
      return apiClient.get<BackendLocation[]>(endpoint);
    },
    get: (id: number | string): Promise<BackendLocation> =>
      apiClient.get<BackendLocation>(`/locations/${id}`),
    create: (data: {
      name: string;
      code: string;
      warehouseId: number;
      parentLocationId?: number;
    }): Promise<BackendLocation> => apiClient.post<BackendLocation>('/locations', data),
    update: (id: number | string, data: Partial<BackendLocation>): Promise<BackendLocation> =>
      apiClient.put<BackendLocation>(`/locations/${id}`, data),
  },

  // --- CATEGORIES ---
  categories: {
    list: (): Promise<BackendCategory[]> => apiClient.get<BackendCategory[]>('/categories'),
    get: (id: number | string): Promise<BackendCategory> =>
      apiClient.get<BackendCategory>(`/categories/${id}`),
    create: (data: { name: string; description?: string }): Promise<BackendCategory> =>
      apiClient.post<BackendCategory>('/categories', data),
    update: (id: number | string, data: Partial<BackendCategory>): Promise<BackendCategory> =>
      apiClient.put<BackendCategory>(`/categories/${id}`, data),
    delete: (id: number | string): Promise<void> =>
      apiClient.delete<void>(`/categories/${id}`),
  },

  // --- GLOBAL SEARCH ---
  search: {
    query: (q: string): Promise<BackendSearchResult> =>
      apiClient.get<BackendSearchResult>(`/search?q=${encodeURIComponent(q)}`),
  },

  // --- REORDER & RISKS ---
  reorder: {
    getRecommendations: (): Promise<BackendReorderRecommendation[]> =>
      apiClient.get<BackendReorderRecommendation[]>('/reorder/recommendations'),
    getRisks: (): Promise<BackendDashboardData['lowStockItems']> =>
      apiClient.get<BackendDashboardData['lowStockItems']>('/risk'),
  },
};
