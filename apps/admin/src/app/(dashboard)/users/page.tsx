'use client';

import { useEffect, useState } from 'react';
import { getUsers, api, type User } from '@/lib/api';

const KYC_COLOR: Record<string, string> = {
  PENDING: 'bg-gray-100 text-gray-600',
  SUBMITTED: 'bg-yellow-100 text-yellow-700',
  VERIFIED: 'bg-green-100 text-green-700',
  REJECTED: 'bg-red-100 text-red-700',
};

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [total, setTotal] = useState(0);
  const [kycFilter, setKycFilter] = useState('');
  const [phoneFilter, setPhoneFilter] = useState('');
  const [loading, setLoading] = useState(false);

  async function fetchUsers() {
    setLoading(true);
    try {
      const data = await getUsers({
        kycStatus: kycFilter || undefined,
        phone: phoneFilter || undefined,
      });
      setUsers(data.users);
      setTotal(data.total);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchUsers(); }, [kycFilter]);

  async function handleToggleBlock(userId: string, currentlyBlocked: boolean) {
    await api.patch(`/admin/users/${userId}/block`, { blocked: !currentlyBlocked });
    fetchUsers();
  }

  return (
    <div className="p-8">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Users</h2>

      {/* Filters */}
      <div className="flex gap-3 mb-5">
        <select
          value={kycFilter}
          onChange={(e) => setKycFilter(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 bg-white"
        >
          <option value="">All KYC Statuses</option>
          <option value="PENDING">Pending</option>
          <option value="SUBMITTED">Submitted</option>
          <option value="VERIFIED">Verified</option>
          <option value="REJECTED">Rejected</option>
        </select>
        <input
          type="text"
          placeholder="Search by phone..."
          value={phoneFilter}
          onChange={(e) => setPhoneFilter(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && fetchUsers()}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 w-48"
        />
        <button onClick={fetchUsers} className="px-4 py-2 bg-brand-600 text-white text-sm font-medium rounded-lg hover:bg-brand-700">
          Search
        </button>
        <span className="ml-auto text-sm text-gray-400 self-center">{total} users</span>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">WhatsApp</th>
              <th className="px-4 py-3">KYC Status</th>
              <th className="px-4 py-3">Joined</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {users.map((user) => (
              <tr key={user.id} className={user.isBlocked ? 'bg-red-50' : 'hover:bg-gray-50'}>
                <td className="px-4 py-3 font-medium text-gray-900">
                  {user.name ?? '—'}
                  {user.isBlocked && (
                    <span className="ml-2 text-xs bg-red-100 text-red-700 px-1.5 py-0.5 rounded">Blocked</span>
                  )}
                </td>
                <td className="px-4 py-3 text-gray-600">{user.whatsappPhone}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${KYC_COLOR[user.kycStatus] ?? ''}`}>
                    {user.kycStatus}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs text-gray-400">
                  {new Date(user.createdAt).toLocaleDateString('en-NG')}
                </td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => handleToggleBlock(user.id, user.isBlocked)}
                    className={`px-2 py-1 text-xs rounded font-medium ${
                      user.isBlocked
                        ? 'bg-green-100 text-green-700 hover:bg-green-200'
                        : 'bg-red-100 text-red-700 hover:bg-red-200'
                    }`}
                  >
                    {user.isBlocked ? 'Unblock' : 'Block'}
                  </button>
                </td>
              </tr>
            ))}
            {!loading && users.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-400">No users found</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
