import React, { useState, useEffect } from 'react';
import {
  Sliders,
  Plus,
  Search,
  X,
  Scale,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { inventoryEngine } from '../services/inventoryEngine';
import { Adjustment, AdjustmentReason } from '../types';
import { useToast } from '../components/Toast';
import { RouteId } from '../components/Sidebar';

interface AdjustmentsViewProps {
  onNavigate?: (route: RouteId, targetId?: string) => void;
  openNewModalOnLoad?: boolean;
  preselectedProductId?: string;
  selectedWarehouse?: string;
  targetAdjustmentId?: string;
}

export const AdjustmentsView: React.FC<AdjustmentsViewProps> = ({
  onNavigate,
  openNewModalOnLoad,
  preselectedProductId,
  selectedWarehouse,
  targetAdjustmentId,
}) => {
  const { showToast } = useToast();
  const adjustments = inventoryEngine.getAdjustments();
  const products = inventoryEngine.getProducts();
  const warehouses = inventoryEngine.getWarehouses();
  const locations = inventoryEngine.getLocations();

  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(openNewModalOnLoad || false);
  const [selectedAdjustment, setSelectedAdjustment] = useState<Adjustment | null>(null);

  const initialWh = (selectedWarehouse && selectedWarehouse !== 'all' ? selectedWarehouse : warehouses[0]?.id) || '1';
  const initialLocs = locations.filter((l) => l.warehouseId === initialWh);
  const initialLoc = initialLocs[0]?.id || '1';
  const initialProd = preselectedProductId || products[0]?.id || '1';

  // Form State
  const [formData, setFormData] = useState({
    productId: initialProd,
    warehouseId: initialWh,
    locationId: initialLoc,
    physicalCount: 10,
    reason: 'Counting Error' as AdjustmentReason,
    notes: '',
  });

  // Keep target adjustment open if navigated from search or dashboard
  useEffect(() => {
    if (targetAdjustmentId) {
      const match = adjustments.find((a) => a.id === targetAdjustmentId || a.reference.toLowerCase() === targetAdjustmentId.toLowerCase());
      if (match) setSelectedAdjustment(match);
    }
  }, [targetAdjustmentId, adjustments]);

  // Keep form data locations consistent with available warehouses & locations
  useEffect(() => {
    if (warehouses.length > 0) {
      const currentWhValid = warehouses.some((w) => w.id === formData.warehouseId);
      const activeWh = currentWhValid ? formData.warehouseId : warehouses[0].id;
      const validLocs = locations.filter((l) => l.warehouseId === activeWh);
      const isLocValid = validLocs.some((l) => l.id === formData.locationId);

      if (!currentWhValid || !isLocValid) {
        setFormData((prev) => ({
          ...prev,
          warehouseId: activeWh,
          locationId: isLocValid ? prev.locationId : validLocs[0]?.id || '',
        }));
      }
    }
  }, [warehouses, locations, formData.warehouseId, formData.locationId]);

  const handleWarehouseChange = (whId: string) => {
    const locs = locations.filter((l) => l.warehouseId === whId);
    setFormData((prev) => ({
      ...prev,
      warehouseId: whId,
      locationId: locs[0]?.id || '',
    }));
  };

  const selectedProduct = products.find((p) => p.id === formData.productId);
  const currentQuant = inventoryEngine.getQuants(
    formData.productId,
    formData.warehouseId,
    formData.locationId
  )[0];
  const systemQuantity = currentQuant ? currentQuant.quantity : 0;
  const variance = Number(formData.physicalCount) - systemQuantity;

  const handleApplyAdjustment = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.physicalCount < 0) {
      showToast('error', 'Invalid Count', 'Physical count cannot be negative.');
      return;
    }

    const res = inventoryEngine.applyAdjustment({
      warehouseId: formData.warehouseId,
      locationId: formData.locationId,
      productId: formData.productId,
      physicalCount: Number(formData.physicalCount) || 0,
      reason: formData.reason,
      notes: formData.notes,
    });

    if (res.success && res.adjustment) {
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.6 },
      });
      showToast('success', 'Adjustment Applied', res.message);
      setIsModalOpen(false);
      setSelectedAdjustment(res.adjustment);
    } else {
      showToast('error', 'Adjustment Error', res.error);
    }
  };

  const filteredAdjustments = adjustments.filter((a) => {
    if (search) {
      const q = search.toLowerCase();
      return a.reference.toLowerCase().includes(q) || a.productName.toLowerCase().includes(q);
    }
    return true;
  });

  const reasons: AdjustmentReason[] = ['Damaged', 'Missing', 'Misplaced', 'Counting Error', 'Other'];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 26, color: '#0F172A' }}>Inventory Adjustments</h1>
          <p style={{ color: '#64748B', fontSize: 14, marginTop: 4 }}>
            Reconcile physical stock counts with digital system balances and log variance audits.
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="btn btn-primary"
          style={{ background: '#6D28D9', padding: '10px 18px' }}
        >
          <Plus size={16} />
          <span>New Adjustment</span>
        </button>
      </div>

      {/* Core Concept Visual Formula Card */}
      <div
        className="card"
        style={{
          padding: '20px 24px',
          background: 'linear-gradient(135deg, #F8FAFC 0%, #FFFFFF 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 16,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              background: '#FFFBEB',
              color: '#F59E0B',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Scale size={22} />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 14.5, color: '#0F172A' }}>Reconciliation Equation</div>
            <div style={{ fontSize: 13, color: '#64748B', marginTop: 2 }}>
              <strong>System Quantity</strong> → <strong>Physical Floor Count</strong> ={' '}
              <strong style={{ color: '#6D28D9' }}>Audited Variance</strong>
            </div>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="card" style={{ padding: '12px 18px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <Search size={16} color="#94A3B8" style={{ position: 'absolute', left: 12, top: 11 }} />
          <input
            type="text"
            placeholder="Search adjustments by reference, product name, or SKU..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-field"
            style={{ paddingLeft: 36 }}
          />
        </div>
      </div>

      {/* Adjustments Table */}
      <div className="table-container">
        <table className="enterprise-table">
          <thead>
            <tr>
              <th>Reference</th>
              <th>Product</th>
              <th>Location</th>
              <th>System Qty</th>
              <th>Physical Count</th>
              <th>Variance</th>
              <th>Reason</th>
              <th>Status</th>
              <th>Timestamp</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredAdjustments.map((a) => (
              <tr key={a.id}>
                <td style={{ fontWeight: 700, color: '#6D28D9', cursor: 'pointer' }} onClick={() => setSelectedAdjustment(a)}>
                  {a.reference}
                </td>
                <td>
                  <div style={{ fontWeight: 600, color: '#0F172A' }}>{a.productName}</div>
                  <div style={{ fontSize: 11.5, color: '#64748B' }}>{a.sku}</div>
                </td>
                <td style={{ color: '#334155' }}>{a.locationName}</td>
                <td>{a.systemQuantity} {a.uom}</td>
                <td style={{ fontWeight: 600, color: '#0F172A' }}>{a.physicalCount} {a.uom}</td>
                <td>
                  <span
                    className={`badge ${a.variance === 0 ? 'badge-neutral' : a.variance < 0 ? 'badge-danger' : 'badge-success'}`}
                  >
                    {a.variance > 0 ? `+${a.variance}` : a.variance} {a.uom}
                  </span>
                </td>
                <td>
                  <span style={{ fontSize: 12, fontWeight: 500, color: '#475569' }}>{a.reason}</span>
                </td>
                <td>
                  <span className="badge badge-success">
                    <span className="badge-dot" />
                    {a.status}
                  </span>
                </td>
                <td style={{ fontSize: 12, color: '#64748B' }}>{a.date}</td>
                <td style={{ textAlign: 'right' }}>
                  <button onClick={() => setSelectedAdjustment(a)} className="btn btn-sm btn-outline">
                    View
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* New Adjustment Modal */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
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
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 8,
                    background: '#FFFBEB',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Sliders size={18} color="#F59E0B" />
                </div>
                <h3 style={{ fontSize: 17 }}>Physical Inventory Adjustment</h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                style={{ background: 'none', border: 'none', color: '#64748B', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleApplyAdjustment} style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Product and Location */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 14 }}>
                <div>
                  <label className="input-label">Product to Reconcile</label>
                  <select
                    value={formData.productId}
                    onChange={(e) => setFormData({ ...formData, productId: e.target.value })}
                    className="input-field"
                  >
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.sku})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="input-label">Warehouse</label>
                  <select
                    value={formData.warehouseId}
                    onChange={(e) => handleWarehouseChange(e.target.value)}
                    className="input-field"
                  >
                    {warehouses.map((w) => (
                      <option key={w.id} value={w.id}>{w.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="input-label">Storage Rack / Location</label>
                <select
                  value={formData.locationId}
                  onChange={(e) => setFormData({ ...formData, locationId: e.target.value })}
                  className="input-field"
                >
                  {locations
                    .filter((l) => l.warehouseId === formData.warehouseId)
                    .map((l) => (
                      <option key={l.id} value={l.id}>{l.name} ({l.code})</option>
                    ))}
                </select>
              </div>

              {/* System vs Physical Floor Count Box */}
              <div
                style={{
                  background: '#F8FAFC',
                  borderRadius: 10,
                  border: '1px solid #E2E8F0',
                  padding: '16px',
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr 1fr',
                  gap: 12,
                  textAlign: 'center',
                }}
              >
                <div>
                  <div style={{ fontSize: 11.5, color: '#64748B', fontWeight: 600 }}>SYSTEM QUANTITY</div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: '#0F172A', marginTop: 4 }}>
                    {systemQuantity} {selectedProduct?.uom}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: 11.5, color: '#6D28D9', fontWeight: 600 }}>PHYSICAL COUNT</div>
                  <input
                    type="number"
                    min="0"
                    required
                    value={formData.physicalCount}
                    onChange={(e) => setFormData({ ...formData, physicalCount: Number(e.target.value) })}
                    className="input-field"
                    style={{ textAlign: 'center', fontWeight: 700, fontSize: 16, marginTop: 4 }}
                  />
                </div>

                <div>
                  <div style={{ fontSize: 11.5, color: '#64748B', fontWeight: 600 }}>VARIANCE</div>
                  <div
                    style={{
                      fontSize: 20,
                      fontWeight: 800,
                      color: variance === 0 ? '#64748B' : variance < 0 ? '#EF4444' : '#10B981',
                      marginTop: 4,
                    }}
                  >
                    {variance > 0 ? `+${variance}` : variance} {selectedProduct?.uom}
                  </div>
                </div>
              </div>

              {/* Adjustment Reason Radio Pills */}
              <div>
                <label className="input-label">Adjustment Reason</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 4 }}>
                  {reasons.map((r) => {
                    const isSelected = formData.reason === r;
                    return (
                      <button
                        type="button"
                        key={r}
                        onClick={() => setFormData({ ...formData, reason: r })}
                        style={{
                          padding: '6px 12px',
                          borderRadius: 8,
                          border: `1.5px solid ${isSelected ? '#6D28D9' : '#E2E8F0'}`,
                          background: isSelected ? '#F5F3FF' : '#FFFFFF',
                          color: isSelected ? '#6D28D9' : '#475569',
                          fontSize: 12.5,
                          fontWeight: isSelected ? 600 : 500,
                          cursor: 'pointer',
                        }}
                      >
                        {r}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="input-label">Notes & Justification</label>
                <input
                  type="text"
                  placeholder="Discovered damaged batch during physical audit..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="input-field"
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 8 }}>
                <button type="button" onClick={() => setIsModalOpen(false)} className="btn btn-outline">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" style={{ background: '#6D28D9' }}>
                  Apply Stock Adjustment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Adjustment Detail Dialog */}
      {selectedAdjustment && (
        <div className="modal-overlay" onClick={() => setSelectedAdjustment(null)}>
          <div className="modal-content" style={{ maxWidth: 500 }} onClick={(e) => e.stopPropagation()}>
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
                  ADJUSTMENT #{selectedAdjustment.reference}
                </div>
                <h3 style={{ fontSize: 18, marginTop: 2 }}>{selectedAdjustment.productName}</h3>
              </div>
              <button
                onClick={() => setSelectedAdjustment(null)}
                style={{ background: 'none', border: 'none', color: '#64748B', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ background: '#F8FAFC', borderRadius: 8, padding: '14px', border: '1px solid #E2E8F0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ color: '#64748B', fontSize: 13 }}>Location:</span>
                  <strong style={{ color: '#0F172A', fontSize: 13 }}>{selectedAdjustment.locationName}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ color: '#64748B', fontSize: 13 }}>Original System Qty:</span>
                  <strong style={{ color: '#0F172A', fontSize: 13 }}>
                    {selectedAdjustment.systemQuantity} {selectedAdjustment.uom}
                  </strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ color: '#64748B', fontSize: 13 }}>Counted Physical Qty:</span>
                  <strong style={{ color: '#6D28D9', fontSize: 13 }}>
                    {selectedAdjustment.physicalCount} {selectedAdjustment.uom}
                  </strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #E2E8F0', paddingTop: 8 }}>
                  <span style={{ color: '#64748B', fontSize: 13 }}>Net Variance:</span>
                  <strong
                    style={{
                      color: selectedAdjustment.variance < 0 ? '#EF4444' : '#10B981',
                      fontSize: 14,
                    }}
                  >
                    {selectedAdjustment.variance > 0 ? `+${selectedAdjustment.variance}` : selectedAdjustment.variance} {selectedAdjustment.uom}
                  </strong>
                </div>
              </div>

              <div style={{ fontSize: 13, color: '#475569' }}>
                Reason: <strong>{selectedAdjustment.reason}</strong>
              </div>

              {selectedAdjustment.notes && (
                <div style={{ fontSize: 12.5, color: '#64748B' }}>
                  <strong>Notes:</strong> {selectedAdjustment.notes}
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 8 }}>
                <button onClick={() => setSelectedAdjustment(null)} className="btn btn-outline">
                  Close
                </button>
                <button
                  onClick={() => {
                    setSelectedAdjustment(null);
                    onNavigate?.('ledger');
                  }}
                  className="btn btn-primary"
                  style={{ background: '#6D28D9' }}
                >
                  View in Ledger
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
