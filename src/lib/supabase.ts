import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://chuewdbcluwlperhsfil.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNodWV3ZGJjbHV3bHBlcmhzZmlsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODcwNjI4NTgsImV4cCI6MjEwMjYzODg1OH0.HFvCrITg01j3Jo1W_br91kZPthR0t_yVv88ORNPwxBQ'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
