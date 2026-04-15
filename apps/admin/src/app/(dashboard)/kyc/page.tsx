'use client';

import { useEffect, useState } from 'react';
import { getKycQueue, approveKyc, rejectKyc, getUserBvn, type User } from '@/lib/api';

export default function KycPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<User | null>(null);
  const [bvn, setBvn] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [processing, setProcessing] = useState(false);

  async function fetchQueue() {
    setLoading(true);
    const data = await getKycQueue();
    setUsers(data);
    setLoading(false);
  }

  useEffect(() => { fetchQueue(); }, []);

  async function openReview(user: User) {
    setSelected(user);
    setBvn(null);
    setRejectReason('');
  }

  async function loadBvn() {
    if (!selected) return;
    const data = await getUserBvn(selected.id);
    setBvn(data.bvn);
  }

  async function handleApprove() {
    if (!selected) return;
    setProcessing(true);
    try {
      await approveKyc(selected.id);
      setSelected(null);
      fetchQueue();
    } finally {
      setProcessing(false);
    }
  }

  async function handleReject() {
    if (!selected || !rejectReason.trim()) return;
    setProcessing(true);
    try {
      await rejectKyc(selected.id, rejectReason.trim());
      setSelected(null);
      fetchQueue();
    } finally {
      setProcessing(false);
    }
  }

  return (
    <div className="p-8">
      <h2 className="text-2xl font-bold text-gray-900 mb-2">KYC Review Queue</h2>
      <p className="text-sm text-gray-500 mb-6">{users.length} user{users.length !== 1 ? 's' : ''} awaiting review</p>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">WhatsApp</th>
              <th className="px-4 py-3">Submitted</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {users.map((user) => (
              <tr key={user.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-900">{user.name ?? '—'}</td>
                <td className="px-4 py-3 text-gray-600">{user.whatsappPhone}</td>
                <td className="px-4 py-3 text-xs text-gray-400">
                  {new Date(user.createdAt).toLocaleDateString('en-NG')}
                </td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => openReview(user)}
                    className="px-3 py-1.5 bg-brand-600 text-white text-xs font-medium rounded-lg hover:bg-brand-700"
                  >
                    Review
                  </button>
                </td>
              </tr>
            ))}
            {!loading && users.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-gray-400">
                  ✅ KYC queue is empty
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Review Modal */}
      {selected && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-1">KYC Review</h3>
            <p className="text-sm text-gray-500 mb-5">Review identity for {selected.name ?? selected.whatsappPhone}</p>

            <div className="space-y-3 mb-5">
              <Row label="Name" value={selected.name ?? '—'} />
              <Row label="WhatsApp" value={selected.whatsappPhone} />
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">BVN</span>
                {bvn ? (
                  <span className="font-mono text-sm font-semibold text-gray-900">{bvn}</span>
                ) : (
                  <button
                    onClick={loadBvn}
                    className="text-xs text-brand-600 hover:underline"
                  >
                    Reveal BVN
                  </button>
                )}
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-xs font-medium text-gray-500 mb-1">
                Rejection reason (required if rejecting)
              </label>
              <input
                type="text"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="e.g. BVN does not match name"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleApprove}
                disabled={processing}
                className="flex-1 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                ✅ Approve
              </button>
              <button
                onClick={handleReject}
                disabled={processing || !rejectReason.trim()}
                className="flex-1 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                ❌ Reject
              </button>
              <button
                onClick={() => setSelected(null)}
                className="px-4 py-2 border border-gray-200 text-gray-600 text-sm rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-gray-500">{label}</span>
      <span className="text-sm font-medium text-gray-900">{value}</span>
    </div>
  );
}
