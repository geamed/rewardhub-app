
import React, { useState } from 'react';
import { APP_NAME } from '../constants';
import GiftIcon from '../components/icons/GiftIcon';
import { NotificationType } from '../types';

interface EmailVerificationPageProps {
  email: string;
  onGoToLogin: () => void;
  onResendVerification: (email: string) => Promise<void>; // Make it a promise for loading state
  addNotification: (message: string, type: NotificationType) => void; // Already in App.tsx
}

const MailIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className || "w-6 h-6"}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
  </svg>
);


const EmailVerificationPage: React.FC<EmailVerificationPageProps> = ({ email, onGoToLogin, onResendVerification, addNotification }) => {
  const [isResending, setIsResending] = useState(false);

  const handleResendClick = async () => {
    setIsResending(true);
    try {
      await onResendVerification(email);
      // Notification is handled by App.tsx through onResendVerification's internal addNotification call
    } catch (error) {
      // This catch might be redundant if onResendVerification already handles errors and notifications
      console.error("EmailVerificationPage: Error during resend click:", error);
      addNotification("Failed to resend verification email. Please try again.", NotificationType.ERROR);
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-100 p-4 text-center">
      <div className="flex items-center mb-8 text-primary-dark">
        <GiftIcon className="h-12 w-12 mr-3" />
        <h1 className="text-4xl font-bold">{APP_NAME}</h1>
      </div>
      <div className="w-full max-w-lg bg-white p-8 sm:p-10 rounded-xl shadow-2xl">
        <MailIcon className="h-16 w-16 text-primary mx-auto mb-6" />
        <h2 className="text-2xl sm:text-3xl font-semibold text-slate-800 mb-4">Verify Your Email Address</h2>
        <p className="text-slate-600 mb-3">
          Thank you for signing up! A verification link has been sent to:
        </p>
        <p className="text-lg font-medium text-primary-dark mb-6 break-all">{email}</p>
        <p className="text-slate-600 mb-6">
          Please check your inbox (and spam/junk folder) and click on the link to activate your account.
          Once verified, you can log in.
        </p>
        
        <div className="space-y-4">
          <button
            onClick={handleResendClick}
            disabled={isResending}
            className="w-full bg-secondary hover:bg-amber-600 text-white font-semibold py-3 px-4 rounded-lg shadow-md transition-colors duration-300 flex items-center justify-center disabled:opacity-60"
          >
            {isResending ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>Resending...</span>
              </>
            ) : (
              'Resend Verification Email'
            )}
          </button>

          <button
            onClick={onGoToLogin}
            className="w-full border border-primary text-primary hover:bg-primary-light hover:text-white font-semibold py-3 px-4 rounded-lg shadow-sm transition-colors duration-300"
          >
            Go to Login Page
          </button>
        </div>
        <p className="mt-6 text-xs text-slate-500">
          If you don't receive the email within a few minutes, please try resending it.
        </p>
      </div>
    </div>
  );
};

export default EmailVerificationPage;
