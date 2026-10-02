import React, { useState } from 'react';
import {
  CheckCircle2,
  X,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { inventoryEngine } from '../services/inventoryEngine';
import { CycleCount } from '../types';
import { useToast } from '../components/Toast';
import { RouteId } from '../components/Sidebar';

interface CycleCountsViewProps {
  onNavigate?: (route: RouteId, targetId?: string) => void;
}

export const CycleCountsView: React.FC<CycleCountsViewProps> = ({ onNavigate: _onNavigate }) => {
  const { showToast } = useToast();
  const counts = inventoryEngine.getCycleCounts();
  const [selectedItem, setSelectedItem] = useState<CycleCount | null>(null);
  const [countedQty, setCountedQty] = useState<number>(0);

  const handleOpenCountModal = (item: CycleCount) => {
    setSelectedItem(item);
    setCountedQty(item.countedQuantity !== undefined ? item.countedQuantity : item.systemQuantity);
  };

  const handleSaveCount = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem) return;

    inventoryEngine.updateCycleCount(selectedItem.id, countedQty);
    showToast('info', 'Count Recorded', `Recorded physical count of ${countedQty} ${selectedItem.uom} for ${selectedItem.productName}.`);
    setSelectedItem(null);
  };

  const handleCompleteAndAdjust = (item: CycleCount) => {
    inventoryEngine.completeCycleCount(item.id);
    confetti({
      particleCount: 50,
      spread: 60,
      origin: { y: 0.6 },
    });
    showToast('success', 'Cycle Count Completed', `Inventory reconciled and audited for ${item.productName}.`);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 26, color: '#0F172A' }}>Cycle Counts</h1>
          <p style={{ color: '#64748B', fontSize: 14, marginTop: 4 }}>
            Periodic physical auditing schedules to ensure perpetual inventory accuracy.
          </p>
        </div>
      </div>

      {/* Cycle Counts Table */}
      <div className="table-container">
        <table className="enterprise-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Location</th>
              <th>Product</th>
              <th>System Qty</th>
              <th>Counted Qty</th>
              <th>Variance</th>
              <th>Assigned Operator</th>
              <th>Audit Schedule</th>
              <th>Status</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {counts.map((c) => {
              const isCompleted = c.status === 'Completed';
              return (
                <tr key={c.id}>
                  <td style={{ fontWeight: 700, color: '#6D28D9' }}>{c.id}</td>
                  <td style={{ fontWeight: 600, color: '#0F172A' }}>{c.locationName}</td>
                  <td>
                    <div style={{ fontWeight: 600, color: '#0F172A' }}>{c.productName}</div>
                    <div style={{ fontSize: 11.5, color: '#64748B' }}>{c.sku}</div>
                  </td>
                  <td>{c.systemQuantity} {c.uom}</td>
                  <td style={{ fontWeight: 600, color: c.countedQuantity !== undefined ? '#6D28D9' : '#94A3B8' }}>
                    {c.countedQuantity !== undefined ? `${c.countedQuantity} ${c.uom}` : 'Not counted'}
                  </td>
                  <td>
                    {c.variance !== undefined ? (
                      <span
                        className={`badge ${c.variance === 0 ? 'badge-neutral' : c.variance < 0 ? 'badge-danger' : 'badge-success'}`}
                      >
                        {c.variance > 0 ? `+${c.variance}` : c.variance} {c.uom}
                      </span>
                    ) : (
                      <span style={{ color: '#94A3B8', fontSize: 12 }}>—</span>
                    )}
                  </td>
                  <td style={{ color: '#334155' }}>{c.assignedTo}</td>
                  <td style={{ fontSize: 12, color: '#64748B' }}>Next: {c.nextCountDate}</td>
                  <td>
                    <span
                      className={`badge ${
                        isCompleted
                          ? 'badge-success'
                          : c.status === 'Review'
                          ? 'badge-purple'
                          : c.status === 'Counting'
                          ? 'badge-warning'
                          : 'badge-neutral'
                      }`}
                    >
                      <span className="badge-dot" />
                      {c.status}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    {!isCompleted ? (
                      <div style={{ display: 'inline-flex', gap: 6 }}>
                        <button
                          onClick={() => handleOpenCountModal(c)}
                          className="btn btn-sm btn-outline"
                        >
                          Record Count
                        </button>
                        {c.countedQuantity !== undefined && (
                          <button
                            onClick={() => handleCompleteAndAdjust(c)}
                            className="btn btn-sm btn-primary"
                            style={{ background: '#10B981' }}
                          >
                            <CheckCircle2 size={13} />
                            Reconcile
                          </button>
                        )}
                      </div>
                    ) : (
                      <span style={{ fontSize: 12, color: '#10B981', fontWeight: 600 }}>Audited ✓</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Record Count Modal */}
      {selectedItem && (
        <div className="modal-overlay" onClick={() => setSelectedItem(null)}>
          <div className="modal-content" style={{ maxWidth: 440 }} onClick={(e) => e.stopPropagation()}>
            <div
              style={{
                padding: '18px 24px',
                borderBottom: '1px solid var(--border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <h3 style={{ fontSize: 17 }}>Record Physical Count</h3>
              <button
                onClick={() => setSelectedItem(null)}
                style={{ background: 'none', border: 'none', color: '#64748B', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveCount} style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <div style={{ fontSize: 13, color: '#64748B' }}>Product & Bin:</div>
                <div style={{ fontWeight: 700, fontSize: 15, color: '#0F172A', marginTop: 2 }}>
                  {selectedItem.productName} ({selectedItem.sku})
                </div>
                <div style={{ fontSize: 12.5, color: '#6D28D9', marginTop: 2 }}>
                  Location: {selectedItem.locationName}
                </div>
              </div>

              <div style={{ background: '#F8FAFC', padding: '12px 16px', borderRadius: 8, border: '1px solid #E2E8F0' }}>
                <div style={{ fontSize: 12, color: '#64748B' }}>Digital System Quantity:</div>
                <div style={{ fontSize: 18, fontWeight: 800, color: '#0F172A', marginTop: 2 }}>
                  {selectedItem.systemQuantity} {selectedItem.uom}
                </div>
              </div>

              <div>
                <label className="input-label">Actual Physical Count Counted</label>
                <input
                  type="number"
                  min="0"
                  required
                  value={countedQty}
                  onChange={(e) => setCountedQty(Number(e.target.value))}
                  className="input-field"
                  style={{ fontSize: 16, fontWeight: 700 }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 8 }}>
                <button type="button" onClick={() => setSelectedItem(null)} className="btn btn-outline">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" style={{ background: '#6D28D9' }}>
                  Save Count
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
