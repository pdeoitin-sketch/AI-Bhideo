import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Check, Zap, Sparkles, ShieldCheck, HelpCircle } from 'lucide-react';

export const PricingSection = () => {
  const { pricingPlans, user, upgradePlan, showToast } = useApp();
  const [isAnnual, setIsAnnual] = useState(true);

  const handleSelectPlan = (plan) => {
    if (user.tier.toLowerCase().includes(plan.name.toLowerCase().split(' ')[0])) {
      showToast('Current Plan', `You are currently on the ${plan.name} tier.`, 'info');
      return;
    }
    upgradePlan(plan);
  };

  return (
    <section id="pricing-section" className="py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      
      {/* Header */}
      <div className="text-center max-w-3xl mx-auto mb-10">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-brand-500/10 border border-brand-500/30 text-brand-300 text-xs font-mono font-bold mb-4">
          <Zap className="w-3.5 h-3.5" />
          <span>DEMO PRICING & CREDITS</span>
        </div>
        <h2 className="text-3xl sm:text-5xl font-display font-extrabold text-white tracking-tight">
          Lower-cost <span className="gradient-text-neon">Render Plans</span>
        </h2>
        <p className="mt-4 text-slate-300 text-sm sm:text-base">
          Reduced monthly and annual demo prices. Plan changes update local credits only; no payment or hosted video compute is processed.
        </p>

        {/* Billing Switch */}
        <div className="mt-8 inline-flex items-center gap-3 p-1.5 rounded-2xl bg-dark-900 border border-white/10">
          <button
            onClick={() => setIsAnnual(false)}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
              !isAnnual ? 'bg-brand-500 text-white shadow-md shadow-brand-500/30' : 'text-slate-400 hover:text-white'
            }`}
          >
            Monthly Billing
          </button>
          <button
            onClick={() => setIsAnnual(true)}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
              isAnnual ? 'bg-brand-500 text-white shadow-md shadow-brand-500/30' : 'text-slate-400 hover:text-white'
            }`}
          >
            <span>Annual Billing</span>
            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-400/20 text-emerald-300 border border-emerald-400/30">
              SAVE 20%
            </span>
          </button>
        </div>
      </div>

      {/* Plan Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-stretch">
        {pricingPlans.map((plan) => {
          const price = isAnnual ? plan.priceAnnual : plan.priceMonthly;
          const isCurrent = user.tier.toLowerCase().includes(plan.name.toLowerCase().split(' ')[0]);

          return (
            <div
              key={plan.id}
              className={`glass-panel p-6 rounded-3xl border flex flex-col justify-between relative transition-all ${
                plan.popular
                  ? 'border-brand-500 shadow-2xl shadow-brand-500/20 bg-dark-850/90 ring-1 ring-brand-500/60'
                  : 'border-white/10 hover:border-white/20'
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-gradient-to-r from-brand-500 to-brand-cyan text-white text-[10px] font-extrabold uppercase tracking-widest shadow-md">
                  Most Popular
                </div>
              )}

              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-lg font-bold text-white">{plan.name}</h3>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/5 text-slate-300 border border-white/10">
                    {plan.badge}
                  </span>
                </div>

                <p className="text-xs text-slate-400 min-h-[32px]">{plan.description}</p>

                {/* Price Display */}
                <div className="mt-4 mb-4 pb-4 border-b border-white/10">
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-extrabold font-display text-white">${price}</span>
                    <span className="text-xs text-slate-400">/ month</span>
                  </div>
                  <p className="text-xs font-mono font-semibold text-brand-300 mt-1">{plan.credits}</p>
                </div>

                {/* Feature List */}
                <div className="space-y-2.5 text-xs">
                  {plan.features.map((feat, i) => (
                    <div key={i} className="flex items-start gap-2 text-slate-300">
                      <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      <span className="leading-snug">{feat}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Button */}
              <div className="mt-8 pt-4 border-t border-white/10">
                <button
                  onClick={() => handleSelectPlan(plan)}
                  className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold transition-all ${
                    isCurrent
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 cursor-default'
                      : plan.popular
                      ? 'bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-500 hover:to-brand-400 text-white shadow-lg shadow-brand-500/30'
                      : 'bg-white/10 hover:bg-white/15 text-white border border-white/10'
                  }`}
                >
                  {isCurrent ? 'Current Plan' : plan.buttonText}
                </button>
              </div>

            </div>
          );
        })}
      </div>

      {/* Trust & Guarantee Banner */}
      <div className="mt-14 glass-panel p-6 rounded-3xl border border-white/10 max-w-3xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-white">Demo Checkout Only</h4>
            <p className="text-xs text-slate-400">Plans and credit packs are illustrative. No payment is taken and no hosted AI model or GPU service is provisioned.</p>
          </div>
        </div>
        <button
          onClick={() => showToast('Enterprise Inquiries', 'Contacting enterprise team at enterprise@bhideo.ai', 'info')}
          className="px-4 py-2 rounded-xl bg-dark-900 border border-white/10 hover:border-brand-500 text-xs font-semibold text-slate-200 hover:text-white shrink-0"
        >
          Talk to Sales
        </button>
      </div>

    </section>
  );
};
