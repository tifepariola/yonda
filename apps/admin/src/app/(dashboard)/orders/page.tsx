'use client';

import { useEffect, useState } from 'react';
import { getOrders, updateOrderStatus, markOrderPaid, type Order } from '@/lib/api';

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
  const [markPaidOrderId, setMarkPaidOrderId] = useState<string | null>(null);
  const [markPaidNote, setMarkPaidNote] = useState('');
  const [markPaidLoading, setMarkPaidLoading] = useState(false);

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

  async function handleMarkPaid() {
    if (!markPaidOrderId) return;
    setMarkPaidLoading(true);
    try {
      await markOrderPaid(markPaidOrderId, markPaidNote || undefined);
      setMarkPaidOrderId(null);
      setMarkPaidNote('');
      fetchOrders();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to mark as paid');
    } finally {
      setMarkPaidLoading(false);
    }
  }

  return (
    <div className="p-8">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Orders</h2>

      {/* Manual payment approval modal */}
      {markPaidOrderId && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md">
            <h3 className="text-lg font-bold text-gray-900 mb-1">Manual Payment Approval</h3>
            <p className="text-sm text-gray-500 mb-4">
              Only use this if you&apos;ve confirmed the payment via your bank or Paystack dashboard.
              The customer will receive a WhatsApp confirmation.
            </p>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Note (optional)
            </label>
            <input
              type="text"
              placeholder="e.g. Confirmed via Paystack dashboard ref: xyz"
              value={markPaidNote}
              onChange={(e) => setMarkPaidNote(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => { setMarkPaidOrderId(null); setMarkPaidNote(''); }}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900"
              >
                Cancel
              </button>
              <button
                onClick={handleMarkPaid}
                disabled={markPaidLoading}
                className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {markPaidLoading ? 'Confirming...' : 'Confirm Payment'}
              </button>
            </div>
          </div>
        </div>
      )}

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
                  <div className="flex flex-wrap gap-1">
                    {order.status === 'PENDING_PAYMENT' && (
                      <button
                        onClick={() => setMarkPaidOrderId(order.id)}
                        className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs hover:bg-blue-200 font-medium"
                      >
                        Mark as Paid
                      </button>
                    )}
                    {order.status === 'PAID' && (
                      <>
                        <button
                          onClick={() => handleStatusUpdate(order.id, 'PROCESSING')}
                          className="px-2 py-1 bg-orange-100 text-orange-700 rounded text-xs hover:bg-orange-200"
                        >
                          Processing
                        </button>
                        <button
                          onClick={() => handleStatusUpdate(order.id, 'DELIVERED')}
                          className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs hover:bg-green-200"
                        >
                          Delivered
                        </button>
                      </>
                    )}
                    {order.status === 'PROCESSING' && (
                      <button
                        onClick={() => handleStatusUpdate(order.id, 'DELIVERED')}
                        className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs hover:bg-green-200"
                      >
                        Mark Delivered
                      </button>
                    )}
                  </div>
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
