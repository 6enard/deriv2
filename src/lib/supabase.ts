import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://hpmhuvsyozdwtrwhcuyn.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhwbWh1dnN5b3pkd3Ryd2hjdXluIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgwMTU0NDQsImV4cCI6MjEwMzU5MTQ0NH0.KWg5WbHi1AU8l-KOscKwutEA42xzVpPxDxrMvwA4qWk'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
