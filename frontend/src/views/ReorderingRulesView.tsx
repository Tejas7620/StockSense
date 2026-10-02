import React, { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { inventoryEngine } from '../services/inventoryEngine';
import { ReorderingRule } from '../types';
import { useToast } from '../components/Toast';

export const ReorderingRulesView: React.FC = () => {
  const { showToast } = useToast();
  const rules = inventoryEngine.getReorderRules();
  const products = inventoryEngine.getProducts();
  const warehouses = inventoryEngine.getWarehouses();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    productId: products[0]?.id || '1',
    warehouseId: warehouses[0]?.id || '1',
    minQuantity: 25,
    targetQuantity: 50,
  });

  const handleToggleRule = (rule: ReorderingRule) => {
    const updatedStatus = inventoryEngine.toggleReorderRule(rule.id);
    showToast(
      'info',
      'Rule Updated',
      `Reordering rule for ${rule.productName} is now ${updatedStatus ? 'Active' : 'Disabled'}.`
    );
  };

  const handleCreateRule = (e: React.FormEvent) => {
    e.preventDefault();
    const created = inventoryEngine.addReorderRule({
      productId: formData.productId,
      warehouseId: formData.warehouseId,
      minQuantity: Number(formData.minQuantity) || 10,
      targetQuantity: Number(formData.targetQuantity) || 30,
    });

    if (created) {
      showToast('success', 'Rule Created', `Reordering threshold rule set for ${created.productName}.`);
      setIsModalOpen(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 26, color: '#0F172A' }}>Reordering Rules</h1>
          <p style={{ color: '#64748B', fontSize: 14, marginTop: 4 }}>
            Configure min/max inventory buffers to automate replenishment calculations.
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="btn btn-primary"
          style={{ background: '#6D28D9', padding: '10px 18px' }}
        >
          <Plus size={16} />
          <span>New Reordering Rule</span>
        </button>
      </div>

      {/* Rules Table */}
      <div className="table-container">
        <table className="enterprise-table">
          <thead>
            <tr>
              <th>Product</th>
              <th>SKU</th>
              <th>Warehouse</th>
              <th>Minimum Quantity (Safety)</th>
              <th>Target Quantity (Max)</th>
              <th>Status</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rules.map((r) => (
              <tr key={r.id}>
                <td>
                  <strong style={{ color: '#0F172A' }}>{r.productName}</strong>
                </td>
                <td style={{ fontWeight: 600, color: '#6D28D9' }}>{r.sku}</td>
                <td style={{ color: '#334155' }}>{r.warehouseName}</td>
                <td style={{ fontWeight: 700, color: '#F59E0B' }}>
                  {r.minQuantity} {r.uom}
                </td>
                <td style={{ fontWeight: 700, color: '#10B981' }}>
                  {r.targetQuantity} {r.uom}
                </td>
                <td>
                  <span className={`badge ${r.active ? 'badge-success' : 'badge-neutral'}`}>
                    <span className="badge-dot" />
                    {r.active ? 'Active' : 'Disabled'}
                  </span>
                </td>
                <td style={{ textAlign: 'right' }}>
                  <button
                    onClick={() => handleToggleRule(r)}
                    className="btn btn-sm btn-outline"
                  >
                    {r.active ? 'Deactivate' : 'Activate'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
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
              <h3 style={{ fontSize: 17 }}>Create Reordering Rule</h3>
              <button
                onClick={() => setIsModalOpen(false)}
                style={{ background: 'none', border: 'none', color: '#64748B', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateRule} style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label className="input-label">Product</label>
                <select
                  value={formData.productId}
                  onChange={(e) => setFormData({ ...formData, productId: e.target.value })}
                  className="input-field"
                >
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>
                  ))}
                </select>
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

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label className="input-label">Minimum Stock Buffer</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={formData.minQuantity}
                    onChange={(e) => setFormData({ ...formData, minQuantity: Number(e.target.value) })}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="input-label">Target Max Level</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={formData.targetQuantity}
                    onChange={(e) => setFormData({ ...formData, targetQuantity: Number(e.target.value) })}
                    className="input-field"
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 8 }}>
                <button type="button" onClick={() => setIsModalOpen(false)} className="btn btn-outline">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" style={{ background: '#6D28D9' }}>
                  Save Rule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
