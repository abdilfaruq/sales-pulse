import React, { useState, useRef, useEffect } from 'react';
import Avatar from '../assets/avatar.jpg';

function useOutsideClick(ref, handler) {
  useEffect(() => {
    const listener = (e) => {
      if (!ref.current || ref.current.contains(e.target)) return;
      handler(e);
    };
    document.addEventListener('mousedown', listener);
    document.addEventListener('touchstart', listener);
    return () => {
      document.removeEventListener('mousedown', listener);
      document.removeEventListener('touchstart', listener);
    };
  }, [ref, handler]);
}

const notifications = [
  { id: 1, title: 'Notification 1' },
  { id: 2, title: 'Notification 2' },
  { id: 3, title: 'Notification 3' },
];

const messages = [
  { id: 1, title: 'Message 1' },
  { id: 2, title: 'Message 2' },
  { id: 3, title: 'Message 3' },
  { id: 4, title: 'Message 4' },
  { id: 5, title: 'Message 5' },
];
const userMenuItems = [
  { id: 'profile', title: 'Profile', onClick: () => console.log('Navigate to Profile') },
  { id: 'settings', title: 'Settings', onClick: () => console.log('Navigate to Settings') },
  { id: 'logout', title: 'Logout', onClick: () => console.log('Perform Logout') },
];

const Header = ({ sidebarOpen, setSidebarOpen }) => {
  const [notifOpen, setNotifOpen] = useState(false);
  const [msgOpen, setMsgOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const notifRef = useRef(null);
  const msgRef = useRef(null);
  const userRef = useRef(null);

  useOutsideClick(notifRef, () => setNotifOpen(false));
  useOutsideClick(msgRef, () => setMsgOpen(false));
  useOutsideClick(userRef, () => setUserOpen(false));

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setNotifOpen(false);
        setMsgOpen(false);
        setUserOpen(false);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const renderDropdownItem = (item, onClick) => (
    <div
      key={item.id}
      role="menuitem"
      tabIndex={0}
      onClick={() => onClick()}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          onClick();
        }
      }}
      className="px-4 py-2 text-sm text-purple-800 dark:text-purple-200 hover:bg-purple-50 dark:hover:bg-purple-700 cursor-pointer focus:bg-purple-50 dark:focus:bg-purple-700 outline-none transition-colors duration-150"
    >
      {item.title}
    </div>
  );

  return (
    <header className="
      sticky top-0 z-20 flex items-center justify-between
      bg-purple-100/30 dark:bg-purple-900/30 backdrop-blur-lg
      border-b border-purple-200/50 dark:border-purple-700/50
      px-4 py-3"
    >
      <div className="flex items-center">
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          aria-label={sidebarOpen ? 'Tutup sidebar' : 'Buka sidebar'}
          className="lg:hidden text-purple-800 dark:text-purple-200 p-2
                     hover:bg-purple-200/50 dark:hover:bg-purple-800/50
                     rounded-md focus:outline-none focus:ring-2 focus:ring-purple-400 dark:focus:ring-purple-500
                     transition-colors duration-150"
        >
          {sidebarOpen ? (
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          )}
        </button>
      </div>

      <div className="flex items-center space-x-4">
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => {
              setNotifOpen((v) => !v);
              setMsgOpen(false);
              setUserOpen(false);
            }}
            aria-label="Notifications"
            aria-haspopup="menu"
            aria-expanded={notifOpen}
            className="relative p-2
                       bg-purple-50/20 dark:bg-purple-800/20 rounded-full
                       hover:bg-purple-200/60 dark:hover:bg-purple-800/60
                       focus:outline-none focus:ring-2 focus:ring-purple-400 dark:focus:ring-purple-500
                       transition-colors duration-150"
          >
            <svg className="w-6 h-6 text-purple-800 dark:text-purple-200" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
            {notifications.length > 0 && (
              <span className="absolute top-0 right-0 inline-flex items-center justify-center px-1.5 py-0.5 text-xs font-bold leading-none text-white bg-purple-600 rounded-full">
                {notifications.length}
              </span>
            )}
          </button>
          {notifOpen && (
            <div
              role="menu"
              aria-label="Notifikasi"
              className="origin-top-right absolute right-0 mt-2 w-64
                         bg-purple-50/90 dark:bg-purple-900/90
                         border border-purple-200 dark:border-purple-700
                         rounded-lg shadow-lg overflow-hidden z-50 backdrop-blur-lg
                         transition-opacity duration-200"
            >
              {notifications.map((item) =>
                renderDropdownItem(item, () => {
                  console.log('Klik notifikasi:', item);
                  setNotifOpen(false);
                })
              )}
              <div className="px-4 py-2 text-center text-xs text-purple-800 dark:text-purple-200">
                View All
              </div>
            </div>
          )}
        </div>

        <div className="relative" ref={msgRef}>
          <button
            onClick={() => {
              setMsgOpen((v) => !v);
              setNotifOpen(false);
              setUserOpen(false);
            }}
            aria-label="Messages"
            aria-haspopup="menu"
            aria-expanded={msgOpen}
            className="relative p-2
                       bg-purple-50/20 dark:bg-purple-800/20 rounded-full
                       hover:bg-purple-200/60 dark:hover:bg-purple-800/60
                       focus:outline-none focus:ring-2 focus:ring-purple-400 dark:focus:ring-purple-500
                       transition-colors duration-150"
          >
            <svg className="w-6 h-6 text-purple-800 dark:text-purple-200" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4-.8L3 20l1.2-3.8A7.966 7.966 0 013 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            {messages.length > 0 && (
              <span className="absolute top-0 right-0 inline-flex items-center justify-center px-1.5 py-0.5 text-xs font-bold leading-none text-white bg-green-500 rounded-full">
                {messages.length}
              </span>
            )}
          </button>
          {msgOpen && (
            <div
              role="menu"
              aria-label="Pesan"
              className="origin-top-right absolute right-0 mt-2 w-64
                         bg-purple-50/90 dark:bg-purple-900/90
                         border border-purple-200 dark:border-purple-700
                         rounded-lg shadow-lg overflow-hidden z-50 backdrop-blur-lg
                         transition-opacity duration-200"
            >
              {messages.map((item) =>
                renderDropdownItem(item, () => {
                  console.log('Klik pesan:', item);
                  setMsgOpen(false);
                })
              )}
              <div className="px-4 py-2 text-center text-xs text-purple-800 dark:text-purple-200">
                View All
              </div>
            </div>
          )}
        </div>

        <div className="relative" ref={userRef}>
          <button
            onClick={() => {
              setUserOpen((v) => !v);
              setNotifOpen(false);
              setMsgOpen(false);
            }}
            aria-label="User menu"
            aria-haspopup="menu"
            aria-expanded={userOpen}
            className="p-1
                       bg-purple-50/20 dark:bg-purple-800/20 rounded-full
                       hover:bg-purple-200/60 dark:hover:bg-purple-800/60
                       focus:outline-none focus:ring-2 focus:ring-purple-400 dark:focus:ring-purple-500
                       transition-colors duration-150 border-2 border-purple-300 dark:border-purple-500"
          >
            <img
                src={Avatar}
                alt="User avatar"
                className="w-9 h-9 rounded-full object-cover"
            />
          </button>
          {userOpen && (
            <div
              role="menu"
              aria-label="User menu"
              className="origin-top-right absolute right-0 mt-2 w-48
                         bg-purple-50/90 dark:bg-purple-900/90
                         border border-purple-200 dark:border-purple-700
                         rounded-lg shadow-lg overflow-hidden z-50 backdrop-blur-lg
                         transition-opacity duration-200"
            >
              {userMenuItems.map((item) =>
                renderDropdownItem(item, () => {
                  item.onClick();
                  setUserOpen(false);
                })
              )}
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default React.memo(Header);
