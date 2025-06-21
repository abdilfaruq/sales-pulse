const BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

async function fetchJSON(url, params = {}) {
  const query = new URLSearchParams(params).toString();

  const fullUrl = query ? `${BASE_URL}${url}?${query}` : `${BASE_URL}${url}`;
  const res = await fetch(fullUrl);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to fetch ${url}: ${res.status} ${text}`);
  }
  const json = await res.json();
  return json;
}

export async function getProductSales(params = {}) {
  return fetchJSON('/products/sales', params);
}

export async function getScatterPlotData(params = {}) {
  return fetchJSON('/sales/correlation', params);
}

export async function getHeatmapData(params = {}) {
  return fetchJSON('/sales/heatmap', params);
}

export async function getProductsBySubcategory() {
  return fetchJSON('/catalog/subcategories-with-products');
}

export async function getSalesTimeSeries(params = {}) {
  return fetchJSON('/reports/sales/timeseries', params);
}

export async function getKPISummary(params = {}) {
  return fetchJSON('/reports/kpi', params);
}

export async function getSalesComparison(params = {}) {
  return fetchJSON('/reports/sales/comparison', params);
}

