import React, { useState, useEffect } from 'react';
import { Search, X, Package, ArrowDownToLine, Truck, ArrowLeftRight, ArrowRight } from 'lucide-react';
import { inventoryEngine } from '../services/inventoryEngine';
import { RouteId } from './Sidebar';

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (route: RouteId, targetId?: string) => void;
}

export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({ isOpen, onClose, onNavigate }) => {
  const [query, setQuery] = useState('');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
        else {
          // Open handled by parent or state
        }
      }
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const state = inventoryEngine.getState();
  const q = query.trim().toLowerCase();

  const matchingProducts = state.products.filter(
    (p) => !q || p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q)
  );

  const matchingReceipts = state.receipts.filter(
    (r) => !q || r.reference.toLowerCase().includes(q) || r.supplier.toLowerCase().includes(q)
  );

  const matchingDeliveries = state.deliveries.filter(
    (d) => !q || d.reference.toLowerCase().includes(q) || d.customer.toLowerCase().includes(q)
  );

  const matchingTransfers = state.transfers.filter(
    (t) => !q || t.reference.toLowerCase().includes(q) || t.destLocationName.toLowerCase().includes(q)
  );

  const matchingLedger = state.ledger.filter(
    (l) => !q || l.reference.toLowerCase().includes(q) || l.productName.toLowerCase().includes(q)
  );

  const totalResults =
    matchingProducts.length +
    matchingReceipts.length +
    matchingDeliveries.length +
    matchingTransfers.length +
    matchingLedger.length;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content"
        style={{ maxWidth: 640 }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: '16px 20px',
            borderBottom: '1px solid var(--border)',
          }}
        >
          <Search size={20} color="#6D28D9" />
          <input
            autoFocus
            type="text"
            placeholder="Type to search products, SKU, receipts, transfers, ledger..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{
              flex: 1,
              border: 'none',
              outline: 'none',
              fontSize: 15,
              color: '#0F172A',
            }}
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer' }}
            >
              <X size={18} />
            </button>
          )}
          <kbd
            style={{
              background: '#F1F5F9',
              border: '1px solid #CBD5E1',
              borderRadius: 4,
              padding: '2px 6px',
              fontSize: 11,
              color: '#64748B',
            }}
          >
            ESC
          </kbd>
        </div>

        {/* Results Body */}
        <div style={{ maxHeight: 420, overflowY: 'auto', padding: '12px 16px' }}>
          {totalResults === 0 ? (
            <div style={{ textAlign: 'center', padding: '36px 20px', color: '#64748B' }}>
              <Package size={36} color="#CBD5E1" style={{ margin: '0 auto 10px' }} />
              <div style={{ fontWeight: 600, fontSize: 14 }}>No matches found for "{query}"</div>
              <div style={{ fontSize: 12.5, color: '#94A3B8', marginTop: 4 }}>
                Try searching for "Steel", "STL-001", "RC-0042", or "Transfer"
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Products Category */}
              {matchingProducts.length > 0 && (
                <div>
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: '#94A3B8',
                      letterSpacing: '0.06em',
                      textTransform: 'uppercase',
                      marginBottom: 6,
                    }}
                  >
                    Products & SKU
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {matchingProducts.slice(0, 4).map((p) => (
                      <div
                        key={p.id}
                        onClick={() => {
                          onNavigate('products', p.id);
                          onClose();
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '8px 12px',
                          borderRadius: 8,
                          cursor: 'pointer',
                          transition: 'background 0.15s ease',
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = '#F8FAFC')}
                        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div
                            style={{
                              width: 32,
                              height: 32,
                              borderRadius: 6,
                              background: '#F5F3FF',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            <Package size={16} color="#6D28D9" />
                          </div>
                          <div>
                            <div style={{ fontWeight: 600, fontSize: 13.5, color: '#0F172A' }}>{p.name}</div>
                            <div style={{ fontSize: 11.5, color: '#64748B' }}>
                              SKU: {p.sku} • {p.categoryName}
                            </div>
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span
                            className={`badge ${
                              p.status === 'In Stock'
                                ? 'badge-success'
                                : p.status === 'Out of Stock'
                                ? 'badge-danger'
                                : 'badge-warning'
                            }`}
                          >
                            {p.totalStock} {p.uom}
                          </span>
                          <ArrowRight size={14} color="#94A3B8" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Receipts Category */}
              {matchingReceipts.length > 0 && (
                <div>
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: '#94A3B8',
                      letterSpacing: '0.06em',
                      textTransform: 'uppercase',
                      marginBottom: 6,
                    }}
                  >
                    Receipts
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {matchingReceipts.slice(0, 3).map((r) => (
                      <div
                        key={r.id}
                        onClick={() => {
                          onNavigate('receipts', r.id);
                          onClose();
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '8px 12px',
                          borderRadius: 8,
                          cursor: 'pointer',
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = '#F8FAFC')}
                        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div
                            style={{
                              width: 32,
                              height: 32,
                              borderRadius: 6,
                              background: '#ECFDF5',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            <ArrowDownToLine size={16} color="#10B981" />
                          </div>
                          <div>
                            <div style={{ fontWeight: 600, fontSize: 13.5, color: '#0F172A' }}>{r.reference}</div>
                            <div style={{ fontSize: 11.5, color: '#64748B' }}>
                              Supplier: {r.supplier} • {r.items[0]?.productName}
                            </div>
                          </div>
                        </div>
                        <span className={`badge ${r.status === 'Done' ? 'badge-success' : 'badge-warning'}`}>
                          {r.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Deliveries & Transfers */}
              {matchingDeliveries.length > 0 && (
                <div>
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: '#94A3B8',
                      letterSpacing: '0.06em',
                      textTransform: 'uppercase',
                      marginBottom: 6,
                    }}
                  >
                    Deliveries
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {matchingDeliveries.slice(0, 3).map((d) => (
                      <div
                        key={d.id}
                        onClick={() => {
                          onNavigate('deliveries', d.id);
                          onClose();
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '8px 12px',
                          borderRadius: 8,
                          cursor: 'pointer',
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = '#F8FAFC')}
                        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div
                            style={{
                              width: 32,
                              height: 32,
                              borderRadius: 6,
                              background: '#EFF6FF',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            <Truck size={16} color="#3B82F6" />
                          </div>
                          <div>
                            <div style={{ fontWeight: 600, fontSize: 13.5, color: '#0F172A' }}>{d.reference}</div>
                            <div style={{ fontSize: 11.5, color: '#64748B' }}>Customer: {d.customer}</div>
                          </div>
                        </div>
                        <span className={`badge ${d.status === 'Done' ? 'badge-success' : 'badge-info'}`}>
                          {d.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Transfers */}
              {matchingTransfers.length > 0 && (
                <div>
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      color: '#94A3B8',
                      letterSpacing: '0.06em',
                      textTransform: 'uppercase',
                      marginBottom: 6,
                    }}
                  >
                    Transfers
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {matchingTransfers.slice(0, 2).map((t) => (
                      <div
                        key={t.id}
                        onClick={() => {
                          onNavigate('transfers', t.id);
                          onClose();
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '8px 12px',
                          borderRadius: 8,
                          cursor: 'pointer',
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = '#F8FAFC')}
                        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div
                            style={{
                              width: 32,
                              height: 32,
                              borderRadius: 6,
                              background: '#F5F3FF',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            <ArrowLeftRight size={16} color="#6D28D9" />
                          </div>
                          <div>
                            <div style={{ fontWeight: 600, fontSize: 13.5, color: '#0F172A' }}>{t.reference}</div>
                            <div style={{ fontSize: 11.5, color: '#64748B' }}>To: {t.destLocationName}</div>
                          </div>
                        </div>
                        <span className="badge badge-purple">{t.status}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer info */}
        <div
          style={{
            padding: '10px 16px',
            background: '#F8FAFC',
            borderTop: '1px solid var(--border)',
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: 12,
            color: '#64748B',
          }}
        >
          <span>Use arrow keys or click to navigate</span>
          <span>StockSense Global Search</span>
        </div>
      </div>
    </div>
  );
};
