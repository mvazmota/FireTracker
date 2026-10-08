// Thin wrapper around the Worker API. Cookies carry the session, so every
// request must include credentials.

async function request(path, options = {}) {
  const response = await fetch(path, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  if (!response.ok) {
    const detail = await response.json().catch(() => ({}))
    throw new Error(detail.error || `Request failed (${response.status})`)
  }
  return response.json().catch(() => ({}))
}

export const api = {
  getState: () => request('/api/state'),

  putTransaction: (transaction) => request(`/api/transactions/${encodeURIComponent(transaction.id)}`, { method: 'PUT', body: JSON.stringify(transaction) }),
  deleteTransaction: (id) => request(`/api/transactions/${encodeURIComponent(id)}`, { method: 'DELETE' }),

  putAsset: (type, record) => request(`/api/assets/${type}/${encodeURIComponent(record.id)}`, { method: 'PUT', body: JSON.stringify(record) }),
  deleteAsset: (type, id) => request(`/api/assets/${type}/${encodeURIComponent(id)}`, { method: 'DELETE' }),

  putRecurring: (rule) => request(`/api/recurring/${encodeURIComponent(rule.id)}`, { method: 'PUT', body: JSON.stringify(rule) }),
  deleteRecurring: (id) => request(`/api/recurring/${encodeURIComponent(id)}`, { method: 'DELETE' }),

  putSettings: (payload) => request('/api/settings', { method: 'PUT', body: JSON.stringify(payload) }),
  importAll: (payload) => request('/api/import', { method: 'POST', body: JSON.stringify(payload) }),
  deleteAccount: () => request('/api/account', { method: 'DELETE' }),

  // Public fund data, looked up from an ISIN and cached by the Worker.
  lookupEtf: (isin) => request(`/api/etf/lookup?isin=${encodeURIComponent(isin)}`),
  etfPrices: (symbol, from) => request(`/api/etf/prices?symbol=${encodeURIComponent(symbol)}&from=${encodeURIComponent(from)}`),

  // The annual cost, which no free feed publishes — typed once per fund.
  saveEtfTer: (isin, ter) => request('/api/etf/ter', { method: 'PUT', body: JSON.stringify({ isin, ter }) }),
}
