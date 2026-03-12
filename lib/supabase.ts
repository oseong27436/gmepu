import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface GmepuMemo {
  id: string;
  text: string;
  author: string;
  color: string;
  lat: number;
  lng: number;
  likes: number;
  created_at: string;
}
