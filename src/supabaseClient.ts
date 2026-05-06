import { createClient } from '@supabase/supabase-js'

// Vite menggunakan import.meta.env untuk membaca file .env
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_KEY

// Validasi sederhana agar tidak blank jika lupa isi .env
if (!supabaseUrl || !supabaseAnonKey) {
  console.warn("Peringatan: URL atau Key Supabase tidak ditemukan di .env");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
