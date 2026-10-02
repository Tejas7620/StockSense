import React, { useState } from 'react';
import { X, Bot, Send } from 'lucide-react';
import { inventoryEngine } from '../services/inventoryEngine';
import { RouteId } from './Sidebar';

interface StockSenseAiDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (route: RouteId, targetId?: string) => void;
}

interface Message {
  sender: 'user' | 'assistant';
  text: string;
  actionRoute?: RouteId;
  actionLabel?: string;
  dataPoints?: Array<{ label: string; value: string }>;
}

export const StockSenseAiDrawer: React.FC<StockSenseAiDrawerProps> = ({ isOpen, onClose, onNavigate }) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      sender: 'assistant',
      text: "Hello Tejas! I'm your StockSense AI Inventory Assistant. I inspect your actual real-time warehouse data, ledger movements, and stock levels to answer your questions accurately.",
    },
  ]);
  const [input, setInput] = useState('');

  if (!isOpen) return null;

  const quickQuestions = [
    'Why is Steel Rod showing low stock?',
    'Which products need replenishment?',
    'Where is product STL-001 located?',
    'Summarize current warehouse risk',
  ];

  const handleSend = (queryText: string) => {
    if (!queryText.trim()) return;

    const userMsg: Message = { sender: 'user', text: queryText };
    const q = queryText.toLowerCase();

    // Query Real Data Authoritatively
    let botReply: Message = {
      sender: 'assistant',
      text: '',
    };

    const state = inventoryEngine.getState();
    const steelRod = state.products.find((p) => p.sku === 'STL-001');

    if (q.includes('steel rod') && (q.includes('why') || q.includes('low') || q.includes('stock'))) {
      const recentRodMovements = state.ledger.filter((m) => m.productId === steelRod?.id);
      const quants = state.quants.filter((q) => q.productId === steelRod?.id);

      botReply = {
        sender: 'assistant',
        text: `Steel Rod (STL-001) is currently at **${steelRod?.totalStock ?? 0} kg**, which is below its configured reorder safety threshold of **${steelRod?.reorderLevel} kg** (Target: ${steelRod?.targetLevel} kg).`,
        dataPoints: [
          { label: 'Current On-Hand', value: `${steelRod?.totalStock ?? 0} kg` },
          { label: 'Reorder Point', value: `${steelRod?.reorderLevel} kg` },
          { label: 'Main Wh (Rack A)', value: `${quants.find((q) => q.locationId === 'loc-rack-a')?.quantity || 0} kg` },
          { label: 'Production (P1)', value: `${quants.find((q) => q.locationId === 'loc-prod-p1')?.quantity || 0} kg` },
          { label: 'Recent Movements', value: `${recentRodMovements.length} audit entries` },
        ],
        actionRoute: 'reorder',
        actionLabel: 'Create Replenishment Order →',
      };
    } else if (q.includes('replenish') || q.includes('reorder') || q.includes('low') || q.includes('out of stock')) {
      const atRiskProducts = state.products.filter(
        (p) => p.totalStock <= p.reorderLevel || p.status === 'Out of Stock'
      );

      botReply = {
        sender: 'assistant',
        text: `Based on your live stock rules, **${atRiskProducts.length} products** currently require replenishment:`,
        dataPoints: atRiskProducts.map((p) => ({
          label: `${p.name} (${p.sku})`,
          value: `${p.totalStock} / ${p.reorderLevel} ${p.uom} [${p.status}]`,
        })),
        actionRoute: 'risk',
        actionLabel: 'Go to Risk Center →',
      };
    } else if (q.includes('where') || q.includes('stl-001') || q.includes('location')) {
      const quants = state.quants.filter((q) => q.productId === steelRod?.id && q.quantity > 0);
      botReply = {
        sender: 'assistant',
        text: `Steel Rod (STL-001) is currently stored in **${quants.length} warehouse locations**:`,
        dataPoints: quants.map((q) => {
          const loc = state.locations.find((l) => l.id === q.locationId);
          return {
            label: `${loc?.warehouseName || 'Warehouse'} / ${loc?.name || 'Rack'}`,
            value: `${q.quantity} kg (Reserved: ${q.reservedQuantity} kg)`,
          };
        }),
        actionRoute: 'stock-location',
        actionLabel: 'View Stock By Location →',
      };
    } else if (q.includes('risk') || q.includes('health') || q.includes('summarize')) {
      const stats = inventoryEngine.getDashboardStats();
      botReply = {
        sender: 'assistant',
        text: `Warehouse Risk Summary: You have **${stats.outOfStockCount} Out-of-Stock items** and **${stats.lowStockCount} Low-Stock items** requiring immediate attention. Total active units in system: **${stats.totalStockUnits.toLocaleString()} units**.`,
        dataPoints: [
          { label: 'Out of Stock', value: `${stats.outOfStockCount} items` },
          { label: 'Low Stock', value: `${stats.lowStockCount} items` },
          { label: 'Pending Inbound', value: `${stats.pendingReceiptsCount} receipts` },
          { label: 'Pending Outbound', value: `${stats.pendingDeliveriesCount} deliveries` },
        ],
        actionRoute: 'risk',
        actionLabel: 'Open Inventory Risk Center →',
      };
    } else {
      const stats = inventoryEngine.getDashboardStats();
      botReply = {
        sender: 'assistant',
        text: `I analyzed your inventory state: There are currently ${state.products.length} products tracked, ${stats.totalStockUnits.toLocaleString()} units in stock across 3 warehouses, and ${state.ledger.length} verified ledger operations. How else can I assist with your supply chain?`,
      };
    }

    setMessages((prev) => [...prev, userMsg, botReply]);
    setInput('');
  };

  return (
    <div className="modal-overlay" onClick={onClose} style={{ justifyContent: 'flex-end', padding: 0 }}>
      <div
        style={{
          width: 440,
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
            padding: '20px 22px',
            background: 'linear-gradient(135deg, #181226 0%, #2D1B4E 100%)',
            color: '#FFFFFF',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 9,
                background: 'rgba(255, 255, 255, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Bot size={20} color="#DDD6FE" />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 16 }}>Ask StockSense AI</div>
              <div style={{ fontSize: 11.5, color: '#CBD5E1' }}>Real-time verified inventory insights</div>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: '#CBD5E1', cursor: 'pointer' }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Chat History */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '20px 18px',
            display: 'flex',
            flexDirection: 'column',
            gap: 16,
            background: '#F8FAFC',
          }}
        >
          {messages.map((m, idx) => (
            <div
              key={idx}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: m.sender === 'user' ? 'flex-end' : 'flex-start',
              }}
            >
              <div
                style={{
                  maxWidth: '88%',
                  padding: '12px 16px',
                  borderRadius: 14,
                  fontSize: 13.5,
                  lineHeight: 1.45,
                  background: m.sender === 'user' ? '#6D28D9' : '#FFFFFF',
                  color: m.sender === 'user' ? '#FFFFFF' : '#1E293B',
                  border: m.sender === 'user' ? 'none' : '1px solid #E2E8F0',
                  boxShadow: m.sender === 'user' ? '0 2px 4px rgba(109, 40, 217, 0.2)' : 'var(--shadow-xs)',
                }}
              >
                {m.text}

                {/* Data Points Pill List */}
                {m.dataPoints && (
                  <div
                    style={{
                      marginTop: 10,
                      paddingTop: 8,
                      borderTop: '1px solid #F1F5F9',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 4,
                    }}
                  >
                    {m.dataPoints.map((dp, i) => (
                      <div
                        key={i}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          fontSize: 12,
                          background: '#F8FAFC',
                          padding: '4px 8px',
                          borderRadius: 6,
                        }}
                      >
                        <span style={{ color: '#64748B' }}>{dp.label}:</span>
                        <strong style={{ color: '#0F172A' }}>{dp.value}</strong>
                      </div>
                    ))}
                  </div>
                )}

                {/* Action Route Button */}
                {m.actionRoute && m.actionLabel && (
                  <button
                    onClick={() => {
                      onNavigate(m.actionRoute!);
                      onClose();
                    }}
                    style={{
                      marginTop: 10,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      background: '#F5F3FF',
                      border: '1px solid #DDD6FE',
                      borderRadius: 6,
                      padding: '5px 10px',
                      color: '#6D28D9',
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    {m.actionLabel}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Suggested Quick Questions */}
        <div style={{ padding: '10px 16px', background: '#FFFFFF', borderTop: '1px solid var(--border)' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', marginBottom: 6 }}>
            Quick Inquiries
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {quickQuestions.map((q, idx) => (
              <button
                key={idx}
                onClick={() => handleSend(q)}
                style={{
                  fontSize: 11.5,
                  padding: '4px 10px',
                  borderRadius: 999,
                  background: '#F1F5F9',
                  border: '1px solid #E2E8F0',
                  color: '#475569',
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#EDE9FE';
                  e.currentTarget.style.color = '#6D28D9';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '#F1F5F9';
                  e.currentTarget.style.color = '#475569';
                }}
              >
                {q}
              </button>
            ))}
          </div>
        </div>

        {/* Input Bar */}
        <div
          style={{
            padding: '12px 16px',
            background: '#FFFFFF',
            borderTop: '1px solid var(--border)',
            display: 'flex',
            gap: 8,
          }}
        >
          <input
            type="text"
            placeholder="Ask StockSense AI about stock, movements, rules..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend(input)}
            style={{
              flex: 1,
              padding: '9px 12px',
              fontSize: 13,
              border: '1px solid var(--border)',
              borderRadius: 8,
              outline: 'none',
            }}
          />
          <button
            onClick={() => handleSend(input)}
            style={{
              padding: '0 14px',
              background: '#6D28D9',
              color: '#FFFFFF',
              border: 'none',
              borderRadius: 8,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Send size={15} />
          </button>
        </div>
      </div>
    </div>
  );
};
