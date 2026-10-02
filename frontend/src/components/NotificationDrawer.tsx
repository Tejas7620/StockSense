import React from 'react';
import { X, Bell, AlertTriangle, AlertCircle, Truck, ArrowDownToLine, CheckCheck } from 'lucide-react';
import { Notification } from '../types';
import { RouteId } from './Sidebar';

interface NotificationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: Notification[];
  onMarkRead: (id: string) => void;
  onMarkAllRead: () => void;
  onNavigate: (route: RouteId, targetId?: string) => void;
}

export const NotificationDrawer: React.FC<NotificationDrawerProps> = ({
  isOpen,
  onClose,
  notifications,
  onMarkRead,
  onMarkAllRead,
  onNavigate,
}) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose} style={{ justifyContent: 'flex-end', padding: 0 }}>
      <div
        style={{
          width: 380,
          height: '100vh',
          background: '#FFFFFF',
          boxShadow: 'var(--shadow-xl)',
          display: 'flex',
          flexDirection: 'column',
          animation: 'slideInRight 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '20px',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Bell size={20} color="#6D28D9" />
            <h3 style={{ fontSize: 16 }}>Notifications</h3>
            {notifications.filter((n) => !n.isRead).length > 0 && (
              <span className="badge badge-purple" style={{ padding: '2px 8px', fontSize: 11 }}>
                {notifications.filter((n) => !n.isRead).length} new
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: '#64748B', cursor: 'pointer' }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Subhead / Mark all read */}
        <div
          style={{
            padding: '10px 20px',
            background: '#F8FAFC',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <span style={{ fontSize: 12, color: '#64748B' }}>Inventory & Operation Alerts</span>
          <button
            onClick={onMarkAllRead}
            style={{
              background: 'none',
              border: 'none',
              color: '#6D28D9',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            <CheckCheck size={14} />
            Mark all read
          </button>
        </div>

        {/* Notification List */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {notifications.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: '#94A3B8' }}>
              <Bell size={40} style={{ margin: '0 auto 12px', opacity: 0.4 }} />
              <div style={{ fontWeight: 600, color: '#334155' }}>All caught up!</div>
              <div style={{ fontSize: 12.5, marginTop: 4 }}>No pending notifications.</div>
            </div>
          ) : (
            notifications.map((notif) => {
              let icon = <AlertTriangle size={18} color="#F59E0B" />;
              let iconBg = '#FFFBEB';

              if (notif.type === 'out_of_stock') {
                icon = <AlertCircle size={18} color="#EF4444" />;
                iconBg = '#FEF2F2';
              } else if (notif.type === 'pending_delivery') {
                icon = <Truck size={18} color="#3B82F6" />;
                iconBg = '#EFF6FF';
              } else if (notif.type === 'pending_receipt') {
                icon = <ArrowDownToLine size={18} color="#10B981" />;
                iconBg = '#ECFDF5';
              }

              return (
                <div
                  key={notif.id}
                  onClick={() => {
                    onMarkRead(notif.id);
                    if (notif.link.includes('product')) {
                      const id = notif.link.split('/').pop();
                      onNavigate('products', id);
                    } else if (notif.link.includes('deliveries')) {
                      onNavigate('deliveries');
                    } else if (notif.link.includes('receipts')) {
                      onNavigate('receipts');
                    }
                    onClose();
                  }}
                  style={{
                    padding: '12px 14px',
                    borderRadius: 10,
                    border: `1px solid ${notif.isRead ? '#F1F5F9' : '#DDD6FE'}`,
                    background: notif.isRead ? '#FFFFFF' : '#FAF5FF',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    position: 'relative',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.boxShadow = 'var(--shadow-sm)')}
                  onMouseLeave={(e) => (e.currentTarget.style.boxShadow = 'none')}
                >
                  <div style={{ display: 'flex', gap: 12 }}>
                    <div
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 8,
                        background: iconBg,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      {icon}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: 13,
                          fontWeight: notif.isRead ? 600 : 700,
                          color: '#0F172A',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                        }}
                      >
                        <span>{notif.title}</span>
                        {!notif.isRead && (
                          <span
                            style={{
                              width: 6,
                              height: 6,
                              borderRadius: '50%',
                              background: '#6D28D9',
                            }}
                          />
                        )}
                      </div>
                      <div style={{ fontSize: 12, color: '#475569', marginTop: 3, lineHeight: 1.4 }}>
                        {notif.message}
                      </div>
                      <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 6 }}>{notif.timestamp}</div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
