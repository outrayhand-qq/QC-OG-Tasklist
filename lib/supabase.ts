import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://hnnnxxovvuxfpxoivzwa.supabase.co'
const supabaseAnonKey = 'sb_publishable_20WzwjMZMdfM84VdDB3mmg_U_zbGskX'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)