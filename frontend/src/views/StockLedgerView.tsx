import React, { useState } from 'react';
import {
  Search,
  ArrowDownToLine,
  Truck,
  ArrowLeftRight,
  Sliders,
  X,
} from 'lucide-react';
import { inventoryEngine } from '../services/inventoryEngine';
import { StockLedgerEntry } from '../types';
import { RouteId } from '../components/Sidebar';

interface StockLedgerViewProps {
  onNavigate: (route: RouteId, targetId?: string) => void;
}

export const StockLedgerView: React.FC<StockLedgerViewProps> = ({ onNavigate }) => {
  const ledger = inventoryEngine.getLedger();
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [selectedEntry, setSelectedEntry] = useState<StockLedgerEntry | null>(null);

  const filteredEntries = ledger.filter((entry) => {
    if (search) {
      const q = search.toLowerCase();
      if (
        !entry.reference.toLowerCase().includes(q) &&
        !entry.productName.toLowerCase().includes(q) &&
        !entry.sku.toLowerCase().includes(q)
      ) {
        return false;
      }
    }
    if (typeFilter !== 'all' && entry.type !== typeFilter) {
      return false;
    }
    return true;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 26, color: '#0F172A' }}>Stock Ledger (Audit Trail)</h1>
          <p style={{ color: '#64748B', fontSize: 14, marginTop: 4 }}>
            Immutable, double-entry audit trail recording every physical stock-affecting transaction.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <span className="badge badge-purple" style={{ padding: '6px 14px', fontSize: 13 }}>
            {ledger.length} Verified Ledger Events
          </span>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="card" style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 240, position: 'relative' }}>
          <Search size={16} color="#94A3B8" style={{ position: 'absolute', left: 12, top: 11 }} />
          <input
            type="text"
            placeholder="Search by movement reference, product, SKU..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-field"
            style={{ paddingLeft: 36 }}
          />
        </div>
        <div style={{ minWidth: 180 }}>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="input-field"
          >
            <option value="all">All Movement Types</option>
            <option value="Receipt">Receipt (+)</option>
            <option value="Delivery">Delivery (-)</option>
            <option value="Internal Transfer">Internal Transfer</option>
            <option value="Adjustment">Adjustment (±)</option>
          </select>
        </div>
      </div>

      {/* Ledger Table */}
      <div className="table-container">
        <table className="enterprise-table">
          <thead>
            <tr>
              <th>Reference</th>
              <th>Date & Time</th>
              <th>Operation Type</th>
              <th>Product</th>
              <th>From Location</th>
              <th>To Location</th>
              <th>Quantity</th>
              <th>Executed By</th>
              <th>Status</th>
              <th style={{ textAlign: 'right' }}>Details</th>
            </tr>
          </thead>
          <tbody>
            {filteredEntries.map((e) => {
              const isPositive = e.quantity > 0;
              let typeColor = '#6D28D9';
              let TypeIcon = ArrowLeftRight;

              if (e.type === 'Receipt') {
                typeColor = '#10B981';
                TypeIcon = ArrowDownToLine;
              } else if (e.type === 'Delivery') {
                typeColor = '#3B82F6';
                TypeIcon = Truck;
              } else if (e.type === 'Adjustment') {
                typeColor = '#F59E0B';
                TypeIcon = Sliders;
              }

              return (
                <tr key={e.id}>
                  <td style={{ fontWeight: 700, color: '#6D28D9', cursor: 'pointer' }} onClick={() => setSelectedEntry(e)}>
                    {e.reference}
                  </td>
                  <td style={{ fontSize: 12, color: '#64748B' }}>{e.timestamp}</td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600, color: typeColor }}>
                      <TypeIcon size={14} />
                      <span>{e.type}</span>
                    </div>
                  </td>
                  <td>
                    <div
                      style={{ fontWeight: 600, color: '#0F172A', cursor: 'pointer' }}
                      onClick={() => onNavigate('products', e.productId)}
                    >
                      {e.productName}
                    </div>
                    <div style={{ fontSize: 11, color: '#64748B' }}>{e.sku}</div>
                  </td>
                  <td style={{ color: '#475569' }}>{e.fromLocation}</td>
                  <td style={{ fontWeight: 500, color: '#0F172A' }}>{e.toLocation}</td>
                  <td
                    style={{
                      fontWeight: 800,
                      color: isPositive ? '#10B981' : '#EF4444',
                      fontSize: 13.5,
                    }}
                  >
                    {isPositive ? `+${e.quantity}` : `${e.quantity}`} {e.uom}
                  </td>
                  <td style={{ color: '#334155', fontSize: 12.5 }}>{e.user}</td>
                  <td>
                    <span className="badge badge-success">
                      <span className="badge-dot" />
                      {e.status}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <button onClick={() => setSelectedEntry(e)} className="btn btn-sm btn-outline">
                      Inspect
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Movement Detail Inspection Modal */}
      {selectedEntry && (
        <div className="modal-overlay" onClick={() => setSelectedEntry(null)}>
          <div className="modal-content" style={{ maxWidth: 540 }} onClick={(e) => e.stopPropagation()}>
            <div
              style={{
                padding: '18px 24px',
                borderBottom: '1px solid var(--border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <div style={{ fontSize: 13, color: '#6D28D9', fontWeight: 700 }}>
                  AUDIT LOG #{selectedEntry.id.toUpperCase()}
                </div>
                <h3 style={{ fontSize: 18, marginTop: 2 }}>
                  {selectedEntry.type} — {selectedEntry.reference}
                </h3>
              </div>
              <button
                onClick={() => setSelectedEntry(null)}
                style={{ background: 'none', border: 'none', color: '#64748B', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ background: '#F8FAFC', padding: '16px', borderRadius: 10, border: '1px solid #E2E8F0', display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748B', fontSize: 13 }}>Product:</span>
                  <strong style={{ color: '#0F172A', fontSize: 13 }}>
                    {selectedEntry.productName} ({selectedEntry.sku})
                  </strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748B', fontSize: 13 }}>Quantity Change:</span>
                  <strong
                    style={{
                      fontSize: 15,
                      color: selectedEntry.quantity > 0 ? '#10B981' : '#EF4444',
                    }}
                  >
                    {selectedEntry.quantity > 0 ? `+${selectedEntry.quantity}` : selectedEntry.quantity} {selectedEntry.uom}
                  </strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748B', fontSize: 13 }}>Source:</span>
                  <strong style={{ color: '#0F172A', fontSize: 13 }}>{selectedEntry.fromLocation}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748B', fontSize: 13 }}>Destination:</span>
                  <strong style={{ color: '#0F172A', fontSize: 13 }}>{selectedEntry.toLocation}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #E2E8F0', paddingTop: 8 }}>
                  <span style={{ color: '#64748B', fontSize: 13 }}>Authenticated Operator:</span>
                  <strong style={{ color: '#6D28D9', fontSize: 13 }}>{selectedEntry.user}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: '#64748B', fontSize: 13 }}>Timestamp:</span>
                  <span style={{ color: '#64748B', fontSize: 12 }}>{selectedEntry.timestamp}</span>
                </div>
              </div>

              {selectedEntry.notes && (
                <div style={{ fontSize: 13, color: '#475569' }}>
                  <strong>Operation Audit Remarks:</strong> {selectedEntry.notes}
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 8 }}>
                <button onClick={() => setSelectedEntry(null)} className="btn btn-outline">
                  Close
                </button>
                <button
                  onClick={() => {
                    const prodId = selectedEntry.productId;
                    setSelectedEntry(null);
                    onNavigate('products', prodId);
                  }}
                  className="btn btn-primary"
                  style={{ background: '#6D28D9' }}
                >
                  View Product State
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
