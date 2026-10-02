import React from 'react';
import {
  Package,
  ArrowLeft,
  ArrowDownToLine,
  ArrowLeftRight,
  Sliders,
  MapPin,
  Clock,
  TrendingUp,
} from 'lucide-react';
import { inventoryEngine } from '../services/inventoryEngine';
import { RouteId } from '../components/Sidebar';

interface ProductDetailViewProps {
  productId: string;
  onNavigate: (route: RouteId, targetId?: string) => void;
  onOpenReceiptForProduct: (productId: string) => void;
  onOpenTransferForProduct: (productId: string) => void;
  onOpenAdjustmentForProduct: (productId: string) => void;
}

export const ProductDetailView: React.FC<ProductDetailViewProps> = ({
  productId,
  onNavigate,
  onOpenReceiptForProduct,
  onOpenTransferForProduct,
  onOpenAdjustmentForProduct,
}) => {
  const product = inventoryEngine.getProductById(productId);
  const locations = inventoryEngine.getLocations();
  const quants = inventoryEngine.getQuants(product?.id);
  const movements = inventoryEngine.getLedger().filter((m) => m.productId === product?.id);

  if (!product) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 20px' }}>
        <Package size={48} color="#CBD5E1" style={{ margin: '0 auto 12px' }} />
        <h2>Product Not Found</h2>
        <p style={{ color: '#64748B', marginTop: 6 }}>The requested product does not exist in inventory.</p>
        <button onClick={() => onNavigate('products')} className="btn btn-primary" style={{ marginTop: 16 }}>
          Back to Products
        </button>
      </div>
    );
  }

  let badgeClass = 'badge-success';
  if (product.status === 'Out of Stock') badgeClass = 'badge-danger';
  else if (product.status === 'Low Stock' || product.status === 'Below Minimum') badgeClass = 'badge-warning';
  else if (product.status === 'High Consumption') badgeClass = 'badge-info';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Breadcrumb & Navigation */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: '#64748B' }}>
        <button
          onClick={() => onNavigate('products')}
          style={{
            background: 'none',
            border: 'none',
            color: '#6D28D9',
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            cursor: 'pointer',
            fontWeight: 600,
          }}
        >
          <ArrowLeft size={16} />
          Products
        </button>
        <span>/</span>
        <span style={{ color: '#0F172A', fontWeight: 600 }}>{product.name}</span>
      </div>

      {/* Product Hero Header */}
      <div
        className="card"
        style={{
          padding: '24px 28px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 16,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 12,
              background: '#F5F3FF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Package size={28} color="#6D28D9" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <h1 style={{ fontSize: 24, color: '#0F172A' }}>{product.name}</h1>
              <span className={`badge ${badgeClass}`}>
                <span className="badge-dot" />
                {product.status}
              </span>
            </div>
            <div style={{ fontSize: 13, color: '#64748B', marginTop: 4 }}>
              SKU: <strong style={{ color: '#6D28D9' }}>{product.sku}</strong> • Category: {product.categoryName} • Unit: {product.uom}
            </div>
          </div>
        </div>

        {/* Primary Action Buttons */}
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={() => onOpenReceiptForProduct(product.id)}
            className="btn btn-primary"
            style={{ background: '#6D28D9' }}
          >
            <ArrowDownToLine size={16} />
            <span>Receive Stock</span>
          </button>
          <button
            onClick={() => onOpenTransferForProduct(product.id)}
            className="btn btn-outline-purple"
          >
            <ArrowLeftRight size={16} />
            <span>Transfer</span>
          </button>
          <button
            onClick={() => onOpenAdjustmentForProduct(product.id)}
            className="btn btn-outline"
          >
            <Sliders size={16} />
            <span>Count & Adjust</span>
          </button>
        </div>
      </div>

      {/* KPI Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16 }}>
        <div className="card" style={{ padding: '18px 20px' }}>
          <div style={{ fontSize: 12.5, color: '#64748B', fontWeight: 500 }}>Total On Hand</div>
          <div style={{ fontSize: 26, fontWeight: 800, color: '#0F172A', marginTop: 4 }}>
            {product.totalStock} <span style={{ fontSize: 14, fontWeight: 500, color: '#64748B' }}>{product.uom}</span>
          </div>
          <div style={{ fontSize: 11.5, color: '#10B981', marginTop: 4, display: 'flex', alignItems: 'center', gap: 3 }}>
            <TrendingUp size={12} /> Physical balance
          </div>
        </div>

        <div className="card" style={{ padding: '18px 20px' }}>
          <div style={{ fontSize: 12.5, color: '#64748B', fontWeight: 500 }}>Available to Promise</div>
          <div style={{ fontSize: 26, fontWeight: 800, color: '#6D28D9', marginTop: 4 }}>
            {product.availableStock} <span style={{ fontSize: 14, fontWeight: 500, color: '#64748B' }}>{product.uom}</span>
          </div>
          <div style={{ fontSize: 11.5, color: '#64748B', marginTop: 4 }}>Unreserved quantity</div>
        </div>

        <div className="card" style={{ padding: '18px 20px' }}>
          <div style={{ fontSize: 12.5, color: '#64748B', fontWeight: 500 }}>Reserved Stock</div>
          <div style={{ fontSize: 26, fontWeight: 800, color: '#F59E0B', marginTop: 4 }}>
            {product.reservedStock} <span style={{ fontSize: 14, fontWeight: 500, color: '#64748B' }}>{product.uom}</span>
          </div>
          <div style={{ fontSize: 11.5, color: '#F59E0B', marginTop: 4 }}>Allocated to orders</div>
        </div>

        <div className="card" style={{ padding: '18px 20px' }}>
          <div style={{ fontSize: 12.5, color: '#64748B', fontWeight: 500 }}>Reorder Safety Level</div>
          <div style={{ fontSize: 26, fontWeight: 800, color: '#0F172A', marginTop: 4 }}>
            {product.reorderLevel} <span style={{ fontSize: 14, fontWeight: 500, color: '#64748B' }}>{product.uom}</span>
          </div>
          <div style={{ fontSize: 11.5, color: '#64748B', marginTop: 4 }}>Target: {product.targetLevel} {product.uom}</div>
        </div>
      </div>

      {/* Grid: Stock by Location & Movement Timeline */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 24 }}>
        {/* Stock by Location */}
        <div className="card" style={{ padding: '22px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <MapPin size={18} color="#6D28D9" />
            <h3 style={{ fontSize: 16 }}>Stock by Location</h3>
          </div>

          <div className="table-container" style={{ border: 'none' }}>
            <table className="enterprise-table">
              <thead>
                <tr>
                  <th>Warehouse / Location</th>
                  <th>Quantity</th>
                  <th>Reserved</th>
                  <th>Available</th>
                </tr>
              </thead>
              <tbody>
                {quants.length === 0 ? (
                  <tr>
                    <td colSpan={4} style={{ textAlign: 'center', padding: '24px 12px', color: '#94A3B8' }}>
                      No physical inventory stored across any warehouse locations.
                    </td>
                  </tr>
                ) : (
                  quants.map((q) => {
                    const loc = locations.find((l) => l.id === q.locationId);
                    return (
                      <tr key={q.id}>
                        <td>
                          <div style={{ fontWeight: 600, color: '#0F172A' }}>
                            {loc?.warehouseName || 'Warehouse'}
                          </div>
                          <div style={{ fontSize: 11.5, color: '#64748B' }}>
                            Location: {loc?.name || 'Rack'} ({loc?.code})
                          </div>
                        </td>
                        <td style={{ fontWeight: 700, color: '#0F172A' }}>
                          {q.quantity} {product.uom}
                        </td>
                        <td style={{ color: '#F59E0B' }}>
                          {q.reservedQuantity} {product.uom}
                        </td>
                        <td style={{ fontWeight: 600, color: '#10B981' }}>
                          {Math.max(0, q.quantity - q.reservedQuantity)} {product.uom}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Movement Timeline */}
        <div className="card" style={{ padding: '22px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <Clock size={18} color="#6D28D9" />
            <h3 style={{ fontSize: 16 }}>Movement Timeline</h3>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {movements.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '30px 12px', color: '#94A3B8' }}>
                No recorded stock ledger movements for this item.
              </div>
            ) : (
              movements.map((m) => {
                const isPositive = m.quantity > 0;
                return (
                  <div
                    key={m.id}
                    style={{
                      padding: '12px 14px',
                      borderRadius: 10,
                      background: '#F8FAFC',
                      border: '1px solid #E2E8F0',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontWeight: 700, fontSize: 13, color: '#0F172A' }}>{m.reference}</span>
                        <span className="badge badge-neutral" style={{ fontSize: 11 }}>{m.type}</span>
                      </div>
                      <div style={{ fontSize: 11.5, color: '#64748B', marginTop: 3 }}>
                        {m.fromLocation} → {m.toLocation}
                      </div>
                      <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 3 }}>
                        By {m.user} on {m.timestamp}
                      </div>
                    </div>
                    <div
                      style={{
                        fontWeight: 700,
                        fontSize: 14,
                        color: isPositive ? '#10B981' : '#EF4444',
                      }}
                    >
                      {isPositive ? `+${m.quantity}` : `${m.quantity}`} {m.uom}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
