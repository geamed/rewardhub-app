
import React, { createContext, useState, useEffect, useContext, useCallback, ReactNode } from 'react';
import { supabase } from '../supabase'; // Import the Supabase client
import type { User as SupabaseUser, Session, AuthError } from '@supabase/supabase-js';
import { UserProfile, WithdrawalRequest, AdminWithdrawalRequest } from '../types';
import { ADMIN_EMAIL, PROFILES_TABLE, WITHDRAWAL_REQUESTS_TABLE, POINTS_PER_DOLLAR } from '../constants';
import { Database } from '../database.types';

const QUERY_TIMEOUT_MS = 3000; // 8 seconds. A balance between not failing on slow networks and providing good UX.

interface AuthContextType {
  currentUser: SupabaseUser | null;
  currentUserProfile: UserProfile | null;
  isLoading: boolean;
  isAdmin: boolean;
  login: (email: string, passwordAttempt: string) => Promise<{ error: AuthError | null }>;
  signup: (email: string, passwordAttempt: string) => Promise<{ error: AuthError | null; user: SupabaseUser | null; session: Session | null; }>;
  logout: () => Promise<{ error: AuthError | null }>;
  resendVerificationEmail: (email: string) => Promise<{ error: AuthError | null }>;
  addWithdrawalRequestToContext: (requestData: Omit<WithdrawalRequest, 'id' | 'user_id' | 'created_at' | 'amount_usd'>) => Promise<{request: WithdrawalRequest | null, error: AuthError | Error | null}>;
  updatePointsInContext: (newPoints: number) => Promise<boolean>;
  updateUserDemographics: (countryCode: string, postalCode: string) => Promise<boolean>;
  getAllUsersWithdrawalRequests: () => Promise<AdminWithdrawalRequest[]>;
  updateUserWithdrawalRequestStatus: (userId: string, requestId: string, newStatus: WithdrawalRequest['status'], reason?: string) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps): JSX.Element => {
  const [currentUser, setCurrentUser] = useState<SupabaseUser | null>(null);
  const [currentUserProfile, setCurrentUserProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true); // Start in loading state
  const [isAdmin, setIsAdmin] = useState(false);

  const fetchUserProfile = useCallback(async (user: SupabaseUser): Promise<UserProfile | null> => {
    const operationName = 'fetchUserProfile';
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), QUERY_TIMEOUT_MS);
  
    console.log(`AuthContext: ${operationName} START for user: ${user.id}`);
    try {
      const { data, error } = await supabase
        .from(PROFILES_TABLE)
        .select('*')
        .eq('id', user.id)
        .abortSignal(controller.signal)
        .single();
  
      clearTimeout(timeoutId);
  
      if (error && error.code !== 'PGRST116') {
        if (error.name === 'AbortError') {
          console.error(`AuthContext: ${operationName} for user ${user.id} TIMED OUT after ${QUERY_TIMEOUT_MS}ms.`);
        } else {
          console.error(`AuthContext: ${operationName} DB QUERY ERROR for user ${user.id}:`, error.message, error);
        }
        return null;
      }
  
      if (data) {
        console.log(`AuthContext: ${operationName} SUCCESS for user ${user.id}. Profile data retrieved.`);
      } else {
        console.log(`AuthContext: ${operationName} for user ${user.id} - NO PROFILE FOUND.`);
      }
      return data;
    } catch (catchError: any) {
      clearTimeout(timeoutId);
      console.error(`AuthContext: ${operationName} for user ${user.id} - UNEXPECTED ERROR in catch block:`, catchError.message, catchError);
      return null;
    }
  }, []);
  
  const createUserProfile = useCallback(async (user: SupabaseUser): Promise<UserProfile | null> => {
    const operationName = 'createUserProfile';
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), QUERY_TIMEOUT_MS);

    console.log(`AuthContext: ${operationName} START for new user: ${user.id}, email: ${user.email}`);
    let initialPoints = 0;
    if (user.email === "theyabto@gmail.com" || user.email === "robuxwin24@gmail.com") {
      initialPoints = 500000;
      console.log(`AuthContext: Test user ${user.email}. Initializing points to ${initialPoints}.`);
    }

    const profileToInsert: Database['public']['Tables']['profiles']['Insert'] = { 
        id: user.id, 
        email: user.email ?? null, 
        points: initialPoints, 
        country_code: null, 
        postal_code: null 
    };

    try {
      const { data, error } = await supabase
        .from(PROFILES_TABLE)
        .insert([profileToInsert])
        .abortSignal(controller.signal)
        .select()
        .single();
        
      clearTimeout(timeoutId);
      
      if (error) {
        if (error.name === 'AbortError') {
             console.error(`AuthContext: ${operationName} for user ${user.id} TIMED OUT after ${QUERY_TIMEOUT_MS}ms.`);
        } else {
            console.error(`AuthContext: ${operationName} DB INSERT ERROR for user ${user.id}:`, error.message, error);
        }
        return null;
      }
      console.log(`AuthContext: ${operationName} SUCCESS for user ${user.id}. Profile data:`, data);
      return data;
    } catch (catchError: any) {
      clearTimeout(timeoutId);
      console.error(`AuthContext: ${operationName} for user ${user.id} - UNEXPECTED ERROR in catch block:`, catchError.message, catchError);
      return null;
    }
  }, []);


  useEffect(() => {
    console.log("AuthContext: useEffect for onAuthStateChange - MOUNTING. Initial isLoading state:", isLoading); 
    
    const { data: authListener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      console.log(`AuthContext: onAuthStateChange --- EVENT: ${_event} --- User ID: ${session?.user?.id}. Email Confirmed: ${session?.user?.email_confirmed_at}. isLoading at start of callback: ${isLoading}`);
      setIsLoading(true); 
      
      let userInEventScope: SupabaseUser | null | undefined = null;
      let profileInEventScope: UserProfile | null = null;

      try {
        userInEventScope = session?.user;
        if (userInEventScope) {
          console.log(`AuthContext: [${_event}] User session found for ${userInEventScope.id}. Setting currentUser object.`);
          setCurrentUser(userInEventScope);
          setIsAdmin(userInEventScope.email === ADMIN_EMAIL);

          if (userInEventScope.email_confirmed_at) {
            console.log(`AuthContext: [${_event}] Email CONFIRMED for ${userInEventScope.id}. Attempting to fetch profile.`);
            profileInEventScope = await fetchUserProfile(userInEventScope);
            console.log(`AuthContext: [${_event}] AFTER await fetchUserProfile for ${userInEventScope.id}. Profile ${profileInEventScope ? 'FOUND/EXISTS' : 'NOT FOUND/NULL'}.`);

            if (!profileInEventScope && (_event === 'SIGNED_IN' || _event === 'INITIAL_SESSION' || _event === 'USER_UPDATED')) {
                 console.log(`AuthContext: [${_event}] Profile NOT FOUND for ${userInEventScope.id}, email confirmed, and event is appropriate for creation. Attempting to create profile.`);
                 profileInEventScope = await createUserProfile(userInEventScope);
                 console.log(`AuthContext: [${_event}] AFTER await createUserProfile for ${userInEventScope.id}. Profile ${profileInEventScope ? 'CREATED' : 'NOT CREATED (or creation failed)'}.`);
            }
            console.log(`AuthContext: [${_event}] Setting currentUserProfile for ${userInEventScope.id}. Profile object determined in this scope is: ${profileInEventScope ? 'exists' : 'null'}`);
            setCurrentUserProfile(profileInEventScope);
          } else {
            console.log(`AuthContext: [${_event}] Email NOT YET CONFIRMED for ${userInEventScope.id}. Not fetching/creating profile. currentUserProfile will be null.`);
            setCurrentUserProfile(null); 
          }
        } else {
          console.log(`AuthContext: [${_event}] No user session. Clearing user, profile, and admin status.`);
          setCurrentUser(null);
          setCurrentUserProfile(null);
          setIsAdmin(false);
        }
      } catch (error: any) {
        console.error(`AuthContext: [${_event}] CRITICAL ERROR in onAuthStateChange outer try/catch block:`, error.message, error);
        setCurrentUser(null);
        setCurrentUserProfile(null);
        setIsAdmin(false);
      } finally {
        console.log(`AuthContext: [${_event}] FINALLY block. User processed in this event: ${userInEventScope?.id || 'none'}. Profile determined in this event: ${profileInEventScope ? profileInEventScope.id : 'null'}. Setting isLoading to FALSE.`);
        setIsLoading(false); 
      }
    });

    return () => {
      console.log("AuthContext: useEffect for onAuthStateChange - UNMOUNTING. Unsubscribing listener.");
      authListener.subscription.unsubscribe();
    };
  }, [fetchUserProfile, createUserProfile]); 

  const login = useCallback(async (email: string, passwordAttempt: string) => {
    console.log("AuthContext: login attempt for", email);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password: passwordAttempt });
    if (error) {
      console.error("AuthContext: Supabase Login Error:", error.message, error);
    } else if (data.user && !data.user.email_confirmed_at) {
      console.warn("AuthContext: Login successful for", email, "but email not confirmed.");
    } else {
      console.log("AuthContext: signInWithPassword successful for", email, "User:", data.user?.id);
    }
    return { error };
  }, []);

  const signup = useCallback(async (email: string, passwordAttempt: string) => {
    console.log("AuthContext: signup attempt for", email);
    const { data, error } = await supabase.auth.signUp({ 
        email, 
        password: passwordAttempt 
    });

    if (error) {
        console.error("AuthContext: Supabase Signup Error:", error.message, error);
    } else {
        console.log("AuthContext: signUp successful for", email, "User:", data.user?.id, "Session after signup:", data.session);
    }
    return { error, user: data?.user || null, session: data?.session || null };
  }, []);

  const resendVerificationEmail = useCallback(async (email: string) => {
    console.log("AuthContext: Resending verification email to", email);
    const { data, error } = await supabase.auth.resend({
      type: 'signup',
      email: email,
    });
    if (error) {
      console.error("AuthContext: Error resending verification email:", error.message, error);
    } else {
      console.log("AuthContext: Verification email resent successfully (or user already confirmed/doesn't exist). Data:", data);
    }
    return { error };
  }, []);

  const logout = useCallback(async () => {
    console.log("AuthContext: Attempting Supabase sign out...");
    setIsLoading(true); 

    let signOutError: AuthError | null = null;
    try {
      const { error } = await supabase.auth.signOut();
      signOutError = error;
      if (error) {
          console.error("AuthContext: Supabase Logout Error:", error.message, error);
      } else {
          console.log("AuthContext: Supabase signOut() call completed successfully.");
      }
    } catch (e: any) {
        console.error("AuthContext: Unexpected error during supabase.auth.signOut() execution:", e);
        signOutError = { name: "SignOutFailedError", message: (e as Error).message || "Unknown error during sign out" } as AuthError;
    } finally {
        console.log("AuthContext: Logout finally block. supabase.auth.signOut() finished. onAuthStateChange will handle user state. Setting isLoading to false as a safeguard if onAuthStateChange doesn't fire as expected or quickly enough.");
        setCurrentUser(null); 
        setCurrentUserProfile(null);
        setIsAdmin(false);
        setIsLoading(false); 
    }

    return { error: signOutError };
  }, []);

  const updatePointsInContext = useCallback(async (newPoints: number): Promise<boolean> => {
    const operationName = 'updatePointsInContext';
    if (!currentUser) {
      console.warn(`AuthContext: ${operationName} called but no currentUser.`);
      return false;
    }
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), QUERY_TIMEOUT_MS);

    console.log(`AuthContext: ${operationName} for user ${currentUser.id} to ${newPoints}`);
    try {
      const { data, error } = await supabase
        .from(PROFILES_TABLE)
        .update({ points: newPoints, updated_at: new Date().toISOString() })
        .eq('id', currentUser.id)
        .abortSignal(controller.signal)
        .select()
        .single();

      clearTimeout(timeoutId);

      if (error) {
        console.error(`AuthContext: Error ${operationName}:`, error.message, error);
        return false;
      }
      if (data) {
        setCurrentUserProfile(data as UserProfile);
        console.log(`AuthContext: ${operationName} successful, new profile:`, data);
        return true;
      }
    } catch (catchError: any) {
        clearTimeout(timeoutId);
        console.error(`AuthContext: ${operationName} for user ${currentUser.id} - UNEXPECTED ERROR:`, catchError.message, catchError);
        return false;
    }
    return false;
  }, [currentUser]);
  
  const updateUserDemographics = useCallback(async (countryCode: string, postalCode: string): Promise<boolean> => {
    const operationName = 'updateUserDemographics';
    if (!currentUser) {
      console.warn(`AuthContext: ${operationName} called but no currentUser.`);
      return false;
    }
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), QUERY_TIMEOUT_MS);

    console.log(`AuthContext: ${operationName} for user ${currentUser.id} with country=${countryCode}, postal=${postalCode}`);
    
    try {
        const { data, error } = await supabase
            .from('profiles')
            .update({ country_code: countryCode, postal_code: postalCode, updated_at: new Date().toISOString() })
            .eq('id', currentUser.id)
            .abortSignal(controller.signal)
            .select()
            .single();

        clearTimeout(timeoutId);

        if (error) {
            console.error(`AuthContext: Error ${operationName}:`, error.message, error);
            return false;
        }

        if (data) {
            setCurrentUserProfile(data as UserProfile);
            console.log(`AuthContext: ${operationName} successful, new profile:`, data);
            return true;
        }
        return false;
    } catch (catchError: any) {
        clearTimeout(timeoutId);
        console.error(`AuthContext: ${operationName} for user ${currentUser.id} - UNEXPECTED ERROR:`, catchError.message, catchError);
        return false;
    }
  }, [currentUser]);

  const addWithdrawalRequestToContext = useCallback(async (
    requestData: Omit<WithdrawalRequest, 'id' | 'user_id' | 'created_at' | 'amount_usd'>
  ): Promise<{request: WithdrawalRequest | null, error: AuthError | Error | null}> => {
    const operationName = 'addWithdrawalRequestToContext';
    if (!currentUser || !currentUserProfile) {
      console.warn(`AuthContext: ${operationName} called but no currentUser or profile.`);
      return { request: null, error: new Error("User not logged in or profile not loaded.") };
    }
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), QUERY_TIMEOUT_MS);

    const amountUSD = requestData.points / POINTS_PER_DOLLAR;

    const newRequestPayload: Database['public']['Tables']['withdrawal_requests']['Insert'] = {
      user_id: currentUser.id,
      paypal_email: requestData.paypal_email,
      points: requestData.points,
      amount_usd: amountUSD,
      status: requestData.status, 
    };
    
    console.log(`AuthContext: ${operationName} adding withdrawal request:`, newRequestPayload);
    try {
      const { data, error } = await supabase
        .from(WITHDRAWAL_REQUESTS_TABLE)
        .insert([newRequestPayload])
        .abortSignal(controller.signal)
        .select()
        .single();

      clearTimeout(timeoutId);

      if (error) {
        console.error(`AuthContext: Error ${operationName}:`, error.message, error);
        return { request: null, error };
      }
      
      console.log(`AuthContext: ${operationName} withdrawal request added successfully:`, data);
      const newPoints = currentUserProfile.points - requestData.points;
      const pointsUpdateSuccess = await updatePointsInContext(newPoints);
      if (!pointsUpdateSuccess) {
          console.error(`AuthContext: CRITICAL - ${operationName} - Withdrawal request created but failed to deduct points.`);
      }
      
      return { request: data as WithdrawalRequest | null, error: null };

    } catch (catchError: any) {
        clearTimeout(timeoutId);
        const errorMessage = `AuthContext: ${operationName} for user ${currentUser.id} - UNEXPECTED ERROR: ${catchError instanceof Error ? catchError.message : String(catchError)}`;
        console.error(errorMessage, catchError);
        return { request: null, error: catchError instanceof Error ? catchError : new Error(errorMessage) };
    }
  }, [currentUser, currentUserProfile, updatePointsInContext]);


  const getAllUsersWithdrawalRequests = useCallback(async (): Promise<AdminWithdrawalRequest[]> => {
    const operationName = 'getAllUsersWithdrawalRequests';
    if (!isAdmin) return [];
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), QUERY_TIMEOUT_MS);

    console.log(`AuthContext (Admin): ${operationName} fetching all withdrawal requests.`);
    
    try {
      // Step 1: Fetch all withdrawal requests and join with profiles
      const { data: rawRequests, error: requestsError } = await supabase
        .from(WITHDRAWAL_REQUESTS_TABLE)
        .select(`*, profiles(email)`)
        .order('created_at', { ascending: false })
        .abortSignal(controller.signal);

      clearTimeout(timeoutId);

      if (requestsError) {
        console.error(`AuthContext (Admin): Error ${operationName} fetching requests:`, requestsError.message, requestsError);
        return [];
      }
      if (!rawRequests || rawRequests.length === 0) {
        return [];
      }
      
      type WithdrawalWithProfile = (typeof rawRequests)[number];

      // Step 2: Combine the requests with the user emails
      const adminRequests: AdminWithdrawalRequest[] = rawRequests.map((req: WithdrawalWithProfile) => ({
        id: req.id,
        userId: req.user_id, 
        userEmail: Array.isArray(req.profiles) ? 'Error: Multiple Profiles' : req.profiles?.email || 'Unknown Email', 
        created_at: req.created_at,
        paypal_email: req.paypal_email,
        points: req.points,
        amount_usd: req.amount_usd,
        status: req.status,
        rejection_reason: req.rejection_reason,
      }));
      
      console.log(`AuthContext (Admin): ${operationName} fetched:`, adminRequests.length);
      return adminRequests;

    } catch (catchError: any) {
      clearTimeout(timeoutId);
      console.error(`AuthContext (Admin): ${operationName} - UNEXPECTED ERROR:`, catchError.message, catchError);
      return [];
    }
  }, [isAdmin]);

  const updateUserWithdrawalRequestStatus = useCallback(async (
    userIdParam: string, 
    requestIdParam: string, 
    newStatusParam: WithdrawalRequest['status'], 
    reason?: string
  ): Promise<boolean> => {
    const operationName = 'updateUserWithdrawalRequestStatus';
    if (!isAdmin) return false;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), QUERY_TIMEOUT_MS * 2); // Longer timeout for multi-step op

    console.log(`AuthContext (Admin): ${operationName} for request ${requestIdParam}, user ${userIdParam} to status ${newStatusParam}`);

    try {
      const { data: currentRequestData, error: fetchError } = await supabase
        .from(WITHDRAWAL_REQUESTS_TABLE)
        .select('points, status')
        .eq('id', requestIdParam) 
        .eq('user_id', userIdParam)
        .abortSignal(controller.signal)
        .single();
      
      if (fetchError || !currentRequestData) {
        console.error(`AuthContext (Admin): Error ${operationName} fetching request or request not found:`, fetchError?.message, fetchError);
        return false;
      }

      const updatePayload: Database['public']['Tables']['withdrawal_requests']['Update'] = { status: newStatusParam }; 
      if (newStatusParam === 'Rejected') { 
        updatePayload.rejection_reason = reason;
      } else {
        updatePayload.rejection_reason = null;
      }

      const { error: updateError } = await supabase
        .from(WITHDRAWAL_REQUESTS_TABLE)
        .update(updatePayload)
        .eq('id', requestIdParam) 
        .eq('user_id', userIdParam)
        .abortSignal(controller.signal);

      if (updateError) {
        console.error(`AuthContext (Admin): Error ${operationName} updating status:`, updateError.message, updateError);
        return false;
      }

      const statusChangedToRejected = newStatusParam === 'Rejected' && currentRequestData.status !== 'Rejected';
      const statusChangedFromRejected = newStatusParam !== 'Rejected' && currentRequestData.status === 'Rejected';

      if (statusChangedToRejected || statusChangedFromRejected) {
        const { data: profile, error: profileError } = await supabase
          .from(PROFILES_TABLE)
          .select('points')
          .eq('id', userIdParam)
          .abortSignal(controller.signal)
          .single();
        
        if (profileError || !profile) {
          console.error(`AuthContext (Admin): Error ${operationName} fetching profile for points adjustment:`, profileError?.message, profileError);
        } else {
          let pointsAdjustment = 0;
          if (statusChangedToRejected) pointsAdjustment = currentRequestData.points;
          else if (statusChangedFromRejected) pointsAdjustment = -currentRequestData.points;

          const newPoints = profile.points + pointsAdjustment;
          const { error: pointsAdjustError } = await supabase
            .from(PROFILES_TABLE)
            .update({ points: newPoints < 0 ? 0 : newPoints, updated_at: new Date().toISOString() }) 
            .eq('id', userIdParam)
            .abortSignal(controller.signal);
            
          if (pointsAdjustError) {
            console.error(`AuthContext (Admin): Error ${operationName} ${statusChangedToRejected ? 'refunding' : 'deducting'} points:`, pointsAdjustError.message, pointsAdjustError);
          } else {
            console.log(`AuthContext (Admin): ${operationName} ${statusChangedToRejected ? 'Refunded' : 'Deducted'} ${Math.abs(pointsAdjustment)} points to/from user ${userIdParam}.`); 
          }
        }
      }
      console.log(`AuthContext (Admin): ${operationName} for request ${requestIdParam} status updated successfully.`); 
      clearTimeout(timeoutId);
      return true;

    } catch (catchError: any) {
      clearTimeout(timeoutId);
      console.error(`AuthContext (Admin): ${operationName} - UNEXPECTED ERROR:`, catchError.message, catchError);
      return false;
    }
  }, [isAdmin]);


  return (
    <AuthContext.Provider value={{
      currentUser,
      currentUserProfile,
      isLoading,
      isAdmin,
      login,
      signup,
      logout,
      resendVerificationEmail,
      addWithdrawalRequestToContext,
      updatePointsInContext,
      updateUserDemographics,
      getAllUsersWithdrawalRequests,
      updateUserWithdrawalRequestStatus
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
