import React, { useState } from 'react';
import { Building2, Plus, MapPin, X } from 'lucide-react';
import { inventoryEngine } from '../services/inventoryEngine';
import { useToast } from '../components/Toast';
import { RouteId } from '../components/Sidebar';

interface WarehousesViewProps {
  onNavigate?: (route: RouteId) => void;
}

export const WarehousesView: React.FC<WarehousesViewProps> = ({ onNavigate }) => {
  const { showToast } = useToast();
  const warehouses = inventoryEngine.getWarehouses();
  const locations = inventoryEngine.getLocations();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ name: '', code: '', address: '' });

  const handleAddWarehouse = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.code.trim()) {
      showToast('error', 'Validation Error', 'Name and Code are required.');
      return;
    }

    const newWh = inventoryEngine.addWarehouse({
      name: formData.name.trim(),
      code: formData.code.trim(),
      address: formData.address || 'Standard logistics facility',
    });

    showToast('success', 'Warehouse Added', `Warehouse ${newWh.name} (${newWh.code}) created successfully.`);
    setIsModalOpen(false);
    setFormData({ name: '', code: '', address: '' });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 26, color: '#0F172A' }}>Warehouses</h1>
          <p style={{ color: '#64748B', fontSize: 14, marginTop: 4 }}>
            Configure and manage physical storage facilities and multi-warehouse supply channels.
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="btn btn-primary"
          style={{ background: '#6D28D9', padding: '10px 18px' }}
        >
          <Plus size={16} />
          <span>New Warehouse</span>
        </button>
      </div>

      {/* Warehouse Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 18 }}>
        {warehouses.map((w) => {
          const whLocs = locations.filter((l) => l.warehouseId === w.id);
          const quantsInWh = inventoryEngine.getQuants(undefined, w.id);
          const totalUnits = quantsInWh.reduce((s, q) => s + q.quantity, 0);

          return (
            <div key={w.id} className="card" style={{ padding: '22px', display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div
                    style={{
                      width: 42,
                      height: 42,
                      borderRadius: 10,
                      background: '#F5F3FF',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Building2 size={22} color="#6D28D9" />
                  </div>
                  <div>
                    <h3 style={{ fontSize: 16, color: '#0F172A' }}>{w.name}</h3>
                    <span className="badge badge-purple" style={{ fontSize: 11, marginTop: 2 }}>{w.code}</span>
                  </div>
                </div>
                <span className="badge badge-success">Active</span>
              </div>

              <div style={{ fontSize: 13, color: '#64748B', display: 'flex', alignItems: 'flex-start', gap: 6 }}>
                <MapPin size={16} color="#94A3B8" style={{ flexShrink: 0, marginTop: 2 }} />
                <span>{w.address}</span>
              </div>

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  padding: '10px 14px',
                  background: '#F8FAFC',
                  borderRadius: 8,
                  fontSize: 12.5,
                }}
              >
                <div>
                  <span style={{ color: '#64748B' }}>Storage Racks: </span>
                  <strong>{whLocs.length}</strong>
                </div>
                <div>
                  <span style={{ color: '#64748B' }}>Stored Units: </span>
                  <strong style={{ color: '#6D28D9' }}>{totalUnits.toLocaleString()}</strong>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                <button
                  onClick={() => onNavigate?.('stock-location')}
                  className="btn btn-sm btn-outline-purple"
                  style={{ flex: 1 }}
                >
                  Manage Racks
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal-content" style={{ maxWidth: 480 }} onClick={(e) => e.stopPropagation()}>
            <div
              style={{
                padding: '18px 24px',
                borderBottom: '1px solid var(--border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <h3 style={{ fontSize: 17 }}>Add New Warehouse</h3>
              <button
                onClick={() => setIsModalOpen(false)}
                style={{ background: 'none', border: 'none', color: '#64748B', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddWarehouse} style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label className="input-label">Warehouse Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Central Distribution Hub"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="input-field"
                />
              </div>

              <div>
                <label className="input-label">Facility Code</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. WH-HUB"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  className="input-field"
                  style={{ textTransform: 'uppercase' }}
                />
              </div>

              <div>
                <label className="input-label">Address & Logistics Bay</label>
                <input
                  type="text"
                  placeholder="Facility address..."
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="input-field"
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 8 }}>
                <button type="button" onClick={() => setIsModalOpen(false)} className="btn btn-outline">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" style={{ background: '#6D28D9' }}>
                  Save Warehouse
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
