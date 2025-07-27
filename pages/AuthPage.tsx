import AuthPage from '../AuthPage';
export default AuthPage;


import React, { useState, FormEvent } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { APP_NAME } from '../constants';
import GiftIcon from '../components/icons/GiftIcon'; 
import { NotificationType } from '../types';
import type { AuthError } from '@supabase/supabase-js';

interface AuthPageProps {
  onAuthSuccess: () => void; 
  onSuccessfulSignup: (email: string) => void; // New prop for signup success
  addNotification: (message: string, type: NotificationType) => void;
  initialMode?: 'login' | 'signup'; // New prop
}

const getSupabaseErrorMessage = (error: AuthError | null): string => {
  if (!error) return 'An unexpected error occurred.';
  
  if (error.message && error.message.toLowerCase().includes("invalid login credentials")) {
    return 'Invalid email or password.';
  }
  if (error.message && error.message.includes("User already registered")) {
    return 'This email address is already in use by another account.';
  }
  if (error.message && error.message.includes("Password should be at least 6 characters")) {
     return 'Password is too weak. It should be at least 6 characters long.';
  }
  if (error.message && error.message.includes("Unable to validate email address: invalid format")) {
      return "Invalid email address format. Please check and try again.";
  }
  // Check for email rate limit exceeded
  if (error.message && error.message.toLowerCase().includes("for expiry duration check if your email provider cancelled block")) {
    return "Email rate limit exceeded. Please try again later.";
  }
  if (error.message && error.message.toLowerCase().includes("error sending confirmation mail")) {
     return "There was an issue sending the confirmation email. Please try signing up again later.";
  }
  console.warn("Unhandled Supabase Auth Error:", error.name, error.message);
  return error.message || 'An unexpected authentication error occurred. Please try again later.';
};


const AuthPage: React.FC<AuthPageProps> = ({ onAuthSuccess, onSuccessfulSignup, addNotification, initialMode = 'login' }) => {
  const [isLoginMode, setIsLoginMode] = useState(initialMode === 'login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [confirmPasswordError, setConfirmPasswordError] = useState<string | null>(null);
  
  const { login, signup, isLoading: isAuthContextLoading } = useAuth();
  const [isSubmittingForm, setIsSubmittingForm] = useState(false);

  React.useEffect(() => {
    setIsLoginMode(initialMode === 'login');
  }, [initialMode]);


  const validateEmail = (emailToValidate: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(emailToValidate);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsSubmittingForm(true);
    setEmailError(null);
    setPasswordError(null);
    setConfirmPasswordError(null);

    if (!validateEmail(email)) {
      setEmailError("Please enter a valid email address.");
      setIsSubmittingForm(false);
      return;
    }
    
    if (password.length === 0) {
      setPasswordError("Password cannot be empty.");
      setIsSubmittingForm(false);
      return;
    }

    if (!isLoginMode) { 
      if (password.length < 6) {
        setPasswordError("Password must be at least 6 characters long.");
        setIsSubmittingForm(false);
        return;
      }
      if (password !== confirmPassword) {
        setConfirmPasswordError("Passwords do not match.");
        setIsSubmittingForm(false);
        return;
      }
    }

    try {
      if (isLoginMode) {
        const authResult = await login(email, password);
        if (authResult.error) {
          addNotification(getSupabaseErrorMessage(authResult.error), NotificationType.ERROR);
        } else {
          // Check if email is confirmed. Supabase client might not expose this directly on user from signIn.
          // AuthContext's onAuthStateChange will handle setting userProfile to null if not confirmed.
          // App.tsx's logic will determine if "Error Loading User Data" page is shown vs dashboard.
          addNotification("Login successful! Welcome back.", NotificationType.SUCCESS);
          onAuthSuccess(); 
        }
      } else { 
        // Signup
        const authResult = await signup(email, password);
        if (authResult.error) {
          addNotification(getSupabaseErrorMessage(authResult.error), NotificationType.ERROR);
        } else {
          // User object exists, session might be null if email verification is pending.
          addNotification("Signup successful! Please check your email to verify your account.", NotificationType.SUCCESS);
          onSuccessfulSignup(email); // Navigate to verification page
        }
      }
    } catch (error) { 
      console.error("AuthPage: Unexpected error during auth operation", error);
      addNotification('An unexpected error occurred. Please try again.', NotificationType.ERROR);
    } finally {
      setIsSubmittingForm(false);
    }
  };
  
  const pageActionIsLoading = isAuthContextLoading || isSubmittingForm;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-100 p-4">
      <div className="flex items-center mb-8 text-primary-dark">
        <GiftIcon className="h-12 w-12 mr-3" />
        <h1 className="text-4xl font-bold">{APP_NAME}</h1>
      </div>
      <div className="w-full max-w-md bg-white p-8 rounded-xl shadow-2xl">
        <h2 className="text-2xl font-bold text-center text-slate-700 mb-6">
          {isLoginMode ? 'Welcome Back!' : 'Create Your Account'}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-slate-600">
              Email Address
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setEmailError(null); }}
              required
              className={`mt-1 w-full px-3 py-2 border ${emailError ? 'border-red-500' : 'border-slate-300'} rounded-md shadow-sm focus:ring-primary focus:border-primary sm:text-sm`}
              placeholder="you@example.com"
              aria-describedby={emailError ? "email-error" : undefined}
              autoComplete="email"
            />
            {emailError && <p id="email-error" className="mt-1 text-xs text-red-500">{emailError}</p>}
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-slate-600">
              Password
            </label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setPasswordError(null); }}
              required
              minLength={isLoginMode ? undefined : 6}
              className={`mt-1 w-full px-3 py-2 border ${passwordError ? 'border-red-500' : 'border-slate-300'} rounded-md shadow-sm focus:ring-primary focus:border-primary sm:text-sm`}
              placeholder="••••••••"
              aria-describedby={passwordError ? "password-error" : undefined}
              autoComplete={isLoginMode ? "current-password" : "new-password"}
            />
            {passwordError && <p id="password-error" className="mt-1 text-xs text-red-500">{passwordError}</p>}
          </div>
          {!isLoginMode && (
            <div>
             <label htmlFor="confirmPassword" className="block text-sm font-medium text-slate-600">
                Confirm Password
              </label>
              <input
                type="password"
                id="confirmPassword"
                value={confirmPassword}
                onChange={(e) => { setConfirmPassword(e.target.value); setConfirmPasswordError(null); }}
                required
                className={`mt-1 w-full px-3 py-2 border ${confirmPasswordError ? 'border-red-500' : 'border-slate-300'} rounded-md shadow-sm focus:ring-primary focus:border-primary sm:text-sm`}
                placeholder="••••••••"
                aria-describedby={confirmPasswordError ? "confirm-password-error" : undefined}
                autoComplete="new-password"
              />
              {confirmPasswordError && <p id="confirm-password-error" className="mt-1 text-xs text-red-500">{confirmPasswordError}</p>}
            </div>
          )}
          <button
            type="submit"
            disabled={pageActionIsLoading}
            className="w-full bg-primary hover:bg-primary-dark text-white font-semibold py-2.5 px-4 rounded-lg shadow-md transition-colors duration-300 flex items-center justify-center disabled:opacity-50 mt-2"
          >
            {pageActionIsLoading ? (
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : (isLoginMode ? 'Login' : 'Sign Up')}
          </button>
        </form>
        <p className="mt-6 text-center text-sm text-slate-500">
          {isLoginMode ? "Don't have an account?" : 'Already have an account?'}
          <button
            onClick={() => {
              if (pageActionIsLoading) return;
              setIsLoginMode(!isLoginMode);
              setEmailError(null);
              setPasswordError(null);
              setConfirmPasswordError(null);
              setEmail(''); setPassword(''); setConfirmPassword('');
            }}
            className="font-medium text-primary hover:text-primary-dark ml-1 focus:outline-none disabled:opacity-70"
            disabled={pageActionIsLoading}
          >
            {isLoginMode ? 'Sign Up' : 'Login'}
          </button>
        </p>
      </div>
    </div>
  );
};

export default AuthPage;
