import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://arymmivalnqfgitdwbdd.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFyeW1taXZhbG5xZmdpdGR3YmRkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM1MzkwMTMsImV4cCI6MjA3OTExNTAxM30.hvtHTZG-Yq7HcjdblELzAoFRCjLyfl5SkTdcQ_lwaOI';

export const supabase = createClient(supabaseUrl, supabaseKey);
