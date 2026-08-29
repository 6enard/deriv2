import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://czmclfzubeugpuomnwnr.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN6bWNsZnp1YmV1Z3B1b21ud25yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgwMzAzMDIsImV4cCI6MjEwMzYwNjMwMn0.US_1zWw9xNWPgalQfWupk_wJr8YE4nQyqbGSw7jZLws'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
