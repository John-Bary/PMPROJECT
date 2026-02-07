import { X, Check, Sparkles, Crown } from 'lucide-react';

const plans = [
  {
    id: 'free',
    name: 'Free',
    price: '$0',
    period: 'forever',
    description: 'For individuals getting started',
    features: [
      'Up to 50 tasks',
      '1 workspace',
      '3 categories',
      'Basic task management',
    ],
    cta: 'Current Plan',
    disabled: true,
    className: 'border-neutral-200',
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '$9',
    period: '/month',
    description: 'For professionals and small teams',
    icon: Sparkles,
    features: [
      'Unlimited tasks',
      'Up to 5 workspaces',
      'Unlimited categories',
      'Priority support',
      'Calendar view',
      'Advanced filters',
      'Email reminders',
    ],
    cta: 'Upgrade to Pro',
    popular: true,
    className: 'border-teal-300 ring-2 ring-teal-100',
  },
  {
    id: 'business',
    name: 'Business',
    price: '$24',
    period: '/month',
    description: 'For larger teams and organizations',
    icon: Crown,
    features: [
      'Everything in Pro',
      'Unlimited workspaces',
      'Team collaboration',
      'Admin controls',
      'Audit log',
      'Custom integrations',
      'Dedicated support',
    ],
    cta: 'Upgrade to Business',
    className: 'border-purple-200',
  },
];

function UpgradeModal({ isOpen, onClose, currentPlan = 'free' }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" role="dialog" aria-modal="true" aria-labelledby="upgrade-modal-title">
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto animate-scale-in">
          <div className="p-6 sm:p-8">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 id="upgrade-modal-title" className="text-2xl font-bold text-neutral-900">
                  Choose Your Plan
                </h2>
                <p className="text-neutral-500 mt-1">
                  Upgrade to unlock more features for your team
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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
              {plans.map((plan) => {
                const isCurrent = plan.id === currentPlan;
                const Icon = plan.icon;

                return (
                  <div
                    key={plan.id}
                    className={`relative flex flex-col rounded-xl border-2 p-6 transition-all ${plan.className} ${
                      plan.popular ? 'shadow-lg' : ''
                    }`}
                  >
                    {plan.popular && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                        <span className="bg-teal-500 text-white text-xs font-semibold px-3 py-1 rounded-full">
                          Most Popular
                        </span>
                      </div>
                    )}

                    <div className="mb-4">
                      <div className="flex items-center gap-2 mb-2">
                        {Icon && <Icon size={20} className={plan.id === 'pro' ? 'text-teal-500' : 'text-purple-500'} />}
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
                          <Check size={16} className="text-teal-500 flex-shrink-0 mt-0.5" />
                          <span className="text-neutral-700">{feature}</span>
                        </li>
                      ))}
                    </ul>

                    <button
                      className={`w-full py-2.5 rounded-lg font-medium text-sm transition-all ${
                        isCurrent
                          ? 'bg-neutral-100 text-neutral-400 cursor-not-allowed'
                          : plan.popular
                            ? 'bg-teal-500 text-white hover:bg-teal-600 shadow-sm'
                            : 'bg-neutral-900 text-white hover:bg-neutral-800'
                      }`}
                      disabled={isCurrent || plan.disabled}
                    >
                      {isCurrent ? 'Current Plan' : plan.cta}
                    </button>
                  </div>
                );
              })}
            </div>

            <p className="text-center text-xs text-neutral-400 mt-6">
              All plans include SSL encryption and daily backups. Cancel anytime.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default UpgradeModal;
