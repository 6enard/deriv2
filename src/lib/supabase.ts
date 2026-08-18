import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://jwomjwwgrqbrzulmhcvu.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp3b21qd3dncnFicnp1bG1oY3Z1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODcwODIzMzcsImV4cCI6MjEwMjY1ODMzN30.Tf9kM3rAeBnIhPemgAoVWcE0YSO_QgiiwXc09xfysUs'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
