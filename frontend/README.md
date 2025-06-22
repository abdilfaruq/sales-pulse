# Sales Pulse Frontend

## 📖 Description

Sales Pulse Frontend is a React-based dashboard for visualizing retail sales analytics powered by the Sales Pulse backend. It provides interactive filters, charts, and reporting components using Plotly, Lottie animations, React Query for data fetching, and Zustand for state management.

Built with:

* React (v19+)
* Vite
* Tailwind CSS
* @tanstack/react-query for data fetching and caching
* Plotly.js via react-plotly.js for interactive charts
* Lottie animations via lottie-react
* react-select for filter dropdowns
* Zustand for global filter state
* react-responsive for responsive behaviors

## 🔥 Key Features

* **Filter Controls**: Select subcategories, products, states, and specify the number of top results to display with cascading menus.
* **Charts**:

  * Pie Chart: distribution of top products or states based on result count.
  * Scatter Plot: correlation (discount vs quantity) by state.
  * Heatmap: sales by state-product.
  * Reporting: time series, KPI summary, and comparison charts using Plotly.
* **Responsive Design**: Tailwind CSS classes and react-responsive ensure layouts adapt to different screen sizes.
* **Data Fetching**: React Query handles fetching, caching, and error/loading states for API calls.
* **State Management**: Zustand store for filter selections (selectedProduct, selectedState, resultCount).
* **Animations**: Lottie animations for loading and decorative elements.
* **Dark Mode Ready**: Tailwind CSS dark classes used throughout.
* **Accessible UI**: Keyboard-friendly dropdowns, ARIA attributes in header/sidebar components.
* **Modular Components**: Reusable components: Header, Sidebar, FilterControls, PieChart, ScatterPlotChart, HeatmapChart, Reporting.

## 📦 Prerequisites

* **Node.js**: v16+ (preferably v18+).
* **npm** or **yarn**.
* Sales Pulse Backend running and accessible; ensure environment variable `VITE_API_BASE_URL` points to backend API (e.g., `http://localhost:3001/api`).

## 🚀 Installation and Setup

1. **Clone Repository**

    ```bash
    # Clone the repository
    git clone https://github.com/abdilfaruq/sales-pulse.git

    # Navigate into the project directory
    cd sales-pulse

    # Go to the frontend folder
    cd frontend

    # Install dependencies
    npm install
    ```

2. **Environment Variables**

   * Create `.env` in project root or use `.env.local`:

     ```env
     VITE_API_BASE_URL=http://localhost:3001/api
     ```
   * Adjust the URL to your deployed backend endpoint.

3. **Development Server**

   ```bash
   npm run dev
   ```

   * Open browser at `http://localhost:5173` (or as shown in terminal).

4. **Build for Production**

   ```bash
   npm run build
   ```

   * Outputs static assets in `dist/`. Deploy to static hosting (Netlify, Vercel, etc.). Ensure CORS on backend allows the frontend origin.

5. **Preview Production Build**

   ```bash
   npm run preview
   ```

## 🌐 Environment Configuration

* **VITE\_API\_BASE\_URL**: Base URL for API calls, e.g., `https://api.yourdomain.com/api`.
* Ensure consistent staging/production URLs in environment.

## 📑 Component Overview

### 1. Header

* Contains:

  * Sidebar toggle button (mobile).
  * Notification icon with dropdown showing notification items and "View All" link.
  * Messages icon with dropdown.
  * User avatar with dropdown for Profile, Settings, Logout.
* Uses `useOutsideClick` hook to close dropdowns when clicking outside.
* Keyboard accessible: ARIA attributes, `onKeyDown` for Enter/Space.

### 2. Sidebar

* Navigation links: Dashboard, Reports, Settings (customize as needed).
* Lottie animation at bottom for decoration.
* Responsive: slides in/out on mobile, always visible on larger screens.

### 3. FilterControls

* Fetches catalog (`/catalog/subcategories-with-products`) and heatmap data to derive state list.
* React Query is used to fetch and cache data; loading and error states handled with Lottie animation.
* Cascading dropdown: first choose subcategory or All Products; if subcategory selected, show products; back button to subcategory.
* State dropdown: list of states from heatmap data.
* Number of top results dropdown: select 5, 10, 15, 20, 50, 100, or All results.
* Reset button to clear filters.
* Styled with Tailwind and custom react-select styles.

### 4. PieChart

* Fetches product sales (`/products/sales`) based on filters.
* Shows distribution: if product selected without state, distribution by state; else distribution by product.
* Limits slices based on selected number of top results, groups rest into "Others".
* Loading/error states with Lottie.
* Uses react-plotly.js for interactive pie chart.

### 5. ScatterPlotChart

* Fetches correlation data (`/sales/correlation`) based on filters.
* Filters data for selected product and top states based on result count.
* For each state, plots quantity vs discount scatter points, with trend line (linear regression calculated in component).
* Responsive legend layout via react-responsive.
* Loading/error/no-data states with Lottie.

### 6. HeatmapChart

* Fetches heatmap data (`/sales/heatmap`) with React Query.
* Filters by selected state/product and number of top results.
* Constructs z-values matrix for Plotly heatmap: rows = product labels, columns = states.
* Shortens long labels, shows full in hover.
* Loading/error/no-data states with Lottie.

### 7. Reporting

* Fetches via `/reports/sales/timeseries`, `/reports/kpi`, `/reports/sales/comparison`.
* Filter bar: Start Date, End Date (clamped to available data range), Interval (day/week/month/year), and toggles: Show KPI, Show Time Series, Show Comparison.
* Date inputs default to full data range (e.g., `2013-01-03` to `2016-12-30`), clamp logic prevents invalid ranges.
* KPI Section: displays total sales, total profit, avg discount, total orders in grid; styled responsively with Tailwind and Lottie for loading/error.
* Time Series Chart: Plotly line chart for sales & profit over time; responsive axes and fonts, margin adjustments to avoid label overlap; loading/error/no-data states handled.
* Comparison Section: Allows selecting two periods by date inputs; shows period1 and period2 metrics and differences for total sales, profit, discount, orders; uses React Query for comparison endpoint; styled grid responsive with Tailwind.

## 🌐 API Integration (services/api.js)

```js
const BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

async function fetchJSON(url, params = {}) {
  const query = new URLSearchParams(params).toString();
  const fullUrl = query ? `${BASE_URL}${url}?${query}` : `${BASE_URL}${url}`;
  const res = await fetch(fullUrl);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to fetch ${url}: ${res.status} ${text}`);
  }
  return res.json();
}

export async function getProductsBySubcategory() {
  return fetchJSON('/catalog/subcategories-with-products');
}
export async function getHeatmapData(params = {}) {
  return fetchJSON('/sales/heatmap', params);
}
export async function getProductSales(params = {}) {
  return fetchJSON('/products/sales', params);
}
export async function getScatterPlotData(params = {}) {
  return fetchJSON('/sales/correlation', params);
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
```

* Ensure `VITE_API_BASE_URL` ends with `/api` or adjust fetch paths accordingly.
* All fetches handle loading, error, and data states in components via React Query.

## 🧩 State Management

* **Zustand store** (`src/store/filterStore.js`):

  ```js
  import { create } from 'zustand';
  export const useFilterStore = create(set => ({
    selectedProduct: null,
    selectedState: null,
    resultCount: 10,
    setSelectedProduct: product => set({ selectedProduct: product }),
    setSelectedState: state => set({ selectedState: state }),
    setResultCount: count => set({ resultCount: count }),
  }));
  ```
* Components import and update filter state. React Query re-fetch triggered by queryKey dependencies (includes filter state values).

## 🎨 Styling & Theming

* **Tailwind CSS** for utility-first styling.
* Responsive font sizes: use `text-xs sm:text-sm text-base sm:text-lg` as in components.
* Container and card backgrounds: semi-transparent backgrounds (`bg-white/70`, `bg-purple-100/20 dark:bg-purple-800/20`, etc.) and backdrop blur for glassmorphic effect.
* Spacing and layout: flex, grid, gap utilities for responsive arrangement.

## 🔄 Data Fetching & Caching

* **React Query** setup: QueryClientProvider wrapped at root (e.g., in `main.jsx`).
* `staleTime` and caching: for filter controls (catalog, heatmapAll), set `staleTime: 10 * 60 * 1000` to reduce refetch frequency.
* Query keys include filter values to automatically refetch when filters change.
* Handle `isLoading`, `isError`, `data` states in UI with Lottie animations and user-friendly messages.

## 🛠 Development & Tooling

* **Vite**: Fast dev server and build.
* **TypeScript**: Project currently in JavaScript; consider migrating to TS for type safety.
* **React DevTools**: Use for debugging component state.
* **Network**: Use browser devtools to inspect API calls.

## 📈 Performance & Optimization

* **Code Splitting**: Lazy-load heavy components (e.g., Plotly charts) if initial bundle size is large.
* **Memoization**: Use React.memo or useMemo for expensive computations (e.g., data transformations) if needed.
* **Bundle Size**: Plotly.js can be large; consider using `react-plotly.js` with only necessary bundles or alternative chart library if size is a concern. Alternatively, use lightweight chart libraries but current spec uses Plotly.
* **Loading UX**: Show skeletons or Lottie animations for data-loading states.
* **Avoid Overfetching**: React Query keys properly configured to avoid redundant requests. For heatmapAll fetch, ensure not repeated unnecessarily.

## 📱 Responsive Design

* Use Tailwind’s responsive utilities (`sm:`, `md:`, etc.) to adjust layouts and font sizes.
* Charts use Plotly’s `responsive: true` and `useResizeHandler` to resize on container changes.
* Sidebar toggles on mobile via `sidebarOpen` state; Header toggler appears only on mobile.

## 🔒 Security & CORS

* **CORS**: Backend must allow requests from frontend origin (`VITE_API_BASE_URL`).
* **Authentication**: If endpoints require auth, add auth token handling in `services/api.js` (e.g., attach Authorization header).
* **Input Sanitization**: Frontend passes user inputs (dates, filters) that get validated server-side; ensure date strings valid format.
* **Sensitive Data**: Do not expose sensitive info in frontend. Only fetch necessary data.

### Integration with Backend

* Confirm backend Cors config matches frontend origin.
* For production, backend URL likely different; update `VITE_API_BASE_URL` accordingly.
* Use relative paths or proxy if deploying both frontend and backend under same domain.

## 🚀 Usage

1. Start backend service.
2. Configure `VITE_API_BASE_URL` to backend API endpoint.
3. Run `npm run dev` for frontend; interact with dashboard at specified port.
4. Build and deploy frontend to static host.
5. Monitor network calls to ensure API endpoints reachable.

## 📝 License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.
