import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
const localPortfolioKey = 'portio-local-portfolio'

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey)

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    })
  : null

export function readLocalPortfolio() {
  if (typeof window === 'undefined') return null

  const saved = window.localStorage.getItem(localPortfolioKey)
  if (!saved) return null

  try {
    return JSON.parse(saved)
  } catch {
    return null
  }
}

export function writeLocalPortfolio(portfolio) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(localPortfolioKey, JSON.stringify(portfolio))
}

export function removeLocalPortfolio() {
  if (typeof window === 'undefined') return
  window.localStorage.removeItem(localPortfolioKey)
}

export async function ensureSupabaseSession() {
  if (!supabase) return null

  const { data: { session } } = await supabase.auth.getSession()
  if (session) return session

  const { data, error } = await supabase.auth.signInAnonymously()
  if (error) throw error
  return data.session
}
