import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface GmepuMemo {
  id: string;
  text: string;
  nickname: string;
  color: string;
  lat: number;
  lng: number;
  likes: number;
  created_at: string;
}

export interface GmepuReaction {
  id: string;
  memo_id: string;
  fingerprint: string;
  emoji: string;
  created_at: string;
}

export interface GmepuReply {
  id: string;
  memo_id: string;
  text: string;
  nickname: string;
  fingerprint: string;
  created_at: string;
}

export const REACTION_EMOJIS = ["❤️", "🔥", "😂", "👀", "👍"] as const;
