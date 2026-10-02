import React, { useState } from 'react';
import { MapPin, Plus, X } from 'lucide-react';
import { inventoryEngine } from '../services/inventoryEngine';
import { useToast } from '../components/Toast';
import { RouteId } from '../components/Sidebar';

interface LocationsViewProps {
  onNavigate?: (route: RouteId) => void;
}

export const LocationsView: React.FC<LocationsViewProps> = ({ onNavigate: _onNavigate }) => {
  const { showToast } = useToast();
  const locations = inventoryEngine.getLocations();
  const warehouses = inventoryEngine.getWarehouses();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    warehouseId: warehouses[0]?.id || '1',
    type: 'Internal' as const,
  });

  const handleAddLocation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.code.trim()) {
      showToast('error', 'Validation Error', 'Rack Name and Code are required.');
      return;
    }

    const newLoc = inventoryEngine.addLocation({
      warehouseId: formData.warehouseId,
      name: formData.name.trim(),
      code: formData.code.trim(),
      type: formData.type,
    });

    showToast('success', 'Location Created', `Location ${newLoc.name} (${newLoc.code}) added.`);
    setIsModalOpen(false);
    setFormData({ name: '', code: '', warehouseId: warehouses[0]?.id || '1', type: 'Internal' });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 26, color: '#0F172A' }}>Locations & Racks</h1>
          <p style={{ color: '#64748B', fontSize: 14, marginTop: 4 }}>
            Sub-locations, internal aisle racks, and staging areas.
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="btn btn-primary"
          style={{ background: '#6D28D9', padding: '10px 18px' }}
        >
          <Plus size={16} />
          <span>New Location</span>
        </button>
      </div>

      {/* Locations Table */}
      <div className="table-container">
        <table className="enterprise-table">
          <thead>
            <tr>
              <th>Location Name</th>
              <th>Code</th>
              <th>Warehouse</th>
              <th>Type</th>
              <th>Status</th>
              <th style={{ textAlign: 'right' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {locations.map((loc) => {
              const quants = inventoryEngine.getQuants(undefined, undefined, loc.id);
              const totalUnits = quants.reduce((s, q) => s + q.quantity, 0);

              return (
                <tr key={loc.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <MapPin size={16} color="#6D28D9" />
                      <strong style={{ color: '#0F172A' }}>{loc.name}</strong>
                    </div>
                  </td>
                  <td style={{ fontWeight: 600, color: '#6D28D9' }}>{loc.code}</td>
                  <td style={{ color: '#334155' }}>{loc.warehouseName}</td>
                  <td>
                    <span className="badge badge-neutral">{loc.type}</span>
                  </td>
                  <td>
                    <span className="badge badge-success">
                      <span className="badge-dot" />
                      Active
                    </span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: '#0F172A' }}>
                      {totalUnits.toLocaleString()} units
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal-content" style={{ maxWidth: 460 }} onClick={(e) => e.stopPropagation()}>
            <div
              style={{
                padding: '18px 24px',
                borderBottom: '1px solid var(--border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <h3 style={{ fontSize: 17 }}>Create Storage Location</h3>
              <button
                onClick={() => setIsModalOpen(false)}
                style={{ background: 'none', border: 'none', color: '#64748B', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddLocation} style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label className="input-label">Location / Rack Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Rack D, Aisle 3"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="input-field"
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label className="input-label">Code</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. RACK-D"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    className="input-field"
                    style={{ textTransform: 'uppercase' }}
                  />
                </div>
                <div>
                  <label className="input-label">Warehouse</label>
                  <select
                    value={formData.warehouseId}
                    onChange={(e) => setFormData({ ...formData, warehouseId: e.target.value })}
                    className="input-field"
                  >
                    {warehouses.map((w) => (
                      <option key={w.id} value={w.id}>{w.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 8 }}>
                <button type="button" onClick={() => setIsModalOpen(false)} className="btn btn-outline">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" style={{ background: '#6D28D9' }}>
                  Save Location
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
