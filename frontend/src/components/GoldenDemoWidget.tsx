import React, { useState } from 'react';
import { X, Sparkles, CheckCircle2, Play, RotateCcw, ScrollText } from 'lucide-react';
import confetti from 'canvas-confetti';
import { inventoryEngine } from '../services/inventoryEngine';
import { useToast } from './Toast';
import { RouteId } from './Sidebar';

interface GoldenDemoWidgetProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (route: RouteId) => void;
}

export const GoldenDemoWidget: React.FC<GoldenDemoWidgetProps> = ({ isOpen, onClose, onNavigate }) => {
  const { showToast } = useToast();
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [isRunning, setIsRunning] = useState(false);

  if (!isOpen) return null;

  const steps = [
    {
      num: 1,
      title: 'Inbound Receipt (+100 kg)',
      desc: 'Receive 100 kg Steel Rod from ABC Metals into Main Warehouse / Rack A.',
      expected: 'Steel Rod stock jumps from 0 kg to 100 kg.',
      badge: '+100 kg Receipt',
      badgeColor: '#10B981',
    },
    {
      num: 2,
      title: 'Internal Transfer (30 kg)',
      desc: 'Transfer 30 kg Steel Rod from Main Warehouse / Rack A to Production / Rack P1.',
      expected: 'Rack A = 70 kg, Production = 30 kg. Total stock = 100 kg (Unchanged).',
      badge: 'Relocation',
      badgeColor: '#6D28D9',
    },
    {
      num: 3,
      title: 'Customer Delivery (-20 kg)',
      desc: 'Dispatch 20 kg Steel Rod to Apex Manufacturing with stock verification.',
      expected: 'Rack A drops from 70 kg to 50 kg. Total stock = 80 kg.',
      badge: '-20 kg Outgoing',
      badgeColor: '#3B82F6',
    },
    {
      num: 4,
      title: 'Physical Count & Adjustment (-3 kg)',
      desc: 'Floor count reveals 77 kg total (Damaged stock). Reconcile with -3 kg adjustment.',
      expected: 'System stock adjusted to exactly 77 kg.',
      badge: '-3 kg Variance',
      badgeColor: '#EF4444',
    },
    {
      num: 5,
      title: 'Ledger Audit & Dashboard Verification',
      desc: 'Inspect the complete double-entry ledger with all 4 signed movements and live KPI reflect.',
      expected: 'Dashboard KPIs and Risk Center instantly update in real-time.',
      badge: 'Immutable Audit',
      badgeColor: '#0F172A',
    },
  ];

  const handleRunStep = (stepNum: 1 | 2 | 3 | 4 | 5) => {
    setIsRunning(true);
    const res = inventoryEngine.runGoldenDemoStep(stepNum);
    setIsRunning(false);

    if (res.success) {
      confetti({
        particleCount: stepNum === 4 || stepNum === 5 ? 80 : 40,
        spread: 60,
        origin: { y: 0.6 },
      });
      showToast('success', `Step ${stepNum} Completed!`, res.message);
      if (stepNum < 5) {
        setCurrentStep((stepNum + 1) as any);
      }
    } else {
      showToast('error', 'Execution Error', res.message);
    }
  };

  const handleRunFullDemo = async () => {
    setIsRunning(true);
    // Step 1
    inventoryEngine.runGoldenDemoStep(1);
    await new Promise((r) => setTimeout(r, 600));
    // Step 2
    inventoryEngine.runGoldenDemoStep(2);
    await new Promise((r) => setTimeout(r, 600));
    // Step 3
    inventoryEngine.runGoldenDemoStep(3);
    await new Promise((r) => setTimeout(r, 600));
    // Step 4
    inventoryEngine.runGoldenDemoStep(4);
    await new Promise((r) => setTimeout(r, 600));

    setIsRunning(false);
    setCurrentStep(5);

    confetti({
      particleCount: 120,
      spread: 80,
      origin: { y: 0.5 },
    });

    showToast(
      'success',
      'Golden Demo Completed!',
      'All 4 operations executed. Steel Rod balance: 77 kg. Inspect the Stock Ledger!'
    );
  };

  const steelRod = inventoryEngine.getProductById('prod-steel-rod');
  const rackAQuant = inventoryEngine.getQuants('prod-steel-rod', 'wh-main', 'loc-rack-a')[0]?.quantity || 0;
  const prodP1Quant = inventoryEngine.getQuants('prod-steel-rod', 'wh-prod', 'loc-prod-p1')[0]?.quantity || 0;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content"
        style={{ maxWidth: 720, maxHeight: '92vh', overflow: 'hidden' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '20px 24px',
            background: 'linear-gradient(135deg, #181226 0%, #2D1B4E 100%)',
            color: '#FFFFFF',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                background: 'rgba(255, 255, 255, 0.12)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Sparkles size={22} color="#DDD6FE" />
            </div>
            <div>
              <h2 style={{ fontSize: 18, color: '#FFFFFF' }}>Hackathon Golden Demo Scenario</h2>
              <div style={{ fontSize: 12.5, color: '#CBD5E1', marginTop: 2 }}>
                Step-by-step authoritative inventory workflow proof for judges
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer' }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Live Steel Rod Balance Status Box */}
        <div
          style={{
            background: '#F5F3FF',
            borderBottom: '1px solid #DDD6FE',
            padding: '12px 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 12.5, fontWeight: 700, color: '#5B21B6' }}>LIVE STATE: Steel Rod (STL-001)</span>
            <span className="badge badge-purple">{steelRod?.totalStock ?? 0} kg Total</span>
          </div>
          <div style={{ display: 'flex', gap: 16, fontSize: 12, color: '#4C1D95' }}>
            <span>Rack A: <strong>{rackAQuant} kg</strong></span>
            <span>Production P1: <strong>{prodP1Quant} kg</strong></span>
            <span>Status: <strong>{steelRod?.status}</strong></span>
          </div>
        </div>

        {/* Step Progression List */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {steps.map((s) => {
            const isCompleted = currentStep > s.num || (currentStep === 5 && s.num < 5);
            const isCurrent = currentStep === s.num;

            return (
              <div
                key={s.num}
                style={{
                  border: `1.5px solid ${isCurrent ? '#6D28D9' : isCompleted ? '#A7F3D0' : '#E2E8F0'}`,
                  borderRadius: 12,
                  padding: '14px 18px',
                  background: isCurrent ? '#FAF5FF' : isCompleted ? '#F0FDF4' : '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 16,
                  transition: 'all 0.2s ease',
                }}
              >
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    background: isCompleted ? '#10B981' : isCurrent ? '#6D28D9' : '#F1F5F9',
                    color: isCompleted || isCurrent ? '#FFFFFF' : '#64748B',
                    fontWeight: 700,
                    fontSize: 13,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  {isCompleted ? <CheckCircle2 size={18} /> : s.num}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ fontWeight: 700, fontSize: 14, color: '#0F172A' }}>{s.title}</div>
                    <span
                      style={{
                        fontSize: 11,
                        padding: '2px 8px',
                        borderRadius: 999,
                        background: `${s.badgeColor}15`,
                        color: s.badgeColor,
                        fontWeight: 600,
                      }}
                    >
                      {s.badge}
                    </span>
                  </div>
                  <div style={{ fontSize: 12.5, color: '#475569', marginTop: 3 }}>{s.desc}</div>
                  <div style={{ fontSize: 12, color: '#6D28D9', marginTop: 2, fontWeight: 500 }}>
                    Impact: {s.expected}
                  </div>
                </div>

                {s.num < 5 ? (
                  <button
                    onClick={() => handleRunStep(s.num as any)}
                    disabled={isRunning}
                    className="btn btn-sm btn-primary"
                    style={{ flexShrink: 0 }}
                  >
                    <Play size={13} />
                    Run Step {s.num}
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      onNavigate('ledger');
                      onClose();
                    }}
                    className="btn btn-sm btn-outline-purple"
                    style={{ flexShrink: 0 }}
                  >
                    <ScrollText size={13} />
                    Inspect Ledger
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer controls */}
        <div
          style={{
            padding: '16px 24px',
            background: '#FAFBFD',
            borderTop: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <button
            onClick={() => {
              inventoryEngine.resetToDefault();
              setCurrentStep(1);
              showToast('info', 'Database Reset', 'State restored to pristine initial conditions.');
            }}
            className="btn btn-outline"
            style={{ fontSize: 12.5 }}
          >
            <RotateCcw size={14} />
            Reset State
          </button>

          <div style={{ display: 'flex', gap: 10 }}>
            <button
              onClick={() => {
                onNavigate('dashboard');
                onClose();
              }}
              className="btn btn-outline"
            >
              View Dashboard
            </button>
            <button
              onClick={handleRunFullDemo}
              disabled={isRunning}
              className="btn btn-primary"
              style={{ background: 'linear-gradient(135deg, #7C3AED 0%, #4C1D95 100%)' }}
            >
              <Sparkles size={15} />
              Run 1-Click Golden Demo
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
