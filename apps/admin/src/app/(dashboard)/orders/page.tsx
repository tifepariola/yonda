'use client';

import { useEffect, useState } from 'react';
import { getOrders, updateOrderStatus, type Order } from '@/lib/api';

const STATUS_COLOR: Record<string, string> = {
  PENDING_PAYMENT: 'bg-yellow-100 text-yellow-800',
  PAID: 'bg-blue-100 text-blue-800',
  PROCESSING: 'bg-orange-100 text-orange-800',
  DELIVERED: 'bg-green-100 text-green-800',
  FAILED: 'bg-red-100 text-red-800',
  CANCELLED: 'bg-gray-100 text-gray-600',
  REFUNDED: 'bg-purple-100 text-purple-800',
};

const STATUS_OPTIONS = ['', 'PENDING_PAYMENT', 'PAID', 'PROCESSING', 'DELIVERED', 'FAILED', 'CANCELLED', 'REFUNDED'];

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [phoneFilter, setPhoneFilter] = useState('');
  const [loading, setLoading] = useState(false);

  async function fetchOrders() {
    setLoading(true);
    try {
      const data = await getOrders({
        status: statusFilter || undefined,
        phone: phoneFilter || undefined,
        page,
      });
      setOrders(data.orders);
      setTotal(data.total);
      setPages(data.pages);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchOrders(); }, [page, statusFilter]);

  async function handleStatusUpdate(orderId: string, status: string) {
    await updateOrderStatus(orderId, status);
    fetchOrders();
  }

  return (
    <div className="p-8">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Orders</h2>

      {/* Filters */}
      <div className="flex gap-3 mb-5">
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
        >
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>{s || 'All Statuses'}</option>
          ))}
        </select>
        <input
          type="text"
          placeholder="Search by phone..."
          value={phoneFilter}
          onChange={(e) => setPhoneFilter(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && fetchOrders()}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 w-48"
        />
        <button
          onClick={fetchOrders}
          className="px-4 py-2 bg-brand-600 text-white text-sm font-medium rounded-lg hover:bg-brand-700"
        >
          Search
        </button>
        <span className="ml-auto text-sm text-gray-400 self-center">{total} total orders</span>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
              <th className="px-4 py-3">Order</th>
              <th className="px-4 py-3">Customer</th>
              <th className="px-4 py-3">Amount</th>
              <th className="px-4 py-3">Delivery</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {orders.map((order) => (
              <tr key={order.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-mono text-xs text-gray-600">
                  YND-{order.id.slice(0, 8).toUpperCase()}
                </td>
                <td className="px-4 py-3">
                  <p className="font-medium text-gray-800">{order.user.name ?? '—'}</p>
                  <p className="text-gray-400 text-xs">{order.user.whatsappPhone}</p>
                </td>
                <td className="px-4 py-3">
                  <p className="font-semibold text-gray-900">¥{Number(order.cnyAmount).toLocaleString()}</p>
                  <p className="text-gray-400 text-xs">₦{Number(order.ngnAmount).toLocaleString()}</p>
                </td>
                <td className="px-4 py-3 text-xs text-gray-600">
                  <p>{order.deliveryType}</p>
                  <p className="text-gray-400">{order.deliveryAccountId}</p>
                </td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_COLOR[order.status] ?? ''}`}>
                    {order.status.replace(/_/g, ' ')}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs text-gray-500">
                  {new Date(order.createdAt).toLocaleDateString('en-NG')}
                </td>
                <td className="px-4 py-3">
                  {order.status === 'PAID' && (
                    <div className="flex gap-1">
                      <button
                        onClick={() => handleStatusUpdate(order.id, 'DELIVERED')}
                        className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs hover:bg-green-200"
                      >
                        Mark Delivered
                      </button>
                      <button
                        onClick={() => handleStatusUpdate(order.id, 'PROCESSING')}
                        className="px-2 py-1 bg-orange-100 text-orange-700 rounded text-xs hover:bg-orange-200"
                      >
                        Processing
                      </button>
                    </div>
                  )}
                  {order.status === 'PROCESSING' && (
                    <button
                      onClick={() => handleStatusUpdate(order.id, 'DELIVERED')}
                      className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs hover:bg-green-200"
                    >
                      Mark Delivered
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {!loading && orders.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                  No orders found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex justify-center gap-2 mt-4">
          {Array.from({ length: pages }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              onClick={() => setPage(p)}
              className={`w-8 h-8 rounded text-sm ${page === p ? 'bg-brand-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}
            >
              {p}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
