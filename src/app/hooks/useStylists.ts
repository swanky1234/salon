import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';

export interface Stylist {
  id: string;
  name: string;
  bio: string;
  profile_image: string;
  portfolio_images: string[];
  specialties: string[];
  phone?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export function useStylists() {
  const [stylists, setStylists] = useState<Stylist[]>([]);
  const [loading, setLoading] = useState(true);

  const loadStylists = useCallback(async () => {
    const { data, error } = await supabase
      .from('stylists')
      .select('*')
      .is('deleted_at', null)
      .eq('is_active', true)
      .order('created_at', { ascending: true });

    if (!error && data) {
      setStylists(data as Stylist[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadStylists();
  }, [loadStylists]);

  return { stylists, loading, reload: loadStylists };
}
