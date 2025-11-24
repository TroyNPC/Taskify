
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://avfzimzbunjscqqfusnf.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF2ZnppbXpidW5qc2NxcWZ1c25mIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM4MDIyMTUsImV4cCI6MjA3OTM3ODIxNX0.uuPtJoU8-27py-Hn8qTBIvuq_Xk32Ir-M4ShlfKSkPw';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
  },
});
