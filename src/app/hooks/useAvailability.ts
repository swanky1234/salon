import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';

export interface Holiday {
  id: string;
  date: string;
  name: string;
}

export interface Availability {
  id: string;
  stylist_id: string | null;
  day_of_week: number | null;
  specific_date: string | null;
  start_time: string;
  end_time: string;
  is_available: boolean;
}

// Generate time slots between start and end time in 1-hour increments
export function generateTimeSlots(start: string, end: string): string[] {
  const slots: string[] = [];
  const [startH, startM] = start.split(':').map(Number);
  const [endH, endM] = end.split(':').map(Number);
  let h = startH;
  let m = startM;
  while (h < endH || (h === endH && m < endM)) {
    const label = `${h === 0 ? 12 : h > 12 ? h - 12 : h}:${m.toString().padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;
    slots.push(label);
    m += 60;
    if (m >= 60) { h += Math.floor(m / 60); m = m % 60; }
  }
  return slots;
}

export function useAvailability() {
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [availability, setAvailability] = useState<Availability[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    const [{ data: hols }, { data: avail }] = await Promise.all([
      supabase.from('holidays').select('*').order('date'),
      supabase.from('availability').select('*'),
    ]);
    if (hols) setHolidays(hols as Holiday[]);
    if (avail) setAvailability(avail as Availability[]);
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const isHoliday = (date: Date) =>
    holidays.some(h => h.date === date.toISOString().split('T')[0]);

  // Get available time slots for a given date (and optional stylist)
  const getTimeSlotsForDate = (date: Date, stylistId?: string): string[] => {
    const dayOfWeek = date.getDay();
    const dateStr = date.toISOString().split('T')[0];

    // Find stylist-specific specific_date override
    const stylistSpecific = stylistId
      ? availability.find(a => a.stylist_id === stylistId && a.specific_date === dateStr)
      : null;

    // Salon-wide specific_date override
    const salonSpecific = availability.find(
      a => a.stylist_id === null && a.specific_date === dateStr
    );

    // Stylist weekly default
    const stylistWeekly = stylistId
      ? availability.find(a => a.stylist_id === stylistId && a.day_of_week === dayOfWeek && !a.specific_date)
      : null;

    // Salon weekly default
    const salonWeekly = availability.find(
      a => a.stylist_id === null && a.day_of_week === dayOfWeek && !a.specific_date
    );

    const rule = stylistSpecific || salonSpecific || stylistWeekly || salonWeekly;

    if (!rule || !rule.is_available) {
      // Return default 9 AM - 7 PM if no rule defined
      return generateTimeSlots('09:00', '19:00');
    }
    return generateTimeSlots(rule.start_time, rule.end_time);
  };

  return { holidays, availability, loading, isHoliday, getTimeSlotsForDate, reload: loadData };
}
