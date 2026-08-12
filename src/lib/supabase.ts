import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://twegszjxmxzcrlyqcrud.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR3ZWdzemp4bXh6Y3JseXFjcnVkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY1MDg1ODEsImV4cCI6MjEwMjA4NDU4MX0._V8FxZPkjj-rmY2ggYRjjNUjFj5cSvgaaN_i15FwROY'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
