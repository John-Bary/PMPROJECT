import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Users, FolderOpen, ClipboardList, CreditCard, Loader2 } from 'lucide-react';
import { adminAPI } from '../utils/api';
import { Button } from 'components/ui/button';
import { Card, CardContent } from 'components/ui/card';

function StatCard({ label, value, sub, icon: Icon, color = 'neutral' }) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2 rounded-lg bg-neutral-50">
            <Icon size={18} className="text-neutral-500" />
          </div>
          <span className="text-sm font-medium text-neutral-500">{label}</span>
        </div>
        <p className="text-2xl font-bold text-neutral-900">{value}</p>
        {sub && <p className="text-sm text-neutral-400 mt-1">{sub}</p>}
      </CardContent>
    </Card>
  );
}

function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const { data } = await adminAPI.getStats();
        setStats(data.data);
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load admin stats.');
      } finally {
        setIsLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <Loader2 size={32} className="animate-spin text-neutral-400" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-neutral-500 mb-4">{error}</p>
          <Link to="/dashboard" className="text-neutral-700 hover:text-neutral-900 font-medium">
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      <header className="bg-white border-b border-neutral-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-3">
            <Button asChild variant="ghost" size="icon" aria-label="Back to dashboard">
              <Link to="/dashboard">
                <ArrowLeft size={20} />
              </Link>
            </Button>
            <h1 className="text-xl font-bold text-neutral-900">Admin Dashboard</h1>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Users */}
        <section className="mb-8">
          <h2 className="text-lg font-semibold text-neutral-900 mb-4">Users</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Total Users" value={stats.users.total} icon={Users} />
            <StatCard label="Verified" value={stats.users.verified} sub={`${stats.users.total > 0 ? Math.round((stats.users.verified / stats.users.total) * 100) : 0}% verified`} icon={Users} color="green" />
            <StatCard label="New (7 days)" value={stats.users.new7d} icon={Users} color="blue" />
            <StatCard label="New (30 days)" value={stats.users.new30d} icon={Users} color="purple" />
          </div>
        </section>

        {/* Workspaces & Tasks */}
        <section className="mb-8">
          <h2 className="text-lg font-semibold text-neutral-900 mb-4">Workspaces & Tasks</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Workspaces" value={stats.workspaces.total} icon={FolderOpen} />
            <StatCard label="Total Tasks" value={stats.tasks.total} icon={ClipboardList} />
            <StatCard label="Completed" value={stats.tasks.completed} sub={`${stats.tasks.total > 0 ? Math.round((stats.tasks.completed / stats.tasks.total) * 100) : 0}% completion rate`} icon={ClipboardList} color="green" />
            <StatCard label="New Tasks (7d)" value={stats.tasks.new7d} icon={ClipboardList} color="blue" />
          </div>
        </section>

        {/* Subscriptions */}
        <section>
          <h2 className="text-lg font-semibold text-neutral-900 mb-4">Subscriptions</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatCard label="Total Subscriptions" value={stats.subscriptions.total} icon={CreditCard} />
            <StatCard label="Active" value={stats.subscriptions.active} icon={CreditCard} color="green" />
            <StatCard label="Pro Plans" value={stats.subscriptions.pro} icon={CreditCard} color="purple" />
          </div>
        </section>
      </main>
    </div>
  );
}

export default AdminDashboard;
