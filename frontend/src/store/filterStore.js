import { create } from "zustand";

export const useFilterStore = create((set) => ({
  selectedProduct: null,
  selectedState: null,
  topN: 10,

  setSelectedProduct: (product) => set({ selectedProduct: product }),
  setSelectedState: (state) => set({ selectedState: state }),
  setTopN: (n) => set({ topN: n }),
}));
