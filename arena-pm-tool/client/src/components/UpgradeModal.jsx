import { useState } from 'react';
import { motion } from 'framer-motion';
import { X, Check, Sparkles } from 'lucide-react';
import useBillingStore from '../store/billingStore';
import { ButtonSpinner } from './Loader';

const plans = [
  {
    id: 'free',
    name: 'Free',
    price: '€0',
    period: '/month',
    description: 'For individuals getting started',
    features: [
      'Up to 50 tasks',
      '1 workspace',
      'Up to 3 members',
      'Board + List views',
    ],
    className: 'border-neutral-200',
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '€5',
    period: '/seat/month',
    description: 'For small teams who need more',
    icon: Sparkles,
    features: [
      'Unlimited tasks',
      'Unlimited workspaces',
      'Unlimited members',
      'Board + List + Calendar views',
      'Email reminders',
      'File attachments',
      'Priority support',
    ],
    cta: 'Upgrade to Pro',
    popular: true,
    className: 'border-primary-600 ring-2 ring-primary-100',
  },
];

function UpgradeModal({ isOpen, onClose, currentPlan = 'free' }) {
  const { startCheckout, openPortal } = useBillingStore();
  const [loadingPlan, setLoadingPlan] = useState(null);

  if (!isOpen) return null;

  const handleUpgrade = async (planId) => {
    if (planId === 'free' || planId === currentPlan) return;

    setLoadingPlan(planId);
    try {
      await startCheckout();
    } finally {
      setLoadingPlan(null);
    }
  };

  const handleManage = async () => {
    setLoadingPlan('manage');
    try {
      await openPortal();
    } finally {
      setLoadingPlan(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" role="dialog" aria-modal="true" aria-labelledby="upgrade-modal-title">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/20"
        onClick={onClose}
      />

      <div className="flex min-h-full items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.98 }}
          transition={{ duration: 0.2 }}
          className="relative bg-white rounded-xl shadow-md w-full max-w-3xl max-h-[90vh] overflow-y-auto">
          <div className="p-6 sm:p-8">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 id="upgrade-modal-title" className="text-2xl font-bold text-neutral-900">
                  Choose Your Plan
                </h2>
                <p className="text-neutral-500 mt-1">
                  Simple pricing. No hidden fees. Cancel anytime.
                </p>
              </div>
              <button
                onClick={onClose}
                className="p-2 text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 rounded-lg transition-all"
                aria-label="Close upgrade modal"
              >
                <X size={24} />
              </button>
            </div>

            {/* Plans Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
              {plans.map((plan) => {
                const isCurrent = plan.id === currentPlan;
                const Icon = plan.icon;
                const isLoading = loadingPlan === plan.id;

                return (
                  <div
                    key={plan.id}
                    className={`relative flex flex-col rounded-xl border-2 p-6 transition-all ${plan.className} ${
                      plan.popular ? '' : ''
                    }`}
                  >
                    {plan.popular && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                        <span className="bg-primary-600 text-white text-xs font-semibold px-3 py-1 rounded-full">
                          Most Popular
                        </span>
                      </div>
                    )}

                    <div className="mb-4">
                      <div className="flex items-center gap-2 mb-2">
                        {Icon && <Icon size={20} className="text-primary-600" />}
                        <h3 className="text-lg font-semibold text-neutral-900">{plan.name}</h3>
                      </div>
                      <p className="text-sm text-neutral-500">{plan.description}</p>
                    </div>

                    <div className="mb-6">
                      <span className="text-3xl font-bold text-neutral-900">{plan.price}</span>
                      <span className="text-neutral-500 text-sm">{plan.period}</span>
                    </div>

                    <ul className="space-y-3 mb-6 flex-1">
                      {plan.features.map((feature, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-sm">
                          <Check size={16} className="text-primary-600 flex-shrink-0 mt-0.5" />
                          <span className="text-neutral-700">{feature}</span>
                        </li>
                      ))}
                    </ul>

                    {isCurrent ? (
                      <button
                        className="w-full py-2.5 rounded-lg font-medium text-sm bg-neutral-100 text-neutral-400 cursor-not-allowed"
                        disabled
                      >
                        Current Plan
                      </button>
                    ) : plan.id === 'free' ? (
                      // For paid users viewing free plan
                      currentPlan !== 'free' ? (
                        <button
                          onClick={handleManage}
                          disabled={loadingPlan === 'manage'}
                          className="w-full py-2.5 rounded-lg font-medium text-sm bg-neutral-200 text-neutral-700 hover:bg-neutral-300 transition-all flex items-center justify-center"
                        >
                          {loadingPlan === 'manage' && <ButtonSpinner />}
                          Manage Subscription
                        </button>
                      ) : null
                    ) : (
                      <button
                        onClick={() => handleUpgrade(plan.id)}
                        disabled={isLoading}
                        className="w-full py-2.5 rounded-lg font-medium text-sm bg-primary-600 text-white hover:bg-primary-700 transition-all disabled:opacity-50 flex items-center justify-center"
                      >
                        {isLoading && <ButtonSpinner />}
                        {isLoading ? 'Redirecting...' : plan.cta}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Manage existing subscription */}
            {currentPlan !== 'free' && (
              <div className="mt-6 text-center">
                <button
                  onClick={handleManage}
                  disabled={loadingPlan === 'manage'}
                  className="text-sm text-neutral-500 hover:text-neutral-700 underline transition-all flex items-center justify-center mx-auto gap-1"
                >
                  {loadingPlan === 'manage' && <ButtonSpinner />}
                  Manage subscription & billing
                </button>
              </div>
            )}

            <p className="text-center text-xs text-neutral-400 mt-6">
              All plans include SSL encryption and daily backups. Cancel anytime.
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

export default UpgradeModal;
