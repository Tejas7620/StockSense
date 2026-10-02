import React, { useState } from 'react';
import { RotateCcw } from 'lucide-react';
import { inventoryEngine } from '../services/inventoryEngine';
import { UserRole } from '../types';
import { useToast } from '../components/Toast';
import { RouteId } from '../components/Sidebar';

interface ProfileViewProps {
  onNavigate?: (route: RouteId) => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({ onNavigate: _onNavigate }) => {
  const { showToast } = useToast();
  const user = inventoryEngine.getUser();
  const [name, setName] = useState(user.name);
  const [role, setRole] = useState<UserRole>(user.role);
  const [password, setPassword] = useState('');

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    inventoryEngine.setUser({
      ...user,
      name,
      role,
    });
    showToast('success', 'Profile Updated', 'User profile information updated.');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 800 }}>
      {/* Header */}
      <div>
        <h1 style={{ fontSize: 26, color: '#0F172A' }}>My Profile & Settings</h1>
        <p style={{ color: '#64748B', fontSize: 14, marginTop: 4 }}>
          Manage your StockSense account, user role, and security preferences.
        </p>
      </div>

      {/* Profile Card */}
      <div className="card" style={{ padding: '28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20, borderBottom: '1px solid #F1F5F9', paddingBottom: 24 }}>
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: '50%',
              background: '#4C1D95',
              color: '#FFFFFF',
              fontWeight: 800,
              fontSize: 24,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 14px rgba(76, 29, 149, 0.35)',
            }}
          >
            {user.avatar}
          </div>
          <div>
            <h2 style={{ fontSize: 20, color: '#0F172A' }}>{user.name}</h2>
            <div style={{ fontSize: 13, color: '#64748B', marginTop: 3 }}>{user.email}</div>
            <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
              <span className="badge badge-purple">{user.role}</span>
              <span className="badge badge-success">Account Active</span>
            </div>
          </div>
        </div>

        <form onSubmit={handleUpdate} style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <label className="input-label">Full Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="input-field"
              />
            </div>
            <div>
              <label className="input-label">Email Address (Read-only)</label>
              <input
                type="email"
                disabled
                value={user.email}
                className="input-field"
                style={{ background: '#F8FAFC' }}
              />
            </div>
          </div>

          <div>
            <label className="input-label">Assigned ERP Role</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as UserRole)}
              className="input-field"
            >
              <option value="Inventory Manager">Inventory Manager (Full Operations & Approvals)</option>
              <option value="Warehouse Staff">Warehouse Staff (Picking & Stock Counts)</option>
              <option value="Administrator">Administrator (System Config & ERP Settings)</option>
            </select>
          </div>

          <div>
            <label className="input-label">Change Password</label>
            <input
              type="password"
              placeholder="Enter new password (optional)..."
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input-field"
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
            <button
              type="button"
              onClick={() => {
                inventoryEngine.resetToDefault();
                showToast('info', 'Database Reset', 'State reset to initial demo parameters.');
              }}
              className="btn btn-outline"
            >
              <RotateCcw size={15} />
              Reset Demo State
            </button>

            <button type="submit" className="btn btn-primary" style={{ background: '#6D28D9' }}>
              Save Profile Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
