
import React, { useState, useEffect, useCallback, useRef } from 'react';
import Header from './components/Header';
import Footer from './components/Footer';
import Dashboard from './components/Dashboard';
import Notification from './components/Notification';
import AuthPage from './pages/AuthPage';
import AdminPage from './pages/AdminPage';
import EmailVerificationPage from './pages/EmailVerificationPage';
import Modal from './components/Modal';
import { useAuth } from './contexts/AuthContext'; 
import { WithdrawalRequest, NotificationType, NotificationMessage, UserProfile } from './types';
import { THEOREMREACH_API_KEY, WITHDRAWAL_REQUESTS_TABLE } from './constants';
import type { TheoremReachRewardData } from './theoremreach.d';
import type { User as SupabaseUser, AuthError } from '@supabase/supabase-js';
import { supabase } from './supabase';
import XCircleIcon from './components/icons/XCircleIcon';

const App: React.FC = () => {
  const { 
    currentUser, 
    currentUserProfile, 
    logout, 
    isLoading: isAuthLoading, 
    isAdmin,
    addWithdrawalRequestToContext,
    updatePointsInContext,
    getAllUsersWithdrawalRequests, 
    updateUserWithdrawalRequestStatus,
    resendVerificationEmail // from useAuth
  } = useAuth();
  
  console.log('App.tsx Render - currentUser:', currentUser?.id, 'isAdmin:', isAdmin, 'isAuthLoading:', isAuthLoading, 'currentUserProfile exists:', !!currentUserProfile);

  const [notifications, setNotifications] = useState<NotificationMessage[]>([]);
  const [isTheoremReachInitialized, setIsTheoremReachInitialized] = useState(false);
  const [isWithdrawLoading, setIsWithdrawLoading] = useState(false);
  const [lastProcessedTRSessionPoints, setLastProcessedTRSessionPoints] = useState(0);
  const [showLogoutConfirmModal, setShowLogoutConfirmModal] = useState(false);
  const [currentView, setCurrentView] = useState<'dashboard' | 'admin'>('dashboard'); // For main app navigation
  const [userWithdrawalRequests, setUserWithdrawalRequests] = useState<WithdrawalRequest[]>([]);
  const [showSlowLoadOptions, setShowSlowLoadOptions] = useState(false);
  const [logoutTrigger, setLogoutTrigger] = useState(0);

  // New states for email verification flow
  const [showVerificationMessageFor, setShowVerificationMessageFor] = useState<string | null>(null);
  const [authPageInitialMode, setAuthPageInitialMode] = useState<'login' | 'signup'>('login');


  const prevCurrentUserRef = useRef<SupabaseUser | null>(currentUser);
  const slowLoadTimerRef = useRef<number | null>(null);

  // Ref to hold the latest user profile to avoid stale closures in callbacks.
  const currentUserProfileRef = useRef<UserProfile | null>(currentUserProfile);
  useEffect(() => {
    currentUserProfileRef.current = currentUserProfile;
  }, [currentUserProfile]);


  useEffect(() => {
    const showFullScreenLoader = isAuthLoading && !currentUser;

    if (showFullScreenLoader) {
      if (slowLoadTimerRef.current) {
        clearTimeout(slowLoadTimerRef.current);
      }
      slowLoadTimerRef.current = window.setTimeout(() => {
        // Check condition again inside timeout, as state might have changed
        if (isAuthLoading && !currentUser) { 
            console.log("App.tsx: Slow load timer fired for full-screen loader. Setting showSlowLoadOptions to true.");
            setShowSlowLoadOptions(true);
        } else {
            console.log("App.tsx: Slow load timer fired, but full-screen loader condition no longer met.");
        }
      }, 3000); // 3-second timeout for slow load options
    } else {
      if (slowLoadTimerRef.current) {
        clearTimeout(slowLoadTimerRef.current);
        slowLoadTimerRef.current = null;
      }
      setShowSlowLoadOptions(false); // Reset this if full-screen loader is not shown
    }

    return () => {
      if (slowLoadTimerRef.current) {
        clearTimeout(slowLoadTimerRef.current);
      }
    };
  }, [isAuthLoading, currentUser]); // Depend on both isAuthLoading and currentUser

  // If user becomes fully authenticated (logged in, email verified, profile loaded),
  // and we were showing the verification message, clear it.
  useEffect(() => {
    if (currentUser && currentUserProfile && currentUser.email_confirmed_at && showVerificationMessageFor) {
      console.log("App.tsx: User is fully authenticated and profile loaded, clearing verification message prompt.");
      setShowVerificationMessageFor(null);
    }
  }, [currentUser, currentUserProfile, showVerificationMessageFor]);


  useEffect(() => {
    if (!currentUser || !isAdmin) {
        setCurrentView('dashboard');
    }
  }, [currentUser, isAdmin]);

  const addNotification = useCallback((message: string, type: NotificationType) => {
    const newNotification: NotificationMessage = {
      id: crypto.randomUUID(),
      message,
      type,
    };
    setNotifications(prev => [newNotification, ...prev.slice(0, 4)]);
    const timerId = window.setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== newNotification.id));
    }, 5000);
    return () => clearTimeout(timerId);
  }, []);

  const dismissNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  useEffect(() => {
    if (prevCurrentUserRef.current && !currentUser && !isAuthLoading && !showVerificationMessageFor) { // Only show logout if not in verification flow
      console.log("App.tsx: Detected logout (currentUser became null). Showing logout notification.");
      addNotification("You have been logged out successfully.", NotificationType.SUCCESS);
    }
    prevCurrentUserRef.current = currentUser;
  }, [currentUser, isAuthLoading, addNotification, showVerificationMessageFor]);

  useEffect(() => {
    const fetchUserWithdrawals = async () => {
      if (currentUser?.id && currentUser.email_confirmed_at) { // Only fetch if email confirmed
        console.log("App.tsx: Fetching withdrawal requests for user:", currentUser.id);
        const { data, error } = await supabase
          .from(WITHDRAWAL_REQUESTS_TABLE)
          .select('*')
          .eq('user_id', currentUser.id)
          .order('created_at', { ascending: false });

        if (error) {
          console.error("App.tsx: Error fetching user withdrawal requests:", error.message, error);
          addNotification(`Could not load withdrawal history: ${error.message}`, NotificationType.ERROR);
          setUserWithdrawalRequests([]);
        } else {
          setUserWithdrawalRequests(data as WithdrawalRequest[]);
          console.log("App.tsx: User withdrawal requests loaded:", data);
        }
      } else {
        setUserWithdrawalRequests([]);
      }
    };
    fetchUserWithdrawals();
  }, [currentUser, addNotification]);

   useEffect(() => {
    if (!currentUser || !currentUser.id || !currentUser.email_confirmed_at) { // TR only if email confirmed
      if(isTheoremReachInitialized || window.TR) console.log("App.tsx (TR Effect): User logged out, no ID, or email not confirmed. Clearing TheoremReach.");
      setIsTheoremReachInitialized(false);
      if (window.TR) {
        window.TR = undefined; 
      }
      setLastProcessedTRSessionPoints(0); 
      return;
    }

    if (typeof window.TheoremReach === 'undefined') {
      console.warn("App.tsx (TR Effect): TheoremReach SDK script not yet loaded.");
      setIsTheoremReachInitialized(false);
      return;
    }
    
    const theoremReachUserId = currentUser.id; 

    if (window.TR && window.TR.config?.userId !== theoremReachUserId) {
        console.log(`App.tsx (TR Effect): TheoremReach user ID mismatch. Current: ${window.TR.config?.userId}, New: ${theoremReachUserId}. Re-initializing.`);
        setLastProcessedTRSessionPoints(0);
        window.TR = undefined; 
    } else if (isTheoremReachInitialized && window.TR && window.TR.config?.userId === theoremReachUserId) {
        console.log("App.tsx (TR Effect): TheoremReach already initialized for current user.");
        return;
    }
    
    if (!window.TR || (window.TR.config?.userId !== theoremReachUserId)) {
        console.log(`App.tsx (TR Effect): Preparing to initialize TheoremReach for user ID: ${theoremReachUserId}.`);
        setLastProcessedTRSessionPoints(0); 
    
        const onRewardCallback = (data: TheoremReachRewardData) => {
          const currentTRSessionEarnings = data.earnedThisSession || 0;

          setLastProcessedTRSessionPoints(prevProcessedPoints => {
            const newlyEarnedPoints = currentTRSessionEarnings - prevProcessedPoints;
            const userProfile = currentUserProfileRef.current; // Use the ref to get latest profile

            if (newlyEarnedPoints > 0 && userProfile) { 
              console.log(`App.tsx (TR onReward): TheoremReach reported ${currentTRSessionEarnings} total session points. Previously processed: ${prevProcessedPoints}. Newly earned: ${newlyEarnedPoints}`);
              updatePointsInContext(userProfile.points + newlyEarnedPoints)
                .then(success => {
                  if (success) {
                    addNotification(`You earned ${newlyEarnedPoints} points from TheoremReach!`, NotificationType.SUCCESS);
                  } else {
                    addNotification(`Failed to update points after TheoremReach reward.`, NotificationType.ERROR);
                  }
                });
              return currentTRSessionEarnings; 
            } else if (newlyEarnedPoints < 0) {
              console.warn(`App.tsx (TR onReward): TheoremReach reported session earnings (${currentTRSessionEarnings}) less than previously processed (${prevProcessedPoints}). No points adjusted.`);
              return prevProcessedPoints; 
            } else if (newlyEarnedPoints > 0 && !userProfile) {
                console.error("App.tsx (TR onReward): Received TR reward but user profile ref is null. Cannot update points.");
            }
            return prevProcessedPoints;
          });
        };

        try {
          const config = {
            apiKey: THEOREMREACH_API_KEY,
            userId: theoremReachUserId,
            onReward: onRewardCallback,
            onRewardCenterOpened: () => console.log("App.tsx (TR Event): TheoremReach Reward Center Opened"),
            onRewardCenterClosed: () => console.log("App.tsx (TR Event): TheoremReach Reward Center Closed"),
          };
          window.TR = new window.TheoremReach(config);
          setIsTheoremReachInitialized(true);
          console.log("App.tsx (TR Effect): TheoremReach SDK Initialized successfully for user:", theoremReachUserId);
        } catch (sdkError: any) {
          console.error("App.tsx (TR Effect): Failed to initialize TheoremReach SDK:", sdkError.message || sdkError);
          addNotification(`Could not initialize survey provider: ${sdkError.message || 'Unknown error'}`, NotificationType.ERROR);
          setIsTheoremReachInitialized(false);
        }
    }
  }, [currentUser, addNotification, updatePointsInContext, isTheoremReachInitialized]); 


  const handleAccessTheoremReach = useCallback(() => {
    if (isTheoremReachInitialized && window.TR && typeof window.TR.showRewardCenter === 'function') {
      window.TR.showRewardCenter();
    } else {
      addNotification("Survey provider is not ready. Please wait or try logging in again.", NotificationType.INFO);
      console.warn("App.tsx: handleAccessTheoremReach called but TR not ready. isTheoremReachInitialized:", isTheoremReachInitialized, "window.TR:", window.TR);
    }
  }, [isTheoremReachInitialized, addNotification]);

  const handleWithdraw = useCallback(async (paypalEmail: string, pointsToWithdraw: number) => {
    if (!currentUser || !currentUserProfile) {
      addNotification("You must be logged in to make a withdrawal.", NotificationType.ERROR);
      return;
    }
    if (pointsToWithdraw > currentUserProfile.points) {
      addNotification("Insufficient points for this withdrawal.", NotificationType.ERROR);
      return;
    }

    setIsWithdrawLoading(true);
    const requestPayload = {
      paypal_email: paypalEmail,
      points: pointsToWithdraw,
      status: 'Pending Review' as WithdrawalRequest['status'],
    };

    const { request: createdRequest, error: withdrawalError } = await addWithdrawalRequestToContext(requestPayload);

    if (createdRequest) {
      addNotification(`Withdrawal request for ${pointsToWithdraw} points submitted.`, NotificationType.SUCCESS);
      setUserWithdrawalRequests(prev => [createdRequest, ...prev]); 
    } else {
      const errorMessage = withdrawalError instanceof Error ? withdrawalError.message : (withdrawalError as AuthError)?.message || "Withdrawal request failed. Please try again.";
      addNotification(errorMessage, NotificationType.ERROR);
    }
    setIsWithdrawLoading(false);
  }, [currentUser, currentUserProfile, addNotification, addWithdrawalRequestToContext]);

  const handleLogout = useCallback(async () => {
    setShowLogoutConfirmModal(true);
  }, []);

  const confirmLogoutAction = async () => {
    setShowLogoutConfirmModal(false);
    console.log("App.tsx: User confirmed logout. Proceeding with Supabase logout.");
    await logout(); 
    setShowVerificationMessageFor(null); // Clear verification state on logout
    setAuthPageInitialMode('login'); // Reset auth page to login
    console.log("App.tsx: logout() in AuthContext completed. Explicitly hiding slow load options and forcing App.tsx re-evaluation.");
    // setShowSlowLoadOptions(false); // This is handled by useEffect [isAuthLoading, currentUser]
    setLogoutTrigger(prev => prev + 1); 
  };

  const cancelLogoutAction = () => {
    setShowLogoutConfirmModal(false);
  };
  
  // Called on successful LOGIN
  const handleAuthSuccess = () => {
    console.log("App.tsx: AuthPage reported a successful LOGIN event.");
    setShowVerificationMessageFor(null); // Clear verification prompt on successful login
    setCurrentView('dashboard'); 
    setAuthPageInitialMode('login');
  };

  // Called on successful SIGNUP
  const handleSuccessfulSignup = (email: string) => {
    console.log("App.tsx: AuthPage reported a successful SIGNUP event for email:", email);
    setShowVerificationMessageFor(email); // Show verification page
    setAuthPageInitialMode('login'); // Next time AuthPage shows, default to login
  };

  const handleReturnToLoginFromVerification = () => {
    console.log("App.tsx: Returning to login page from verification page.");
    setShowVerificationMessageFor(null);
    setAuthPageInitialMode('login');
  };

  const handleResendVerification = async (email: string) => {
    console.log("App.tsx: Attempting to resend verification for", email);
    const { error } = await resendVerificationEmail(email);
    if (error) {
      addNotification(`Error resending verification: ${error.message}`, NotificationType.ERROR);
    } else {
      addNotification(`Verification email resent to ${email}. Please check your inbox (and spam folder).`, NotificationType.SUCCESS);
    }
  };


  const NotificationStack = () => (
    <div 
      className="fixed top-5 right-5 space-y-3 z-50 w-full max-w-sm"
      aria-live="polite"
      aria-atomic="true"
    >
      {notifications.map(notif => (
         <Notification key={notif.id} notification={notif} onDismiss={dismissNotification} />
      ))}
    </div>
  );
  
  const renderCurrentViewForMainApp = () => {
    // This function assumes currentUserProfile is non-null, which is checked before calling it.
    if (currentView === 'admin' && isAdmin) {
      return <AdminPage 
                getAllRequests={getAllUsersWithdrawalRequests} 
                updateRequestStatus={updateUserWithdrawalRequestStatus}
                addNotification={addNotification}
             />;
    }
    return (
      <Dashboard
        points={currentUserProfile!.points} 
        onEarnPoints={handleAccessTheoremReach} 
        isEarningPointsLoading={!isTheoremReachInitialized} 
        withdrawalRequests={userWithdrawalRequests} 
        onWithdraw={handleWithdraw}
        isWithdrawLoading={isWithdrawLoading}
      />
    );
  };
  
  const renderAppContent = () => {
    // State 1: Full-screen loader if session/user is not yet determined
    if (isAuthLoading && !currentUser) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-slate-100 p-4">
          <div className="flex items-center">
              <svg className="animate-spin h-10 w-10 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <p className="ml-3 text-slate-600">Loading user session...</p>
          </div>
          {showSlowLoadOptions && ( // showSlowLoadOptions is managed by useEffect depending on [isAuthLoading, currentUser]
            <div className="mt-6 text-center">
              <p className="text-sm text-slate-500 mb-4">Taking longer than usual to load...</p>
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={() => window.location.reload()}
                  className="px-5 py-2.5 bg-primary text-white font-semibold rounded-lg hover:bg-primary-dark transition-colors shadow-md focus:outline-none focus:ring-2 focus:ring-primary-light focus:ring-offset-2 w-full sm:w-auto"
                  aria-label="Refresh the page"
                >
                  Refresh Page
                </button>
                <button
                  onClick={handleLogout} 
                  className="px-5 py-2.5 border border-primary text-primary font-semibold rounded-lg hover:bg-primary-light hover:text-white transition-colors shadow-md focus:outline-none focus:ring-2 focus:ring-primary-light focus:ring-offset-2 w-full sm:w-auto"
                  aria-label="Logout from your account"
                >
                  Logout
                </button>
              </div>
            </div>
          )}
        </div>
      );
    }
  
    // State 2: Post-signup email verification flow
    if (showVerificationMessageFor && (!currentUser || !currentUser.email_confirmed_at || !currentUserProfile)) {
      return (
        <>
          <EmailVerificationPage 
            email={showVerificationMessageFor} 
            onGoToLogin={handleReturnToLoginFromVerification}
            onResendVerification={handleResendVerification}
            addNotification={addNotification}
          />
          <NotificationStack />
        </>
      );
    }
  
    // State 3: No user authenticated, show AuthPage
    if (!currentUser) {
      return (
        <>
          <AuthPage 
            onAuthSuccess={handleAuthSuccess} 
            onSuccessfulSignup={handleSuccessfulSignup}
            addNotification={addNotification} 
            initialMode={authPageInitialMode}
          />
          <NotificationStack />
        </>
      );
    }
  
    // currentUser IS defined from here onwards.
  
    // State 4: User exists but email not confirmed
    if (!currentUser.email_confirmed_at) {
       return (
        <>
          <EmailVerificationPage 
            email={currentUser.email || 'your email'} 
            onGoToLogin={handleReturnToLoginFromVerification} 
            onResendVerification={handleResendVerification}
            addNotification={addNotification}
          />
          <NotificationStack />
        </>
      );
    }

    // currentUser exists AND email is confirmed.

    // State 5: Profile is actively being loaded (isAuthLoading is true, but profile not yet available)
    // Show App Shell with an inline loader for the main content area.
    if (isAuthLoading && !currentUserProfile) { 
      return (
        <div className="flex flex-col min-h-screen bg-slate-100 text-slate-800 font-sans">
          <Header 
            onLogout={handleLogout} 
            userEmail={currentUser.email} 
            isAdmin={isAdmin}
            onNavigateToAdmin={() => setCurrentView('admin')}
            onNavigateToDashboard={() => setCurrentView('dashboard')}
            currentView={currentView} // Or a default/neutral view like 'dashboard'
          />
          <main className="flex-grow container mx-auto px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10 flex flex-col items-center justify-center">
            <svg className="animate-spin h-10 w-10 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <p className="mt-3 text-slate-600">Loading your data...</p>
          </main>
          <NotificationStack />
          <Footer />
        </div>
      );
    }
    
    // State 6: Profile fetch completed (isAuthLoading is false OR it became true but profile is still null), but profile is null (error state)
    if (!currentUserProfile) { 
       console.error("App.tsx: Rendering 'Error Loading User Data' page. currentUser exists and email confirmed, but currentUserProfile is null. This often indicates an RLS issue with the 'profiles' table or a failed profile creation/fetch. Check AuthContext logs.");
       return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-slate-100 p-4 text-center">
          <XCircleIcon className="h-16 w-16 text-red-500 mx-auto mb-6" />
          <h2 className="text-3xl font-semibold text-slate-800 mb-3">Error Loading User Data</h2>
          <p className="text-slate-600 mb-8 max-w-md">
            We encountered an issue loading your profile. This can happen if your email is verified but the profile setup failed.
            Please try refreshing or logging out and back in.
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-3 bg-primary text-white font-semibold rounded-lg hover:bg-primary-dark transition-colors shadow-md focus:outline-none focus:ring-2 focus:ring-primary-light focus:ring-offset-2 w-full sm:w-auto"
            >
              Refresh Page
            </button>
            <button
              onClick={handleLogout} 
              className="px-6 py-3 border border-primary text-primary font-semibold rounded-lg hover:bg-primary-light hover:text-white transition-colors shadow-md focus:outline-none focus:ring-2 focus:ring-primary-light focus:ring-offset-2 w-full sm:w-auto"
            >
              Logout
            </button>
          </div>
           <p className="mt-8 text-sm text-slate-500">
              If the problem persists, please check the browser console for error details from `AuthContext` and contact support.
          </p>
           <NotificationStack /> {/* Added here for consistency */}
        </div>
      );
    }
    
    // State 7: All good: currentUser, email_confirmed_at, currentUserProfile are available.
    // Main application view:
    return (
      <div className="flex flex-col min-h-screen bg-slate-100 text-slate-800 font-sans">
        <Header 
          onLogout={handleLogout} 
          userEmail={currentUser.email} 
          isAdmin={isAdmin}
          onNavigateToAdmin={() => setCurrentView('admin')}
          onNavigateToDashboard={() => setCurrentView('dashboard')}
          currentView={currentView}
        />
        <main className="flex-grow container mx-auto px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
          {renderCurrentViewForMainApp()}
        </main>
        <NotificationStack />
        <Footer />
      </div>
    );
  };

  const shouldRenderLogoutModal = (currentUser || (isAuthLoading && !currentUser && showSlowLoadOptions)) && !showVerificationMessageFor;


  return (
    <>
      {renderAppContent()}
      {shouldRenderLogoutModal && (
        <Modal
          isOpen={showLogoutConfirmModal}
          onClose={cancelLogoutAction}
          onConfirm={confirmLogoutAction}
          title="Confirm Logout"
          confirmText="Logout"
          confirmButtonClass="bg-red-600 hover:bg-red-700 focus:ring-red-500"
        >
          <p>Are you sure you want to log out of your account?</p>
        </Modal>
      )}
    </>
  );
};

export default App;
