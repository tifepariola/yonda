'use client';

import { useEffect, useState } from 'react';
import { getActiveRate, getRateHistory, createRate, type FxRate } from '@/lib/api';

export default function RatesPage() {
  const [active, setActive] = useState<FxRate | null>(null);
  const [history, setHistory] = useState<FxRate[]>([]);
  const [baseRate, setBaseRate] = useState('');
  const [margin, setMargin] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  async function fetchRates() {
    const [activeData, historyData] = await Promise.all([
      getActiveRate().catch(() => null),
      getRateHistory().catch(() => []),
    ]);
    setActive(activeData);
    setHistory(historyData);
  }

  useEffect(() => { fetchRates(); }, []);

  // Preview calculation
  const previewRate =
    baseRate && margin
      ? (parseFloat(baseRate) * (1 + parseFloat(margin) / 100)).toFixed(2)
      : null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      const base = parseFloat(baseRate);
      const marginDecimal = parseFloat(margin) / 100;
      if (isNaN(base) || base <= 0 || isNaN(marginDecimal) || marginDecimal < 0) {
        setError('Invalid values');
        return;
      }
      await createRate(base, marginDecimal);
      setSuccess('Rate updated successfully!');
      setBaseRate('');
      setMargin('');
      fetchRates();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update rate');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-8 max-w-3xl">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">FX Rate Management</h2>

      {/* Current Rate */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
        <h3 className="font-semibold text-gray-700 mb-3">Current Active Rate</h3>
        {active ? (
          <div className="space-y-2">
            <p className="text-3xl font-bold text-gray-900">
              1 CNY = ₦{Number(active.effectiveRateCnyToNgn).toFixed(2)}
            </p>
            <p className="text-sm text-gray-500">
              Base: ₦{Number(active.baseRateCnyToNgn).toFixed(2)} + {(Number(active.marginPercent) * 100).toFixed(1)}% margin
            </p>
            <p className="text-xs text-gray-400">
              Set {new Date(active.createdAt).toLocaleString('en-NG')}
            </p>
          </div>
        ) : (
          <p className="text-orange-600 font-medium">⚠️ No active rate configured</p>
        )}
      </div>

      {/* Update Rate Form */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
        <h3 className="font-semibold text-gray-700 mb-4">Update Rate</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Base Rate (₦ per CNY)
              </label>
              <input
                type="number"
                step="0.01"
                value={baseRate}
                onChange={(e) => setBaseRate(e.target.value)}
                placeholder="e.g. 220.50"
                required
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Margin (%)
              </label>
              <input
                type="number"
                step="0.1"
                min="0"
                max="50"
                value={margin}
                onChange={(e) => setMargin(e.target.value)}
                placeholder="e.g. 5"
                required
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
          </div>

          {previewRate && (
            <div className="bg-brand-50 border border-brand-100 rounded-lg px-4 py-3">
              <p className="text-sm text-brand-700">
                Preview: customers will pay <strong>₦{previewRate}</strong> per CNY
              </p>
            </div>
          )}

          {error && <p className="text-sm text-red-600">{error}</p>}
          {success && <p className="text-sm text-green-600">{success}</p>}

          <button
            type="submit"
            disabled={loading}
            className="px-5 py-2 bg-brand-600 text-white text-sm font-medium rounded-lg hover:bg-brand-700 disabled:opacity-50"
          >
            {loading ? 'Updating...' : 'Update Rate'}
          </button>
        </form>
      </div>

      {/* Rate History */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-700">Rate History</h3>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wide">
              <th className="px-4 py-3 text-left">Effective Rate</th>
              <th className="px-4 py-3 text-left">Base Rate</th>
              <th className="px-4 py-3 text-left">Margin</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3 text-left">Created</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {history.map((rate) => (
              <tr key={rate.id}>
                <td className="px-4 py-3 font-semibold text-gray-900">
                  ₦{Number(rate.effectiveRateCnyToNgn).toFixed(2)}
                </td>
                <td className="px-4 py-3 text-gray-600">₦{Number(rate.baseRateCnyToNgn).toFixed(2)}</td>
                <td className="px-4 py-3 text-gray-600">{(Number(rate.marginPercent) * 100).toFixed(1)}%</td>
                <td className="px-4 py-3">
                  {rate.isActive ? (
                    <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs font-medium">Active</span>
                  ) : (
                    <span className="px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full text-xs">Inactive</span>
                  )}
                </td>
                <td className="px-4 py-3 text-xs text-gray-400">
                  {new Date(rate.createdAt).toLocaleDateString('en-NG')}
                </td>
              </tr>
            ))}
            {history.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-gray-400">No rate history</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
