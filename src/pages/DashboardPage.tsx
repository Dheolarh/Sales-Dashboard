import React, { useState, useEffect, useCallback } from 'react';
import { Package, ShoppingCart, Users, AlertTriangle, TrendingUp, DollarSign } from 'lucide-react';
import { StatsCard } from '../components/dashboard/StatsCard';
import { RecentTransactions } from '../components/dashboard/RecentTransactions';
import { SalesChart } from '../components/dashboard/SalesChart';
import { QuickActions } from '../components/dashboard/QuickActions';
import { SystemHealth } from '../components/dashboard/SystemHealth';
import { supabase, dbService } from '../lib/supabase';
import { formatCurrency } from '../utils/format';
import { useToast } from '../hooks/useToast';
import { ToastContainer } from '../components/ui/Toast';

export const DashboardPage: React.FC = () => {
  const [stats, setStats] = useState({
    totalProducts: 0,
    totalTransactions: 0,
    activeAdmins: 0,
    unresolvedErrors: 0,
    totalRevenue: 0,
    todaysSales: 0
  });
  const [loading, setLoading] = useState(true);
  const { toasts, addToast, removeToast } = useToast();

  const loadDashboardData = useCallback(async (isInitialLoad = false) => {
    try {
      const [dashboardStats, recentTransactions] = await Promise.all([
        dbService.getDashboardStats(),
        dbService.getRecentTransactions(100)
      ]);

      // Calculate revenue metrics
      const totalRevenue = recentTransactions.reduce((sum, t) => sum + t.total_amount, 0);
      const today = new Date().toDateString();
      const todaysSales = recentTransactions
        .filter(t => new Date(t.transaction_time).toDateString() === today)
        .reduce((sum, t) => sum + t.total_amount, 0);

      setStats({
        ...dashboardStats,
        totalRevenue,
        todaysSales
      });

      // Show welcome toast only on the first load
      if (isInitialLoad) {
        addToast({
          type: 'success',
          title: 'Dashboard Loaded',
          message: 'Welcome back! Your dashboard data has been updated.',
          duration: 3000
        });
      }
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
      addToast({
        type: 'error',
        title: 'Loading Error',
        message: 'Failed to load dashboard data. Please refresh the page.',
        duration: 5000
      });
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    // Initial data load
    loadDashboardData(true);

    // Set up a Realtime subscription to the transactions table
    const subscription = supabase
      .channel('public:transactions')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'transactions' },
        (payload) => {
          console.log('New transaction received!', payload);
          // When a new transaction comes in, reload the dashboard data
          loadDashboardData(false);
          addToast({
            type: 'info',
            title: 'Dashboard Updated',
            message: 'New sales data has been loaded automatically.',
            duration: 4000
          });
        }
      )
      .subscribe();

    // Cleanup function: Unsubscribe when the component unmounts
    return () => {
      supabase.removeChannel(subscription);
    };
  }, [loadDashboardData, addToast]);

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-64" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard Overview</h1>
          <p className="text-gray-600 mt-1">Welcome to your QuickCart sales dashboard</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
          <StatsCard
            title="Total Products"
            value={stats.totalProducts.toLocaleString()}
            icon={Package}
            color="blue"
          />
          <StatsCard
            title="Total Transactions"
            value={stats.totalTransactions.toLocaleString()}
            icon={ShoppingCart}
            color="green"
          />
          <StatsCard
            title="Active Admins"
            value={stats.activeAdmins}
            icon={Users}
            color="purple"
          />
          <StatsCard
            title="Unresolved Errors"
            value={stats.unresolvedErrors}
            icon={AlertTriangle}
            color="red"
          />
          <StatsCard
            title="Total Revenue"
            value={formatCurrency(stats.totalRevenue)}
            icon={DollarSign}
            color="green"
          />
          <StatsCard
            title="Today's Sales"
            value={formatCurrency(stats.todaysSales)}
            icon={TrendingUp}
            color="blue"
          />
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Charts */}
          <div className="lg:col-span-2 space-y-6">
            <SalesChart />
            <RecentTransactions />
          </div>
          
          {/* Right Column - Actions & Health */}
          <div className="space-y-6">
            <QuickActions />
            <SystemHealth />
          </div>
        </div>
      </div>

      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} onClose={removeToast} />
    </>
  );
};