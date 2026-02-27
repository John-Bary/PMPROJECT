import { useState } from 'react';
import { Check, Sparkles, Loader2 } from 'lucide-react';
import useBillingStore from '../store/billingStore';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from 'components/ui/dialog';
import { Button } from 'components/ui/button';

const plans = [
  {
    id: 'free',
    name: 'Free',
    price: '\u20ac0',
    period: '/month',
    description: 'For individuals getting started',
    features: [
      'Up to 50 tasks',
      '1 workspace',
      'Up to 3 members',
      'Board + List views',
    ],
    className: 'border-border',
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '\u20ac3',
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
    className: 'border-primary ring-2 ring-accent',
  },
];

function UpgradeModal({ isOpen, onClose, currentPlan = 'free' }) {
  const { startCheckout, openPortal } = useBillingStore();
  const [loadingPlan, setLoadingPlan] = useState(null);

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
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">
            Choose Your Plan
          </DialogTitle>
          <DialogDescription>
            Simple pricing. No hidden fees. Cancel anytime.
          </DialogDescription>
        </DialogHeader>

        {/* Plans Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          {plans.map((plan) => {
            const isCurrent = plan.id === currentPlan;
            const Icon = plan.icon;
            const isLoading = loadingPlan === plan.id;

            return (
              <div
                key={plan.id}
                className={`relative flex flex-col rounded-xl border-2 p-6 transition-all ${plan.className}`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="bg-primary text-primary-foreground text-xs font-semibold px-3 py-1 rounded-full">
                      Most Popular
                    </span>
                  </div>
                )}

                <div className="mb-4">
                  <div className="flex items-center gap-2 mb-2">
                    {Icon && <Icon size={20} className="text-primary" />}
                    <h3 className="text-lg font-semibold text-foreground">{plan.name}</h3>
                  </div>
                  <p className="text-sm text-muted-foreground">{plan.description}</p>
                </div>

                <div className="mb-6">
                  <span className="text-3xl font-bold text-foreground">{plan.price}</span>
                  <span className="text-muted-foreground text-sm">{plan.period}</span>
                </div>

                <ul className="space-y-2.5 mb-6 flex-1">
                  {plan.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm">
                      <Check size={16} className="text-primary flex-shrink-0 mt-0.5" />
                      <span className="text-foreground">{feature}</span>
                    </li>
                  ))}
                </ul>

                {isCurrent ? (
                  <Button
                    variant="ghost"
                    className="w-full bg-accent text-muted-foreground cursor-not-allowed hover:bg-accent hover:text-muted-foreground"
                    disabled
                  >
                    Current Plan
                  </Button>
                ) : plan.id === 'free' ? (
                  // For paid users viewing free plan
                  currentPlan !== 'free' ? (
                    <Button
                      variant="secondary"
                      onClick={handleManage}
                      disabled={loadingPlan === 'manage'}
                      className="w-full transition-colors duration-150"
                    >
                      {loadingPlan === 'manage' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Manage Subscription
                    </Button>
                  ) : null
                ) : (
                  <Button
                    onClick={() => handleUpgrade(plan.id)}
                    disabled={isLoading}
                    className="w-full bg-primary text-primary-foreground hover:bg-primary/90 transition-colors duration-150 font-semibold shadow-sm"
                  >
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {isLoading ? 'Redirecting to checkout...' : plan.cta}
                  </Button>
                )}
              </div>
            );
          })}
        </div>

        {/* Manage existing subscription */}
        {currentPlan !== 'free' && (
          <div className="mt-6 text-center">
            <Button
              variant="link"
              onClick={handleManage}
              disabled={loadingPlan === 'manage'}
              className="text-sm text-muted-foreground hover:text-foreground underline"
            >
              {loadingPlan === 'manage' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Manage subscription & billing
            </Button>
          </div>
        )}

        <p className="text-center text-xs text-muted-foreground mt-6">
          All plans include SSL encryption and daily backups. Cancel anytime.
        </p>
      </DialogContent>
    </Dialog>
  );
}

export default UpgradeModal;
