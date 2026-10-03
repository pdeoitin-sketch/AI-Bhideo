import React from 'react';
import { useApp } from '../context/AppContext';
import { X, Zap, Check, Sparkles, CreditCard, ShieldCheck } from 'lucide-react';

/**
 * Recharge & Subscription modal.
 *
 * The app has always had an `isUpgradeModalOpen` flag (Navbar "Recharge &
 * Subscriptions", profile "Recharge"/"Change Plan", and the insufficient-credits
 * path in AppContext all set it) but no component ever rendered it — pressing
 * any of those buttons did nothing at all. This is that missing piece.
 */
export const UpgradeModal = () => {
  const {
    isUpgradeModalOpen,
    setIsUpgradeModalOpen,
    user,
    upgradePlan,
    purchaseCredits,
    pricingPlans,
    showToast,
  } = useApp();

  if (!isUpgradeModalOpen) return null;

  const creditPacks = [
    { id: 'pack-500', amount: 500, price: 9, label: '+500 Credits', note: '≈ 100 Turbo renders' },
    { id: 'pack-2000', amount: 2000, price: 29, label: '+2,000 Credits', note: '≈ 400 Cinema renders', popular: true },
    { id: 'pack-6000', amount: 6000, price: 79, label: '+6,000 Credits', note: 'Best value per credit' },
  ];

  const usagePercent = user?.maxCredits
    ? Math.min(100, Math.round((user.credits / user.maxCredits) * 100))
    : 0;

  return (
    <div
      className="fixed inset-0 bg-dark-950/85 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fade-in"
      onClick={() => setIsUpgradeModalOpen(false)}
    >
      <div
        className="glass-panel rounded-3xl border border-white/10 w-full max-w-3xl max-h-[92vh] overflow-y-auto shadow-2xl animate-bounce-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 p-6 pb-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-amber-500/25 to-brand-500/25 border border-amber-500/30 text-amber-300 flex items-center justify-center">
              <Zap className="w-5 h-5 fill-amber-300/80" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white font-display">Recharge & Subscriptions</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Top up GPU compute credits or upgrade your studio plan.
              </p>
            </div>
          </div>
          <button
            onClick={() => setIsUpgradeModalOpen(false)}
            className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
            aria-label="Close recharge modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-7">
          {/* Current balance */}
          <div className="p-5 rounded-2xl bg-dark-900/70 border border-white/10">
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="font-semibold text-slate-200 flex items-center gap-1.5">
                <CreditCard className="w-3.5 h-3.5 text-brand-400" />
                Current balance
              </span>
              <span className="font-mono text-amber-300 font-bold">
                {user?.credits ?? 0} / {user?.maxCredits ?? 0} credits
              </span>
            </div>
            <div className="w-full h-2.5 rounded-full bg-dark-950 border border-white/10 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-amber-500 via-brand-500 to-brand-cyan transition-all duration-500"
                style={{ width: `${usagePercent}%` }}
              />
            </div>
            <p className="text-[11px] text-slate-500 mt-2">
              Plan: <span className="text-slate-300 font-semibold">{user?.tier || 'Free Explorer'}</span> · Credits never
              expire while your account is active.
            </p>
          </div>

          {/* One-time credit packs */}
          <div>
            <h4 className="text-xs font-bold text-white uppercase tracking-widest mb-3 flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              Instant Credit Packs
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {creditPacks.map((pack) => (
                <button
                  key={pack.id}
                  onClick={() => purchaseCredits(pack.amount)}
                  className={`p-4 rounded-2xl border text-left transition-all hover:scale-[1.02] ${
                    pack.popular
                      ? 'border-brand-500/60 bg-brand-500/10 shadow-lg shadow-brand-500/10'
                      : 'border-white/10 bg-dark-900/70 hover:border-white/25'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-bold text-white">{pack.label}</span>
                    {pack.popular && (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-brand-500 text-white">BEST</span>
                    )}
                  </div>
                  <p className="text-lg font-display font-extrabold text-amber-300">${pack.price}</p>
                  <p className="text-[10px] text-slate-400 mt-1 leading-snug">{pack.note}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Plan upgrades */}
          <div>
            <h4 className="text-xs font-bold text-white uppercase tracking-widest mb-3 flex items-center gap-2">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              Switch Studio Plan
            </h4>
            <div className="space-y-2.5">
              {(pricingPlans || []).map((plan) => {
                const isCurrent = (user?.tier || '').toLowerCase() === plan.name.toLowerCase();
                return (
                  <div
                    key={plan.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-dark-900/70 border border-white/10"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-white">{plan.name}</span>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/5 text-slate-300 border border-white/10">
                          {plan.badge}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1">
                        ${plan.priceMonthly}/mo · {plan.credits}
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        if (isCurrent) {
                          showToast('Current Plan', `You are already on ${plan.name}.`, 'info');
                          return;
                        }
                        upgradePlan(plan);
                      }}
                      className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                        isCurrent
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 cursor-default'
                          : 'bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-500 hover:to-brand-400 text-white shadow-md shadow-brand-500/25'
                      }`}
                    >
                      {isCurrent ? 'Current Plan' : `Upgrade · $${plan.priceMonthly}/mo`}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          <p className="text-[11px] text-slate-500 text-center flex items-center justify-center gap-1.5">
            <Check className="w-3.5 h-3.5 text-emerald-400" />
            Demo checkout — no payment method is charged.
          </p>
        </div>
      </div>
    </div>
  );
};
