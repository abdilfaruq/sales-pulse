import React, { useState, useTransition } from "react";
import Select from "react-select";
import { useFilterStore } from "../store/filterStore";
import { useQuery } from "@tanstack/react-query";
import { getProductsBySubcategory, getHeatmapData } from "../services/api";
import Lottie from "lottie-react";
import loadingAnimation from "../assets/Loading.json";

const FilterControls = () => {
  const [isPending, startTransition] = useTransition();

  const {
    selectedProduct,
    setSelectedProduct,
    selectedState,
    setSelectedState,
    topN,
    setTopN,
  } = useFilterStore();

  const {
    data: catalogData,
    isLoading: isCatalogLoading,
    error: catalogError,
  } = useQuery({
    queryKey: ["catalog"],
    queryFn: () => getProductsBySubcategory(),
    staleTime: 10 * 60 * 1000,
    onError: (err) => console.error("FilterControls catalog error:", err),
  });

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
  const {
    data: heatmapAll,
    isLoading: isStatesLoading,
    error: statesError,
  } = useQuery({
    queryKey: ["heatmapAll"],
    queryFn: fetchAllHeatmap,
    staleTime: 10 * 60 * 1000,
    onError: (err) => console.error("FilterControls heatmapAll error:", err),
  });

  const productsBySub = catalogData?.data || [];
  const statesList = heatmapAll?.data
    ? Array.from(new Set(heatmapAll.data.map((d) => d.state)))
    : [];

  const [level, setLevel] = useState("subcategory");
  const [selectedSubcategory, setSelectedSubcategory] = useState(null);
  const [menuIsOpen, setMenuIsOpen] = useState(false);

  const dedupedSubcategories = Array.from(
    new Map(
      productsBySub.map((sub) => [
        sub.subcategory_name,
        { value: sub.subcategory_id, label: sub.subcategory_name },
      ])
    ).values()
  );
  const subcategoryOptions = dedupedSubcategories;

  const productOptions = selectedSubcategory
    ? productsBySub
        .find((sub) => sub.subcategory_id === selectedSubcategory)
        ?.products.map((p) => ({ value: p.name, label: p.name })) || []
    : [];

  const allProductsOption = { value: null, label: "All Products" };

  let productOptionsToShow = [];
  if (level === "subcategory") {
    productOptionsToShow = [allProductsOption, ...subcategoryOptions];
  } else if (level === "products") {
    productOptionsToShow = [
      { value: "__back", label: "← Back to Subcategories" },
      ...productOptions,
    ];
  }

  const stateOptions = [
    { value: null, label: "All States" },
    ...statesList.map((s) => ({ value: s, label: s })),
  ];

  const topNOptions = [
    { value: 5, label: "Top 5" },
    { value: 10, label: "Top 10" },
    { value: 15, label: "Top 15" },
    { value: 20, label: "Top 20" },
    { value: 50, label: "Top 50" },
    { value: 100, label: "Top 100" },
    { value: null, label: "All" },
  ];

  const handleProductChange = (option) => {
    if (!option) {
      setSelectedProduct(null);
      setLevel("subcategory");
      setSelectedSubcategory(null);
      setMenuIsOpen(false);
      return;
    }
    if (option.value === "__back") {
      setLevel("subcategory");
      setSelectedSubcategory(null);
      setMenuIsOpen(true);
      return;
    }
    if (level === "subcategory") {
      if (option.value === null) {
        setSelectedProduct(null);
        setLevel("subcategory");
        setSelectedSubcategory(null);
        setMenuIsOpen(false);
      } else {
        const isSub = subcategoryOptions.some((sub) => sub.value === option.value);
        if (isSub) {
          setSelectedSubcategory(option.value);
          setLevel("products");
          setMenuIsOpen(true);
        } else {
          setSelectedProduct(option.value);
          setLevel("subcategory");
          setSelectedSubcategory(null);
          setMenuIsOpen(false);
        }
      }
    } else if (level === "products") {
      if (option.value === null) {
        setSelectedProduct(null);
      } else {
        setSelectedProduct(option.value);
      }
      setLevel("subcategory");
      setSelectedSubcategory(null);
      setMenuIsOpen(false);
    }
  };

  const handleStateChange = (option) => {
    setSelectedState(option?.value || null);
  };

  const handleTopNChange = (option) => {
    startTransition(() => {
      setTopN(option?.value ?? null);
    });
  };

  let selectedProductOption = null;
  if (selectedProduct) {
    const found = productsBySub
      .flatMap((sub) =>
        sub.products.map((p) => ({ value: p.name, label: p.name }))
      )
      .find((p) => p.value === selectedProduct);
    selectedProductOption = found || null;
  } else if (level === "subcategory") {
    selectedProductOption = allProductsOption;
  } else {
    selectedProductOption = null;
  }

  const selectedStateOption =
    stateOptions.find((opt) => opt.value === selectedState) || {
      value: null,
      label: "All States",
    };

  const selectedTopNOption =
    topNOptions.find((opt) => opt.value === topN) || topNOptions[1];

  const customStyles = {
    control: (provided, state) => ({
      ...provided,
      borderColor: state.isFocused ? "#8b5cf6" : "#d1d5db",
      boxShadow: state.isFocused ? "0 0 0 2px rgba(139,92,246,0.3)" : "none",
      "&:hover": { borderColor: "#8b5cf6" },
      borderRadius: 12,
      paddingLeft: 8,
      paddingRight: 8,
      minHeight: 40,
      cursor: "pointer",
      backgroundColor: "rgba(255,255,255,0.5)",
    }),
    menu: (provided) => ({
      ...provided,
      zIndex: 9999,
      borderRadius: 12,
      boxShadow: "0 8px 16px rgba(139,92,246,0.25)",
      maxHeight: 300,
    }),
    option: (provided, state) => ({
      ...provided,
      padding: "10px 16px",
      backgroundColor: state.isFocused
        ? "rgba(139,92,246,0.1)"
        : "transparent",
      color: "#4c1d95",
    }),
    singleValue: (provided) => ({
      ...provided,
      color: "#5b21b6",
      fontWeight: 600,
    }),
    clearIndicator: (provided) => ({
      ...provided,
      cursor: "pointer",
      color: "#6b7280",
      "&:hover": { color: "#8b5cf6" },
    }),
    dropdownIndicator: (provided) => ({
      ...provided,
      color: "#6b7280",
      "&:hover": { color: "#8b5cf6" },
    }),
  };

  if (isCatalogLoading || isStatesLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-10">
        <Lottie
          animationData={loadingAnimation}
          loop
          style={{ width: 80, height: 80 }}
        />
        <p className="mt-2 text-purple-700 dark:text-purple-300">Loading filters...</p>
      </div>
    );
  }
  if (catalogError || statesError) {
    console.error("FilterControls load error:", { catalogError, statesError });
    return (
      <div className="flex flex-col items-center justify-center py-10">
        <Lottie
          animationData={loadingAnimation}
          loop
          style={{ width: 80, height: 80 }}
        />
        <p className="mt-2 text-red-600 text-center">
          Failed to load filter data: {catalogError?.message || statesError?.message}
        </p>
      </div>
    );
  }

  const handleReset = () => {
    startTransition(() => {
      setSelectedProduct(null);
      setSelectedState(null);
      setTopN(10);
      setLevel("subcategory");
      setSelectedSubcategory(null);
      setMenuIsOpen(false);
    });
  };

  return (
    <div className="mb-8 px-4 flex flex-col sm:flex-row sm:flex-wrap gap-4 sm:gap-6 items-center justify-center">
      <div className="w-full sm:w-64">
        <Select
          options={productOptionsToShow}
          value={selectedProductOption}
          onChange={handleProductChange}
          isClearable
          placeholder={
            level === "subcategory"
              ? "Select Subcategory or All Products"
              : "Select Product"
          }
          classNamePrefix="react-select"
          aria-label="Filter by Product"
          styles={customStyles}
          noOptionsMessage={() =>
            level === "subcategory"
              ? "No subcategories found"
              : "No products found"
          }
          isSearchable
          filterOption={(candidate, input) =>
            candidate.label.toLowerCase().includes(input.toLowerCase())
          }
          menuIsOpen={menuIsOpen}
          onMenuOpen={() => setMenuIsOpen(true)}
          onMenuClose={() => {
            if (level === "products") {
              setMenuIsOpen(true);
            } else {
              setMenuIsOpen(false);
            }
          }}
          closeMenuOnSelect={false}
        />
      </div>

      <div className="w-full sm:w-48">
        <Select
          options={stateOptions}
          value={selectedStateOption}
          onChange={handleStateChange}
          isClearable
          placeholder="Select State"
          classNamePrefix="react-select"
          aria-label="Filter by State"
          styles={customStyles}
          isSearchable
          noOptionsMessage={() => "No states found"}
          filterOption={(candidate, input) =>
            candidate.label.toLowerCase().includes(input.toLowerCase())
          }
        />
      </div>

      <div className="w-full sm:w-36">
        <Select
          options={topNOptions}
          value={selectedTopNOption}
          onChange={handleTopNChange}
          placeholder="Select Top Results"
          classNamePrefix="react-select"
          aria-label="Select Top Results"
          styles={customStyles}
          isSearchable={false}
          isClearable={false}
        />
      </div>

      <div className="w-full sm:w-auto flex justify-center">
        <button
          onClick={handleReset}
          disabled={isPending}
          className={`
            px-4 py-2 rounded-lg font-medium
            bg-purple-600 text-white
            hover:bg-purple-700
            focus:outline-none focus:ring-2 focus:ring-purple-400
            disabled:opacity-50 disabled:cursor-not-allowed
            transition-colors duration-150
          `}
        >
          Reset Filters
        </button>
      </div>
    </div>
  );
};

export default FilterControls;
