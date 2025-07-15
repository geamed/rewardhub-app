
import React from 'react';
import { APP_NAME } from './constants';
import GiftIcon from './GiftIcon';
import LogoutIcon from './LogoutIcon';
import ShieldCheckIcon from './ShieldCheckIcon'; // Import admin icon

interface HeaderProps {
  onLogout: () => void;
  userEmail?: string | null; // Firebase user email can be null
  isAdmin: boolean;
  onNavigateToAdmin?: () => void; // Callback to navigate to admin panel
  onNavigateToDashboard?: () => void; // Callback to navigate to dashboard
  currentView: 'dashboard' | 'admin'; // To highlight active link
}

const Header: React.FC<HeaderProps> = ({ onLogout, userEmail, isAdmin, onNavigateToAdmin, onNavigateToDashboard, currentView }) => {
  return (
    <header className="bg-primary-dark shadow-md">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <GiftIcon className="h-8 w-8 text-white" />
            <button 
              onClick={onNavigateToDashboard}
              className="text-2xl sm:text-3xl font-bold text-white focus:outline-none focus:ring-2 focus:ring-primary-light rounded-md"
              aria-label="Go to dashboard"
            >
              {APP_NAME}
            </button>
          </div>
          
          <div className="flex items-center space-x-3 sm:space-x-4">
            {isAdmin && onNavigateToAdmin && onNavigateToDashboard && (
              <>
                <button
                    onClick={onNavigateToDashboard}
                    title="Dashboard"
                    aria-label="Dashboard"
                    className={`text-sm font-medium px-3 py-2 rounded-md transition-colors duration-150 ${currentView === 'dashboard' ? 'bg-primary text-white' : 'text-primary-light hover:bg-primary hover:text-white'}`}
                >
                    Dashboard
                </button>
                <button
                  onClick={onNavigateToAdmin}
                  title="Admin Panel"
                  aria-label="Admin Panel"
                  className={`flex items-center space-x-1.5 text-sm font-medium px-3 py-2 rounded-md transition-colors duration-150 ${currentView === 'admin' ? 'bg-primary text-white' : 'text-primary-light hover:bg-primary hover:text-white'}`}
                >
                  <ShieldCheckIcon className="h-5 w-5" />
                  <span>Admin</span>
                </button>
                <span className="text-slate-500 hidden sm:inline">|</span>
              </>
            )}

            {userEmail ? (
              <>
                <span className="text-sm text-primary-light hidden sm:inline">{userEmail}</span>
                <button
                  onClick={() => {
                    console.log("Header.tsx: Logout button clicked. Type of onLogout:", typeof onLogout);
                    if (typeof onLogout === 'function') {
                      onLogout();
                    } else {
                      console.error("Header.tsx: onLogout prop is not a function!", onLogout);
                      alert("Logout action is currently unavailable. Please contact support. (Error: CB_NF)");
                    }
                  }}
                  title="Logout"
                  aria-label="Logout"
                  className="flex items-center space-x-2 text-white hover:text-primary-light focus:outline-none focus:ring-2 focus:ring-primary-light rounded-md p-2 transition-colors duration-150"
                >
                  <LogoutIcon className="h-6 w-6" />
                  <span className="hidden sm:inline text-sm font-medium">Logout</span>
                </button>
              </>
            ) : (
              <div className="flex items-center space-x-2">
                  <span className="text-white text-sm">Please log in or sign up</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
