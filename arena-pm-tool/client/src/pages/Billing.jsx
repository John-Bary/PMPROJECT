import { useState, useEffect, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  CreditCard,
  ArrowLeft,
  CheckCircle,
  AlertCircle,
  BarChart3,
  Users,
  FolderOpen,
  ClipboardList,
  ExternalLink,
  Loader2,
} from 'lucide-react';
import useWorkspaceStore from '../store/workspaceStore';
import useTaskStore from '../store/taskStore';
import useCategoryStore from '../store/categoryStore';
import useBillingStore from '../store/billingStore';
import PlanBadge from '../components/PlanBadge';
import UpgradeModal from '../components/UpgradeModal';
import { toast } from 'sonner';
import { Button } from 'components/ui/button';
import { Card, CardContent } from 'components/ui/card';
import { Badge } from 'components/ui/badge';

function UsageBar({ label, icon: Icon, current, limit, color = 'neutral' }) {
  const isUnlimited = !limit || limit === Infinity;
  const percentage = isUnlimited ? 0 : Math.min((current / limit) * 100, 100);
  const isNearLimit = !isUnlimited && percentage >= 80;
  const isAtLimit = !isUnlimited && percentage >= 100;

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className={`p-1.5 rounded-lg ${isAtLimit ? 'bg-red-50' : 'bg-muted'}`}>
              <Icon size={16} className={isAtLimit ? 'text-red-500' : 'text-muted-foreground'} />
            </div>
            <span className="text-sm font-medium text-foreground">{label}</span>
          </div>
          <span className="text-sm text-muted-foreground">
            {current} / {isUnlimited ? '\u221E' : limit}
          </span>
        </div>

        {!isUnlimited && (
          <div className="w-full bg-accent rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all ${
                isAtLimit ? 'bg-red-500' : isNearLimit ? 'bg-amber-500' : `bg-primary`
              }`}
              style={{ width: `${percentage}%` }}
              role="progressbar"
              aria-valuenow={current}
              aria-valuemin={0}
              aria-valuemax={limit}
              aria-label={`${label}: ${current} of ${limit} used`}
            />
          </div>
        )}

        {isUnlimited && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <CheckCircle size={12} />
            <span>Unlimited</span>
          </div>
        )}

        {isAtLimit && (
          <div className="flex items-center gap-1 mt-2 text-xs text-destructive">
            <AlertCircle size={12} />
            <span>Limit reached — upgrade to continue</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Default plan limits (fallback when API data not yet loaded)
const DEFAULT_LIMITS = {
  free: { tasks: 50, workspaces: 1, categories: Infinity, members: 3 },
  pro: { tasks: Infinity, workspaces: Infinity, categories: Infinity, members: Infinity },
};

function Billing() {
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [isPortalLoading, setIsPortalLoading] = useState(false);
  const [searchParams] = useSearchParams();

  const { subscription, plan, usage, fetchSubscription, openPortal } = useBillingStore();
  const { workspaces, members } = useWorkspaceStore();
  const { tasks } = useTaskStore();
  const { categories } = useCategoryStore();

  // Determine current plan from billing store
  const currentPlan = plan?.id || 'free';
  const limits = usage
    ? {
        tasks: usage.maxTasks || Infinity,
        workspaces: usage.maxWorkspaces || Infinity,
        categories: Infinity,
        members: usage.maxMembers || Infinity,
      }
    : DEFAULT_LIMITS[currentPlan] || DEFAULT_LIMITS.free;

  // Fetch subscription data on mount
  useEffect(() => {
    fetchSubscription();
  }, [fetchSubscription]);

  // Handle Stripe checkout success redirect
  useEffect(() => {
    if (searchParams.get('checkout') === 'success') {
      toast.success('Subscription activated! Welcome to Pro.');
      fetchSubscription();
    } else if (searchParams.get('checkout') === 'cancelled') {
      toast('Checkout cancelled.', { icon: '\u21A9\uFE0F' });
    }
  }, [searchParams, fetchSubscription]);

  const currentUsage = useMemo(() => ({
    tasks: usage?.taskCount ?? tasks.length,
    workspaces: usage?.workspaceCount ?? workspaces.length,
    categories: categories.length,
    members: usage?.memberCount ?? members.length,
  }), [usage, tasks.length, workspaces.length, categories.length, members.length]);

  const handleManageBilling = async () => {
    setIsPortalLoading(true);
    try {
      await openPortal();
    } finally {
      setIsPortalLoading(false);
    }
  };

  const subscriptionStatus = subscription?.status;
  const isPastDue = subscriptionStatus === 'past_due';
  const isTrialing = subscriptionStatus === 'trialing';

  return (
    <div className="min-h-screen bg-muted">
      {/* Header */}
      <header className="bg-card border-b border-border">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-3">
            <Button asChild variant="ghost" size="icon" aria-label="Back to dashboard">
              <Link to="/dashboard">
                <ArrowLeft size={20} />
              </Link>
            </Button>
            <div className="flex items-center gap-3">
              <CreditCard size={24} className="text-foreground" />
              <h1 className="text-xl font-bold text-foreground">Billing & Plans</h1>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Past due warning */}
        {isPastDue && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
            <AlertCircle size={20} className="text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-red-800">Payment failed</p>
              <p className="text-sm text-red-600 mt-1">
                Your last payment failed. Please update your payment method to avoid losing access to Pro features.
              </p>
              <button
                onClick={handleManageBilling}
                className="mt-2 text-sm font-medium text-red-700 underline hover:text-red-800"
              >
                Update payment method
              </button>
            </div>
          </div>
        )}

        {/* Current Plan */}
        <section className="mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <h2 className="text-lg font-semibold text-foreground">Current Plan</h2>
                    <PlanBadge plan={currentPlan} size="md" />
                    {isTrialing && (
                      <Badge variant="outline" className="text-amber-600 border-amber-200 bg-amber-50">
                        Trial
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {currentPlan === 'free'
                      ? 'You are on the free plan. Upgrade to unlock more features.'
                      : `You are on the ${plan?.name || 'Pro'} plan.`}
                  </p>
                  {subscription?.currentPeriodEnd && currentPlan !== 'free' && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {isTrialing ? 'Trial ends' : 'Renews'}: {new Date(subscription.currentPeriodEnd).toLocaleDateString()}
                    </p>
                  )}
                </div>
                <div className="flex gap-2">
                  {currentPlan !== 'free' && (
                    <Button
                      variant="secondary"
                      onClick={handleManageBilling}
                      disabled={isPortalLoading}
                    >
                      {isPortalLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ExternalLink size={14} />}
                      Manage Billing
                    </Button>
                  )}
                  <Button onClick={() => setIsUpgradeModalOpen(true)}>
                    {currentPlan === 'free' ? 'Upgrade Plan' : 'Change Plan'}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Usage Overview */}
        <section className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 size={20} className="text-muted-foreground" />
            <h2 className="text-lg font-semibold text-foreground">Usage</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <UsageBar
              label="Tasks"
              icon={ClipboardList}
              current={currentUsage.tasks}
              limit={limits.tasks}
            />
            <UsageBar
              label="Workspaces"
              icon={FolderOpen}
              current={currentUsage.workspaces}
              limit={limits.workspaces}
            />
            <UsageBar
              label="Categories"
              icon={FolderOpen}
              current={currentUsage.categories}
              limit={limits.categories}
            />
            <UsageBar
              label="Team Members"
              icon={Users}
              current={currentUsage.members}
              limit={limits.members}
            />
          </div>
        </section>

        {/* Billing History */}
        <section>
          <h2 className="text-lg font-semibold text-foreground mb-4">Billing History</h2>
          <Card>
            <CardContent className="p-8 text-center">
              <CreditCard size={32} className="text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground text-sm">
                {currentPlan === 'free'
                  ? 'No billing history yet. Upgrade to a paid plan to see invoices here.'
                  : 'Manage invoices and payment history through the Stripe portal.'}
              </p>
              {currentPlan !== 'free' && (
                <Button
                  variant="ghost"
                  onClick={handleManageBilling}
                  disabled={isPortalLoading}
                  className="mt-3"
                >
                  {isPortalLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ExternalLink size={14} />}
                  View invoices in Stripe
                </Button>
              )}
            </CardContent>
          </Card>
        </section>
      </main>

      {/* Upgrade Modal */}
      <UpgradeModal
        isOpen={isUpgradeModalOpen}
        onClose={() => setIsUpgradeModalOpen(false)}
        currentPlan={currentPlan}
      />
    </div>
  );
}

export default Billing;
