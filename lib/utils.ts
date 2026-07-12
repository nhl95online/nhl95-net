import { supabase } from './supabase';

export interface Season {
  league_id: number;
  season_name: string;
}

// Fetch all seasons from the DB and return them as a list
export async function getAvailableSeasons(): Promise<Season[]> {
  const { data, error } = await supabase
    .from('league_seasons')
    .select('league_id, season_name')
    .order('league_id', { ascending: true });

  if (error) {
    console.error("Error fetching seasons:", error);
    return [];
  }
  return data || [];
}