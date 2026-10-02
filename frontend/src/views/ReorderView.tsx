import React from 'react';
import { Plus } from 'lucide-react';
import { inventoryEngine } from '../services/inventoryEngine';
import { RouteId } from '../components/Sidebar';
import { useToast } from '../components/Toast';

interface ReorderViewProps {
  onNavigate: (route: RouteId, targetId?: string) => void;
  onOpenReceiptForProduct?: (productId: string) => void;
}

export const ReorderView: React.FC<ReorderViewProps> = ({ onNavigate, onOpenReceiptForProduct: _onOpenReceiptForProduct }) => {
  const { showToast } = useToast();
  const products = inventoryEngine.getProducts();
  const rules = inventoryEngine.getReorderRules();

  const recommendations = products
    .filter((p) => p.totalStock <= p.reorderLevel)
    .map((p) => {
      const rule = rules.find((r) => r.productId === p.id);
      const target = rule ? rule.targetQuantity : p.targetLevel;
      const recommendedQty = Math.max(0, target - p.totalStock);
      return {
        product: p,
        currentStock: p.totalStock,
        minStock: p.reorderLevel,
        targetStock: target,
        recommendedQty,
      };
    });

  const handle1ClickDraftReceipt = (productId: string, qty: number) => {
    const prod = products.find((p) => p.id === productId);
    if (!prod) return;

    const res = inventoryEngine.createReceipt({
      supplier: 'Default Preferred Supplier',
      warehouseId: 'wh-main',
      locationId: 'loc-rack-a',
      items: [{ productId: prod.id, orderedQty: qty }],
      notes: `Generated from Reorder Recommendation (${qty} ${prod.uom})`,
    });

    if (res.success && res.receipt) {
      showToast(
        'success',
        'Replenishment Draft Created',
        `Draft receipt ${res.receipt.reference} created for ${qty} ${prod.uom} ${prod.name}.`
      );
      onNavigate('receipts');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 26, color: '#0F172A' }}>Reorder Recommendations</h1>
          <p style={{ color: '#64748B', fontSize: 14, marginTop: 4 }}>
            Automated suggested replenishment orders calculated from stock levels and minimum safety rules.
          </p>
        </div>
      </div>

      {/* Recommendations Table */}
      <div className="table-container">
        <table className="enterprise-table">
          <thead>
            <tr>
              <th>Product</th>
              <th>SKU</th>
              <th>Current Stock</th>
              <th>Minimum Threshold</th>
              <th>Target Level</th>
              <th>Recommended Order Qty</th>
              <th>Status</th>
              <th style={{ textAlign: 'right' }}>1-Click Action</th>
            </tr>
          </thead>
          <tbody>
            {recommendations.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: '48px 20px', color: '#10B981' }}>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>No reorder orders needed.</div>
                  <div style={{ fontSize: 12.5, color: '#64748B', marginTop: 4 }}>
                    All products are comfortably above minimum stock replenishment levels.
                  </div>
                </td>
              </tr>
            ) : (
              recommendations.map(({ product, currentStock, minStock, targetStock, recommendedQty }) => (
                <tr key={product.id}>
                  <td>
                    <div
                      style={{ fontWeight: 600, color: '#0F172A', cursor: 'pointer' }}
                      onClick={() => onNavigate('products', product.id)}
                    >
                      {product.name}
                    </div>
                    <div style={{ fontSize: 11.5, color: '#64748B' }}>{product.categoryName}</div>
                  </td>
                  <td style={{ fontWeight: 600, color: '#6D28D9' }}>{product.sku}</td>
                  <td style={{ fontWeight: 800, color: currentStock === 0 ? '#EF4444' : '#F59E0B' }}>
                    {currentStock} {product.uom}
                  </td>
                  <td style={{ color: '#475569' }}>{minStock} {product.uom}</td>
                  <td style={{ color: '#64748B' }}>{targetStock} {product.uom}</td>
                  <td style={{ fontWeight: 800, color: '#10B981', fontSize: 14 }}>
                    +{recommendedQty} {product.uom}
                  </td>
                  <td>
                    <span
                      className={`badge ${
                        product.status === 'Out of Stock' ? 'badge-danger' : 'badge-warning'
                      }`}
                    >
                      <span className="badge-dot" />
                      {product.status}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <button
                      onClick={() => handle1ClickDraftReceipt(product.id, recommendedQty)}
                      className="btn btn-sm btn-primary"
                      style={{ background: '#6D28D9' }}
                    >
                      <Plus size={13} />
                      Generate Receipt Draft
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
