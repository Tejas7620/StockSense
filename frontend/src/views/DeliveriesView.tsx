import React, { useState, useEffect } from 'react';
import {
  Truck,
  Plus,
  Search,
  CheckCircle2,
  Package,
  AlertCircle,
  X,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { inventoryEngine } from '../services/inventoryEngine';
import { Delivery } from '../types';
import { useToast } from '../components/Toast';
import { RouteId } from '../components/Sidebar';

interface DeliveriesViewProps {
  onNavigate?: (route: RouteId, targetId?: string) => void;
  openNewModalOnLoad?: boolean;
  selectedWarehouse?: string;
  targetDeliveryId?: string;
}

export const DeliveriesView: React.FC<DeliveriesViewProps> = ({
  openNewModalOnLoad,
  selectedWarehouse,
  targetDeliveryId,
}) => {
  const { showToast } = useToast();
  const deliveries = inventoryEngine.getDeliveries();
  const products = inventoryEngine.getProducts();
  const warehouses = inventoryEngine.getWarehouses();
  const locations = inventoryEngine.getLocations();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isModalOpen, setIsModalOpen] = useState(openNewModalOnLoad || false);
  const [selectedDelivery, setSelectedDelivery] = useState<Delivery | null>(null);

  const initialWh = (selectedWarehouse && selectedWarehouse !== 'all' ? selectedWarehouse : warehouses[0]?.id) || '1';
  const initialLocs = locations.filter((l) => l.warehouseId === initialWh);
  const initialLoc = initialLocs[0]?.id || '1';

  // Form State
  const [formData, setFormData] = useState({
    customer: '',
    warehouseId: initialWh,
    locationId: initialLoc,
    productId: products[4]?.id || products[0]?.id || '1',
    quantity: 10,
    notes: '',
  });

  // Keep target delivery open if navigated from search or dashboard
  useEffect(() => {
    if (targetDeliveryId) {
      const match = deliveries.find((d) => d.id === targetDeliveryId || d.reference.toLowerCase() === targetDeliveryId.toLowerCase());
      if (match) setSelectedDelivery(match);
    }
  }, [targetDeliveryId, deliveries]);

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

  // Calculate live available stock at selected location
  const currentQuant = inventoryEngine
    .getQuants(formData.productId, formData.warehouseId, formData.locationId)[0];
  const liveAvailable = currentQuant ? Math.max(0, currentQuant.quantity - currentQuant.reservedQuantity) : 0;
  const selectedProduct = products.find((p) => p.id === formData.productId);

  const filteredDeliveries = deliveries.filter((d) => {
    if (search) {
      const q = search.toLowerCase();
      if (!d.reference.toLowerCase().includes(q) && !d.customer.toLowerCase().includes(q)) {
        return false;
      }
    }
    if (statusFilter !== 'all' && d.status !== statusFilter) {
      return false;
    }
    return true;
  });

  const handleCreateDelivery = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.customer.trim()) {
      showToast('error', 'Customer Required', 'Please enter customer name or client account.');
      return;
    }

    if (formData.quantity > liveAvailable) {
      showToast(
        'error',
        'Insufficient Stock',
        `Cannot dispatch ${formData.quantity} ${selectedProduct?.uom}. Only ${liveAvailable} ${selectedProduct?.uom} available in ${formData.locationId}.`
      );
      return;
    }

    const res = inventoryEngine.createDelivery({
      customer: formData.customer,
      warehouseId: formData.warehouseId,
      locationId: formData.locationId,
      items: [{ productId: formData.productId, requestedQty: Number(formData.quantity) || 1 }],
      notes: formData.notes,
    });

    if (res.success && res.delivery) {
      showToast('success', 'Delivery Order Created', `Order ${res.delivery.reference} created and staged for dispatch.`);
      setIsModalOpen(false);
      setSelectedDelivery(res.delivery);
    } else {
      showToast('error', 'Validation Error', res.error);
    }
  };

  const handleValidateDelivery = (deliveryId: string) => {
    const res = inventoryEngine.validateDelivery(deliveryId);
    if (res.success) {
      confetti({
        particleCount: 70,
        spread: 60,
        origin: { y: 0.6 },
      });
      showToast('success', 'Delivery Validated', res.message);
      setSelectedDelivery(null);
    } else {
      showToast('error', 'Delivery Blocked', res.error);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 26, color: '#0F172A' }}>Deliveries (Outgoing Stock)</h1>
          <p style={{ color: '#64748B', fontSize: 14, marginTop: 4 }}>
            Outbound customer fulfillment, sales orders, and carrier dispatches.
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="btn btn-primary"
          style={{ background: '#6D28D9', padding: '10px 18px' }}
        >
          <Plus size={16} />
          <span>New Delivery</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="card" style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 240, position: 'relative' }}>
          <Search size={16} color="#94A3B8" style={{ position: 'absolute', left: 12, top: 11 }} />
          <input
            type="text"
            placeholder="Search by delivery reference, customer..."
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
            <option value="Picked">Picked</option>
            <option value="Packed">Packed</option>
            <option value="Done">Done</option>
          </select>
        </div>
      </div>

      {/* Deliveries Table */}
      <div className="table-container">
        <table className="enterprise-table">
          <thead>
            <tr>
              <th>Reference</th>
              <th>Customer</th>
              <th>Source Location</th>
              <th>Product Line</th>
              <th>Quantity</th>
              <th>Status</th>
              <th>Date</th>
              <th style={{ textAlign: 'right' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredDeliveries.map((d) => {
              const item = d.items[0];
              const qty = item ? item.deliveredQty || item.requestedQty : 0;
              const isDone = d.status === 'Done';

              return (
                <tr key={d.id}>
                  <td style={{ fontWeight: 700, color: '#6D28D9', cursor: 'pointer' }} onClick={() => setSelectedDelivery(d)}>
                    {d.reference}
                  </td>
                  <td style={{ fontWeight: 600, color: '#0F172A' }}>{d.customer}</td>
                  <td>
                    {d.warehouseName} / {d.locationName}
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Package size={14} color="#64748B" />
                      <span>{item?.productName || 'Items'}</span>
                      <span style={{ fontSize: 11.5, color: '#94A3B8' }}>({item?.sku})</span>
                    </div>
                  </td>
                  <td style={{ fontWeight: 700, color: '#EF4444' }}>
                    -{qty} {item?.uom}
                  </td>
                  <td>
                    <span
                      className={`badge ${
                        isDone ? 'badge-success' : d.status === 'Ready' ? 'badge-info' : 'badge-warning'
                      }`}
                    >
                      <span className="badge-dot" />
                      {d.status}
                    </span>
                  </td>
                  <td style={{ fontSize: 12, color: '#64748B' }}>{d.date}</td>
                  <td style={{ textAlign: 'right' }}>
                    {!isDone ? (
                      <button
                        onClick={() => handleValidateDelivery(d.id)}
                        className="btn btn-sm btn-primary"
                        style={{ background: '#3B82F6' }}
                      >
                        <CheckCircle2 size={13} />
                        Validate Delivery
                      </button>
                    ) : (
                      <button
                        onClick={() => setSelectedDelivery(d)}
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

      {/* New Delivery Modal */}
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
                    background: '#EFF6FF',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Truck size={18} color="#3B82F6" />
                </div>
                <h3 style={{ fontSize: 17 }}>Create Delivery Order (Outgoing)</h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                style={{ background: 'none', border: 'none', color: '#64748B', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateDelivery} style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label className="input-label">
                  Customer / Destination Account <span className="input-required">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. ABC Furniture Ltd, Acme Logistics"
                  value={formData.customer}
                  onChange={(e) => setFormData({ ...formData, customer: e.target.value })}
                  className="input-field"
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div>
                  <label className="input-label">Source Warehouse</label>
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
                  <label className="input-label">Source Rack / Bay</label>
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

              <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 14 }}>
                <div>
                  <label className="input-label">Product to Deliver</label>
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
                  <label className="input-label">
                    Requested Qty <span className="input-required">*</span>
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

              {/* Prominent Stock Availability Warning/Info Box */}
              <div
                style={{
                  padding: '12px 16px',
                  borderRadius: 8,
                  background: formData.quantity > liveAvailable ? '#FEF2F2' : '#EFF6FF',
                  border: `1px solid ${formData.quantity > liveAvailable ? '#FECACA' : '#BFDBFE'}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <div style={{ fontSize: 12, color: formData.quantity > liveAvailable ? '#991B1B' : '#1E40AF', fontWeight: 600 }}>
                    Available Stock in selected location:
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 800, color: formData.quantity > liveAvailable ? '#EF4444' : '#2563EB', marginTop: 2 }}>
                    {liveAvailable} {selectedProduct?.uom}
                  </div>
                </div>
                {formData.quantity > liveAvailable && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#EF4444', fontSize: 12, fontWeight: 600 }}>
                    <AlertCircle size={16} />
                    <span>Insufficient Stock!</span>
                  </div>
                )}
              </div>

              <div>
                <label className="input-label">Shipping / Carrier Notes</label>
                <input
                  type="text"
                  placeholder="Dock 4 pickup, priority carrier tracking..."
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
                  disabled={formData.quantity > liveAvailable}
                  className="btn btn-primary"
                  style={{ background: '#3B82F6' }}
                >
                  Stage Delivery Order
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delivery Stepper & Detail Dialog */}
      {selectedDelivery && (
        <div className="modal-overlay" onClick={() => setSelectedDelivery(null)}>
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
                <div style={{ fontSize: 13, color: '#3B82F6', fontWeight: 700 }}>
                  DELIVERY #{selectedDelivery.reference}
                </div>
                <h3 style={{ fontSize: 18, marginTop: 2 }}>{selectedDelivery.customer}</h3>
              </div>
              <button
                onClick={() => setSelectedDelivery(null)}
                style={{ background: 'none', border: 'none', color: '#64748B', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Stepper Workflow */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0' }}>
                {['Picked', 'Packed', 'Ready', 'Done'].map((step, idx) => {
                  const stepIndex = ['Draft', 'Picked', 'Packed', 'Ready', 'Done'].indexOf(selectedDelivery.status);
                  const isCurrent = selectedDelivery.status === step;
                  const isPast = stepIndex >= ['Draft', 'Picked', 'Packed', 'Ready', 'Done'].indexOf(step);

                  return (
                    <div key={step} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div
                        style={{
                          width: 26,
                          height: 26,
                          borderRadius: '50%',
                          background: isPast ? '#10B981' : isCurrent ? '#3B82F6' : '#F1F5F9',
                          color: isPast || isCurrent ? '#FFFFFF' : '#64748B',
                          fontSize: 11,
                          fontWeight: 700,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        {isPast ? <CheckCircle2 size={14} /> : idx + 1}
                      </div>
                      <span style={{ fontSize: 12, fontWeight: isCurrent ? 700 : 500, color: isCurrent ? '#0F172A' : '#64748B' }}>
                        {step}
                      </span>
                    </div>
                  );
                })}
              </div>

              <div style={{ background: '#F8FAFC', borderRadius: 8, padding: '14px', border: '1px solid #E2E8F0' }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', marginBottom: 8 }}>
                  Dispatched Products
                </div>
                {selectedDelivery.items.map((i) => (
                  <div key={i.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontWeight: 600, color: '#0F172A', fontSize: 14 }}>{i.productName}</div>
                      <div style={{ fontSize: 12, color: '#64748B' }}>SKU: {i.sku}</div>
                    </div>
                    <div style={{ fontWeight: 700, color: '#EF4444', fontSize: 15 }}>
                      -{i.requestedQty} {i.uom}
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 10 }}>
                <button onClick={() => setSelectedDelivery(null)} className="btn btn-outline">
                  Close
                </button>
                {selectedDelivery.status !== 'Done' && (
                  <button
                    onClick={() => handleValidateDelivery(selectedDelivery.id)}
                    className="btn btn-primary"
                    style={{ background: '#3B82F6' }}
                  >
                    <CheckCircle2 size={16} />
                    Validate & Dispatch Outbound Stock
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
