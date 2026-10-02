import React, { useState } from 'react';
import {
  AlertTriangle,
  AlertCircle,
  Package,
  ArrowDownToLine,
} from 'lucide-react';
import { inventoryEngine } from '../services/inventoryEngine';
import { RouteId } from '../components/Sidebar';

interface RiskCenterViewProps {
  onNavigate: (route: RouteId, targetId?: string) => void;
  onOpenReceiptForProduct: (productId: string) => void;
}

export const RiskCenterView: React.FC<RiskCenterViewProps> = ({ onNavigate, onOpenReceiptForProduct }) => {
  const products = inventoryEngine.getProducts();
  const [tabFilter, setTabFilter] = useState<'all' | 'out' | 'low' | 'high'>('all');

  const riskProducts = products.filter((p) => {
    if (tabFilter === 'out') return p.status === 'Out of Stock' || p.totalStock <= 0;
    if (tabFilter === 'low') return p.status === 'Low Stock' || p.status === 'Below Minimum';
    if (tabFilter === 'high') return p.status === 'High Consumption';
    return (
      p.status === 'Out of Stock' ||
      p.status === 'Below Minimum' ||
      p.status === 'Low Stock' ||
      p.status === 'High Consumption'
    );
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 26, color: '#0F172A' }}>Inventory Risk Center</h1>
          <p style={{ color: '#64748B', fontSize: 14, marginTop: 4 }}>
            Real-time critical inventory monitoring, stockout prevention, and replenishment triggers.
          </p>
        </div>
        <button
          onClick={() => onNavigate('reorder')}
          className="btn btn-primary"
          style={{ background: '#6D28D9' }}
        >
          View Reorder Queue →
        </button>
      </div>

      {/* Risk Metrics Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
        <div
          className="card"
          onClick={() => setTabFilter('out')}
          style={{
            padding: '20px',
            cursor: 'pointer',
            borderLeft: '4px solid #EF4444',
            background: tabFilter === 'out' ? '#FEF2F2' : '#FFFFFF',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <AlertCircle size={20} color="#EF4444" />
            <div style={{ fontSize: 13, color: '#64748B', fontWeight: 600 }}>Out of Stock</div>
          </div>
          <div style={{ fontSize: 28, fontWeight: 800, color: '#EF4444', marginTop: 8 }}>
            {products.filter((p) => p.status === 'Out of Stock').length}
          </div>
          <div style={{ fontSize: 12, color: '#991B1B', marginTop: 2 }}>Immediate production halt risk</div>
        </div>

        <div
          className="card"
          onClick={() => setTabFilter('low')}
          style={{
            padding: '20px',
            cursor: 'pointer',
            borderLeft: '4px solid #F59E0B',
            background: tabFilter === 'low' ? '#FFFBEB' : '#FFFFFF',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <AlertTriangle size={20} color="#F59E0B" />
            <div style={{ fontSize: 13, color: '#64748B', fontWeight: 600 }}>Below Minimum Safety</div>
          </div>
          <div style={{ fontSize: 28, fontWeight: 800, color: '#F59E0B', marginTop: 8 }}>
            {products.filter((p) => p.status === 'Low Stock' || p.status === 'Below Minimum').length}
          </div>
          <div style={{ fontSize: 12, color: '#92400E', marginTop: 2 }}>Replenishment recommended</div>
        </div>

        <div
          className="card"
          onClick={() => setTabFilter('all')}
          style={{
            padding: '20px',
            cursor: 'pointer',
            borderLeft: '4px solid #6D28D9',
            background: tabFilter === 'all' ? '#F5F3FF' : '#FFFFFF',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Package size={20} color="#6D28D9" />
            <div style={{ fontSize: 13, color: '#64748B', fontWeight: 600 }}>Total At-Risk Items</div>
          </div>
          <div style={{ fontSize: 28, fontWeight: 800, color: '#6D28D9', marginTop: 8 }}>
            {riskProducts.length}
          </div>
          <div style={{ fontSize: 12, color: '#4C1D95', marginTop: 2 }}>Under configured thresholds</div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 10 }}>
        <button
          onClick={() => setTabFilter('all')}
          className={`btn btn-sm ${tabFilter === 'all' ? 'btn-primary' : 'btn-outline'}`}
        >
          All Risks ({products.filter((p) => p.status !== 'In Stock').length})
        </button>
        <button
          onClick={() => setTabFilter('out')}
          className={`btn btn-sm ${tabFilter === 'out' ? 'btn-danger' : 'btn-outline'}`}
        >
          Out of Stock
        </button>
        <button
          onClick={() => setTabFilter('low')}
          className={`btn btn-sm ${tabFilter === 'low' ? 'btn-primary' : 'btn-outline'}`}
          style={tabFilter === 'low' ? { background: '#F59E0B', borderColor: '#F59E0B' } : {}}
        >
          Below Safety Level
        </button>
        <button
          onClick={() => setTabFilter('high')}
          className={`btn btn-sm ${tabFilter === 'high' ? 'btn-primary' : 'btn-outline'}`}
        >
          High Consumption
        </button>
      </div>

      {/* Table */}
      <div className="table-container">
        <table className="enterprise-table">
          <thead>
            <tr>
              <th>Product</th>
              <th>SKU</th>
              <th>Current On Hand</th>
              <th>Safety Min</th>
              <th>Target Level</th>
              <th>Shortfall Deficit</th>
              <th>Risk Status</th>
              <th style={{ textAlign: 'right' }}>Remediation Action</th>
            </tr>
          </thead>
          <tbody>
            {riskProducts.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: '40px 20px', color: '#10B981' }}>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>No inventory risks detected.</div>
                  <div style={{ fontSize: 12.5, color: '#64748B', marginTop: 4 }}>
                    Your current stock is fully within configured safety buffer levels.
                  </div>
                </td>
              </tr>
            ) : (
              riskProducts.map((p) => {
                const deficit = Math.max(0, p.targetLevel - p.totalStock);
                let badgeClass = 'badge-warning';
                let btnLabel = 'Recommend';

                if (p.status === 'Out of Stock') {
                  badgeClass = 'badge-danger';
                  btnLabel = 'Order Now';
                } else if (p.status === 'Below Minimum') {
                  badgeClass = 'badge-warning';
                  btnLabel = 'Replenish';
                } else if (p.status === 'High Consumption') {
                  badgeClass = 'badge-info';
                  btnLabel = 'Monitor';
                }

                return (
                  <tr key={p.id}>
                    <td>
                      <div
                        style={{ fontWeight: 600, color: '#0F172A', cursor: 'pointer' }}
                        onClick={() => onNavigate('products', p.id)}
                      >
                        {p.name}
                      </div>
                      <div style={{ fontSize: 11.5, color: '#64748B' }}>{p.categoryName}</div>
                    </td>
                    <td style={{ fontWeight: 600, color: '#6D28D9' }}>{p.sku}</td>
                    <td style={{ fontWeight: 800, color: p.totalStock === 0 ? '#EF4444' : '#0F172A' }}>
                      {p.totalStock} {p.uom}
                    </td>
                    <td style={{ color: '#475569' }}>{p.reorderLevel} {p.uom}</td>
                    <td style={{ color: '#64748B' }}>{p.targetLevel} {p.uom}</td>
                    <td style={{ fontWeight: 700, color: '#EF4444' }}>
                      {deficit > 0 ? `-${deficit} ${p.uom}` : '0'}
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
                          onClick={() => onOpenReceiptForProduct(p.id)}
                          className="btn btn-sm btn-primary"
                          style={{ background: '#6D28D9' }}
                        >
                          <ArrowDownToLine size={12} />
                          {btnLabel}
                        </button>
                        <button
                          onClick={() => onNavigate('products', p.id)}
                          className="btn btn-sm btn-outline"
                        >
                          View
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
    </div>
  );
};
