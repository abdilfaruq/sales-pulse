import React from "react";
import { useQuery } from "@tanstack/react-query";
import { useFilterStore } from "../store/filterStore";
import Plot from "react-plotly.js";
import Lottie from "lottie-react";
import loadingAnimation from "../assets/Loading.json";
import { getProductSales } from "../services/api";

const truncate = (str, max = 20) =>
  str.length > max ? str.slice(0, max) + "..." : str;

const PieChart = () => {
  const { selectedProduct, selectedState, topN = null } = useFilterStore();

  const isByState = Boolean(selectedProduct && !selectedState);

  const { data: res, isLoading, error } = useQuery({
    queryKey: ["productSales", { product: selectedProduct, state: selectedState, topN }],
    queryFn: () => {
      const params = {};
      if (selectedProduct) params.product = selectedProduct;
      if (selectedState) params.state = selectedState;
      params.page = 1;
      params.pageSize = topN != null 
        ? Math.min(topN * 2, 1000) 
        : 1000;
      return getProductSales(params);
    },
    keepPreviousData: true,
    onError: (err) => console.error("PieChart fetch error:", err),
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
    return <p className="text-center text-red-600">Error fetching data. Please try again later.</p>;
  }

  const sorted = data
    .slice()
    .sort((a, b) => parseInt(b.total_sold, 10) - parseInt(a.total_sold, 10));
  let pieData;
  if (topN != null) {
    pieData = sorted.slice(0, topN);
  } else {
    const MAX_SLICES = 100;
    if (sorted.length > MAX_SLICES) {
      const main = sorted.slice(0, MAX_SLICES);
      const others = sorted.slice(MAX_SLICES);
      const othersTotal = others.reduce((sum, item) => sum + parseInt(item.total_sold, 10), 0);
      pieData = [...main, {
        ...(isByState ? { state: "Others" } : { product: "Others" }),
        total_sold: othersTotal.toString()
      }];
    } else {
      pieData = sorted;
    }
  }

  if (pieData.length === 0) {
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

  let labels, values, hovertexts;
  if (isByState) {
    labels = pieData.map(item => truncate(item.state));
    values = pieData.map(item => parseInt(item.total_sold, 10));
    hovertexts = pieData.map(item => `${item.state}: ${item.total_sold}`);
  } else {
    labels = pieData.map(item => truncate(item.product));
    values = pieData.map(item => parseInt(item.total_sold, 10));
    if (selectedState) {
      hovertexts = pieData.map(item => `${item.product}: ${item.total_sold}`);
    } else {
      hovertexts = pieData.map(item => `${item.product}: ${item.total_sold}`);
    }
  }

  let titleText;
  if (isByState) {
    titleText = `Sales distribution of "${selectedProduct}" by State`;
  } else if (selectedState) {
    titleText = `Top ${topN != null ? topN : "All"} Products in ${selectedState}`;
  } else {
    titleText = `Top ${topN != null ? topN : "All"} Most Sold Products`;
  }

  return (
    <div className="w-full h-64 sm:h-80 md:h-96 flex flex-col">
      <h2 className="text-xl font-extrabold text-gray-900 uppercase tracking-wide text-center mb-2">
        {titleText}
      </h2>
      <div className="flex-1">
        <Plot
          data={[{
            type: "pie",
            labels,
            values,
            hovertext: hovertexts,
            hoverinfo: "text+value+percent",
            hole: 0.2,
            textinfo: "label+percent",
            textposition: "inside",
          }]}
          layout={{
            autosize: true,
            margin: { t: 0, b: 0, l: 0, r: 0 },
            showlegend: true,
            legend: {
              orientation: "h",
              x: 0.5,
              xanchor: "center",
              y: -0.1,
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

export default PieChart;
