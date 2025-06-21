import React from "react";
import { useQuery } from "@tanstack/react-query";
import { useFilterStore } from "../store/filterStore";
import Plot from "react-plotly.js";
import Lottie from "lottie-react";
import loadingAnimation from "../assets/Loading.json";
import { getHeatmapData } from "../services/api";

const HeatmapChart = () => {
  const { selectedProduct, selectedState, topN } = useFilterStore();

  const fetchAllHeatmap = async () => {
    const allItems = [];
    let page = 1;
    const pageSize = 1000;
    while (true) {
      const res = await getHeatmapData({ page, pageSize });
      const items = res.data || [];
      if (!items.length) break;
      allItems.push(...items);
      if (items.length < pageSize) break;
      page += 1;
    }
    return { data: allItems };
  };

  const { data: res, isLoading, error } = useQuery({
    queryKey: ["heatmapSalesAll"],
    queryFn: fetchAllHeatmap,
    staleTime: 10 * 60 * 1000,
    onError: (err) => console.error("HeatmapChart fetch error:", err),
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
    console.error("HeatmapChart error:", error);
    return <p className="text-center text-red-600">Error fetching data.</p>;
  }

  let filtered = data;
  if (selectedState) filtered = filtered.filter((d) => d.state === selectedState);
  if (selectedProduct) filtered = filtered.filter((d) => d.product === selectedProduct);

  const productQty = [...new Set(filtered.map((d) => d.product))].map((product) => {
    const totalQty = filtered
      .filter((d) => d.product === product)
      .reduce((sum, d) => sum + parseInt(d.total_sold, 10), 0);
    return { product, totalQty };
  });
  const sortedQty = productQty.sort((a, b) => b.totalQty - a.totalQty);
  const selectedQty = topN != null ? sortedQty.slice(0, topN) : sortedQty;
  const topProducts = selectedQty.map((p) => p.product);
  filtered = filtered.filter((d) => topProducts.includes(d.product));

  const states = [...new Set(filtered.map((d) => d.state))];
  const fullProducts = [...new Set(filtered.map((d) => d.product))];

  if (fullProducts.length === 0 || states.length === 0) {
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

  const MAX_LABEL_LENGTH = 20;
  const productLabelMap = new Map();
  const shortLabels = fullProducts.map((prod) => {
    const short = prod.length > MAX_LABEL_LENGTH ? prod.slice(0, MAX_LABEL_LENGTH) + "..." : prod;
    productLabelMap.set(short, prod);
    return short;
  });

  const z = shortLabels.map((shortLabel) => {
    const fullLabel = productLabelMap.get(shortLabel);
    return states.map((st) => {
      const found = filtered.find((d) => d.product === fullLabel && d.state === st);
      return found ? parseInt(found.total_sold, 10) : 0;
    });
  });
  const text = shortLabels.map((shortLabel) => {
    const fullLabel = productLabelMap.get(shortLabel);
    return states.map((st) => {
      const found = filtered.find((d) => d.product === fullLabel && d.state === st);
      return found
        ? `Product: ${fullLabel}<br>State: ${st}<br>Sales: ${found.total_sold}`
        : `Product: ${fullLabel}<br>State: ${st}<br>Sales: 0`;
    });
  });

  return (
    <div className="w-full h-64 sm:h-80 md:h-96 flex flex-col">
      <h2 className="text-xl font-extrabold text-gray-900 uppercase tracking-wide text-center mb-2">
        Heatmap of Top {topN != null ? topN : "All"} Product Sales by State
      </h2>
      <div className="flex-1">
        <Plot
          data={[
            {
              z,
              x: states,
              y: shortLabels,
              text,
              type: "heatmap",
              hoverinfo: "text",
              showscale: true,
              hoverongaps: false,
              colorbar: {
                title: {
                  text: "<b>Sales</b>",
                  font: { family: "Segoe UI, sans-serif", size: 14, color: "#2c3e50" },
                },
                tickfont: { size: 10 },
              },
            },
          ]}
          layout={{
            autosize: true,
            margin: { t: 20, b: 40, l: 60, r: 20 },
            paper_bgcolor: "rgba(0,0,0,0)",
            plot_bgcolor: "rgba(0,0,0,0)",
            xaxis: { automargin: true, tickangle: -45 },
            yaxis: { automargin: true },
          }}
          config={{ responsive: true }}
          useResizeHandler={true}
          style={{ width: "100%", height: "100%" }}
        />
      </div>
    </div>
  );
};

export default HeatmapChart;
