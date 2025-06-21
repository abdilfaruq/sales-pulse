import React, { useState } from 'react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import FilterControls from './components/FilterControls';
import Reporting from './components/Reporting';
import PieChart from './components/PieChart';
import ScatterPlotChart from './components/ScatterPlotChart';
import HeatmapChart from './components/HeatmapChart';
import Lottie from 'lottie-react';
import DashboardAnimation from './assets/Dashboard.json';

function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div
      className="
        flex h-screen 
        bg-gradient-to-br from-purple-200 via-purple-100 to-white 
        overflow-hidden
      "
    >
      <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <div className="flex-1 flex flex-col overflow-hidden">
        <Header sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />

        <main className="flex-1 overflow-auto p-6">
          <div className="max-w-6xl mx-auto space-y-10">
            <div className="mb-6 flex flex-col items-center justify-center space-y-2 sm:flex-row sm:items-center sm:justify-center">
              <h1 className="text-3xl md:text-4xl font-semibold">
                You’re on <span className="text-primary">Sales Pulse</span>
              </h1>
              <div className="mt-3 sm:mt-0">
                <Lottie animationData={DashboardAnimation} autoplay loop style={{ width: 150, height: 150 }} />
              </div>
            </div>
            <div className="
              relative z-10 rounded-xl 
              backdrop-blur-lg p-1
              "
            >
              <FilterControls />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="
                bg-purple-100/20 dark:bg-purple-800/20 
                backdrop-blur-lg 
                border border-purple-200/40 dark:border-purple-700/40
                shadow-lg rounded-xl p-6 
                transition-shadow hover:shadow-2xl flex flex-col
              ">
                <PieChart />
              </div>

              <div className="
                bg-purple-100/20 dark:bg-purple-800/20 
                backdrop-blur-lg 
                border border-purple-200/40 dark:border-purple-700/40
                shadow-lg rounded-xl p-6 
                transition-shadow hover:shadow-2xl flex flex-col
              ">
                <ScatterPlotChart />
              </div>

              <div className="
                bg-purple-100/20 dark:bg-purple-800/20 
                backdrop-blur-lg 
                border border-purple-200/40 dark:border-purple-700/40
                shadow-lg rounded-xl p-6 
                transition-shadow hover:shadow-2xl md:col-span-2 flex flex-col
              ">
                <HeatmapChart />
              </div>
            </div>
            <div className="
                bg-purple-100/20 dark:bg-purple-800/20 
                backdrop-blur-lg 
                border border-purple-200/40 dark:border-purple-700/40
                shadow-lg rounded-xl p-6 
                transition-shadow hover:shadow-2xl flex flex-col
              ">
              <Reporting />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

export default App;
