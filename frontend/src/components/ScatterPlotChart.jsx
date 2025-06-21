import React from "react";
import { useQuery } from "@tanstack/react-query";
import { useFilterStore } from "../store/filterStore";
import Plot from "react-plotly.js";
import Lottie from "lottie-react";
import loadingAnimation from "../assets/Loading.json";
import { getScatterPlotData } from "../services/api";
import { useMediaQuery } from "react-responsive";

const linearRegression = (x, y) => {
  const n = x.length;
  if (n === 0) return { m: 0, b: 0 };
  const xMean = x.reduce((a, c) => a + c, 0) / n;
  const yMean = y.reduce((a, c) => a + c, 0) / n;
  const num = x.map((xi, i) => (xi - xMean) * (y[i] - yMean)).reduce((a, c) => a + c, 0);
  const den = x.map((xi) => (xi - xMean) ** 2).reduce((a, c) => a + c, 0);
  const m = den === 0 ? 0 : num / den;
  const b = yMean - m * xMean;
  return { m, b };
};

const ScatterPlotChart = () => {
  const { selectedProduct, selectedState, topN } = useFilterStore();
  const isMobile = useMediaQuery({ maxWidth: 639 });

  const { data: res, isLoading, error } = useQuery({
    queryKey: ["salesCorrelation", { state: selectedState, product: selectedProduct, topN }],
    queryFn: () => {
      const params = {};
      if (selectedState) params.state = selectedState;
      params.page = 1;
      params.pageSize = topN != null ? Math.min(topN * 100, 1000) : 1000;
      return getScatterPlotData(params);
    },
    keepPreviousData: true,
    onError: (err) => console.error("ScatterPlotChart fetch error:", err),
  });

  const data = res?.data || [];

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-10">
        <Lottie animationData={loadingAnimation} loop style={{ width: 120, height: 120 }} />
      </div>
    );
  }
  if (error) {
    console.error("ScatterPlotChart error:", error);
    return <p className="text-center text-red-600">Error fetching data.</p>;
  }

  let filtered = data;
  if (selectedProduct) {
    filtered = filtered.filter((d) => d.product === selectedProduct);
  }
  const productQty = [...new Set(filtered.map((d) => d.product))].map((product) => {
    const totalQty = filtered
      .filter((d) => d.product === product)
      .reduce((sum, d) => sum + parseInt(d.quantity, 10), 0);
    return { product, totalQty };
  });
  const sortedQty = productQty.sort((a, b) => b.totalQty - a.totalQty);
  const selectedQty = topN != null ? sortedQty.slice(0, topN) : sortedQty;
  const topProducts = selectedQty.map((p) => p.product);
  filtered = filtered.filter((d) => topProducts.includes(d.product));

  const states = [...new Set(filtered.map((d) => d.state))];
  const traces = states.flatMap((state, i) => {
    const byState = filtered.filter((d) => d.state === state);
    const x = byState.map((d) => parseInt(d.quantity, 10));
    const y = byState.map((d) => parseFloat(d.discount));
    if (x.length === 0) return [];
    const { m, b } = linearRegression(x, y);
    const xMin = Math.min(...x);
    const xMax = Math.max(...x);
    const trendX = [xMin, xMax];
    const trendY = [m * xMin + b, m * xMax + b];
    return [
      {
        x,
        y,
        mode: "markers",
        type: "scatter",
        name: state,
        marker: { opacity: 0.6 },
      },
      {
        x: trendX,
        y: trendY,
        mode: "lines",
        type: "scatter",
        name: `${state} Trend`,
        line: { dash: "dot", width: 2 },
        showlegend: false,
      },
    ];
  });

  if (traces.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10">
        <Lottie animationData={loadingAnimation} loop style={{ width: 120, height: 120 }} />
        <p className="mt-6 text-center text-gray-600 text-lg font-medium">
          No data found for the selected filters.
        </p>
        <p className="text-sm text-gray-400">Try adjusting product or state filters.</p>
      </div>
    );
  }

  const marginLayout = isMobile
    ? { t: 20, b: 100, l: 50, r: 20 }
    : { t: 20, b: 40, l: 50, r: 150 };
  const legendLayout = isMobile
    ? {
        orientation: "h",
        x: 0.5,
        xanchor: "center",
        y: -0.3,
        yanchor: "top",
        title: {
          text: "State",
          font: { size: 12 },
        },
      }
    : {
        orientation: "v",
        x: 1.02,
        xanchor: "left",
        y: 1,
        yanchor: "top",
        title: {
          text: "<b>State</b>",
          font: { family: "Segoe UI, sans-serif", size: 14, color: "#2c3e50" },
        },
      };

  return (
    <div className="w-full h-64 sm:h-80 md:h-96 flex flex-col">
      <h2 className="text-xl font-extrabold text-gray-900 uppercase tracking-wide text-center mb-2">
        Discount vs Quantity by State
      </h2>
      <div className="flex-1 min-h-0">
        <Plot
          data={traces}
          layout={{
            autosize: true,
            margin: marginLayout,
            showlegend: true,
            legend: legendLayout,
            xaxis: {
              title: {
                text: "Quantity Sold",
                font: { size: 12 },
                standoff: 15,
              },
              tickfont: { size: 10 },
              automargin: true,
            },
            yaxis: {
              title: {
                text: "Discount Given",
                font: { size: 12 },
                standoff: 15,
              },
              tickfont: { size: 10 },
              automargin: true,
            },
            paper_bgcolor: "rgba(0,0,0,0)",
            plot_bgcolor: "rgba(0,0,0,0)",
          }}
          config={{ responsive: true }}
          useResizeHandler={true}
          style={{ width: "100%", height: "100%" }}
        />
      </div>
    </div>
  );
};

export default ScatterPlotChart;
