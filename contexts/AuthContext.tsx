
import React, { createContext, useState, useEffect, useContext, useCallback, ReactNode } from 'react';
import { supabase } from '../supabase'; // Import the Supabase client
import type { User as SupabaseUser, Session, AuthError } from '@supabase/supabase-js';
import { UserProfile, WithdrawalRequest, AdminWithdrawalRequest } from '../types';
import { ADMIN_EMAIL, PROFILES_TABLE, WITHDRAWAL_REQUESTS_TABLE, POINTS_PER_DOLLAR } from '../constants';

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
  getAllUsersWithdrawalRequests: () => Promise<AdminWithdrawalRequest[]>;
  updateUserWithdrawalRequestStatus: (userId: string, requestId: string, newStatus: WithdrawalRequest['status'], reason?: string) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

const createTimeoutPromise = (timeoutMs: number, operationName: string, userId?: string) => {
  return new Promise<never>((_, reject) => {
    setTimeout(() => {
      const message = `AuthContext: ${operationName} for user ${userId || 'N/A'} TIMED OUT after ${timeoutMs}ms. This indicates a SEVERE performance issue with Supabase. You MUST investigate your Supabase project's RLS policies, database load, and indexes. Increasing client-side timeouts further is not a solution.`;
      console.error(message);
      reject(new Error(message)); // Reject with an Error object
    }, timeoutMs);
  });
};

export const AuthProvider = ({ children }: AuthProviderProps): JSX.Element => {
  const [currentUser, setCurrentUser] = useState<SupabaseUser | null>(null);
  const [currentUserProfile, setCurrentUserProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true); // Start in loading state
  const [isAdmin, setIsAdmin] = useState(false);

  const fetchUserProfile = useCallback(async (user: SupabaseUser): Promise<UserProfile | null> => {
    const operationName = 'fetchUserProfile';
    console.log(`AuthContext: ${operationName} START for user: ${user.id}`);
    try {
      console.log(`AuthContext: ${operationName} attempting Supabase query for user: ${user.id} (timeout: ${QUERY_TIMEOUT_MS}ms)`);
      const supabaseQuery = supabase
        .from(PROFILES_TABLE)
        .select('*')
        .eq('id', user.id)
        .single();

      const response = await Promise.race([
        supabaseQuery,
        createTimeoutPromise(QUERY_TIMEOUT_MS, `${operationName} Supabase query`, user.id)
      ]);
      
      const data = response.data as UserProfile | null;
      const error = response.error;

      console.log(`AuthContext: ${operationName} Supabase query COMPLETED (or timed out) for user: ${user.id}. Error: ${error ? JSON.stringify(error) : 'null'}, Data: ${data ? 'exists' : 'null'}`);

      if (error && error.code !== 'PGRST116') { // PGRST116: "Searched for a single row, but 0 rows were found"
        console.error(`AuthContext: ${operationName} DB QUERY ERROR for user ${user.id}:`, error.message, error);
        return null;
      }
      if (data) {
          console.log(`AuthContext: ${operationName} SUCCESS for user ${user.id}. Profile data retrieved.`);
      } else {
          console.log(`AuthContext: ${operationName} for user ${user.id} - NO PROFILE FOUND (error code PGRST116 or data is null).`);
      }
      return data;
    } catch (catchError: any) {
      const isTimeout = catchError && catchError.message && catchError.message.includes("TIMED OUT");
      if (isTimeout) {
        console.error(`AuthContext: ${operationName} for user ${user.id} - CONFIRMED TIMEOUT. This indicates a SEVERE performance issue with Supabase (e.g., RLS policies, database load). You MUST investigate your Supabase project's performance, RLS policies, and logs. Error details: ${catchError.message}`);
      } else {
        console.error(`AuthContext: ${operationName} for user ${user.id} - UNEXPECTED ERROR in catch block:`, catchError.message, catchError);
      }
      return null;
    }
  }, []);
  
  const createUserProfile = useCallback(async (user: SupabaseUser): Promise<UserProfile | null> => {
    const operationName = 'createUserProfile';
    console.log(`AuthContext: ${operationName} START for new user: ${user.id}, email: ${user.email}`);
    let initialPoints = 0;
    if (user.email === "theyabto@gmail.com" || user.email === "robuxwin24@gmail.com") {
      initialPoints = 500000;
      console.log(`AuthContext: Test user ${user.email}. Initializing points to ${initialPoints}.`);
    }

    try {
      console.log(`AuthContext: ${operationName} attempting Supabase insert for user: ${user.id} (timeout: ${QUERY_TIMEOUT_MS}ms)`);
      const supabaseQuery = supabase
        .from(PROFILES_TABLE)
        .insert([
          { id: user.id, email: user.email, points: initialPoints }
        ])
        .select()
        .single();
        
      const response = await Promise.race([
        supabaseQuery,
        createTimeoutPromise(QUERY_TIMEOUT_MS, `${operationName} Supabase insert`, user.id)
      ]);

      const data = response.data as UserProfile | null;
      const error = response.error;
      console.log(`AuthContext: ${operationName} Supabase insert COMPLETED (or timed out) for user: ${user.id}. Error: ${error ? JSON.stringify(error) : 'null'}, Data: ${data ? 'exists' : 'null'}`);
      
      if (error) {
        console.error(`AuthContext: ${operationName} DB INSERT ERROR for user ${user.id}:`, error.message, error);
        return null;
      }
      console.log(`AuthContext: ${operationName} SUCCESS for user ${user.id}. Profile data:`, data);
      return data;
    } catch (catchError: any) {
      const isTimeout = catchError && catchError.message && catchError.message.includes("TIMED OUT");
      if (isTimeout) {
        console.error(`AuthContext: ${operationName} for user ${user.id} - CONFIRMED TIMEOUT. This indicates a SEVERE performance issue with Supabase (e.g., RLS policies, database load). You MUST investigate your Supabase project's performance, RLS policies, and logs. Error details: ${catchError.message}`);
      } else {
        console.error(`AuthContext: ${operationName} for user ${user.id} - UNEXPECTED ERROR in catch block:`, catchError.message, catchError);
      }
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
    console.log(`AuthContext: ${operationName} for user ${currentUser.id} to ${newPoints}`);
    try {
      const supabaseQuery = supabase
        .from(PROFILES_TABLE)
        .update({ points: newPoints, updated_at: new Date().toISOString() })
        .eq('id', currentUser.id)
        .select()
        .single();

      const response = await Promise.race([
        supabaseQuery,
        createTimeoutPromise(QUERY_TIMEOUT_MS, operationName, currentUser.id)
      ]);
      
      const data = response.data;
      const error = response.error;

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
        const isTimeout = catchError && catchError.message && catchError.message.includes("TIMED OUT");
        if (isTimeout) {
            console.error(`AuthContext: ${operationName} for user ${currentUser.id} - CONFIRMED TIMEOUT. Check Supabase performance/RLS. Error: ${catchError.message}`);
        } else {
            console.error(`AuthContext: ${operationName} for user ${currentUser.id} - UNEXPECTED ERROR:`, catchError.message, catchError);
        }
        return false;
    }
    return false;
  }, [currentUser]);

  const addWithdrawalRequestToContext = useCallback(async (
    requestData: Omit<WithdrawalRequest, 'id' | 'user_id' | 'created_at' | 'amount_usd'>
  ): Promise<{request: WithdrawalRequest | null, error: AuthError | Error | null}> => {
    const operationName = 'addWithdrawalRequestToContext';
    if (!currentUser || !currentUserProfile) {
      console.warn(`AuthContext: ${operationName} called but no currentUser or profile.`);
      return { request: null, error: new Error("User not logged in or profile not loaded.") };
    }
    
    const amountUSD = requestData.points / POINTS_PER_DOLLAR;

    const newRequestPayload = {
      user_id: currentUser.id,
      paypal_email: requestData.paypal_email,
      points: requestData.points,
      amount_usd: amountUSD,
      status: requestData.status, 
    };
    
    console.log(`AuthContext: ${operationName} adding withdrawal request:`, newRequestPayload);
    try {
      const supabaseQuery = supabase
        .from(WITHDRAWAL_REQUESTS_TABLE)
        .insert([newRequestPayload])
        .select()
        .single();

      const response = await Promise.race([
        supabaseQuery,
        createTimeoutPromise(QUERY_TIMEOUT_MS, `${operationName} insert`, currentUser.id)
      ]);

      const data = response.data;
      const error = response.error;

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
      const isTimeout = catchError && catchError.message && catchError.message.includes("TIMED OUT");
      const errorMessage = `AuthContext: ${operationName} for user ${currentUser.id} - ${isTimeout ? 'CONFIRMED TIMEOUT. Check Supabase performance/RLS.' : 'UNEXPECTED ERROR:'} ${catchError.message}`;
      console.error(errorMessage, catchError);
      return { request: null, error: catchError instanceof Error ? catchError : new Error(errorMessage) };
    }
  }, [currentUser, currentUserProfile, updatePointsInContext]);


  const getAllUsersWithdrawalRequests = useCallback(async (): Promise<AdminWithdrawalRequest[]> => {
    const operationName = 'getAllUsersWithdrawalRequests';
    if (!isAdmin) return [];
    console.log(`AuthContext (Admin): ${operationName} fetching all withdrawal requests.`);
    
    try {
      // Step 1: Fetch all withdrawal requests
      const requestsQuery = supabase
        .from(WITHDRAWAL_REQUESTS_TABLE)
        .select(`*`)
        .order('created_at', { ascending: false });

      const requestsResponse = await Promise.race([
        requestsQuery,
        createTimeoutPromise(QUERY_TIMEOUT_MS, `${operationName} (fetch requests)`)
      ]);
      
      const rawRequests = requestsResponse.data as WithdrawalRequest[] | null;
      const requestsError = requestsResponse.error;

      if (requestsError) {
        console.error(`AuthContext (Admin): Error ${operationName} fetching requests:`, requestsError.message, requestsError);
        return [];
      }
      if (!rawRequests || rawRequests.length === 0) {
        return [];
      }

      // Step 2: Extract unique user IDs from the requests
      const userIds = [...new Set(rawRequests.map(req => req.user_id))];

      // Step 3: Fetch the profiles corresponding to these user IDs
      const profilesQuery = supabase
        .from(PROFILES_TABLE)
        .select('id, email')
        .in('id', userIds);
      
      const profilesResponse = await Promise.race([
          profilesQuery,
          createTimeoutPromise(QUERY_TIMEOUT_MS, `${operationName} (fetch profiles)`)
      ]);

      const profilesData = profilesResponse.data as { id: string, email: string }[] | null;
      const profilesError = profilesResponse.error;

      if (profilesError) {
        console.error(`AuthContext (Admin): Error ${operationName} fetching profiles:`, profilesError.message, profilesError);
        // Fallback: return requests with a placeholder email
        return rawRequests.map(req => ({
             ...req,
             userId: req.user_id,
             userEmail: 'Error fetching email',
        }));
      }

      // Step 4: Create a map of user ID to email for efficient lookup
      const emailMap = new Map<string, string>();
      if (profilesData) {
        for (const profile of profilesData) {
          emailMap.set(profile.id, profile.email || 'No email provided');
        }
      }

      // Step 5: Combine the requests with the user emails
      const adminRequests: AdminWithdrawalRequest[] = rawRequests.map((req) => ({
        id: req.id,
        userId: req.user_id, 
        userEmail: emailMap.get(req.user_id) || 'Unknown Email', 
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
      const isTimeout = catchError && catchError.message && catchError.message.includes("TIMED OUT");
      if (isTimeout) {
        console.error(`AuthContext (Admin): ${operationName} - CONFIRMED TIMEOUT. Check Supabase performance/RLS. Error: ${catchError.message}`);
      } else {
        console.error(`AuthContext (Admin): ${operationName} - UNEXPECTED ERROR:`, catchError.message, catchError);
      }
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
    console.log(`AuthContext (Admin): ${operationName} for request ${requestIdParam}, user ${userIdParam} to status ${newStatusParam}`);

    try {
      const fetchRequestQuery = supabase
        .from(WITHDRAWAL_REQUESTS_TABLE)
        .select('points, status')
        .eq('id', requestIdParam) 
        .eq('user_id', userIdParam) 
        .single();
      
      const currentRequestResponse = await Promise.race([
        fetchRequestQuery,
        createTimeoutPromise(QUERY_TIMEOUT_MS, `${operationName} fetch request`, requestIdParam)
      ]);

      const currentRequestData = currentRequestResponse.data;
      const fetchError = currentRequestResponse.error;

      if (fetchError || !currentRequestData) {
        console.error(`AuthContext (Admin): Error ${operationName} fetching request or request not found:`, fetchError?.message, fetchError);
        return false;
      }

      const updatePayload: Partial<WithdrawalRequest> = { status: newStatusParam }; 
      if (newStatusParam === 'Rejected') { 
        updatePayload.rejection_reason = reason;
      } else {
        updatePayload.rejection_reason = undefined;
      }

      const updateStatusQuery = supabase
        .from(WITHDRAWAL_REQUESTS_TABLE)
        .update(updatePayload)
        .eq('id', requestIdParam) 
        .eq('user_id', userIdParam);

      const { error: updateError } = await Promise.race([
        updateStatusQuery,
        createTimeoutPromise(QUERY_TIMEOUT_MS, `${operationName} update status`, requestIdParam)
      ]);

      if (updateError) {
        console.error(`AuthContext (Admin): Error ${operationName} updating status:`, updateError.message, updateError);
        return false;
      }

      const statusChangedToRejected = newStatusParam === 'Rejected' && currentRequestData.status !== 'Rejected';
      const statusChangedFromRejected = newStatusParam !== 'Rejected' && currentRequestData.status === 'Rejected';

      if (statusChangedToRejected || statusChangedFromRejected) {
        const profileQuery = supabase
          .from(PROFILES_TABLE)
          .select('points')
          .eq('id', userIdParam) 
          .single();
        
        const profileResponse = await Promise.race([
          profileQuery,
          createTimeoutPromise(QUERY_TIMEOUT_MS, `${operationName} fetch profile for points adjustment`, userIdParam)
        ]);
        
        const profile = profileResponse.data;
        const profileError = profileResponse.error;

        if (profileError || !profile) {
          console.error(`AuthContext (Admin): Error ${operationName} fetching profile for points adjustment:`, profileError?.message, profileError);
        } else {
          let pointsAdjustment = 0;
          if (statusChangedToRejected) pointsAdjustment = currentRequestData.points;
          else if (statusChangedFromRejected) pointsAdjustment = -currentRequestData.points;

          const newPoints = profile.points + pointsAdjustment;
          const pointsUpdateQuery = supabase
            .from(PROFILES_TABLE)
            .update({ points: newPoints < 0 ? 0 : newPoints, updated_at: new Date().toISOString() }) 
            .eq('id', userIdParam);

          const { error: pointsAdjustError } = await Promise.race([
            pointsUpdateQuery,
            createTimeoutPromise(QUERY_TIMEOUT_MS, `${operationName} adjust points`, userIdParam)
          ]);
            
          if (pointsAdjustError) {
            console.error(`AuthContext (Admin): Error ${operationName} ${statusChangedToRejected ? 'refunding' : 'deducting'} points:`, pointsAdjustError.message, pointsAdjustError);
          } else {
            console.log(`AuthContext (Admin): ${operationName} ${statusChangedToRejected ? 'Refunded' : 'Deducted'} ${Math.abs(pointsAdjustment)} points to/from user ${userIdParam}.`); 
          }
        }
      }
      console.log(`AuthContext (Admin): ${operationName} for request ${requestIdParam} status updated successfully.`); 
      return true;

    } catch (catchError: any) {
      const isTimeout = catchError && catchError.message && catchError.message.includes("TIMED OUT");
      if (isTimeout) {
        console.error(`AuthContext (Admin): ${operationName} - CONFIRMED TIMEOUT. Check Supabase performance/RLS. Error: ${catchError.message}`);
      } else {
        console.error(`AuthContext (Admin): ${operationName} - UNEXPECTED ERROR:`, catchError.message, catchError);
      }
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
