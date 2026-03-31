import { useState, useEffect, useCallback } from 'react';
import { Plus, Trash2, Save, Calendar, Clock } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Switch } from '../../components/ui/switch';
import { toast } from 'sonner';
import { supabase } from '../../../lib/supabase';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

interface AvailabilityRow {
  id: string;
  stylist_id: string | null;
  day_of_week: number | null;
  specific_date: string | null;
  start_time: string;
  end_time: string;
  is_available: boolean;
}

interface Holiday {
  id: string;
  date: string;
  name: string;
}

interface DaySchedule {
  id?: string;
  is_available: boolean;
  start_time: string;
  end_time: string;
}

type WeekSchedule = Record<number, DaySchedule>; // day_of_week → schedule

const DEFAULT_SCHEDULE = (): WeekSchedule => ({
  0: { is_available: false, start_time: '09:00', end_time: '17:00' },
  1: { is_available: true, start_time: '09:00', end_time: '19:00' },
  2: { is_available: true, start_time: '09:00', end_time: '19:00' },
  3: { is_available: true, start_time: '09:00', end_time: '19:00' },
  4: { is_available: true, start_time: '09:00', end_time: '19:00' },
  5: { is_available: true, start_time: '09:00', end_time: '19:00' },
  6: { is_available: true, start_time: '09:00', end_time: '18:00' },
});

export function AdminAvailability() {
  const [schedule, setSchedule] = useState<WeekSchedule>(DEFAULT_SCHEDULE());
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [newHoliday, setNewHoliday] = useState({ date: '', name: '' });
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);

    // Load salon-wide availability (stylist_id IS NULL)
    const { data: avail } = await supabase
      .from('availability')
      .select('*')
      .is('stylist_id', null)
      .not('day_of_week', 'is', null);

    if (avail && avail.length > 0) {
      const sched: WeekSchedule = { ...DEFAULT_SCHEDULE() };
      (avail as AvailabilityRow[]).forEach(row => {
        if (row.day_of_week !== null) {
          sched[row.day_of_week] = {
            id: row.id,
            is_available: row.is_available,
            start_time: row.start_time,
            end_time: row.end_time,
          };
        }
      });
      setSchedule(sched);
    }

    const { data: hols } = await supabase.from('holidays').select('*').order('date');
    if (hols) setHolidays(hols as Holiday[]);

    setLoading(false);
  }, []);

  useEffect(() => {
    document.title = 'Availability | Luxe Salon Admin';
    loadData();
  }, [loadData]);

  const updateDay = (day: number, field: keyof DaySchedule, value: boolean | string) => {
    setSchedule(prev => ({
      ...prev,
      [day]: { ...prev[day], [field]: value },
    }));
  };

  const saveSchedule = async () => {
    setSaving(true);
    try {
      for (const [dayStr, sched] of Object.entries(schedule)) {
        const dayNum = parseInt(dayStr);
        const payload = {
          stylist_id: null,
          day_of_week: dayNum,
          specific_date: null,
          start_time: sched.start_time,
          end_time: sched.end_time,
          is_available: sched.is_available,
        };

        if (sched.id) {
          await supabase.from('availability').update(payload).eq('id', sched.id);
        } else {
          const { data } = await supabase.from('availability').insert(payload).select().single();
          if (data) {
            setSchedule(prev => ({ ...prev, [dayNum]: { ...prev[dayNum], id: data.id } }));
          }
        }
      }
      toast.success('Schedule saved successfully!');
    } catch {
      toast.error('Failed to save schedule');
    } finally {
      setSaving(false);
    }
  };

  const addHoliday = async () => {
    if (!newHoliday.date || !newHoliday.name) {
      toast.error('Please enter both a date and name');
      return;
    }
    const { data, error } = await supabase.from('holidays').insert(newHoliday).select().single();
    if (error) {
      toast.error('Failed to add holiday');
      return;
    }
    setHolidays(prev => [...prev, data as Holiday]);
    setNewHoliday({ date: '', name: '' });
    toast.success('Holiday added');
  };

  const removeHoliday = async (id: string) => {
    await supabase.from('holidays').delete().eq('id', id);
    setHolidays(prev => prev.filter(h => h.id !== id));
    toast.success('Holiday removed');
  };

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold mb-2">Availability & Holidays</h1>
          <p className="text-gray-600">Set salon opening hours and block holiday dates</p>
        </div>
        <Button onClick={saveSchedule} disabled={saving}>
          <Save className="mr-2 h-4 w-4" />
          {saving ? 'Saving…' : 'Save Schedule'}
        </Button>
      </div>

      {/* Weekly Schedule */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-pink-600" /> Weekly Schedule
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {DAYS.map((dayName, i) => {
              const day = schedule[i];
              return (
                <div key={i} className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 border rounded-lg">
                  <div className="flex items-center gap-3 w-36 shrink-0">
                    <Switch
                      id={`day-switch-${i}`}
                      checked={day.is_available}
                      onCheckedChange={v => updateDay(i, 'is_available', v)}
                    />
                    <Label htmlFor={`day-switch-${i}`} className="font-medium cursor-pointer">
                      {dayName}
                    </Label>
                  </div>
                  <div className={`flex items-center gap-3 transition-opacity ${day.is_available ? '' : 'opacity-30 pointer-events-none'}`}>
                    <div className="flex items-center gap-2">
                      <Label className="text-sm text-gray-500 shrink-0">Opens</Label>
                      <Input
                        type="time"
                        value={day.start_time}
                        onChange={e => updateDay(i, 'start_time', e.target.value)}
                        className="w-32"
                      />
                    </div>
                    <span className="text-gray-400">–</span>
                    <div className="flex items-center gap-2">
                      <Label className="text-sm text-gray-500 shrink-0">Closes</Label>
                      <Input
                        type="time"
                        value={day.end_time}
                        onChange={e => updateDay(i, 'end_time', e.target.value)}
                        className="w-32"
                      />
                    </div>
                  </div>
                  {!day.is_available && (
                    <span className="text-sm text-gray-400 italic">Closed</span>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Holidays */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-pink-600" /> Public Holidays
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Add holiday form */}
          <div className="flex flex-col sm:flex-row gap-3 p-4 bg-gray-50 rounded-lg">
            <div className="flex-1 space-y-1">
              <Label className="text-xs">Date</Label>
              <Input
                type="date"
                value={newHoliday.date}
                onChange={e => setNewHoliday(p => ({ ...p, date: e.target.value }))}
              />
            </div>
            <div className="flex-1 space-y-1">
              <Label className="text-xs">Holiday Name</Label>
              <Input
                placeholder="e.g., Mashujaa Day"
                value={newHoliday.name}
                onChange={e => setNewHoliday(p => ({ ...p, name: e.target.value }))}
              />
            </div>
            <div className="flex items-end">
              <Button onClick={addHoliday} className="w-full sm:w-auto">
                <Plus className="mr-2 h-4 w-4" /> Add
              </Button>
            </div>
          </div>

          {/* Holiday list */}
          {holidays.length === 0 ? (
            <p className="text-center text-gray-500 py-6">No holidays added yet</p>
          ) : (
            <div className="divide-y">
              {holidays.map(h => (
                <div key={h.id} className="flex items-center justify-between py-3">
                  <div>
                    <p className="font-medium">{h.name}</p>
                    <p className="text-sm text-gray-500">{h.date}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeHoliday(h.id)}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
