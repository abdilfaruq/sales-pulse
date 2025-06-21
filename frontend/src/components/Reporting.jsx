import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import Plot from 'react-plotly.js';
import Lottie from 'lottie-react';
import loadingAnimation from '../assets/Loading.json';
import { getSalesTimeSeries, getKPISummary, getSalesComparison } from '../services/api';

export default function Reporting() {
  const minDate = '2013-01-03';
  const maxDate = '2016-12-30';

  const [startDate, setStartDate] = useState(minDate);
  const [endDate, setEndDate] = useState(maxDate);

  const [interval, setInterval] = useState('month');
  const [showKPI, setShowKPI] = useState(true);
  const [showTS, setShowTS] = useState(true);

  const [showComp, setShowComp] = useState(false);
  const defaultP1Start = '2013-01-03';
  const defaultP1End = '2014-01-02';
  const defaultP2Start = '2014-01-03';
  const defaultP2End = '2015-01-02';

  const [period1Start, setPeriod1Start] = useState(defaultP1Start);
  const [period1End, setPeriod1End] = useState(defaultP1End);
  const [period2Start, setPeriod2Start] = useState(defaultP2Start);
  const [period2End, setPeriod2End] = useState(defaultP2End);

  const tsQuery = useQuery({
    queryKey: ['ts', startDate, endDate, interval],
    queryFn: () => getSalesTimeSeries({ start_date: startDate, end_date: endDate, interval }),
    enabled: Boolean(startDate && endDate && showTS),
  });

  const kpiQuery = useQuery({
    queryKey: ['kpi', startDate, endDate],
    queryFn: () => getKPISummary({ start_date: startDate, end_date: endDate }),
    enabled: Boolean(startDate && endDate && showKPI),
  });

  const compQuery = useQuery({
    queryKey: ['comp', period1Start, period1End, period2Start, period2End],
    queryFn: () =>
      getSalesComparison({
        period1_start: period1Start,
        period1_end: period1End,
        period2_start: period2Start,
        period2_end: period2End,
      }),
    enabled:
      showComp &&
      Boolean(period1Start && period1End && period2Start && period2End),
  });

  const rawData = tsQuery.data?.data || [];
  const xLabels = rawData.map(item => {
    const dateObj = new Date(`${item.period}T00:00:00Z`);
    return dateObj.toLocaleString('default', { month: 'short', year: 'numeric' });
  });
  const ySales = rawData.map(item => item.total_sales);
  const yProfit = rawData.map(item => item.total_profit);

  const clampDate = (v, low, high) => {
    if (!v) return '';
    if (low && v < low) return low;
    if (high && v > high) return high;
    return v;
  };

  return (
    <div className="rounded-xl p-6">
      <h2 className="text-lg sm:text-xl md:text-xl font-extrabold text-gray-900 uppercase tracking-wide text-center mb-4">
        Reporting
      </h2>

      <div className="flex flex-wrap gap-4 items-end mb-6">
        <div>
          <label className="block text-xs sm:text-sm">Start Date</label>
          <input
            type="date"
            className="border rounded px-2 py-1 text-xs sm:text-sm"
            value={startDate}
            min={minDate}
            max={endDate || maxDate}
            onChange={e => {
              const v = clampDate(e.target.value, minDate, endDate || maxDate);
              setStartDate(v);
            }}
          />
        </div>
        <div>
          <label className="block text-xs sm:text-sm">End Date</label>
          <input
            type="date"
            className="border rounded px-2 py-1 text-xs sm:text-sm"
            value={endDate}
            min={startDate || minDate}
            max={maxDate}
            onChange={e => {
              const v = clampDate(e.target.value, startDate || minDate, maxDate);
              setEndDate(v);
            }}
          />
        </div>
        <div>
          <label className="block text-xs sm:text-sm">Interval</label>
          <select
            className="border rounded px-2 py-1 text-xs sm:text-sm"
            value={interval}
            onChange={e => setInterval(e.target.value)}
          >
            <option value="day">Day</option>
            <option value="week">Week</option>
            <option value="month">Month</option>
            <option value="year">Year</option>
          </select>
        </div>
        <div className="flex items-center space-x-2 mt-6">
          <label className="flex items-center space-x-1 text-xs sm:text-sm">
            <input
              type="checkbox"
              checked={showKPI}
              onChange={e => setShowKPI(e.target.checked)}
            />
            <span>Show KPI</span>
          </label>
          <label className="flex items-center space-x-1 text-xs sm:text-sm">
            <input
              type="checkbox"
              checked={showTS}
              onChange={e => setShowTS(e.target.checked)}
            />
            <span>Show Time Series</span>
          </label>
          <label className="flex items-center space-x-1 text-xs sm:text-sm">
            <input
              type="checkbox"
              checked={showComp}
              onChange={e => setShowComp(e.target.checked)}
            />
            <span>Show Comparison</span>
          </label>
        </div>
      </div>

      {showKPI && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {kpiQuery.isLoading && (
            <div className="flex flex-col items-center justify-center py-10">
              <Lottie animationData={loadingAnimation} loop style={{ width: 80, height: 80 }} />
              <p className="mt-2 text-purple-700 text-sm sm:text-base">Loading KPI...</p>
            </div>
          )}
          {kpiQuery.isError && (
            <div className="flex flex-col items-center justify-center py-10">
              <Lottie animationData={loadingAnimation} loop style={{ width: 80, height: 80 }} />
              <p className="mt-2 text-red-600 text-center text-sm sm:text-base">
                Failed to load KPI: {kpiQuery.error.message}
              </p>
            </div>
          )}
          {kpiQuery.data && (
            <>
              <div className="p-4 border rounded-lg bg-white/70">
                <p className="text-xs sm:text-sm text-gray-500">Total Sales</p>
                <p className="text-lg sm:text-xl font-semibold">
                  {kpiQuery.data.data.total_sales.toLocaleString()}
                </p>
              </div>
              <div className="p-4 border rounded-lg bg-white/70">
                <p className="text-xs sm:text-sm text-gray-500">Total Profit</p>
                <p className="text-lg sm:text-xl font-semibold">
                  {kpiQuery.data.data.total_profit.toLocaleString()}
                </p>
              </div>
              <div className="p-4 border rounded-lg bg-white/70">
                <p className="text-xs sm:text-sm text-gray-500">Avg Discount</p>
                <p className="text-lg sm:text-xl font-semibold">
                  {(kpiQuery.data.data.avg_discount * 100).toFixed(2)}%
                </p>
              </div>
              <div className="p-4 border rounded-lg bg-white/70">
                <p className="text-xs sm:text-sm text-gray-500">Total Orders</p>
                <p className="text-lg sm:text-xl font-semibold">
                  {kpiQuery.data.data.total_orders}
                </p>
              </div>
            </>
          )}
        </div>
      )}

      {showTS && (
        <div className="w-full h-64 sm:h-80 md:h-96 flex flex-col mb-6">
          <h3 className="text-base sm:text-lg md:text-xl font-extrabold text-gray-900 uppercase tracking-wide text-center mb-2">
            Sales & Profit Over Time
          </h3>
          {tsQuery.isLoading && (
            <div className="flex flex-col items-center justify-center flex-1">
              <Lottie animationData={loadingAnimation} loop style={{ width: 120, height: 120 }} />
              <p className="mt-2 text-purple-700 text-sm sm:text-base">Loading Time Series...</p>
            </div>
          )}
          {tsQuery.isError && (
            <div className="flex flex-col items-center justify-center flex-1">
              <Lottie animationData={loadingAnimation} loop style={{ width: 120, height: 120 }} />
              <p className="mt-2 text-red-600 text-center text-sm sm:text-base">
                Error loading Time Series: {tsQuery.error.message}
              </p>
            </div>
          )}
          {!tsQuery.isLoading && !tsQuery.isError && xLabels.length === 0 && (
            <div className="flex flex-col items-center justify-center flex-1">
              <Lottie animationData={loadingAnimation} loop style={{ width: 120, height: 120 }} />
              <p className="mt-2 text-base sm:text-lg font-medium">
                No data found for the selected range.
              </p>
              <p className="text-xs sm:text-sm text-gray-400">Try adjusting the date filters.</p>
            </div>
          )}
          {!tsQuery.isLoading && !tsQuery.isError && xLabels.length > 0 && (
            <div className="flex-1">
              <Plot
                data={[
                  {
                    x: xLabels,
                    y: ySales,
                    mode: 'lines+markers',
                    name: 'Sales',
                    line: { shape: 'linear', color: '#7c3aed' },
                  },
                  {
                    x: xLabels,
                    y: yProfit,
                    mode: 'lines+markers',
                    name: 'Profit',
                    line: { shape: 'linear', color: '#10b981' },
                    yaxis: 'y2',
                  },
                ]}
                layout={{
                  autosize: true,
                  margin: { t: 20, b: 80, l: 50, r: 50 },
                  xaxis: {
                    title: '',
                    tickangle: -45,
                    automargin: true,
                    tickfont: { size: 10 },
                  },
                  yaxis: {
                    title: 'Sales',
                    rangemode: 'tozero',
                    domain: [0.15, 1],
                    tickfont: { size: 10 },
                  },
                  yaxis2: {
                    title: 'Profit',
                    overlaying: 'y',
                    side: 'right',
                    rangemode: 'tozero',
                    domain: [0.15, 1],
                    tickfont: { size: 10 },
                  },
                  legend: { orientation: 'h', x: 0.5, xanchor: 'center', y: -0.2, font: { size: 10 } },
                  paper_bgcolor: 'rgba(0,0,0,0)',
                  plot_bgcolor: 'rgba(0,0,0,0)',
                }}
                config={{ responsive: true, displayModeBar: false }}
                style={{ width: '100%', height: '100%' }}
                useResizeHandler={true}
              />
            </div>
          )}
        </div>
      )}

      {showComp && (
        <div className="mb-6">
          <h3 className="text-base sm:text-lg md:text-xl font-extrabold text-gray-900 uppercase tracking-wide text-center mb-2">
            Sales Comparison
          </h3>

          <div className="flex flex-wrap gap-4 items-end mb-4 justify-center">
            <div>
              <p className="text-xs sm:text-sm font-semibold text-gray-700">Period 1</p>
              <div className="flex space-x-2">
                <input
                  type="date"
                  className="border rounded px-2 py-1 text-xs sm:text-sm"
                  value={period1Start}
                  min={minDate}
                  max={period1End || maxDate}
                  onChange={e => {
                    const v = clampDate(e.target.value, minDate, period1End || maxDate);
                    setPeriod1Start(v);
                  }}
                />
                <span className="text-xs sm:text-sm">to</span>
                <input
                  type="date"
                  className="border rounded px-2 py-1 text-xs sm:text-sm"
                  value={period1End}
                  min={period1Start || minDate}
                  max={maxDate}
                  onChange={e => {
                    const v = clampDate(e.target.value, period1Start || minDate, maxDate);
                    setPeriod1End(v);
                  }}
                />
              </div>
            </div>
            <div>
              <p className="text-xs sm:text-sm font-semibold text-gray-700">Period 2</p>
              <div className="flex space-x-2">
                <input
                  type="date"
                  className="border rounded px-2 py-1 text-xs sm:text-sm"
                  value={period2Start}
                  min={minDate}
                  max={period2End || maxDate}
                  onChange={e => {
                    const v = clampDate(e.target.value, minDate, period2End || maxDate);
                    setPeriod2Start(v);
                  }}
                />
                <span className="text-xs sm:text-sm">to</span>
                <input
                  type="date"
                  className="border rounded px-2 py-1 text-xs sm:text-sm"
                  value={period2End}
                  min={period2Start || minDate}
                  max={maxDate}
                  onChange={e => {
                    const v = clampDate(e.target.value, period2Start || minDate, maxDate);
                    setPeriod2End(v);
                  }}
                />
              </div>
            </div>
          </div>

          {compQuery.isLoading && (
            <div className="flex flex-col items-center justify-center py-10">
              <Lottie animationData={loadingAnimation} loop style={{ width: 80, height: 80 }} />
              <p className="mt-2 text-purple-700 text-sm sm:text-base">Loading Comparison...</p>
            </div>
          )}
          {compQuery.isError && (
            <div className="flex flex-col items-center justify-center py-10">
              <Lottie animationData={loadingAnimation} loop style={{ width: 80, height: 80 }} />
              <p className="mt-2 text-red-600 text-center text-sm sm:text-base">
                Error loading Comparison: {compQuery.error.message}
              </p>
            </div>
          )}
          {!compQuery.isLoading && !compQuery.isError && compQuery.data && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 border rounded-lg bg-white/70">
                <p className="text-xs sm:text-sm text-gray-500">Period 1 ({period1Start} to {period1End})</p>
                <div className="mt-2 space-y-1">
                  <p className="text-sm sm:text-base">Total Sales: <span className="font-semibold">{compQuery.data.data.period1.total_sales.toLocaleString()}</span></p>
                  <p className="text-sm sm:text-base">Total Profit: <span className="font-semibold">{compQuery.data.data.period1.total_profit.toLocaleString()}</span></p>
                  <p className="text-sm sm:text-base">Avg Discount: <span className="font-semibold">{(compQuery.data.data.period1.avg_discount * 100).toFixed(2)}%</span></p>
                  <p className="text-sm sm:text-base">Total Orders: <span className="font-semibold">{compQuery.data.data.period1.total_orders}</span></p>
                </div>
              </div>
              <div className="p-4 border rounded-lg bg-white/70">
                <p className="text-xs sm:text-sm text-gray-500">Period 2 ({period2Start} to {period2End})</p>
                <div className="mt-2 space-y-1">
                  <p className="text-sm sm:text-base">Total Sales: <span className="font-semibold">{compQuery.data.data.period2.total_sales.toLocaleString()}</span></p>
                  <p className="text-sm sm:text-base">Total Profit: <span className="font-semibold">{compQuery.data.data.period2.total_profit.toLocaleString()}</span></p>
                  <p className="text-sm sm:text-base">Avg Discount: <span className="font-semibold">{(compQuery.data.data.period2.avg_discount * 100).toFixed(2)}%</span></p>
                  <p className="text-sm sm:text-base">Total Orders: <span className="font-semibold">{compQuery.data.data.period2.total_orders}</span></p>
                </div>
              </div>
              <div className="p-4 border rounded-lg bg-white/70">
                <p className="text-xs sm:text-sm text-gray-500">Difference (2 − 1)</p>
                <div className="mt-2 space-y-1">
                  <p className="text-sm sm:text-base">Sales Diff: <span className={`font-semibold ${compQuery.data.data.diff.sales_diff >= 0 ? 'text-green-600' : 'text-red-600'}`}>{compQuery.data.data.diff.sales_diff.toLocaleString()}</span></p>
                  <p className="text-sm sm:text-base">Profit Diff: <span className={`font-semibold ${compQuery.data.data.diff.profit_diff >= 0 ? 'text-green-600' : 'text-red-600'}`}>{compQuery.data.data.diff.profit_diff.toLocaleString()}</span></p>
                  <p className="text-sm sm:text-base">Avg Discount Diff: <span className="font-semibold">{(compQuery.data.data.diff.avg_discount_diff * 100).toFixed(2)}%</span></p>
                  <p className="text-sm sm:text-base">Orders Diff: <span className={`font-semibold ${compQuery.data.data.diff.orders_diff >= 0 ? 'text-green-600' : 'text-red-600'}`}>{compQuery.data.data.diff.orders_diff}</span></p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function clampDate(v, low, high) {
  if (!v) return '';
  if (low && v < low) return low;
  if (high && v > high) return high;
  return v;
}
