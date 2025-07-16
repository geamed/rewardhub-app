import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

// These environment variables should be set in your deployment environment.
// DO NOT HARDCODE THEM HERE IN A PRODUCTION APP.
const supabaseUrl = "https://gmiwizobjtjtjefhhjdp.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdtaXdpem9ianRqdGplZmhoamRwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk0OTk1NjQsImV4cCI6MjA2NTA3NTU2NH0.nesBY7rcq-wh8vr8MpjN6wIAFKOBAzLfIdHtCIf7Cws";

if (!supabaseUrl || !supabaseAnonKey) {
  const errorMessage = "Supabase URL or Anon Key is missing. Please set SUPABASE_URL and SUPABASE_ANON_KEY environment variables, or update supabase.ts directly.";
  console.error(errorMessage);
  // In a real app, you might want to display a more user-friendly error or prevent the app from loading.
  alert(errorMessage); 
  throw new Error(errorMessage);
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);

