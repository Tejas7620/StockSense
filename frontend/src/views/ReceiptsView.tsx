import React, { useState, useEffect } from 'react';
import {
  ArrowDownToLine,
  Plus,
  Search,
  CheckCircle2,
  Package,
  X,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { inventoryEngine } from '../services/inventoryEngine';
import { Receipt } from '../types';
import { useToast } from '../components/Toast';
import { RouteId } from '../components/Sidebar';

interface ReceiptsViewProps {
  onNavigate?: (route: RouteId, targetId?: string) => void;
  openNewModalOnLoad?: boolean;
  selectedWarehouse?: string;
  targetReceiptId?: string;
}

export const ReceiptsView: React.FC<ReceiptsViewProps> = ({
  openNewModalOnLoad,
  selectedWarehouse,
  targetReceiptId,
}) => {
  const { showToast } = useToast();
  const receipts = inventoryEngine.getReceipts();
  const products = inventoryEngine.getProducts();
  const warehouses = inventoryEngine.getWarehouses();
  const locations = inventoryEngine.getLocations();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isModalOpen, setIsModalOpen] = useState(openNewModalOnLoad || false);
  const [selectedReceipt, setSelectedReceipt] = useState<Receipt | null>(null);

  const initialWh = (selectedWarehouse && selectedWarehouse !== 'all' ? selectedWarehouse : warehouses[0]?.id) || '1';
  const initialLocs = locations.filter((l) => l.warehouseId === initialWh);
  const initialLoc = initialLocs[0]?.id || '1';

  // Form State
  const [formData, setFormData] = useState({
    supplier: '',
    warehouseId: initialWh,
    locationId: initialLoc,
    productId: products[0]?.id || '1',
    quantity: 50,
    notes: '',
  });

  // Keep target receipt open if navigated from search or dashboard
  useEffect(() => {
    if (targetReceiptId) {
      const match = receipts.find((r) => r.id === targetReceiptId || r.reference.toLowerCase() === targetReceiptId.toLowerCase());
      if (match) setSelectedReceipt(match);
    }
  }, [targetReceiptId, receipts]);

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

  const filteredReceipts = receipts.filter((r) => {
    if (search) {
      const q = search.toLowerCase();
      if (!r.reference.toLowerCase().includes(q) && !r.supplier.toLowerCase().includes(q)) {
        return false;
      }
    }
    if (statusFilter !== 'all' && r.status !== statusFilter) {
      return false;
    }
    return true;
  });

  const handleCreateReceipt = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.supplier.trim()) {
      showToast('error', 'Supplier Required', 'Please enter a vendor or supplier name.');
      return;
    }

    const res = inventoryEngine.createReceipt({
      supplier: formData.supplier,
      warehouseId: formData.warehouseId,
      locationId: formData.locationId,
      items: [{ productId: formData.productId, orderedQty: Number(formData.quantity) || 1 }],
      notes: formData.notes,
    });

    if (res.success && res.receipt) {
      showToast('success', 'Receipt Draft Created', `Receipt ${res.receipt.reference} created. Click Validate to receive stock.`);
      setIsModalOpen(false);
      setSelectedReceipt(res.receipt);
    } else {
      showToast('error', 'Error', res.error);
    }
  };

  const handleValidateReceipt = (receiptId: string) => {
    const res = inventoryEngine.validateReceipt(receiptId);
    if (res.success) {
      confetti({
        particleCount: 70,
        spread: 60,
        origin: { y: 0.6 },
      });
      showToast('success', 'Receipt Validated', res.message);
      setSelectedReceipt(null);
    } else {
      showToast('error', 'Validation Failed', res.error);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 26, color: '#0F172A' }}>Receipts (Incoming Stock)</h1>
          <p style={{ color: '#64748B', fontSize: 14, marginTop: 4 }}>
            Inbound vendor shipments, supplier purchase orders, and goods receipts.
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="btn btn-primary"
          style={{ background: '#6D28D9', padding: '10px 18px' }}
        >
          <Plus size={16} />
          <span>New Receipt</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="card" style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 240, position: 'relative' }}>
          <Search size={16} color="#94A3B8" style={{ position: 'absolute', left: 12, top: 11 }} />
          <input
            type="text"
            placeholder="Search by receipt reference, supplier..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-field"
            style={{ paddingLeft: 36 }}
          />
        </div>
        <div style={{ minWidth: 160 }}>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="input-field"
          >
            <option value="all">All Statuses</option>
            <option value="Ready">Ready</option>
            <option value="Draft">Draft</option>
            <option value="Done">Done</option>
          </select>
        </div>
      </div>

      {/* Receipts Table */}
      <div className="table-container">
        <table className="enterprise-table">
          <thead>
            <tr>
              <th>Reference</th>
              <th>Supplier</th>
              <th>Destination</th>
              <th>Product Line</th>
              <th>Quantity</th>
              <th>Status</th>
              <th>Date</th>
              <th style={{ textAlign: 'right' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredReceipts.map((r) => {
              const item = r.items[0];
              const qty = item ? item.receivedQty || item.orderedQty : 0;
              const isDone = r.status === 'Done';

              return (
                <tr key={r.id}>
                  <td style={{ fontWeight: 700, color: '#6D28D9', cursor: 'pointer' }} onClick={() => setSelectedReceipt(r)}>
                    {r.reference}
                  </td>
                  <td style={{ fontWeight: 600, color: '#0F172A' }}>{r.supplier}</td>
                  <td>
                    {r.warehouseName} / {r.locationName}
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Package size={14} color="#64748B" />
                      <span>{item?.productName || 'Items'}</span>
                      <span style={{ fontSize: 11.5, color: '#94A3B8' }}>({item?.sku})</span>
                    </div>
                  </td>
                  <td style={{ fontWeight: 700, color: '#10B981' }}>
                    +{qty} {item?.uom}
                  </td>
                  <td>
                    <span className={`badge ${isDone ? 'badge-success' : 'badge-warning'}`}>
                      <span className="badge-dot" />
                      {r.status}
                    </span>
                  </td>
                  <td style={{ fontSize: 12, color: '#64748B' }}>{r.date}</td>
                  <td style={{ textAlign: 'right' }}>
                    {!isDone ? (
                      <button
                        onClick={() => handleValidateReceipt(r.id)}
                        className="btn btn-sm btn-primary"
                        style={{ background: '#10B981' }}
                      >
                        <CheckCircle2 size={13} />
                        Validate
                      </button>
                    ) : (
                      <button
                        onClick={() => setSelectedReceipt(r)}
                        className="btn btn-sm btn-outline"
                      >
                        View
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* New Receipt Modal */}
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
                    background: '#ECFDF5',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <ArrowDownToLine size={18} color="#10B981" />
                </div>
                <h3 style={{ fontSize: 17 }}>Create Incoming Stock Receipt</h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                style={{ background: 'none', border: 'none', color: '#64748B', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateReceipt} style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label className="input-label">
                  Supplier / Vendor Name <span className="input-required">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. ABC Metals Ltd, Global Spools"
                  value={formData.supplier}
                  onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                  className="input-field"
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 14 }}>
                <div>
                  <label className="input-label">Product to Receive</label>
                  <select
                    value={formData.productId}
                    onChange={(e) => setFormData({ ...formData, productId: e.target.value })}
                    className="input-field"
                  >
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.sku}) — {p.totalStock} {p.uom} on hand
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="input-label">
                    Quantity to Receive <span className="input-required">*</span>
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

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div>
                  <label className="input-label">Destination Warehouse</label>
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
                  <label className="input-label">Destination Rack / Location</label>
                  <select
                    value={formData.locationId}
                    onChange={(e) => setFormData({ ...formData, locationId: e.target.value })}
                    className="input-field"
                  >
                    {locations
                      .filter((l) => l.warehouseId === formData.warehouseId)
                      .map((l) => (
                        <option key={l.id} value={l.id}>
                          {l.name} ({l.code})
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="input-label">Notes / Purchase Order Ref</label>
                <input
                  type="text"
                  placeholder="PO-2026-904, Batch tracking #..."
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
                  Create Receipt Order
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Receipt Detail & Validation Dialog */}
      {selectedReceipt && (
        <div className="modal-overlay" onClick={() => setSelectedReceipt(null)}>
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
                  RECEIPT #{selectedReceipt.reference}
                </div>
                <h3 style={{ fontSize: 18, marginTop: 2 }}>{selectedReceipt.supplier}</h3>
              </div>
              <button
                onClick={() => setSelectedReceipt(null)}
                style={{ background: 'none', border: 'none', color: '#64748B', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, fontSize: 13 }}>
                <div>
                  <div style={{ color: '#64748B' }}>Destination</div>
                  <div style={{ fontWeight: 600, color: '#0F172A', marginTop: 2 }}>
                    {selectedReceipt.warehouseName} / {selectedReceipt.locationName}
                  </div>
                </div>
                <div>
                  <div style={{ color: '#64748B' }}>Status</div>
                  <div style={{ marginTop: 2 }}>
                    <span className={`badge ${selectedReceipt.status === 'Done' ? 'badge-success' : 'badge-warning'}`}>
                      {selectedReceipt.status}
                    </span>
                  </div>
                </div>
              </div>

              <div style={{ background: '#F8FAFC', borderRadius: 8, padding: '14px', border: '1px solid #E2E8F0' }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', marginBottom: 8 }}>
                  Material Items
                </div>
                {selectedReceipt.items.map((i) => (
                  <div key={i.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontWeight: 600, color: '#0F172A', fontSize: 14 }}>{i.productName}</div>
                      <div style={{ fontSize: 12, color: '#64748B' }}>SKU: {i.sku}</div>
                    </div>
                    <div style={{ fontWeight: 700, color: '#10B981', fontSize: 15 }}>
                      +{i.orderedQty} {i.uom}
                    </div>
                  </div>
                ))}
              </div>

              {selectedReceipt.notes && (
                <div style={{ fontSize: 12.5, color: '#64748B' }}>
                  <strong>Notes:</strong> {selectedReceipt.notes}
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 10 }}>
                <button onClick={() => setSelectedReceipt(null)} className="btn btn-outline">
                  Close
                </button>
                {selectedReceipt.status !== 'Done' && (
                  <button
                    onClick={() => handleValidateReceipt(selectedReceipt.id)}
                    className="btn btn-primary"
                    style={{ background: '#10B981' }}
                  >
                    <CheckCircle2 size={16} />
                    Validate Receipt & Increase Stock
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
