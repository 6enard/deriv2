import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://kfqpxhurjfssglooqdwk.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtmcXB4aHVyamZzc2dsb29xZHdrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgwMTI2MzYsImV4cCI6MjEwMzU4ODYzNn0.H0heevd9IUygc_qc3UZ2ALV46lZTCRHg8w-US4Xao6Y'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
