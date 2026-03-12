import { supabase } from './supabase'
import type { UserProfile } from './supabase'

export async function signInWithGoogle() {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: `${window.location.origin}/map` },
  })
  if (error) throw error
}

export async function signOut() {
  await supabase.auth.signOut()
}

export async function getProfile(userId: string): Promise<UserProfile | null> {
  const { data } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', userId)
    .single()
  return data
}

export async function createProfile(userId: string, nickname: string): Promise<UserProfile> {
  const { data, error } = await supabase
    .from('user_profiles')
    .insert({ id: userId, nickname })
    .select()
    .single()
  if (error) throw error
  return data
}
