import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  CreditCard,
  ArrowLeft,
  CheckCircle,
  AlertCircle,
  BarChart3,
  Users,
  FolderOpen,
  ClipboardList,
} from 'lucide-react';
import useWorkspaceStore from '../store/workspaceStore';
import useTaskStore from '../store/taskStore';
import useCategoryStore from '../store/categoryStore';
import PlanBadge from '../components/PlanBadge';
import UpgradeModal from '../components/UpgradeModal';

// Plan limits (stubbed for frontend-only)
const planLimits = {
  free: { tasks: 50, workspaces: 1, categories: 3, members: 3 },
  pro: { tasks: Infinity, workspaces: 5, categories: Infinity, members: 20 },
  business: { tasks: Infinity, workspaces: Infinity, categories: Infinity, members: Infinity },
};

function UsageBar({ label, icon: Icon, current, limit, color = 'teal' }) {
  const isUnlimited = limit === Infinity;
  const percentage = isUnlimited ? 0 : Math.min((current / limit) * 100, 100);
  const isNearLimit = !isUnlimited && percentage >= 80;
  const isAtLimit = !isUnlimited && percentage >= 100;

  return (
    <div className="p-4 bg-white rounded-xl border border-neutral-200">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className={`p-1.5 rounded-lg ${isAtLimit ? 'bg-red-50' : `bg-${color}-50`}`}>
            <Icon size={16} className={isAtLimit ? 'text-red-500' : `text-${color}-500`} />
          </div>
          <span className="text-sm font-medium text-neutral-700">{label}</span>
        </div>
        <span className="text-sm text-neutral-500">
          {current} / {isUnlimited ? '∞' : limit}
        </span>
      </div>

      {!isUnlimited && (
        <div className="w-full bg-neutral-100 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all ${
              isAtLimit ? 'bg-red-500' : isNearLimit ? 'bg-amber-500' : `bg-teal-500`
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
        <div className="flex items-center gap-1 text-xs text-neutral-400">
          <CheckCircle size={12} />
          <span>Unlimited</span>
        </div>
      )}

      {isAtLimit && (
        <div className="flex items-center gap-1 mt-2 text-xs text-red-600">
          <AlertCircle size={12} />
          <span>Limit reached — upgrade to continue</span>
        </div>
      )}
    </div>
  );
}

function Billing() {
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);

  // Current plan is stubbed as 'free' for now
  const currentPlan = 'free';
  const limits = planLimits[currentPlan];

  const { workspaces, members } = useWorkspaceStore();
  const { tasks } = useTaskStore();
  const { categories } = useCategoryStore();

  const usage = useMemo(() => ({
    tasks: tasks.length,
    workspaces: workspaces.length,
    categories: categories.length,
    members: members.length,
  }), [tasks.length, workspaces.length, categories.length, members.length]);

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Header */}
      <header className="bg-white border-b border-neutral-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-3">
            <Link
              to="/dashboard"
              className="p-2 text-neutral-400 hover:text-neutral-600 hover:bg-neutral-100 rounded-lg transition-all"
              aria-label="Back to dashboard"
            >
              <ArrowLeft size={20} />
            </Link>
            <div className="flex items-center gap-3">
              <CreditCard size={24} className="text-neutral-700" />
              <h1 className="text-xl font-bold text-neutral-900">Billing & Plans</h1>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Current Plan */}
        <section className="mb-8">
          <div className="bg-white rounded-xl border border-neutral-200 p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h2 className="text-lg font-semibold text-neutral-900">Current Plan</h2>
                  <PlanBadge plan={currentPlan} size="md" />
                </div>
                <p className="text-sm text-neutral-500">
                  {currentPlan === 'free'
                    ? 'You are on the free plan. Upgrade to unlock more features.'
                    : `You are on the ${currentPlan} plan.`}
                </p>
              </div>
              <button
                onClick={() => setIsUpgradeModalOpen(true)}
                className="px-6 py-2.5 bg-teal-500 text-white font-medium rounded-lg hover:bg-teal-600 transition-all shadow-sm text-sm"
              >
                {currentPlan === 'free' ? 'Upgrade Plan' : 'Change Plan'}
              </button>
            </div>
          </div>
        </section>

        {/* Usage Overview */}
        <section className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 size={20} className="text-neutral-600" />
            <h2 className="text-lg font-semibold text-neutral-900">Usage</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <UsageBar
              label="Tasks"
              icon={ClipboardList}
              current={usage.tasks}
              limit={limits.tasks}
            />
            <UsageBar
              label="Workspaces"
              icon={FolderOpen}
              current={usage.workspaces}
              limit={limits.workspaces}
            />
            <UsageBar
              label="Categories"
              icon={FolderOpen}
              current={usage.categories}
              limit={limits.categories}
            />
            <UsageBar
              label="Team Members"
              icon={Users}
              current={usage.members}
              limit={limits.members}
            />
          </div>
        </section>

        {/* Billing History (placeholder) */}
        <section>
          <h2 className="text-lg font-semibold text-neutral-900 mb-4">Billing History</h2>
          <div className="bg-white rounded-xl border border-neutral-200 p-8 text-center">
            <CreditCard size={32} className="text-neutral-300 mx-auto mb-3" />
            <p className="text-neutral-500 text-sm">
              No billing history yet. Upgrade to a paid plan to see invoices here.
            </p>
          </div>
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
