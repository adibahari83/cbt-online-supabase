import { createClient } from '@supabase/supabase-js'

// Mengambil data dari file .env yang tadi Anda buat
const supabaseUrl = process.env.SUPABASE_URL || ''
const supabaseAnonKey = process.env.SUPABASE_KEY || ''

// Membuat "client" untuk memanggil database
export const supabase = createClient(supabaseUrl, supabaseAnonKey)
