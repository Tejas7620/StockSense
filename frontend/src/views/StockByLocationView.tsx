import React, { useState, useEffect } from 'react';
import {
  Building,
  MapPin,
  ArrowLeftRight,
  Sliders,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { inventoryEngine } from '../services/inventoryEngine';
import { RouteId } from '../components/Sidebar';

interface StockByLocationViewProps {
  onNavigate: (route: RouteId, targetId?: string) => void;
  onOpenTransferForProduct: (productId: string) => void;
  onOpenAdjustmentForProduct: (productId: string) => void;
  selectedWarehouse?: string;
}

export const StockByLocationView: React.FC<StockByLocationViewProps> = ({
  onNavigate,
  onOpenTransferForProduct,
  onOpenAdjustmentForProduct,
  selectedWarehouse,
}) => {
  const warehouses = inventoryEngine.getWarehouses();
  const locations = inventoryEngine.getLocations();
  const quants = inventoryEngine.getQuants();
  const products = inventoryEngine.getProducts();

  const getInitialWh = () => {
    if (selectedWarehouse && selectedWarehouse !== 'all') {
      return selectedWarehouse;
    }
    return warehouses[0]?.id || '';
  };

  const [expandedWarehouse, setExpandedWarehouse] = useState<string>(getInitialWh());

  useEffect(() => {
    if (selectedWarehouse && selectedWarehouse !== 'all') {
      setExpandedWarehouse(selectedWarehouse);
    }
  }, [selectedWarehouse]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Header */}
      <div>
        <h1 style={{ fontSize: 26, color: '#0F172A' }}>Stock by Location Hierarchy</h1>
        <p style={{ color: '#64748B', fontSize: 14, marginTop: 4 }}>
          Physical warehouse layout, storage racks, and bin inventory allocations.
        </p>
      </div>

      {/* Warehouses Accordion Grid */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {warehouses.map((wh) => {
          const whLocations = locations.filter((l) => l.warehouseId === wh.id);
          const isExpanded = expandedWarehouse === wh.id;
          const whQuants = quants.filter((q) => q.warehouseId === wh.id);
          const totalUnitsInWh = whQuants.reduce((s, q) => s + q.quantity, 0);

          return (
            <div key={wh.id} className="card" style={{ overflow: 'hidden' }}>
              {/* Warehouse Header Bar */}
              <div
                onClick={() => setExpandedWarehouse(isExpanded ? '' : wh.id)}
                style={{
                  padding: '18px 24px',
                  background: isExpanded ? '#FAF5FF' : '#FFFFFF',
                  borderBottom: isExpanded ? '1px solid #DDD6FE' : 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  cursor: 'pointer',
                  userSelect: 'none',
                  transition: 'background 0.15s ease',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 10,
                      background: isExpanded ? '#6D28D9' : '#F1F5F9',
                      color: isExpanded ? '#FFFFFF' : '#64748B',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Building size={20} />
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <h3 style={{ fontSize: 17, color: '#0F172A' }}>{wh.name}</h3>
                      <span className="badge badge-purple" style={{ fontSize: 11 }}>{wh.code}</span>
                    </div>
                    <div style={{ fontSize: 12.5, color: '#64748B', marginTop: 2 }}>{wh.address}</div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 15, fontWeight: 800, color: '#0F172A' }}>
                      {totalUnitsInWh.toLocaleString()} units
                    </div>
                    <div style={{ fontSize: 11.5, color: '#64748B' }}>{whLocations.length} active racks/zones</div>
                  </div>
                  {isExpanded ? <ChevronDown size={20} color="#6D28D9" /> : <ChevronRight size={20} color="#94A3B8" />}
                </div>
              </div>

              {/* Racks & Quants Content */}
              {isExpanded && (
                <div style={{ padding: '20px 24px', background: '#FFFFFF' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
                    {whLocations.map((loc) => {
                      const locQuants = quants.filter((q) => q.locationId === loc.id);
                      const totalInRack = locQuants.reduce((s, q) => s + q.quantity, 0);

                      return (
                        <div
                          key={loc.id}
                          style={{
                            border: '1px solid #E2E8F0',
                            borderRadius: 12,
                            padding: '16px',
                            background: '#F8FAFC',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 12,
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <MapPin size={16} color="#6D28D9" />
                              <strong style={{ fontSize: 14, color: '#0F172A' }}>{loc.name}</strong>
                              <span style={{ fontSize: 11, color: '#64748B' }}>({loc.code})</span>
                            </div>
                            <span className="badge badge-neutral" style={{ fontSize: 11.5, fontWeight: 700 }}>
                              {totalInRack.toLocaleString()} units
                            </span>
                          </div>

                          {/* Items stored in this rack */}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            {locQuants.length === 0 ? (
                              <div style={{ fontSize: 12, color: '#94A3B8', fontStyle: 'italic', padding: '6px 0' }}>
                                Rack currently empty
                              </div>
                            ) : (
                              locQuants.map((q) => {
                                const prod = products.find((p) => p.id === q.productId);
                                if (!prod) return null;

                                return (
                                  <div
                                    key={q.id}
                                    style={{
                                      background: '#FFFFFF',
                                      padding: '8px 12px',
                                      borderRadius: 8,
                                      border: '1px solid #E2E8F0',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'space-between',
                                    }}
                                  >
                                    <div>
                                      <div
                                        style={{ fontWeight: 600, fontSize: 13, color: '#0F172A', cursor: 'pointer' }}
                                        onClick={() => onNavigate('products', prod.id)}
                                      >
                                        {prod.name}
                                      </div>
                                      <div style={{ fontSize: 11, color: '#64748B' }}>SKU: {prod.sku}</div>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                      <strong style={{ fontSize: 13, color: '#6D28D9' }}>
                                        {q.quantity} {prod.uom}
                                      </strong>
                                      <button
                                        onClick={() => onOpenTransferForProduct(prod.id)}
                                        className="btn btn-sm btn-outline"
                                        title="Transfer this item"
                                        style={{ padding: '3px 7px' }}
                                      >
                                        <ArrowLeftRight size={12} />
                                      </button>
                                      <button
                                        onClick={() => onOpenAdjustmentForProduct(prod.id)}
                                        className="btn btn-sm btn-outline"
                                        title="Count / Adjust"
                                        style={{ padding: '3px 7px' }}
                                      >
                                        <Sliders size={12} />
                                      </button>
                                    </div>
                                  </div>
                                );
                              })
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
