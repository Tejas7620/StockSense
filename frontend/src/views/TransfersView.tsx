import React, { useState, useEffect } from 'react';
import {
  ArrowLeftRight,
  Plus,
  Search,
  Package,
  X,
  ArrowRight,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { inventoryEngine } from '../services/inventoryEngine';
import { InternalTransfer } from '../types';
import { useToast } from '../components/Toast';
import { RouteId } from '../components/Sidebar';

interface TransfersViewProps {
  onNavigate: (route: RouteId, targetId?: string) => void;
  openNewModalOnLoad?: boolean;
  preselectedProductId?: string;
  selectedWarehouse?: string;
  targetTransferId?: string;
}

export const TransfersView: React.FC<TransfersViewProps> = ({
  onNavigate,
  openNewModalOnLoad,
  preselectedProductId,
  selectedWarehouse,
  targetTransferId,
}) => {
  const { showToast } = useToast();
  const transfers = inventoryEngine.getTransfers();
  const products = inventoryEngine.getProducts();
  const warehouses = inventoryEngine.getWarehouses();
  const locations = inventoryEngine.getLocations();

  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(openNewModalOnLoad || false);
  const [selectedTransfer, setSelectedTransfer] = useState<InternalTransfer | null>(null);

  const initialSourceWh = (selectedWarehouse && selectedWarehouse !== 'all' ? selectedWarehouse : warehouses[0]?.id) || '1';
  const initialSourceLocs = locations.filter((l) => l.warehouseId === initialSourceWh);
  const initialSourceLoc = initialSourceLocs[0]?.id || '1';

  const initialDestWh = initialSourceWh;
  const initialDestLocs = locations.filter((l) => l.warehouseId === initialDestWh);
  const initialDestLoc = initialDestLocs[1]?.id || initialDestLocs[0]?.id || '4';

  // Form State
  const [formData, setFormData] = useState({
    sourceWarehouseId: initialSourceWh,
    sourceLocationId: initialSourceLoc,
    destWarehouseId: initialDestWh,
    destLocationId: initialDestLoc,
    productId: preselectedProductId || products[0]?.id || '1',
    quantity: 30,
    notes: '',
  });

  // Keep target transfer open if navigated from search or dashboard
  useEffect(() => {
    if (targetTransferId) {
      const match = transfers.find((t) => t.id === targetTransferId || t.reference.toLowerCase() === targetTransferId.toLowerCase());
      if (match) setSelectedTransfer(match);
    }
  }, [targetTransferId, transfers]);

  // Keep form data locations consistent with available warehouses & locations
  useEffect(() => {
    if (warehouses.length > 0) {
      const currentSrcWhValid = warehouses.some((w) => w.id === formData.sourceWarehouseId);
      const activeSrcWh = currentSrcWhValid ? formData.sourceWarehouseId : warehouses[0].id;
      const validSrcLocs = locations.filter((l) => l.warehouseId === activeSrcWh);
      const isSrcLocValid = validSrcLocs.some((l) => l.id === formData.sourceLocationId);

      const currentDestWhValid = warehouses.some((w) => w.id === formData.destWarehouseId);
      const activeDestWh = currentDestWhValid ? formData.destWarehouseId : warehouses[0].id;
      const validDestLocs = locations.filter((l) => l.warehouseId === activeDestWh);
      const isDestLocValid = validDestLocs.some((l) => l.id === formData.destLocationId);

      if (!currentSrcWhValid || !isSrcLocValid || !currentDestWhValid || !isDestLocValid) {
        setFormData((prev) => ({
          ...prev,
          sourceWarehouseId: activeSrcWh,
          sourceLocationId: isSrcLocValid ? prev.sourceLocationId : validSrcLocs[0]?.id || '',
          destWarehouseId: activeDestWh,
          destLocationId: isDestLocValid ? prev.destLocationId : validDestLocs[1]?.id || validDestLocs[0]?.id || '',
        }));
      }
    }
  }, [warehouses, locations, formData.sourceWarehouseId, formData.sourceLocationId, formData.destWarehouseId, formData.destLocationId]);

  const handleSourceWarehouseChange = (whId: string) => {
    const locs = locations.filter((l) => l.warehouseId === whId);
    setFormData((prev) => ({
      ...prev,
      sourceWarehouseId: whId,
      sourceLocationId: locs[0]?.id || '',
    }));
  };

  const handleDestWarehouseChange = (whId: string) => {
    const locs = locations.filter((l) => l.warehouseId === whId);
    setFormData((prev) => ({
      ...prev,
      destWarehouseId: whId,
      destLocationId: locs[0]?.id || '',
    }));
  };

  const selectedProduct = products.find((p) => p.id === formData.productId);
  const sourceQuant = inventoryEngine.getQuants(
    formData.productId,
    formData.sourceWarehouseId,
    formData.sourceLocationId
  )[0];
  const sourceAvailable = sourceQuant ? Math.max(0, sourceQuant.quantity - sourceQuant.reservedQuantity) : 0;

  const filteredTransfers = transfers.filter((t) => {
    if (search) {
      const q = search.toLowerCase();
      if (!t.reference.toLowerCase().includes(q) && !t.destLocationName.toLowerCase().includes(q)) {
        return false;
      }
    }
    return true;
  });

  const handleExecuteTransfer = (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.sourceLocationId === formData.destLocationId) {
      showToast('error', 'Invalid Transfer', 'Source and destination locations cannot be identical.');
      return;
    }

    if (formData.quantity <= 0) {
      showToast('error', 'Invalid Quantity', 'Transfer quantity must be greater than zero.');
      return;
    }

    if (formData.quantity > sourceAvailable) {
      showToast(
        'error',
        'Insufficient Stock',
        `Cannot transfer ${formData.quantity} ${selectedProduct?.uom}. Only ${sourceAvailable} available in source location.`
      );
      return;
    }

    const res = inventoryEngine.createAndExecuteTransfer({
      sourceWarehouseId: formData.sourceWarehouseId,
      sourceLocationId: formData.sourceLocationId,
      destWarehouseId: formData.destWarehouseId,
      destLocationId: formData.destLocationId,
      productId: formData.productId,
      quantity: Number(formData.quantity) || 1,
      notes: formData.notes,
    });

    if (res.success && res.transfer) {
      confetti({
        particleCount: 65,
        spread: 60,
        origin: { y: 0.6 },
      });
      showToast('success', 'Transfer Completed', res.message);
      setIsModalOpen(false);
      setSelectedTransfer(res.transfer);
    } else {
      showToast('error', 'Transfer Failed', res.error);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 26, color: '#0F172A' }}>Internal Transfers</h1>
          <p style={{ color: '#64748B', fontSize: 14, marginTop: 4 }}>
            Relocate stock across warehouse zones, assembly racks, and buffer bays.
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="btn btn-primary"
          style={{ background: '#6D28D9', padding: '10px 18px' }}
        >
          <Plus size={16} />
          <span>New Transfer</span>
        </button>
      </div>

      {/* Visual Movement Flow Banner */}
      <div
        className="card"
        style={{
          padding: '20px 24px',
          background: 'linear-gradient(135deg, #FAF5FF 0%, #FFFFFF 100%)',
          border: '1px solid #DDD6FE',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 16,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              background: '#6D28D9',
              color: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <ArrowLeftRight size={22} />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 15, color: '#4C1D95' }}>Double-Entry Location Relocation</div>
            <div style={{ fontSize: 12.5, color: '#6D28D9' }}>
              Transfers decrease source quant & increase destination quant. Total product inventory remains unchanged.
            </div>
          </div>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="btn btn-sm btn-outline-purple"
          style={{ padding: '8px 14px' }}
        >
          Move Inventory →
        </button>
      </div>

      {/* Search Bar */}
      <div className="card" style={{ padding: '12px 18px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ flex: 1, position: 'relative' }}>
          <Search size={16} color="#94A3B8" style={{ position: 'absolute', left: 12, top: 11 }} />
          <input
            type="text"
            placeholder="Search transfers by reference, product, source or destination location..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-field"
            style={{ paddingLeft: 36 }}
          />
        </div>
      </div>

      {/* Transfers Table */}
      <div className="table-container">
        <table className="enterprise-table">
          <thead>
            <tr>
              <th>Reference</th>
              <th>Source Location</th>
              <th>Destination Location</th>
              <th>Product</th>
              <th>Transferred Qty</th>
              <th>Status</th>
              <th>Timestamp</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredTransfers.map((t) => {
              const item = t.items[0];
              return (
                <tr key={t.id}>
                  <td style={{ fontWeight: 700, color: '#6D28D9', cursor: 'pointer' }} onClick={() => setSelectedTransfer(t)}>
                    {t.reference}
                  </td>
                  <td style={{ fontWeight: 500, color: '#334155' }}>{t.sourceLocationName}</td>
                  <td style={{ fontWeight: 600, color: '#0F172A' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <ArrowRight size={14} color="#6D28D9" />
                      <span>{t.destLocationName}</span>
                    </div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Package size={14} color="#64748B" />
                      <span>{item?.productName}</span>
                    </div>
                  </td>
                  <td style={{ fontWeight: 700, color: '#6D28D9' }}>
                    {item?.quantity} {item?.uom}
                  </td>
                  <td>
                    <span className="badge badge-success">
                      <span className="badge-dot" />
                      {t.status}
                    </span>
                  </td>
                  <td style={{ fontSize: 12, color: '#64748B' }}>{t.date}</td>
                  <td style={{ textAlign: 'right' }}>
                    <button
                      onClick={() => setSelectedTransfer(t)}
                      className="btn btn-sm btn-outline"
                    >
                      View
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* New Transfer Modal */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal-content" style={{ maxWidth: 580 }} onClick={(e) => e.stopPropagation()}>
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
                  <ArrowLeftRight size={18} color="#6D28D9" />
                </div>
                <h3 style={{ fontSize: 17 }}>Execute Internal Stock Transfer</h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                style={{ background: 'none', border: 'none', color: '#64748B', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleExecuteTransfer} style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Product Selection */}
              <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 14 }}>
                <div>
                  <label className="input-label">Product to Move</label>
                  <select
                    value={formData.productId}
                    onChange={(e) => setFormData({ ...formData, productId: e.target.value })}
                    className="input-field"
                  >
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.sku}) — {p.totalStock} {p.uom} Total
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="input-label">
                    Transfer Qty <span className="input-required">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: Number(e.target.value) })}
                    className="input-field"
                  />
                </div>
              </div>

              {/* Source & Destination Visual Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 12, alignItems: 'center' }}>
                {/* Source Box */}
                <div style={{ background: '#F8FAFC', padding: '12px', borderRadius: 10, border: '1px solid #E2E8F0' }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', marginBottom: 6 }}>
                    FROM (Source)
                  </div>
                  <select
                    value={formData.sourceWarehouseId}
                    onChange={(e) => handleSourceWarehouseChange(e.target.value)}
                    className="input-field"
                    style={{ marginBottom: 6 }}
                  >
                    {warehouses.map((w) => (
                      <option key={w.id} value={w.id}>{w.name}</option>
                    ))}
                  </select>
                  <select
                    value={formData.sourceLocationId}
                    onChange={(e) => setFormData({ ...formData, sourceLocationId: e.target.value })}
                    className="input-field"
                  >
                    {locations
                      .filter((l) => l.warehouseId === formData.sourceWarehouseId)
                      .map((l) => (
                        <option key={l.id} value={l.id}>{l.name}</option>
                      ))}
                  </select>
                </div>

                {/* Arrow */}
                <div style={{ color: '#6D28D9' }}>
                  <ArrowRight size={22} />
                </div>

                {/* Destination Box */}
                <div style={{ background: '#FAF5FF', padding: '12px', borderRadius: 10, border: '1px solid #DDD6FE' }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#6D28D9', textTransform: 'uppercase', marginBottom: 6 }}>
                    TO (Destination)
                  </div>
                  <select
                    value={formData.destWarehouseId}
                    onChange={(e) => handleDestWarehouseChange(e.target.value)}
                    className="input-field"
                    style={{ marginBottom: 6 }}
                  >
                    {warehouses.map((w) => (
                      <option key={w.id} value={w.id}>{w.name}</option>
                    ))}
                  </select>
                  <select
                    value={formData.destLocationId}
                    onChange={(e) => setFormData({ ...formData, destLocationId: e.target.value })}
                    className="input-field"
                  >
                    {locations
                      .filter((l) => l.warehouseId === formData.destWarehouseId)
                      .map((l) => (
                        <option key={l.id} value={l.id}>{l.name}</option>
                      ))}
                  </select>
                </div>
              </div>

              {/* Source Available Stock Info Box */}
              <div
                style={{
                  padding: '10px 14px',
                  borderRadius: 8,
                  background: '#F1F5F9',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  fontSize: 12.5,
                }}
              >
                <span style={{ color: '#475569' }}>Available in selected source location:</span>
                <strong style={{ color: '#0F172A', fontSize: 14 }}>
                  {sourceAvailable} {selectedProduct?.uom}
                </strong>
              </div>

              <div>
                <label className="input-label">Reason / Work Order Notes</label>
                <input
                  type="text"
                  placeholder="Relocation for production run, bin consolidation..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="input-field"
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 8 }}>
                <button type="button" onClick={() => setIsModalOpen(false)} className="btn btn-outline">
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={formData.quantity > sourceAvailable || formData.sourceLocationId === formData.destLocationId}
                  className="btn btn-primary"
                  style={{ background: '#6D28D9' }}
                >
                  Execute Transfer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Transfer Detail View */}
      {selectedTransfer && (
        <div className="modal-overlay" onClick={() => setSelectedTransfer(null)}>
          <div className="modal-content" style={{ maxWidth: 520 }} onClick={(e) => e.stopPropagation()}>
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
                  TRANSFER #{selectedTransfer.reference}
                </div>
                <h3 style={{ fontSize: 18, marginTop: 2 }}>Stock Relocation Verified</h3>
              </div>
              <button
                onClick={() => setSelectedTransfer(null)}
                style={{ background: 'none', border: 'none', color: '#64748B', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div
                style={{
                  padding: '16px',
                  borderRadius: 10,
                  background: '#FAF5FF',
                  border: '1px solid #DDD6FE',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <div style={{ fontSize: 11, color: '#64748B', fontWeight: 700 }}>SOURCE</div>
                  <div style={{ fontWeight: 700, color: '#0F172A', marginTop: 2 }}>
                    {selectedTransfer.sourceLocationName}
                  </div>
                </div>
                <div style={{ textAlign: 'center', color: '#6D28D9', fontWeight: 800 }}>
                  <div>→ {selectedTransfer.items[0]?.quantity} {selectedTransfer.items[0]?.uom} →</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 11, color: '#64748B', fontWeight: 700 }}>DESTINATION</div>
                  <div style={{ fontWeight: 700, color: '#0F172A', marginTop: 2 }}>
                    {selectedTransfer.destLocationName}
                  </div>
                </div>
              </div>

              <div style={{ fontSize: 13, color: '#475569' }}>
                Product: <strong>{selectedTransfer.items[0]?.productName}</strong> ({selectedTransfer.items[0]?.sku})
              </div>

              {selectedTransfer.notes && (
                <div style={{ fontSize: 12.5, color: '#64748B' }}>
                  <strong>Notes:</strong> {selectedTransfer.notes}
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 8 }}>
                <button onClick={() => setSelectedTransfer(null)} className="btn btn-outline">
                  Close
                </button>
                <button
                  onClick={() => {
                    setSelectedTransfer(null);
                    onNavigate('ledger');
                  }}
                  className="btn btn-primary"
                  style={{ background: '#6D28D9' }}
                >
                  Inspect in Ledger
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
