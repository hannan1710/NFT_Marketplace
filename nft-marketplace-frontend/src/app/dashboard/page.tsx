'use client';

import { useAccount } from 'wagmi';
import { useEffect, useState, lazy, Suspense } from 'react';
import { Navbar } from '@/components/Navbar';
import { api } from '@/lib/api';
import { Activity, TrendingUp, AlertTriangle, Shield, DollarSign, Package, RefreshCw } from 'lucide-react';
import dynamic from 'next/dynamic';
import { useDashboardData } from '@/hooks/useDashboardData';
import { useRealtimeEvents } from '@/hooks/useRealtimeEvents';
import { formatEther } from 'viem';

// Lazy load heavy components
const TrustScoreDisplay = dynamic(() => import('@/components/TrustScoreDisplay').then(mod => ({ default: mod.TrustScoreDisplay })), {
  loading: () => <div className="card h-64 animate-pulse bg-gray-200 dark:bg-gray-700"></div>,
  ssr: false
});

const PricePredictionChart = dynamic(() => import('@/components/PricePredictionChart').then(mod => ({ default: mod.PricePredictionChart })), {
  loading: () => <div className="card h-64 animate-pulse bg-gray-200 dark:bg-gray-700"></div>,
  ssr: false
});

// Lazy load recharts
const BarChart = dynamic(() => import('recharts').then(mod => mod.BarChart), { ssr: false });
const Bar = dynamic(() => import('recharts').then(mod => mod.Bar), { ssr: false });
const XAxis = dynamic(() => import('recharts').then(mod => mod.XAxis), { ssr: false });
const YAxis = dynamic(() => import('recharts').then(mod => mod.YAxis), { ssr: false });
const CartesianGrid = dynamic(() => import('recharts').then(mod => mod.CartesianGrid), { ssr: false });
const Tooltip = dynamic(() => import('recharts').then(mod => mod.Tooltip), { ssr: false });
const Legend = dynamic(() => import('recharts').then(mod => mod.Legend), { ssr: false });
const ResponsiveContainer = dynamic(() => import('recharts').then(mod => mod.ResponsiveContainer), { ssr: false });
const PieChart = dynamic(() => import('recharts').then(mod => mod.PieChart), { ssr: false });
const Pie = dynamic(() => import('recharts').then(mod => mod.Pie), { ssr: false });
const Cell = dynamic(() => import('recharts').then(mod => mod.Cell), { ssr: false });

export default function DashboardPage() {
  const { address, isConnected } = useAccount();
  const [eventStats, setEventStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  // Use real-time hooks
  const { stats: dashboardStats, loading: statsLoading, refresh } = useDashboardData();
  const { events: realtimeEvents, eventCount } = useRealtimeEvents(address);

  useEffect(() => {
    if (!address) return;

    const fetchDashboardData = async () => {
      try {
        const stats = await api.getEventStats();
        setEventStats(stats.data);
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
    
    // Refresh stats every 30 seconds as backup
    const interval = setInterval(fetchDashboardData, 30000);
    return () => clearInterval(interval);
  }, [address]);

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Navbar />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
          <Shield className="w-16 h-16 text-gray-400 dark:text-gray-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Connect Your Wallet</h2>
          <p className="text-gray-600 dark:text-gray-400">Please connect your wallet to view your dashboard</p>
        </div>
      </div>
    );
  }

  const gasComparisonData = [
    { name: 'Standard Mint', cost: 150000, optimized: 95000 },
    { name: 'Batch Mint (5)', cost: 750000, optimized: 380000 },
    { name: 'Create Listing', cost: 120000, optimized: 85000 },
    { name: 'Purchase', cost: 180000, optimized: 135000 },
  ];

  const eventTypeData = eventStats?.byType?.map((item: any) => ({
    name: item._id,
    value: item.count,
  })) || [];

  const COLORS = ['#0ea5e9', '#22c55e', '#f59e0b', '#ef4444'];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header with Refresh */}
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">Dashboard</h1>
            <p className="text-gray-600 dark:text-gray-300">Your personalized NFT analytics and insights</p>
          </div>
          <button
            onClick={refresh}
            className="flex items-center space-x-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Refresh</span>
          </button>
        </div>

        {/* Real-time Event Counter */}
        {eventCount > 0 && (
          <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
            <div className="flex items-center space-x-2">
              <Activity className="w-5 h-5 text-green-600 dark:text-green-400 animate-pulse" />
              <span className="text-green-800 dark:text-green-200 font-medium">
                {eventCount} new event{eventCount !== 1 ? 's' : ''} detected in real-time
              </span>
            </div>
          </div>
        )}

        {/* Quick Stats - Now with Real-time Data */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard
            icon={<Package className="w-6 h-6 text-primary-600" />}
            title="Your NFTs"
            value={dashboardStats.ownedNFTs.toString()}
            change={`${eventCount} new events`}
          />
          <StatCard
            icon={<DollarSign className="w-6 h-6 text-success-600" />}
            title="Portfolio Value"
            value={`${dashboardStats.portfolioValue} ETH`}
            change="+12.5%"
          />
          <StatCard
            icon={<Activity className="w-6 h-6 text-warning-600" />}
            title="Total Transactions"
            value={dashboardStats.totalTransactions.toString()}
            change="Last 30 days"
          />
          <StatCard
            icon={<TrendingUp className="w-6 h-6 text-purple-600" />}
            title="Trust Score"
            value={dashboardStats.trustScore.toFixed(0)}
            change={dashboardStats.fraudRiskLevel}
          />
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          {/* Trust Score */}
          <div className="lg:col-span-1">
            <Suspense fallback={<div className="card h-64 animate-pulse bg-gray-200 dark:bg-gray-700"></div>}>
              <TrustScoreDisplay walletAddress={address} showDetails={true} />
            </Suspense>
          </div>

          {/* Price Prediction */}
          <div className="lg:col-span-2">
            <Suspense fallback={<div className="card h-64 animate-pulse bg-gray-200 dark:bg-gray-700"></div>}>
              <PricePredictionChart
                currentPrice={1.5}
                predictedPrice={1.85}
                confidence={0.87}
                historicalData={[
                  { date: '1 week ago', price: 1.2 },
                  { date: '3 days ago', price: 1.4 },
                ]}
              />
            </Suspense>
          </div>
        </div>

        {/* Gas Optimization Chart */}
        <div className="card mb-8">
          <div className="flex items-center space-x-2 mb-6">
            <TrendingUp className="w-6 h-6 text-success-600 dark:text-success-400" />
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Gas Optimization Comparison</h3>
          </div>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={gasComparisonData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" className="dark:stroke-gray-700" />
                <XAxis dataKey="name" stroke="#6b7280" className="dark:stroke-gray-400" fontSize={12} />
                <YAxis stroke="#6b7280" className="dark:stroke-gray-400" fontSize={12} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                  }}
                  wrapperClassName="dark:bg-gray-800"
                />
                <Legend />
                <Bar dataKey="cost" fill="#ef4444" name="Standard Gas Cost" />
                <Bar dataKey="optimized" fill="#22c55e" name="Optimized Gas Cost" />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">Average Gas Savings</span>
              <span className="text-lg font-bold text-success-600 dark:text-success-400">~38%</span>
            </div>
          </div>
        </div>

        {/* Event Distribution */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <div className="card">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-6">Event Distribution</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={eventTypeData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {eventTypeData.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Recent Activity - Now Real-time */}
          <div className="card">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Recent Activity</h3>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                <span className="text-xs text-gray-500 dark:text-gray-400">Live</span>
              </div>
            </div>
            <div className="space-y-4 max-h-64 overflow-y-auto">
              {realtimeEvents.slice(0, 5).map((event, index) => (
                <div key={event.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className={`w-2 h-2 rounded-full ${
                      event.type === 'NFTMinted' ? 'bg-success-600' :
                      event.type === 'ListingPurchased' ? 'bg-primary-600' :
                      event.type === 'AuctionFinalized' ? 'bg-purple-600' :
                      'bg-warning-600'
                    }`}></div>
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{event.type}</p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        {event.data.tokenId ? `Token #${event.data.tokenId}` : 'Transaction'}
                      </p>
                    </div>
                  </div>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    Just now
                  </span>
                </div>
              ))}
              {dashboardStats.recentEvents.slice(0, 5 - realtimeEvents.length).map((event, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className={`w-2 h-2 rounded-full ${
                      event.eventType === 'NFTMinted' ? 'bg-success-600' :
                      event.eventType === 'NFTSold' ? 'bg-primary-600' :
                      'bg-warning-600'
                    }`}></div>
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{event.eventType}</p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">Token #{event.tokenId}</p>
                    </div>
                  </div>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {new Date(event.blockTimestamp).toLocaleDateString()}
                  </span>
                </div>
              ))}
              {realtimeEvents.length === 0 && dashboardStats.recentEvents.length === 0 && (
                <p className="text-center text-gray-500 dark:text-gray-400 py-8">No recent activity</p>
              )}
            </div>
          </div>
        </div>

        {/* Fraud Risk Summary */}
        <div className="card">
          <div className="flex items-center space-x-2 mb-6">
            <AlertTriangle className="w-6 h-6 text-warning-600 dark:text-warning-400" />
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Fraud Risk Summary</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center p-4 bg-success-50 dark:bg-success-950 rounded-lg">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Low Risk Transactions</p>
              <p className="text-3xl font-bold text-success-600 dark:text-success-400">94%</p>
            </div>
            <div className="text-center p-4 bg-warning-50 dark:bg-warning-950 rounded-lg">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Medium Risk</p>
              <p className="text-3xl font-bold text-warning-600 dark:text-warning-400">5%</p>
            </div>
            <div className="text-center p-4 bg-danger-50 dark:bg-danger-950 rounded-lg">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">High Risk</p>
              <p className="text-3xl font-bold text-danger-600 dark:text-danger-400">1%</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, title, value, change }: { icon: React.ReactNode; title: string; value: string; change: string }) {
  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <div className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg">{icon}</div>
      </div>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">{title}</p>
      <p className="text-2xl font-bold text-gray-900 dark:text-white mb-1">{value}</p>
      <p className="text-xs text-gray-500 dark:text-gray-500">{change}</p>
    </div>
  );
}
