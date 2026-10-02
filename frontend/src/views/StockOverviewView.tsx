import React, { useState, useEffect } from 'react';
import { Search } from 'lucide-react';
import { inventoryEngine } from '../services/inventoryEngine';
import { RouteId } from '../components/Sidebar';

interface StockOverviewViewProps {
  onNavigate: (route: RouteId, targetId?: string) => void;
  selectedWarehouse?: string;
}

export const StockOverviewView: React.FC<StockOverviewViewProps> = ({ onNavigate, selectedWarehouse: propWarehouse }) => {
  const quants = inventoryEngine.getQuants();
  const products = inventoryEngine.getProducts();
  const warehouses = inventoryEngine.getWarehouses();
  const locations = inventoryEngine.getLocations();
  const categories = inventoryEngine.getCategories();

  const [search, setSearch] = useState('');
  const [selectedWarehouse, setSelectedWarehouse] = useState(propWarehouse || 'all');
  const [selectedCategory, setSelectedCategory] = useState('all');

  useEffect(() => {
    if (propWarehouse) {
      setSelectedWarehouse(propWarehouse);
    }
  }, [propWarehouse]);

  // Enrich quants with product and location info
  const enrichedStock = quants.map((q) => {
    const prod = products.find((p) => p.id === q.productId);
    const loc = locations.find((l) => l.id === q.locationId);
    const wh = warehouses.find((w) => w.id === q.warehouseId);
    return {
      quantId: q.id,
      productId: q.productId,
      productName: prod?.name || 'Unknown',
      sku: prod?.sku || 'SKU',
      categoryId: prod?.categoryId,
      categoryName: prod?.categoryName || 'General',
      warehouseId: q.warehouseId,
      warehouseName: wh?.name || 'Warehouse',
      locationId: q.locationId,
      locationName: loc?.name || 'Rack',
      quantity: q.quantity,
      reserved: q.reservedQuantity,
      available: Math.max(0, q.quantity - q.reservedQuantity),
      uom: prod?.uom || 'units',
      reorderLevel: prod?.reorderLevel || 0,
      status: prod?.status || 'In Stock',
    };
  });

  const filteredStock = enrichedStock.filter((item) => {
    if (search) {
      const q = search.toLowerCase();
      if (!item.productName.toLowerCase().includes(q) && !item.sku.toLowerCase().includes(q)) {
        return false;
      }
    }
    if (selectedWarehouse !== 'all' && item.warehouseId !== selectedWarehouse) {
      return false;
    }
    if (selectedCategory !== 'all' && item.categoryId !== selectedCategory) {
      return false;
    }
    return true;
  });

  const totalStockCount = filteredStock.reduce((s, i) => s + i.quantity, 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 26, color: '#0F172A' }}>Stock Overview</h1>
          <p style={{ color: '#64748B', fontSize: 14, marginTop: 4 }}>
            Detailed breakdown of on-hand, available, and reserved units by warehouse rack.
          </p>
        </div>
        <span className="badge badge-purple" style={{ padding: '6px 14px', fontSize: 13 }}>
          {totalStockCount.toLocaleString()} Total Units Tracked
        </span>
      </div>

      {/* Filter Bar */}
      <div className="card" style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 240, position: 'relative' }}>
          <Search size={16} color="#94A3B8" style={{ position: 'absolute', left: 12, top: 11 }} />
          <input
            type="text"
            placeholder="Search by product or SKU..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-field"
            style={{ paddingLeft: 36 }}
          />
        </div>
        <div style={{ minWidth: 160 }}>
          <select
            value={selectedWarehouse}
            onChange={(e) => setSelectedWarehouse(e.target.value)}
            className="input-field"
          >
            <option value="all">All Warehouses</option>
            {warehouses.map((w) => (
              <option key={w.id} value={w.id}>{w.name}</option>
            ))}
          </select>
        </div>
        <div style={{ minWidth: 160 }}>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="input-field"
          >
            <option value="all">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Stock Overview Table */}
      <div className="table-container">
        <table className="enterprise-table">
          <thead>
            <tr>
              <th>Product</th>
              <th>SKU</th>
              <th>Category</th>
              <th>Warehouse</th>
              <th>Location</th>
              <th>On Hand</th>
              <th>Reserved</th>
              <th>Available</th>
              <th>Status</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredStock.map((s) => {
              let badgeClass = 'badge-success';
              if (s.status === 'Out of Stock') badgeClass = 'badge-danger';
              else if (s.status === 'Low Stock' || s.status === 'Below Minimum') badgeClass = 'badge-warning';

              return (
                <tr key={s.quantId}>
                  <td>
                    <div
                      style={{ fontWeight: 600, color: '#0F172A', cursor: 'pointer' }}
                      onClick={() => onNavigate('products', s.productId)}
                    >
                      {s.productName}
                    </div>
                  </td>
                  <td style={{ fontWeight: 600, color: '#6D28D9' }}>{s.sku}</td>
                  <td>{s.categoryName}</td>
                  <td style={{ color: '#334155' }}>{s.warehouseName}</td>
                  <td style={{ fontWeight: 500, color: '#0F172A' }}>{s.locationName}</td>
                  <td style={{ fontWeight: 700, color: '#0F172A' }}>
                    {s.quantity} {s.uom}
                  </td>
                  <td style={{ color: '#F59E0B' }}>
                    {s.reserved} {s.uom}
                  </td>
                  <td style={{ fontWeight: 600, color: '#10B981' }}>
                    {s.available} {s.uom}
                  </td>
                  <td>
                    <span className={`badge ${badgeClass}`}>
                      <span className="badge-dot" />
                      {s.status}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <button
                      onClick={() => onNavigate('products', s.productId)}
                      className="btn btn-sm btn-outline"
                    >
                      Inspect
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
