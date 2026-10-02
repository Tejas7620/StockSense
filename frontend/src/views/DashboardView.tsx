import React from 'react';
import {
  Package,
  AlertTriangle,
  AlertCircle,
  FileText,
  ArrowLeftRight,
  Plus,
  ArrowRight,
  TrendingUp,
  MapPin,
  Bot,
} from 'lucide-react';
import { inventoryEngine } from '../services/inventoryEngine';
import { DashboardStats } from '../types';
import { RouteId } from '../components/Sidebar';

interface DashboardViewProps {
  stats: DashboardStats;
  selectedWarehouse: string;
  onNavigate: (route: RouteId, targetId?: string) => void;
  onOpenNewReceipt: () => void;
  onOpenNewDelivery: () => void;
  onOpenNewTransfer: () => void;
  onOpenAi: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  stats,
  selectedWarehouse,
  onNavigate,
  onOpenNewReceipt,
  onOpenNewDelivery,
  onOpenNewTransfer,
  onOpenAi,
}) => {
  const user = inventoryEngine.getUser();
  const products = inventoryEngine.getProducts();
  const locationBreakdown = inventoryEngine.getStockByLocationBreakdown();
  const ledgerMovements = inventoryEngine.getLedger().slice(0, 4);

  // Filter risk products
  const riskProducts = products.filter(
    (p) => p.status === 'Out of Stock' || p.status === 'Below Minimum' || p.status === 'Low Stock' || p.status === 'High Consumption'
  ).slice(0, 4);

  // Operations Today list
  const state = inventoryEngine.getState();
  const operationsToday = [
    ...state.receipts.slice(0, 1).map((r) => ({
      id: r.reference,
      type: 'Receipt',
      product: r.items[0]?.productName || 'Material',
      qty: `+${r.items[0]?.receivedQty || r.items[0]?.orderedQty} ${r.items[0]?.uom}`,
      status: r.status,
      time: '09:12 AM',
      color: '#10B981',
      route: 'receipts' as RouteId,
      rawId: r.id,
    })),
    ...state.deliveries.slice(0, 1).map((d) => ({
      id: d.reference,
      type: 'Delivery',
      product: d.items[0]?.productName || 'Order',
      qty: `-${d.items[0]?.requestedQty} ${d.items[0]?.uom}`,
      status: d.status,
      time: '11:10 AM',
      color: '#EF4444',
      route: 'deliveries' as RouteId,
      rawId: d.id,
    })),
    ...state.transfers.slice(0, 1).map((t) => ({
      id: t.reference,
      type: 'Transfer',
      product: t.items[0]?.productName || 'Relocation',
      qty: `+${t.items[0]?.quantity} ${t.items[0]?.uom}`,
      status: t.status === 'Done' ? 'Done' : 'Waiting',
      time: '01:24 PM',
      color: '#F59E0B',
      route: 'transfers' as RouteId,
      rawId: t.id,
    })),
    ...state.adjustments.slice(0, 1).map((a) => ({
      id: a.reference,
      type: 'Adjustment',
      product: a.productName,
      qty: `${a.variance > 0 ? '+' : ''}${a.variance} ${a.uom}`,
      status: 'Done',
      time: '12:20 PM',
      color: '#EF4444',
      route: 'adjustments' as RouteId,
      rawId: a.id,
    })),
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* 1. Dashboard Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 26, color: '#0F172A', display: 'flex', alignItems: 'center', gap: 8 }}>
            Good morning, {user.name.split(' ')[0]} 👋
          </h1>
          <p style={{ color: '#64748B', fontSize: 14, marginTop: 4 }}>
            Here's a quick overview of your inventory {selectedWarehouse === 'all' ? 'across all enterprise facilities' : `for ${inventoryEngine.getWarehouses().find(w => w.id === selectedWarehouse)?.name || 'active facility'}`}.
          </p>
        </div>

        {/* Quick Actions Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            onClick={onOpenNewReceipt}
            className="btn btn-primary"
            style={{
              background: '#6D28D9',
              padding: '9px 16px',
              boxShadow: '0 2px 6px rgba(109, 40, 217, 0.35)',
            }}
          >
            <Plus size={16} />
            <span>New Receipt</span>
          </button>
          <button
            onClick={onOpenNewDelivery}
            className="btn btn-outline"
            style={{
              padding: '9px 16px',
              borderColor: '#DDD6FE',
              color: '#6D28D9',
              background: '#FFFFFF',
            }}
          >
            <Plus size={16} />
            <span>New Delivery</span>
          </button>
          <button
            onClick={onOpenNewTransfer}
            className="btn btn-outline"
            style={{
              padding: '9px 16px',
              borderColor: '#E2E8F0',
              color: '#334155',
              background: '#FFFFFF',
            }}
          >
            <ArrowLeftRight size={15} />
            <span>Transfer</span>
          </button>
        </div>
      </div>

      {/* 2. KPI Cards Row (5 Cards) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: 16,
        }}
      >
        {/* KPI 1: Total Stock */}
        <div
          className="card"
          onClick={() => onNavigate('stock')}
          style={{ padding: '20px', cursor: 'pointer', position: 'relative' }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                background: '#F5F3FF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Package size={22} color="#6D28D9" />
            </div>
            <span style={{ fontSize: 12, color: '#10B981', display: 'flex', alignItems: 'center', gap: 3, fontWeight: 600 }}>
              <TrendingUp size={13} /> +4% vs. last week
            </span>
          </div>
          <div style={{ marginTop: 14 }}>
            <div style={{ fontSize: 13, color: '#64748B', fontWeight: 500 }}>Total Products</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: '#0F172A', marginTop: 2, letterSpacing: '-0.02em' }}>
              {stats.totalStockUnits.toLocaleString()}
            </div>
            <div style={{ fontSize: 12, color: '#94A3B8', marginTop: 2 }}>in stock</div>
          </div>
        </div>

        {/* KPI 2: Low Stock */}
        <div
          className="card"
          onClick={() => onNavigate('risk')}
          style={{ padding: '20px', cursor: 'pointer', borderLeft: '3px solid #F59E0B' }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                background: '#FFFBEB',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <AlertTriangle size={22} color="#F59E0B" />
            </div>
            <span style={{ fontSize: 12, color: '#F59E0B', fontWeight: 600 }}>★ Needs attention</span>
          </div>
          <div style={{ marginTop: 14 }}>
            <div style={{ fontSize: 13, color: '#64748B', fontWeight: 500 }}>Low Stock</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: '#0F172A', marginTop: 2, letterSpacing: '-0.02em' }}>
              {stats.lowStockCount}
            </div>
            <div style={{ fontSize: 12, color: '#94A3B8', marginTop: 2 }}>products</div>
          </div>
        </div>

        {/* KPI 3: Out of Stock */}
        <div
          className="card"
          onClick={() => onNavigate('risk')}
          style={{ padding: '20px', cursor: 'pointer', borderLeft: '3px solid #EF4444' }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                background: '#FEF2F2',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <AlertCircle size={22} color="#EF4444" />
            </div>
            <span style={{ fontSize: 12, color: '#EF4444', fontWeight: 600 }}>▲ Critical</span>
          </div>
          <div style={{ marginTop: 14 }}>
            <div style={{ fontSize: 13, color: '#64748B', fontWeight: 500 }}>Out of Stock</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: '#0F172A', marginTop: 2, letterSpacing: '-0.02em' }}>
              {stats.outOfStockCount}
            </div>
            <div style={{ fontSize: 12, color: '#94A3B8', marginTop: 2 }}>products</div>
          </div>
        </div>

        {/* KPI 4: Pending Receipts */}
        <div
          className="card"
          onClick={() => onNavigate('receipts')}
          style={{ padding: '20px', cursor: 'pointer' }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                background: '#EFF6FF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <FileText size={22} color="#3B82F6" />
            </div>
            <span style={{ fontSize: 12, color: '#3B82F6', fontWeight: 600 }}>awaiting delivery</span>
          </div>
          <div style={{ marginTop: 14 }}>
            <div style={{ fontSize: 13, color: '#64748B', fontWeight: 500 }}>Pending Receipts</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: '#0F172A', marginTop: 2, letterSpacing: '-0.02em' }}>
              {stats.pendingReceiptsCount}
            </div>
            <div style={{ fontSize: 12, color: '#94A3B8', marginTop: 2 }}>orders</div>
          </div>
        </div>

        {/* KPI 5: Pending Transfers */}
        <div
          className="card"
          onClick={() => onNavigate('transfers')}
          style={{ padding: '20px', cursor: 'pointer' }}
        >
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                background: '#F5F3FF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <ArrowLeftRight size={22} color="#6D28D9" />
            </div>
            <span style={{ fontSize: 12, color: '#6D28D9', fontWeight: 600 }}>in progress</span>
          </div>
          <div style={{ marginTop: 14 }}>
            <div style={{ fontSize: 13, color: '#64748B', fontWeight: 500 }}>Pending Transfers</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: '#0F172A', marginTop: 2, letterSpacing: '-0.02em' }}>
              {stats.pendingTransfersCount}
            </div>
            <div style={{ fontSize: 12, color: '#94A3B8', marginTop: 2 }}>moves</div>
          </div>
        </div>
      </div>

      {/* 3. Main Dashboard Grid (Left: Risk + Operations | Right: Location + Movements) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.6fr) minmax(0, 1fr)', gap: 24 }}>
        {/* Left Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* Card: Inventory Risk Center */}
          <div className="card" style={{ padding: '22px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 8,
                    background: '#FEF2F2',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <AlertCircle size={18} color="#EF4444" />
                </div>
                <div>
                  <h3 style={{ fontSize: 16, color: '#0F172A' }}>Inventory Risk Center</h3>
                  <div style={{ fontSize: 12, color: '#64748B' }}>Products that need your attention</div>
                </div>
              </div>
              <button
                onClick={() => onNavigate('risk')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#6D28D9',
                  fontSize: 12.5,
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                <span>View All</span>
                <ArrowRight size={14} />
              </button>
            </div>

            <div className="table-container" style={{ border: 'none' }}>
              <table className="enterprise-table">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Current Stock</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'right' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {riskProducts.map((p) => {
                    let badgeClass = 'badge-warning';
                    let actionText = 'View';

                    if (p.status === 'Out of Stock') {
                      badgeClass = 'badge-danger';
                      actionText = 'Reorder';
                    } else if (p.status === 'Below Minimum') {
                      badgeClass = 'badge-warning';
                      actionText = 'Recommend';
                    } else if (p.status === 'High Consumption') {
                      badgeClass = 'badge-info';
                      actionText = 'View';
                    }

                    return (
                      <tr key={p.id}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <div
                              style={{
                                width: 34,
                                height: 34,
                                borderRadius: 8,
                                background: '#F1F5F9',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0,
                              }}
                            >
                              <Package size={17} color="#64748B" />
                            </div>
                            <div>
                              <div
                                style={{ fontWeight: 600, color: '#0F172A', cursor: 'pointer' }}
                                onClick={() => onNavigate('products', p.id)}
                              >
                                {p.name}
                              </div>
                              <div style={{ fontSize: 11.5, color: '#64748B' }}>{p.sku}</div>
                            </div>
                          </div>
                        </td>
                        <td style={{ fontWeight: 600, color: '#0F172A' }}>
                          {p.totalStock} {p.uom}
                        </td>
                        <td>
                          <span className={`badge ${badgeClass}`}>
                            <span className="badge-dot" />
                            {p.status}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <button
                            onClick={() => {
                              if (actionText === 'Reorder' || actionText === 'Recommend') {
                                onNavigate('reorder');
                              } else {
                                onNavigate('products', p.id);
                              }
                            }}
                            className="btn btn-sm btn-outline-purple"
                          >
                            {actionText}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Card: Operations Today */}
          <div className="card" style={{ padding: '22px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 8,
                    background: '#F5F3FF',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <FileText size={18} color="#6D28D9" />
                </div>
                <div>
                  <h3 style={{ fontSize: 16, color: '#0F172A' }}>Operations Today</h3>
                  <div style={{ fontSize: 12, color: '#64748B' }}>Real-time inventory operation activity</div>
                </div>
              </div>
              <button
                onClick={() => onNavigate('ledger')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#6D28D9',
                  fontSize: 12.5,
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                <span>View All</span>
                <ArrowRight size={14} />
              </button>
            </div>

            <div className="table-container" style={{ border: 'none' }}>
              <table className="enterprise-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Type</th>
                    <th>Product</th>
                    <th>Quantity</th>
                    <th>Status</th>
                    <th>Time</th>
                  </tr>
                </thead>
                <tbody>
                  {operationsToday.map((op, idx) => (
                    <tr
                      key={idx}
                      style={{ cursor: 'pointer' }}
                      onClick={() => onNavigate(op.route, op.rawId)}
                    >
                      <td style={{ fontWeight: 600, color: '#6D28D9' }}>{op.id}</td>
                      <td>{op.type}</td>
                      <td style={{ color: '#0F172A', fontWeight: 500 }}>{op.product}</td>
                      <td style={{ fontWeight: 600, color: op.color }}>{op.qty}</td>
                      <td>
                        <span
                          className={`badge ${
                            op.status === 'Done'
                              ? 'badge-success'
                              : op.status === 'Ready'
                              ? 'badge-info'
                              : 'badge-warning'
                          }`}
                        >
                          <span className="badge-dot" />
                          {op.status}
                        </span>
                      </td>
                      <td style={{ color: '#64748B', fontSize: 12 }}>{op.time}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* Card: Stock by Location */}
          <div className="card" style={{ padding: '22px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 8,
                    background: '#F5F3FF',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <MapPin size={18} color="#6D28D9" />
                </div>
                <div>
                  <h3 style={{ fontSize: 16, color: '#0F172A' }}>Stock by Location</h3>
                  <div style={{ fontSize: 12, color: '#64748B' }}>Inventory physical distribution</div>
                </div>
              </div>
              <button
                onClick={() => onNavigate('stock-location')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#6D28D9',
                  fontSize: 12.5,
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                <span>View All</span>
                <ArrowRight size={14} />
              </button>
            </div>

            {/* Donut Chart & Legend */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 24, padding: '10px 0' }}>
              {/* Donut Chart SVG */}
              <div style={{ position: 'relative', width: 140, height: 140, flexShrink: 0 }}>
                <svg viewBox="0 0 100 100" width="140" height="140">
                  {/* Background track */}
                  <circle cx="50" cy="50" r="38" fill="none" stroke="#F1F5F9" strokeWidth="16" />
                  {/* Segments: Main Warehouse (50%), Production (27%), Warehouse 2 (15%), Other (8%) */}
                  {/* Circumference = 2 * PI * 38 = 238.76 */}
                  <circle
                    cx="50"
                    cy="50"
                    r="38"
                    fill="none"
                    stroke="#6D28D9"
                    strokeWidth="16"
                    strokeDasharray="119.38 238.76"
                    strokeDashoffset="0"
                    transform="rotate(-90 50 50)"
                  />
                  <circle
                    cx="50"
                    cy="50"
                    r="38"
                    fill="none"
                    stroke="#3B82F6"
                    strokeWidth="16"
                    strokeDasharray="64.46 238.76"
                    strokeDashoffset="-119.38"
                    transform="rotate(-90 50 50)"
                  />
                  <circle
                    cx="50"
                    cy="50"
                    r="38"
                    fill="none"
                    stroke="#10B981"
                    strokeWidth="16"
                    strokeDasharray="35.81 238.76"
                    strokeDashoffset="-183.84"
                    transform="rotate(-90 50 50)"
                  />
                  <circle
                    cx="50"
                    cy="50"
                    r="38"
                    fill="none"
                    stroke="#94A3B8"
                    strokeWidth="16"
                    strokeDasharray="19.1 238.76"
                    strokeDashoffset="-219.65"
                    transform="rotate(-90 50 50)"
                  />
                </svg>
                {/* Center text */}
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <span style={{ fontSize: 16, fontWeight: 800, color: '#0F172A', lineHeight: 1 }}>
                    {locationBreakdown.total.toLocaleString()}
                  </span>
                  <span style={{ fontSize: 10, color: '#64748B', marginTop: 2 }}>Total Units</span>
                </div>
              </div>

              {/* Legend List */}
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
                {locationBreakdown.breakdown.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => onNavigate('stock-location')}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      fontSize: 12.5,
                      cursor: 'pointer',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: '50%',
                          background: item.color,
                        }}
                      />
                      <span style={{ color: '#334155', fontWeight: 500 }}>{item.name}</span>
                    </div>
                    <div style={{ color: '#0F172A', fontWeight: 600 }}>
                      {item.quantity.toLocaleString()} <span style={{ color: '#94A3B8', fontWeight: 400 }}>({item.percentage}%)</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Card: Recent Stock Movement */}
          <div className="card" style={{ padding: '22px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 8,
                    background: '#F5F3FF',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <ArrowLeftRight size={18} color="#6D28D9" />
                </div>
                <div>
                  <h3 style={{ fontSize: 16, color: '#0F172A' }}>Recent Stock Movement</h3>
                  <div style={{ fontSize: 12, color: '#64748B' }}>Traceable inventory ledger log</div>
                </div>
              </div>
              <button
                onClick={() => onNavigate('ledger')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#6D28D9',
                  fontSize: 12.5,
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                }}
              >
                <span>View Ledger</span>
                <ArrowRight size={14} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {ledgerMovements.map((entry) => {
                const isPositive = entry.quantity > 0;
                return (
                  <div
                    key={entry.id}
                    onClick={() => onNavigate('ledger')}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 12px',
                      borderRadius: 8,
                      background: '#F8FAFC',
                      cursor: 'pointer',
                      transition: 'background 0.15s ease',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = '#F1F5F9')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = '#F8FAFC')}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: 8,
                          background: isPositive ? '#ECFDF5' : '#FEF2F2',
                          color: isPositive ? '#10B981' : '#EF4444',
                          fontWeight: 700,
                          fontSize: 12,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        {isPositive ? `+${entry.quantity}` : `${entry.quantity}`}
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 13, color: '#0F172A' }}>{entry.productName}</div>
                        <div style={{ fontSize: 11.5, color: '#64748B' }}>
                          {entry.type} • {entry.reference}
                        </div>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', fontSize: 11.5, color: '#94A3B8' }}>
                      {entry.timestamp}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Ask StockSense AI Quick Banner */}
          <div
            onClick={onOpenAi}
            style={{
              padding: '16px 20px',
              borderRadius: 14,
              background: 'linear-gradient(135deg, #F5F3FF 0%, #EDE9FE 100%)',
              border: '1px solid #DDD6FE',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'pointer',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  background: '#6D28D9',
                  color: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Bot size={20} />
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 13.5, color: '#4C1D95' }}>Ask StockSense AI</div>
                <div style={{ fontSize: 12, color: '#6D28D9' }}>Why is Steel Rod low? Which products need replenishment?</div>
              </div>
            </div>
            <ArrowRight size={18} color="#6D28D9" />
          </div>
        </div>
      </div>
    </div>
  );
};
