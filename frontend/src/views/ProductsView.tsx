import React, { useState, useEffect } from 'react';
import {
  Package,
  Plus,
  Search,
  ArrowLeftRight,
  Sliders,
  X,
} from 'lucide-react';
import { inventoryEngine } from '../services/inventoryEngine';
import { RouteId } from '../components/Sidebar';
import { useToast } from '../components/Toast';

interface ProductsViewProps {
  selectedWarehouse?: string;
  onNavigate: (route: RouteId, targetId?: string) => void;
  onOpenTransferForProduct?: (productId: string) => void;
  onOpenAdjustmentForProduct?: (productId: string) => void;
}

export const ProductsView: React.FC<ProductsViewProps> = ({
  selectedWarehouse,
  onNavigate,
  onOpenTransferForProduct,
  onOpenAdjustmentForProduct,
}) => {
  const { showToast } = useToast();
  const products = inventoryEngine.getProducts();
  const categories = inventoryEngine.getCategories();
  const warehouses = inventoryEngine.getWarehouses();
  const locations = inventoryEngine.getLocations();

  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const initialWh = (selectedWarehouse && selectedWarehouse !== 'all' ? selectedWarehouse : warehouses[0]?.id) || '1';
  const initialLocs = locations.filter((l) => l.warehouseId === initialWh);
  const initialLoc = initialLocs[0]?.id || '1';
  const initialCat = categories[0]?.id || '1';

  // New Product Form State
  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    categoryId: initialCat,
    uom: 'pcs',
    initialStock: 0,
    reorderLevel: 20,
    targetLevel: 50,
    warehouseId: initialWh,
    locationId: initialLoc,
    description: '',
  });

  // Keep form data consistent with available warehouses & locations
  useEffect(() => {
    if (warehouses.length > 0) {
      const currentWhValid = warehouses.some((w) => w.id === formData.warehouseId);
      const activeWh = currentWhValid ? formData.warehouseId : warehouses[0].id;
      const validLocs = locations.filter((l) => l.warehouseId === activeWh);
      const isLocValid = validLocs.some((l) => l.id === formData.locationId);

      const currentCatValid = categories.some((c) => c.id === formData.categoryId);
      const activeCat = currentCatValid ? formData.categoryId : categories[0]?.id || '1';

      if (!currentWhValid || !isLocValid || !currentCatValid) {
        setFormData((prev) => ({
          ...prev,
          warehouseId: activeWh,
          locationId: isLocValid ? prev.locationId : validLocs[0]?.id || '',
          categoryId: activeCat,
        }));
      }
    }
  }, [warehouses, locations, categories, formData.warehouseId, formData.locationId, formData.categoryId]);

  const handleWarehouseChange = (whId: string) => {
    const locs = locations.filter((l) => l.warehouseId === whId);
    setFormData((prev) => ({
      ...prev,
      warehouseId: whId,
      locationId: locs[0]?.id || '',
    }));
  };

  // Filter products
  const filteredProducts = products.filter((p) => {
    if (search) {
      const q = search.toLowerCase();
      if (!p.name.toLowerCase().includes(q) && !p.sku.toLowerCase().includes(q)) {
        return false;
      }
    }
    if (selectedCategory !== 'all' && p.categoryId !== selectedCategory) {
      return false;
    }
    if (selectedStatus !== 'all' && p.status !== selectedStatus) {
      return false;
    }
    return true;
  });

  const handleCreateProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.sku.trim()) {
      showToast('error', 'Validation Error', 'Product Name and SKU are required.');
      return;
    }

    const res = inventoryEngine.createProduct({
      name: formData.name,
      sku: formData.sku,
      categoryId: formData.categoryId,
      uom: formData.uom,
      initialStock: Number(formData.initialStock) || 0,
      reorderLevel: Number(formData.reorderLevel) || 10,
      targetLevel: Number(formData.targetLevel) || 50,
      warehouseId: formData.warehouseId,
      locationId: formData.locationId,
      description: formData.description,
    });

    if (res.success) {
      showToast('success', 'Product Created', `${formData.name} (${formData.sku.toUpperCase()}) added to inventory catalog.`);
      setIsCreateModalOpen(false);
      setFormData({
        name: '',
        sku: '',
        categoryId: categories[0]?.id || 'cat-raw',
        uom: 'pcs',
        initialStock: 0,
        reorderLevel: 20,
        targetLevel: 50,
        warehouseId: 'wh-main',
        locationId: 'loc-rack-a',
        description: '',
      });
    } else {
      showToast('error', 'Creation Failed', res.error);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 26, color: '#0F172A' }}>Products</h1>
          <p style={{ color: '#64748B', fontSize: 14, marginTop: 4 }}>
            Manage products, stock availability, and reorder points.
          </p>
        </div>
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="btn btn-primary"
          style={{ background: '#6D28D9', padding: '10px 18px' }}
        >
          <Plus size={16} />
          <span>New Product</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div
        className="card"
        style={{
          padding: '14px 18px',
          display: 'flex',
          alignItems: 'center',
          gap: 14,
          flexWrap: 'wrap',
        }}
      >
        {/* Search */}
        <div style={{ flex: 1, minWidth: 240, position: 'relative' }}>
          <Search size={16} color="#94A3B8" style={{ position: 'absolute', left: 12, top: 11 }} />
          <input
            type="text"
            placeholder="Search by name, SKU..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-field"
            style={{ paddingLeft: 36 }}
          />
        </div>

        {/* Category Filter */}
        <div style={{ minWidth: 160 }}>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="input-field"
          >
            <option value="all">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        {/* Status Filter */}
        <div style={{ minWidth: 160 }}>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="input-field"
          >
            <option value="all">All Statuses</option>
            <option value="In Stock">In Stock</option>
            <option value="Low Stock">Low Stock</option>
            <option value="Below Minimum">Below Minimum</option>
            <option value="Out of Stock">Out of Stock</option>
            <option value="High Consumption">High Consumption</option>
          </select>
        </div>
      </div>

      {/* Products Table */}
      <div className="table-container">
        <table className="enterprise-table">
          <thead>
            <tr>
              <th>Product</th>
              <th>SKU</th>
              <th>Category</th>
              <th>On Hand</th>
              <th>Available</th>
              <th>Reorder Point</th>
              <th>Status</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredProducts.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: '48px 20px', color: '#64748B' }}>
                  <Package size={40} color="#CBD5E1" style={{ margin: '0 auto 10px' }} />
                  <div style={{ fontWeight: 600, fontSize: 14 }}>No products match your filters</div>
                  <div style={{ fontSize: 12.5, color: '#94A3B8', marginTop: 4 }}>
                    Try clearing search criteria or create a new inventory product.
                  </div>
                </td>
              </tr>
            ) : (
              filteredProducts.map((p) => {
                let badgeClass = 'badge-success';
                if (p.status === 'Out of Stock') badgeClass = 'badge-danger';
                else if (p.status === 'Low Stock' || p.status === 'Below Minimum') badgeClass = 'badge-warning';
                else if (p.status === 'High Consumption') badgeClass = 'badge-info';

                return (
                  <tr key={p.id}>
                    <td>
                      <div
                        style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}
                        onClick={() => onNavigate('products', p.id)}
                      >
                        <div
                          style={{
                            width: 36,
                            height: 36,
                            borderRadius: 8,
                            background: '#F1F5F9',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                          }}
                        >
                          <Package size={18} color="#64748B" />
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, color: '#0F172A' }}>{p.name}</div>
                          <div style={{ fontSize: 11.5, color: '#64748B' }}>
                            {p.description ? p.description.slice(0, 36) + '...' : 'Tracked item'}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td style={{ fontWeight: 600, color: '#6D28D9' }}>{p.sku}</td>
                    <td>{p.categoryName}</td>
                    <td style={{ fontWeight: 700, color: '#0F172A' }}>
                      {p.totalStock} {p.uom}
                    </td>
                    <td style={{ color: '#475569' }}>
                      {p.availableStock} {p.uom}
                    </td>
                    <td style={{ color: '#64748B' }}>
                      {p.reorderLevel} {p.uom}
                    </td>
                    <td>
                      <span className={`badge ${badgeClass}`}>
                        <span className="badge-dot" />
                        {p.status}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: 6 }}>
                        <button
                          onClick={() => onNavigate('products', p.id)}
                          className="btn btn-sm btn-outline"
                          title="View Product Details"
                        >
                          View
                        </button>
                        <button
                          onClick={() => {
                            if (onOpenTransferForProduct) onOpenTransferForProduct(p.id);
                            else onNavigate('transfers', p.id);
                          }}
                          className="btn btn-sm btn-outline"
                          title="Transfer Stock"
                        >
                          <ArrowLeftRight size={13} />
                        </button>
                        <button
                          onClick={() => {
                            if (onOpenAdjustmentForProduct) onOpenAdjustmentForProduct(p.id);
                            else onNavigate('adjustments', p.id);
                          }}
                          className="btn btn-sm btn-outline"
                          title="Count & Adjust Stock"
                        >
                          <Sliders size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Create Product Modal */}
      {isCreateModalOpen && (
        <div className="modal-overlay" onClick={() => setIsCreateModalOpen(false)}>
          <div
            className="modal-content"
            style={{ maxWidth: 560 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                padding: '18px 24px',
                borderBottom: '1px solid var(--border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 8,
                    background: '#F5F3FF',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Package size={18} color="#6D28D9" />
                </div>
                <h3 style={{ fontSize: 17 }}>Create New Product</h3>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                style={{ background: 'none', border: 'none', color: '#64748B', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateProduct} style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 14 }}>
                <div>
                  <label className="input-label">
                    Product Name <span className="input-required">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Copper Wire Spool"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="input-label">
                    SKU Code <span className="input-required">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. COP-009"
                    value={formData.sku}
                    onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                    className="input-field"
                    style={{ textTransform: 'uppercase' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div>
                  <label className="input-label">Category</label>
                  <select
                    value={formData.categoryId}
                    onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                    className="input-field"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="input-label">Unit of Measure (UOM)</label>
                  <select
                    value={formData.uom}
                    onChange={(e) => setFormData({ ...formData, uom: e.target.value })}
                    className="input-field"
                  >
                    <option value="kg">kg (Kilograms)</option>
                    <option value="pcs">pcs (Pieces)</option>
                    <option value="roll">roll (Spools / Rolls)</option>
                    <option value="box">box (Boxes / Cartons)</option>
                    <option value="m">m (Meters)</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
                <div>
                  <label className="input-label">Initial Stock</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.initialStock}
                    onChange={(e) => setFormData({ ...formData, initialStock: Number(e.target.value) })}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="input-label">Reorder Level</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.reorderLevel}
                    onChange={(e) => setFormData({ ...formData, reorderLevel: Number(e.target.value) })}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="input-label">Target Level</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.targetLevel}
                    onChange={(e) => setFormData({ ...formData, targetLevel: Number(e.target.value) })}
                    className="input-field"
                  />
                </div>
              </div>

              {formData.initialStock > 0 && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div>
                    <label className="input-label">Initial Warehouse</label>
                    <select
                      value={formData.warehouseId}
                      onChange={(e) => handleWarehouseChange(e.target.value)}
                      className="input-field"
                    >
                      {warehouses.map((w) => (
                        <option key={w.id} value={w.id}>
                          {w.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="input-label">Initial Storage Location</label>
                    <select
                      value={formData.locationId}
                      onChange={(e) => setFormData({ ...formData, locationId: e.target.value })}
                      className="input-field"
                    >
                      {locations
                        .filter((l) => l.warehouseId === formData.warehouseId)
                        .map((l) => (
                          <option key={l.id} value={l.id}>
                            {l.name}
                          </option>
                        ))}
                    </select>
                  </div>
                </div>
              )}

              <div>
                <label className="input-label">Description / Specifications</label>
                <textarea
                  rows={2}
                  placeholder="Material specs, manufacturer, or bin storage requirements..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="input-field"
                  style={{ resize: 'vertical' }}
                />
              </div>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'flex-end',
                  gap: 12,
                  marginTop: 10,
                }}
              >
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="btn btn-outline"
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" style={{ background: '#6D28D9' }}>
                  Create Product
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
