import React from 'react';
import Lottie from 'lottie-react';
import chartAnimation from '../assets/Chart.json';

const links = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M3 12l2-2m0 0l7-7 7 7M13 5v6h6m-6 0l-7 7h14l-7-7z" />
      </svg>
    ),
  },
  {
    id: 'reports',
    label: 'Reports',
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M9 17v-6a2 2 0 012-2h2a2 2 0 012 2v6m-6 0h6m-6 4h6" />
      </svg>
    ),
  },
  {
    id: 'settings',
    label: 'Settings',
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
        <circle cx="12" cy="12" r="3" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} />
        <path
          strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33
             1.65 1.65 0 00-1 1.51V21a2 2 0 11-4 0v-.09a1.65 1.65 0 00-1-1.51 
             1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82
             1.65 1.65 0 00-1.51-1H3a2 2 0 110-4h.09a1.65 1.65 0 001.51-1
             1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06a1.65 1.65 0 001.82.33
             H9a1.65 1.65 0 001-1.51V3a2 2 0 114 0v.09a1.65 1.65 0 001 1.51 
             1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82
             V9a1.65 1.65 0 001.51 1H21a2 2 0 110 4h-.09a1.65 1.65 0 00-1.51 1z"
        />
      </svg>
    ),
  },
];

const Sidebar = ({ sidebarOpen, setSidebarOpen }) => {
  return (
    <div>
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 md:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside
        className={`
            fixed top-0 left-0 z-40 w-64 h-screen flex flex-col transform
            bg-purple-900/30 dark:bg-purple-900/90 backdrop-blur-lg
            border-r border-purple-900/50 dark:border-purple-900/50
            transition-transform duration-300 ease-in-out
            ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
            md:translate-x-0 md:static
        `}
        role="navigation"
        aria-label="Sidebar"
      >
        <div className="flex items-center justify-between px-4 py-4">
          <span
            className="
              text-2xl font-bold tracking-wide
              bg-gradient-to-r from-purple-500 via-pink-500 to-indigo-500
              bg-[length:200%_200%] bg-clip-text text-transparent
              animate-gradient-x
              transition-transform duration-300
              hover:animate-pulse-scale
            "
          >
            Sales Pulse
          </span>

          <button
            onClick={() => setSidebarOpen(false)}
            aria-label="Tutup sidebar"
            className="
              md:hidden text-purple-600 dark:text-purple-300 p-2
              hover:bg-purple-200/50 dark:hover:bg-purple-800/50
              rounded-md focus:outline-none focus:ring-2 focus:ring-purple-400 dark:focus:ring-purple-500
              transition-colors duration-150
            "
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <nav
          aria-label="Sidebar navigation"
          className="flex-1 flex flex-col justify-center overflow-y-auto sidebar-scroll"
        >
          <ul className="space-y-1">
            {links.map(({ id, label, icon }) => (
              <li key={id}>
                <button
                  onClick={() => {
                    setSidebarOpen(false);
                  }}
                  className="
                    w-full flex items-center px-4 py-3 text-base font-medium
                    text-purple-800 dark:text-purple-200
                    hover:bg-purple-200/50 dark:hover:bg-purple-800/50
                    focus:outline-none focus:bg-purple-200/50 dark:focus:bg-purple-800/50
                    transition-colors duration-200
                  "
                  type="button"
                >
                  <span className="mr-3 text-purple-800 dark:text-purple-200">
                    {React.cloneElement(icon, {
                      className: 'w-5 h-5 text-current',
                    })}
                  </span>
                  <span>{label}</span>
                </button>
              </li>
            ))}
          </ul>
        </nav>

        <div className="px-4 py-4">
          <div className="w-full flex justify-center">
            <Lottie 
              animationData={chartAnimation} 
              autoplay 
              loop 
              style={{ width: 140, height: 140 }} 
            />
          </div>
        </div>
      </aside>
    </div>
  );
};

export default React.memo(Sidebar);
