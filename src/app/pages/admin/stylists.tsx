import { useState, useEffect, useCallback, useRef } from 'react';
import { Plus, Edit, Trash2, Upload, X, Tag, User as UserIcon, Calendar, Clock } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Card, CardContent } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { Badge } from '../../components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '../../components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from '../../components/ui/alert-dialog';
import { toast } from 'sonner';
import { supabase } from '../../../lib/supabase';

function useTitle(title: string) {
  useEffect(() => { document.title = title; }, [title]);
}

interface Stylist {
  id: string;
  name: string;
  bio: string;
  profile_image: string;
  portfolio_images: string[];
  specialties: string[];
  created_at: string;
}

interface AvailabilityRow {
  id?: string;
  stylist_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_available: boolean;
}

const DAYS = [
  { label: 'Sun', value: 0 },
  { label: 'Mon', value: 1 },
  { label: 'Tue', value: 2 },
  { label: 'Wed', value: 3 },
  { label: 'Thu', value: 4 },
  { label: 'Fri', value: 5 },
  { label: 'Sat', value: 6 },
];

const defaultDaySchedule = () => ({
  enabled: false,
  start_time: '09:00',
  end_time: '18:00',
});

const emptyForm = () => ({
  name: '',
  bio: '',
  profile_image: '',
  portfolio_images: [] as string[],
  specialties: [] as string[],
  specialtyInput: '',
});

async function uploadToStorage(bucket: string, file: File): Promise<string | null> {
  const ext = file.name.split('.').pop();
  const path = `${Date.now()}-${Math.random().toString(36).slice(7)}.${ext}`;
  const { error } = await supabase.storage.from(bucket).upload(path, file, { upsert: true });
  if (error) { console.error('Storage upload error:', error); return null; }
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

// ── Availability Dialog ────────────────────────────────────────────────────────
function AvailabilityDialog({
  stylist,
  open,
  onClose,
}: {
  stylist: Stylist;
  open: boolean;
  onClose: () => void;
}) {
  // daySchedule: array indexed 0-6 (Sun-Sat)
  const [schedule, setSchedule] = useState<Array<{ enabled: boolean; start_time: string; end_time: string }>>(
    DAYS.map(() => defaultDaySchedule())
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Load existing availability
  useEffect(() => {
    if (!open) return;
    setLoading(true);
    supabase
      .from('availability')
      .select('*')
      .eq('stylist_id', stylist.id)
      .eq('is_available', true)
      .is('specific_date', null)
      .then(({ data }) => {
        const next = DAYS.map(() => defaultDaySchedule());
        if (data) {
          data.forEach((row: AvailabilityRow) => {
            if (row.day_of_week !== null && row.day_of_week >= 0 && row.day_of_week <= 6) {
              next[row.day_of_week] = {
                enabled: true,
                start_time: row.start_time || '09:00',
                end_time: row.end_time || '18:00',
              };
            }
          });
        }
        setSchedule(next);
        setLoading(false);
      });
  }, [open, stylist.id]);

  const toggleDay = (dayIdx: number) => {
    setSchedule(prev => prev.map((d, i) => i === dayIdx ? { ...d, enabled: !d.enabled } : d));
  };

  const setTime = (dayIdx: number, field: 'start_time' | 'end_time', value: string) => {
    setSchedule(prev => prev.map((d, i) => i === dayIdx ? { ...d, [field]: value } : d));
  };

  const handleSave = async () => {
    setSaving(true);
    // Delete all existing weekly availability rows for this stylist
    await supabase
      .from('availability')
      .delete()
      .eq('stylist_id', stylist.id)
      .is('specific_date', null);

    // Insert enabled days
    const rows = schedule
      .map((d, i) => ({ ...d, dayIdx: i }))
      .filter(d => d.enabled)
      .map(d => ({
        stylist_id: stylist.id,
        day_of_week: d.dayIdx,
        specific_date: null,
        start_time: d.start_time,
        end_time: d.end_time,
        is_available: true,
      }));

    if (rows.length > 0) {
      const { error } = await supabase.from('availability').insert(rows);
      if (error) {
        toast.error('Failed to save schedule: ' + error.message);
        setSaving(false);
        return;
      }
    }

    toast.success(`Schedule saved for ${stylist.name}`);
    setSaving(false);
    onClose();
  };

  const enabledDays = schedule.filter(d => d.enabled).length;

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent
        hideClose
        className="max-w-lg max-h-[90vh] overflow-y-auto"
        onInteractOutside={e => e.preventDefault()}
        onEscapeKeyDown={e => e.preventDefault()}
      >
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-pink-600" />
                Availability – {stylist.name}
              </DialogTitle>
              <p className="text-xs text-gray-500 mt-1">
                Set which days this stylist works. If no days are set, they are available every day by default.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full p-1.5 hover:bg-gray-100 transition-colors cursor-pointer text-gray-500 hover:text-gray-900"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-10">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-600" />
          </div>
        ) : (
          <div className="space-y-3 py-2">
            {/* Quick-select buttons */}
            <div className="flex gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => setSchedule(prev => prev.map((d, i) => i >= 1 && i <= 5 ? { ...d, enabled: true } : { ...d, enabled: false }))}
                className="text-xs px-2 py-1 rounded border border-gray-200 hover:border-pink-400 cursor-pointer"
              >
                Mon–Fri
              </button>
              <button
                type="button"
                onClick={() => setSchedule(prev => prev.map((d, i) => i >= 1 && i <= 6 ? { ...d, enabled: true } : { ...d, enabled: false }))}
                className="text-xs px-2 py-1 rounded border border-gray-200 hover:border-pink-400 cursor-pointer"
              >
                Mon–Sat
              </button>
              <button
                type="button"
                onClick={() => setSchedule(prev => prev.map(d => ({ ...d, enabled: true })))}
                className="text-xs px-2 py-1 rounded border border-gray-200 hover:border-pink-400 cursor-pointer"
              >
                Every Day
              </button>
              <button
                type="button"
                onClick={() => setSchedule(prev => prev.map(d => ({ ...d, enabled: false })))}
                className="text-xs px-2 py-1 rounded border border-red-100 text-red-500 hover:border-red-300 cursor-pointer"
              >
                Clear All
              </button>
            </div>

            {/* Day rows */}
            <div className="space-y-2">
              {DAYS.map((day, i) => {
                const d = schedule[i];
                return (
                  <div
                    key={day.value}
                    className={`rounded-xl border-2 transition-colors overflow-hidden ${d.enabled ? 'border-pink-300 bg-pink-50/40' : 'border-gray-100 bg-gray-50'}`}
                  >
                    <div className="flex items-center gap-3 px-4 py-3">
                      <input
                        type="checkbox"
                        id={`day-${day.value}`}
                        checked={d.enabled}
                        onChange={() => toggleDay(i)}
                        className="cursor-pointer w-4 h-4 accent-pink-600"
                      />
                      <label
                        htmlFor={`day-${day.value}`}
                        className={`font-semibold w-10 cursor-pointer select-none text-sm ${d.enabled ? 'text-pink-700' : 'text-gray-400'}`}
                      >
                        {day.label}
                      </label>

                      {d.enabled ? (
                        <div className="flex items-center gap-2 flex-1 flex-wrap">
                          <Clock className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                          <div className="flex items-center gap-1.5">
                            <input
                              type="time"
                              value={d.start_time}
                              onChange={e => setTime(i, 'start_time', e.target.value)}
                              className="text-xs border border-gray-200 rounded px-2 py-1 cursor-pointer bg-white"
                            />
                            <span className="text-xs text-gray-400">to</span>
                            <input
                              type="time"
                              value={d.end_time}
                              onChange={e => setTime(i, 'end_time', e.target.value)}
                              className="text-xs border border-gray-200 rounded px-2 py-1 cursor-pointer bg-white"
                            />
                          </div>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400 flex-1">Not working</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {enabledDays === 0 && (
              <p className="text-xs text-amber-600 bg-amber-50 px-3 py-2 rounded-lg">
                ⚠️ No days selected — this stylist will be available every day by default (no restrictions).
              </p>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose} className="cursor-pointer">Cancel</Button>
          <Button
            onClick={handleSave}
            disabled={saving || loading}
            className="cursor-pointer bg-pink-600 hover:bg-pink-700"
          >
            {saving ? 'Saving…' : `Save Schedule (${enabledDays} day${enabledDays !== 1 ? 's' : ''})`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────
export function AdminStylists() {
  useTitle('Stylists | Luxe Salon Admin');

  const [stylists, setStylists] = useState<Stylist[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(emptyForm());
  const [editingId, setEditingId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadingPortfolio, setUploadingPortfolio] = useState(false);
  const [saving, setSaving] = useState(false);
  const [availabilityStylist, setAvailabilityStylist] = useState<Stylist | null>(null);
  // Track which stylists have a schedule configured
  const [scheduledIds, setScheduledIds] = useState<Set<string>>(new Set());

  const profileInputRef = useRef<HTMLInputElement>(null);
  const portfolioInputRef = useRef<HTMLInputElement>(null);

  const loadStylists = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('stylists')
      .select('*')
      .is('deleted_at', null)
      .order('created_at', { ascending: true });
    if (data) {
      setStylists(data as Stylist[]);
      // Check which have availability configured
      const { data: avail } = await supabase
        .from('availability')
        .select('stylist_id')
        .not('stylist_id', 'is', null)
        .is('specific_date', null)
        .eq('is_available', true);
      if (avail) {
        setScheduledIds(new Set(avail.map((r: any) => r.stylist_id)));
      }
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadStylists(); }, [loadStylists]);

  const openAdd = () => { setForm(emptyForm()); setEditingId(null); setDialogOpen(true); };
  const openEdit = (s: Stylist) => {
    setForm({
      name: s.name, bio: s.bio || '',
      profile_image: s.profile_image || '',
      portfolio_images: s.portfolio_images || [],
      specialties: s.specialties || [],
      specialtyInput: '',
    });
    setEditingId(s.id);
    setDialogOpen(true);
  };
  const closeDialog = () => { setDialogOpen(false); setForm(emptyForm()); setEditingId(null); };

  const handleProfileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (profileInputRef.current) profileInputRef.current.value = '';
    if (!file) return;
    setUploading(true);
    const url = await uploadToStorage('stylist-images', file);
    if (url) { setForm(p => ({ ...p, profile_image: url })); toast.success('Photo uploaded'); }
    else { toast.error('Upload failed — check bucket exists in Supabase Storage'); }
    setUploading(false);
  };

  const handlePortfolioUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (portfolioInputRef.current) portfolioInputRef.current.value = '';
    if (!files.length) return;
    setUploadingPortfolio(true);
    const urls: string[] = [];
    for (const file of files) {
      const url = await uploadToStorage('stylist-images', file);
      if (url) urls.push(url);
    }
    if (urls.length) {
      setForm(p => ({ ...p, portfolio_images: [...p.portfolio_images, ...urls] }));
      toast.success(`${urls.length} photo${urls.length > 1 ? 's' : ''} uploaded`);
    } else { toast.error('Upload failed'); }
    setUploadingPortfolio(false);
  };

  const removePortfolioImage = (idx: number) =>
    setForm(p => ({ ...p, portfolio_images: p.portfolio_images.filter((_, i) => i !== idx) }));

  const addSpecialty = () => {
    const tag = form.specialtyInput.trim();
    if (!tag || form.specialties.includes(tag)) return;
    setForm(p => ({ ...p, specialties: [...p.specialties, tag], specialtyInput: '' }));
  };
  const removeSpecialty = (tag: string) =>
    setForm(p => ({ ...p, specialties: p.specialties.filter(s => s !== tag) }));

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error('Name is required'); return; }
    setSaving(true);
    const payload = {
      name: form.name.trim(), bio: form.bio,
      profile_image: form.profile_image,
      portfolio_images: form.portfolio_images,
      specialties: form.specialties,
      updated_at: new Date().toISOString(),
    };
    if (editingId) {
      const { error } = await supabase.from('stylists').update(payload).eq('id', editingId);
      if (error) { toast.error(`Failed to update: ${error.message}`); setSaving(false); return; }
      setStylists(prev => prev.map(s => s.id === editingId ? { ...s, ...payload } : s));
      toast.success('Stylist updated');
    } else {
      const { data, error } = await supabase.from('stylists').insert(payload).select().single();
      if (error) { toast.error(`Failed to add: ${error.message}`); setSaving(false); return; }
      setStylists(prev => [...prev, data as Stylist]);
      toast.success('Stylist added successfully');
    }
    setSaving(false);
    closeDialog();
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    await supabase.from('stylists').update({ deleted_at: new Date().toISOString() }).eq('id', deleteId);
    setStylists(prev => prev.filter(s => s.id !== deleteId));
    setDeleteId(null);
    toast.success('Stylist removed');
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold mb-1">Stylists</h1>
          <p className="text-gray-600">Manage your team — profiles, portfolios, specialties & schedules</p>
        </div>
        <Button onClick={openAdd} className="cursor-pointer">
          <Plus className="mr-2 h-4 w-4" />Add Stylist
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-600" />
        </div>
      ) : stylists.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <UserIcon className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p className="text-gray-500 mb-4">No stylists yet.</p>
            <Button onClick={openAdd} className="cursor-pointer">Add Your First Stylist</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {stylists.map(stylist => (
            <Card key={stylist.id} className="overflow-hidden">
              <div className="relative h-44 bg-gradient-to-br from-pink-100 to-purple-100 flex items-center justify-center">
                {stylist.profile_image ? (
                  <img src={stylist.profile_image} alt={stylist.name}
                    className="w-full h-full object-cover"
                    onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                  />
                ) : (
                  <div className="w-20 h-20 rounded-full bg-pink-200 flex items-center justify-center shadow-md">
                    <span className="text-3xl font-bold text-pink-600">{stylist.name[0]?.toUpperCase()}</span>
                  </div>
                )}
                <div className="absolute top-2 right-2 flex gap-1">
                  <Button variant="ghost" size="icon" className="bg-white/90 h-8 w-8 cursor-pointer hover:bg-white" onClick={() => openEdit(stylist)}>
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="bg-white/90 h-8 w-8 text-red-600 cursor-pointer hover:bg-white" onClick={() => setDeleteId(stylist.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                {scheduledIds.has(stylist.id) && (
                  <div className="absolute top-2 left-2 bg-green-600 text-white text-xs px-2 py-0.5 rounded-full flex items-center gap-1">
                    <Calendar className="h-3 w-3" /> Schedule set
                  </div>
                )}
                {stylist.portfolio_images?.length > 0 && (
                  <div className="absolute bottom-2 right-2 bg-black/60 text-white text-xs px-2 py-0.5 rounded-full">
                    {stylist.portfolio_images.length} photos
                  </div>
                )}
              </div>
              <CardContent className="p-4 space-y-3">
                <h3 className="font-semibold text-lg">{stylist.name}</h3>
                {stylist.bio && <p className="text-sm text-gray-600 line-clamp-2">{stylist.bio}</p>}
                {stylist.specialties?.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {stylist.specialties.map(sp => (
                      <Badge key={sp} variant="secondary" className="text-xs bg-pink-100 text-pink-800">{sp}</Badge>
                    ))}
                  </div>
                )}
                {stylist.portfolio_images?.length > 0 && (
                  <div className="grid grid-cols-4 gap-1">
                    {stylist.portfolio_images.slice(0, 4).map((img, i) => (
                      <img key={i} src={img} alt={`Portfolio ${i + 1}`} className="aspect-square object-cover rounded"
                        onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                    ))}
                  </div>
                )}
                {/* Availability button */}
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full cursor-pointer gap-2 border-pink-200 text-pink-700 hover:bg-pink-50"
                  onClick={() => setAvailabilityStylist(stylist)}
                >
                  <Clock className="h-4 w-4" />
                  {scheduledIds.has(stylist.id) ? 'Edit Schedule' : 'Set Working Schedule'}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Hidden file inputs */}
      <input ref={profileInputRef} type="file" accept="image/*" className="hidden" onChange={handleProfileUpload} />
      <input ref={portfolioInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handlePortfolioUpload} />

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={() => {}}>
        <DialogContent
          hideClose
          className="max-w-lg max-h-[90vh] overflow-y-auto"
          onInteractOutside={e => e.preventDefault()}
          onEscapeKeyDown={e => e.preventDefault()}
        >
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle>{editingId ? 'Edit Stylist' : 'Add New Stylist'}</DialogTitle>
              <button type="button" onClick={closeDialog}
                className="rounded-full p-1.5 hover:bg-gray-100 transition-colors cursor-pointer text-gray-500 hover:text-gray-900">
                <X className="h-5 w-5" />
              </button>
            </div>
          </DialogHeader>

          <div className="space-y-5 py-1">
            {/* Profile Picture */}
            <div className="space-y-2">
              <Label>Profile Picture</Label>
              <div className="flex items-center gap-4">
                <div className="flex-shrink-0">
                  {form.profile_image ? (
                    <div className="relative w-20 h-20">
                      <img src={form.profile_image} alt="Profile"
                        className="w-20 h-20 rounded-full object-cover border-2 border-pink-200"
                        onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                      <button type="button" onClick={() => setForm(p => ({ ...p, profile_image: '' }))}
                        className="absolute -top-1 -right-1 bg-red-600 text-white rounded-full w-5 h-5 flex items-center justify-center cursor-pointer">
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ) : (
                    <div className="w-20 h-20 rounded-full bg-pink-100 border-2 border-dashed border-pink-300 flex items-center justify-center">
                      <span className="text-2xl font-bold text-pink-400">{form.name?.[0]?.toUpperCase() || '?'}</span>
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <Button type="button" variant="outline" size="sm" onClick={() => profileInputRef.current?.click()}
                    disabled={uploading} className="cursor-pointer w-full">
                    {uploading
                      ? <><div className="animate-spin rounded-full h-3 w-3 border-b-2 border-pink-600 mr-2" />Uploading...</>
                      : <><Upload className="mr-2 h-4 w-4" />{form.profile_image ? 'Change Photo' : 'Upload Photo'}</>}
                  </Button>
                  <p className="text-xs text-gray-500 mt-1">JPG, PNG or WebP</p>
                </div>
              </div>
            </div>

            {/* Name */}
            <div className="space-y-1">
              <Label htmlFor="stylist-name">Name *</Label>
              <Input id="stylist-name" placeholder="e.g. Amina Wanjiku" value={form.name}
                onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
            </div>

            {/* Bio */}
            <div className="space-y-1">
              <Label htmlFor="stylist-bio">Bio</Label>
              <Textarea id="stylist-bio" placeholder="Short description…" value={form.bio}
                onChange={e => setForm(p => ({ ...p, bio: e.target.value }))} rows={3} />
            </div>

            {/* Specialties */}
            <div className="space-y-2">
              <Label>Specialties</Label>
              <div className="flex gap-2">
                <Input placeholder="e.g. Balayage" value={form.specialtyInput}
                  onChange={e => setForm(p => ({ ...p, specialtyInput: e.target.value }))}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addSpecialty(); } }} />
                <Button type="button" variant="outline" size="sm" onClick={addSpecialty} className="cursor-pointer">
                  <Tag className="h-4 w-4" />
                </Button>
              </div>
              {form.specialties.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {form.specialties.map(tag => (
                    <Badge key={tag} variant="secondary" className="flex items-center gap-1 pr-1">
                      {tag}
                      <button type="button" onClick={() => removeSpecialty(tag)} className="ml-0.5 hover:text-red-600 cursor-pointer">
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            {/* Portfolio */}
            <div className="space-y-2">
              <Label>Portfolio Images ({form.portfolio_images.length})</Label>
              {form.portfolio_images.length > 0 && (
                <div className="grid grid-cols-4 gap-2">
                  {form.portfolio_images.map((img, i) => (
                    <div key={i} className="relative">
                      <img src={img} alt={`Portfolio ${i + 1}`} className="aspect-square object-cover rounded border border-gray-200"
                        onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                      <button type="button" onClick={() => removePortfolioImage(i)}
                        className="absolute -top-1 -right-1 bg-red-600 text-white rounded-full w-4 h-4 flex items-center justify-center cursor-pointer">
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <Button type="button" variant="outline" size="sm" onClick={() => portfolioInputRef.current?.click()}
                disabled={uploadingPortfolio} className="cursor-pointer w-full">
                {uploadingPortfolio
                  ? <><div className="animate-spin rounded-full h-3 w-3 border-b-2 border-pink-600 mr-2" />Uploading...</>
                  : <><Upload className="mr-2 h-4 w-4" />Upload Portfolio Photos</>}
              </Button>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeDialog} className="cursor-pointer">Cancel</Button>
            <Button onClick={handleSave} disabled={saving || uploading || uploadingPortfolio} className="cursor-pointer">
              {saving ? 'Saving…' : editingId ? 'Save Changes' : 'Add Stylist'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Availability Dialog */}
      {availabilityStylist && (
        <AvailabilityDialog
          stylist={availabilityStylist}
          open={!!availabilityStylist}
          onClose={() => {
            setAvailabilityStylist(null);
            // Refresh scheduled IDs
            supabase.from('availability').select('stylist_id')
              .not('stylist_id', 'is', null)
              .is('specific_date', null)
              .eq('is_available', true)
              .then(({ data }) => {
                if (data) setScheduledIds(new Set(data.map((r: any) => r.stylist_id)));
              });
          }}
        />
      )}

      {/* Delete Confirm */}
      <AlertDialog open={!!deleteId} onOpenChange={open => { if (!open) setDeleteId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Stylist?</AlertDialogTitle>
            <AlertDialogDescription>This stylist will be removed from the app.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="cursor-pointer" onClick={() => setDeleteId(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-red-600 hover:bg-red-700 cursor-pointer" onClick={handleDelete}>Remove</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
