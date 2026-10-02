import React, { useState } from 'react';
import { Tag, Plus, X } from 'lucide-react';
import { inventoryEngine } from '../services/inventoryEngine';
import { useToast } from '../components/Toast';

export const CategoriesView: React.FC = () => {
  const { showToast } = useToast();
  const categories = inventoryEngine.getCategories();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ name: '', code: '', description: '' });

  const handleCreateCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.code.trim()) {
      showToast('error', 'Validation Error', 'Name and Code are required.');
      return;
    }

    const newCat = inventoryEngine.addCategory({
      name: formData.name.trim(),
      code: formData.code.trim(),
      description: formData.description,
    });

    showToast('success', 'Category Created', `Category ${newCat.name} added.`);
    setIsModalOpen(false);
    setFormData({ name: '', code: '', description: '' });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 26, color: '#0F172A' }}>Product Categories</h1>
          <p style={{ color: '#64748B', fontSize: 14, marginTop: 4 }}>
            Organize catalog products into material groups, components, and finished goods.
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="btn btn-primary"
          style={{ background: '#6D28D9', padding: '10px 18px' }}
        >
          <Plus size={16} />
          <span>New Category</span>
        </button>
      </div>

      {/* Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
        {categories.map((c) => (
          <div key={c.id} className="card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 8,
                    background: '#F5F3FF',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Tag size={18} color="#6D28D9" />
                </div>
                <h3 style={{ fontSize: 16, color: '#0F172A' }}>{c.name}</h3>
              </div>
              <span className="badge badge-purple">{c.code}</span>
            </div>
            <p style={{ fontSize: 13, color: '#64748B' }}>{c.description}</p>
            <div style={{ marginTop: 'auto', paddingTop: 8, borderTop: '1px solid #F1F5F9', fontSize: 12, color: '#64748B' }}>
              <strong>{c.productCount}</strong> assigned products
            </div>
          </div>
        ))}
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
              <h3 style={{ fontSize: 17 }}>Create Category</h3>
              <button
                onClick={() => setIsModalOpen(false)}
                style={{ background: 'none', border: 'none', color: '#64748B', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateCategory} style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label className="input-label">Category Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Electrical Components"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="input-field"
                />
              </div>

              <div>
                <label className="input-label">Code</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. ELEC"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  className="input-field"
                  style={{ textTransform: 'uppercase' }}
                />
              </div>

              <div>
                <label className="input-label">Description</label>
                <input
                  type="text"
                  placeholder="Brief description..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="input-field"
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 8 }}>
                <button type="button" onClick={() => setIsModalOpen(false)} className="btn btn-outline">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" style={{ background: '#6D28D9' }}>
                  Save Category
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
