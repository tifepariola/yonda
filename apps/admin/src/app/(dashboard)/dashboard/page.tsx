'use client';

import { useEffect, useState } from 'react';
import { getOrders, getKycQueue, getActiveRate, type Order, type FxRate, type User } from '@/lib/api';
import Link from 'next/link';

const STATUS_COLOR: Record<string, string> = {
  PENDING_PAYMENT: 'bg-yellow-100 text-yellow-800',
  PAID: 'bg-blue-100 text-blue-800',
  PROCESSING: 'bg-orange-100 text-orange-800',
  DELIVERED: 'bg-green-100 text-green-800',
  FAILED: 'bg-red-100 text-red-800',
  CANCELLED: 'bg-gray-100 text-gray-600',
  REFUNDED: 'bg-purple-100 text-purple-800',
};

export default function DashboardPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [kycQueue, setKycQueue] = useState<User[]>([]);
  const [activeRate, setActiveRate] = useState<FxRate | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      getOrders({ page: 1 }).then((d) => setOrders(d.orders.slice(0, 10))),
      getKycQueue().then(setKycQueue),
      getActiveRate().then(setActiveRate).catch(() => null),
    ]).finally(() => setLoading(false));
  }, []);

  const todayOrders = orders.filter(
    (o) => new Date(o.createdAt).toDateString() === new Date().toDateString(),
  );
  const todayNgn = todayOrders.reduce((sum, o) => sum + Number(o.ngnAmount), 0);

  if (loading) return <div className="p-8 text-gray-400">Loading...</div>;

  return (
    <div className="p-8">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Dashboard</h2>

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <Card label="Today's Orders" value={String(todayOrders.length)} />
        <Card label="Today's NGN Volume" value={`₦${todayNgn.toLocaleString()}`} />
        <Card label="KYC Pending Review" value={String(kycQueue.length)} highlight={kycQueue.length > 0} />
        <Card
          label="Active Rate"
          value={activeRate ? `₦${Number(activeRate.effectiveRateCnyToNgn).toFixed(2)}/CNY` : 'Not set'}
          highlight={!activeRate}
        />
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Recent Orders */}
        <div className="col-span-2 bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900">Recent Orders</h3>
            <Link href="/dashboard/orders" className="text-sm text-brand-600 hover:underline">
              View all →
            </Link>
          </div>
          <div className="divide-y divide-gray-50">
            {orders.slice(0, 8).map((order) => (
              <div key={order.id} className="px-5 py-3 flex items-center justify-between text-sm">
                <div>
                  <span className="font-mono text-xs text-gray-500">
                    YND-{order.id.slice(0, 8).toUpperCase()}
                  </span>
                  <span className="ml-2 text-gray-700">
                    ¥{Number(order.cnyAmount).toLocaleString()} • {order.user.whatsappPhone}
                  </span>
                </div>
                <span
                  className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLOR[order.status] ?? 'bg-gray-100'}`}
                >
                  {order.status.replace(/_/g, ' ')}
                </span>
              </div>
            ))}
            {orders.length === 0 && (
              <p className="px-5 py-4 text-sm text-gray-400">No orders yet</p>
            )}
          </div>
        </div>

        {/* KYC Queue */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900">KYC Queue</h3>
            <Link href="/dashboard/kyc" className="text-sm text-brand-600 hover:underline">
              Review →
            </Link>
          </div>
          <div className="divide-y divide-gray-50">
            {kycQueue.slice(0, 6).map((user) => (
              <div key={user.id} className="px-5 py-3 text-sm">
                <p className="font-medium text-gray-800">{user.name ?? 'Unknown'}</p>
                <p className="text-gray-400 text-xs">{user.whatsappPhone}</p>
              </div>
            ))}
            {kycQueue.length === 0 && (
              <p className="px-5 py-4 text-sm text-gray-400">Queue is empty ✓</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Card({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`bg-white rounded-xl p-5 shadow-sm border ${highlight ? 'border-orange-200' : 'border-gray-100'}`}
    >
      <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">{label}</p>
      <p className={`text-2xl font-bold ${highlight ? 'text-orange-600' : 'text-gray-900'}`}>
        {value}
      </p>
    </div>
  );
}
