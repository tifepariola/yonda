'use client';

import { useEffect, useState } from 'react';
import { getSettings, updateSettings } from '../../../lib/api';

type Gateway = 'paystack' | 'nomba';

export default function SettingsPage() {
  const [gateway, setGateway] = useState<Gateway>('paystack');
  const [pending, setPending] = useState<Gateway | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    getSettings()
      .then((s) => setGateway(s.paymentGateway as Gateway))
      .catch(() => setError('Failed to load settings'))
      .finally(() => setLoading(false));
  }, []);

  async function handleSave() {
    if (!pending || pending === gateway) return;
    setSaving(true);
    setError(null);
    setSuccess(false);
    try {
      await updateSettings(pending);
      setGateway(pending);
      setPending(null);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (e) {
      setError((e as Error).message ?? 'Failed to save');
    } finally {
      setSaving(false);
    }
  }

  const selected = pending ?? gateway;

  const gateways: { id: Gateway; name: string; description: string; logo: string }[] = [
    {
      id: 'paystack',
      name: 'Paystack',
      description: 'Accept card, bank transfer, and USSD payments via Paystack.',
      logo: '🟢',
    },
    {
      id: 'nomba',
      name: 'Nomba',
      description: 'Accept card, bank transfer, USSD, QR, and mobile money via Nomba Checkout.',
      logo: '🔵',
    },
  ];

  return (
    <div className="p-8 max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Settings</h1>
      <p className="text-sm text-gray-500 mb-8">Configure payment gateway and other system settings.</p>

      <section>
        <h2 className="text-base font-semibold text-gray-800 mb-1">Payment Gateway</h2>
        <p className="text-sm text-gray-500 mb-4">
          New payment links will use the selected gateway. Existing orders are unaffected.
        </p>

        {loading ? (
          <div className="text-sm text-gray-400">Loading…</div>
        ) : (
          <div className="space-y-3">
            {gateways.map((gw) => (
              <button
                key={gw.id}
                type="button"
                onClick={() => setPending(gw.id === gateway ? null : gw.id)}
                className={`w-full text-left flex items-start gap-4 p-4 rounded-xl border-2 transition-colors ${
                  selected === gw.id
                    ? 'border-brand-600 bg-brand-50'
                    : 'border-gray-200 hover:border-gray-300 bg-white'
                }`}
              >
                <span className="text-2xl mt-0.5">{gw.logo}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900">{gw.name}</span>
                    {gateway === gw.id && (
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-green-100 text-green-700">
                        Active
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 mt-0.5">{gw.description}</p>
                </div>
                <div
                  className={`mt-1 w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                    selected === gw.id ? 'border-brand-600' : 'border-gray-300'
                  }`}
                >
                  {selected === gw.id && (
                    <div className="w-2 h-2 rounded-full bg-brand-600" />
                  )}
                </div>
              </button>
            ))}
          </div>
        )}

        {error && (
          <p className="mt-3 text-sm text-red-600">{error}</p>
        )}
        {success && (
          <p className="mt-3 text-sm text-green-600">Settings saved successfully.</p>
        )}

        <div className="mt-5 flex items-center gap-3">
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !pending || pending === gateway}
            className="px-4 py-2 text-sm font-medium text-white bg-brand-600 rounded-lg hover:bg-brand-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
          {pending && pending !== gateway && (
            <button
              type="button"
              onClick={() => setPending(null)}
              className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
            >
              Cancel
            </button>
          )}
        </div>
      </section>
    </div>
  );
}
