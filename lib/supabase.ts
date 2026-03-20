import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface UserProfile {
  id: string;
  nickname: string;
  created_at: string;
}

export interface GmepuMemo {
  id: string;
  text: string;
  nickname: string;
  user_id: string | null;
  color: string;
  lat: number;
  lng: number;
  created_at: string;
  sido: string | null;
  sigungu: string | null;
  dong: string | null;
}

export interface GmepuReaction {
  id: string;
  memo_id: string;
  user_id: string;
  emoji: string;
  created_at: string;
}

export interface GmepuReply {
  id: string;
  memo_id: string;
  text: string;
  nickname: string;
  user_id: string;
  created_at: string;
}

export const REACTION_EMOJIS = ["❤️", "🔥", "😂", "👀", "👍"] as const;
