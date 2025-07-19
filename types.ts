
import type { Database } from './database.types';

// Supabase user type is imported directly from @supabase/supabase-js where needed
// e.g. import type { User as SupabaseUser } from '@supabase/supabase-js';

// --- Using generated types for consistency ---
export type UserProfile = Database['public']['Tables']['profiles']['Row'];
export type WithdrawalRequest = Database['public']['Tables']['withdrawal_requests']['Row'];


// Type for withdrawal requests as viewed by an admin, including user identifiers
export interface AdminWithdrawalRequest extends Omit<WithdrawalRequest, 'user_id'> {
  // We will fetch user email separately or join if possible in Supabase queries.
  // For simplicity here, we'll assume user_id is still part of the raw request data
  // and email is fetched/joined.
  userId: string; // This is the user_id from the withdrawal_requests table
  userEmail: string; // The email of the user who made the request (from profiles or auth.users)
}

// This type combines Supabase auth user with our application profile data
export interface UserWithProfile {
  id: string; // Supabase auth user ID
  email: string | null; // Supabase auth user email
  // Any other relevant fields from SupabaseUser that you might need
  profile: UserProfile | null; // Application-specific profile data
}


export enum NotificationType {
  SUCCESS = 'success',
  ERROR = 'error',
  INFO = 'info',
}

export interface NotificationMessage {
  id: string;
  message: string;
  type: NotificationType;
}
