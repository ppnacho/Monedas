// assets/js/supabaseClient.js
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm'

// 1. Pega aquí la URL de tu proyecto Supabase
const SUPABASE_URL = 'https://gawrunepixcazeuelasw.supabase.co';

// 2. Pega aquí tu clave PÚBLICA (anon / public)
const SUPABASE_ANON_KEY = 'sb_publishable_f46kPmVleLt67O_1t7o-HQ_5ef6QFtq';

export const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    experimental: {
      passkey: true
    }
  }
});
