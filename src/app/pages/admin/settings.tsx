import { useState, useEffect, useRef } from 'react';
import {
  Save, Phone, FileText, Shield, RefreshCw, Image as ImageIcon,
  Upload, X, Edit3, Store, MapPin, Mail, Clock,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import { supabase } from '../../../lib/supabase';
import { toast } from 'sonner';

function useTitle(title: string) {
  useEffect(() => { document.title = title; }, [title]);
}

interface SettingRow { key: string; value: string; }

const SETTING_KEYS = [
  'whatsapp_number', 'terms_of_service', 'privacy_policy', 'home_categories',
  'salon_name', 'salon_address', 'salon_phone', 'salon_email',
  'salon_hours_weekday', 'salon_hours_saturday', 'salon_hours_sunday',
];

const DEFAULT_CATEGORIES = [
  { key: 'hair',    label: 'Hair Styling',       description: 'Cut, colour & style',          image: '' },
  { key: 'nails',   label: 'Nail Services',       description: 'Manicure & pedicure',          image: '' },
  { key: 'facial',  label: 'Facial Treatments',   description: 'Skin care & rejuvenation',     image: '' },
  { key: 'massage', label: 'Massage Therapy',     description: 'Relaxation & wellness',        image: '' },
  { key: 'makeup',  label: 'Makeup',              description: 'Everyday & bridal looks',      image: '' },
  { key: 'waxing',  label: 'Waxing',              description: 'Smooth & hair-free skin',      image: '' },
];

const DEFAULT_IMAGES: Record<string, string> = {
  hair:    'https://images.unsplash.com/photo-1562322140-8baeececf3df?w=600',
  nails:   'https://images.unsplash.com/photo-1604654894610-df63bc536371?w=600',
  facial:  'https://images.unsplash.com/photo-1519823551278-64ac92734fb1?w=600',
  massage: 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=600',
  makeup:  'https://images.unsplash.com/photo-1487412947147-5cebf100ffc2?w=600',
  waxing:  'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=600',
};

type CategoryEntry = { key: string; label: string; description: string; image: string };

export function AdminSettings() {
  useTitle('Settings | Luxe Salon Admin');

  const [settings, setSettings] = useState<Record<string, string>>({
    whatsapp_number: '',
    terms_of_service: '',
    privacy_policy: '',
    home_categories: '',
    salon_name: 'Luxe Salon',
    salon_address: 'Kimathi Street, CBD, Nairobi, Kenya',
    salon_phone: '+254 712 345 678',
    salon_email: 'info@luxesalon.co.ke',
    salon_hours_weekday: '9:00 AM – 8:00 PM',
    salon_hours_saturday: '10:00 AM – 6:00 PM',
    salon_hours_sunday: 'Closed',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [categories, setCategories] = useState<CategoryEntry[]>(DEFAULT_CATEGORIES);
  const [uploadingCat, setUploadingCat] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingForKey, setUploadingForKey] = useState<string | null>(null);

  useEffect(() => { loadSettings(); }, []);

  const loadSettings = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('settings')
      .select('key, value')
      .in('key', SETTING_KEYS);

    if (error) {
      toast.error('Failed to load settings');
    } else if (data) {
      const map: Record<string, string> = {};
      (data as SettingRow[]).forEach(row => { map[row.key] = row.value || ''; });
      setSettings(prev => ({ ...prev, ...map }));

      // Parse home_categories
      if (map.home_categories) {
        try {
          const parsed = JSON.parse(map.home_categories);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setCategories(DEFAULT_CATEGORIES.map(def => {
              const found = parsed.find((p: any) => p.key === def.key);
              return found ? { ...def, ...found } : def;
            }));
          }
        } catch { /* ignore */ }
      }
    }
    setLoading(false);
  };

  const saveSetting = async (key: string, value?: string) => {
    setSaving(key);
    const val = value !== undefined ? value : settings[key];
    const { error } = await supabase
      .from('settings')
      .upsert({ key, value: val, updated_at: new Date().toISOString() }, { onConflict: 'key' });

    if (error) {
      toast.error(`Failed to save: ${error.message}`);
    } else {
      toast.success('Saved!');
    }
    setSaving(null);
  };

  const saveSalonInfo = async () => {
    setSaving('salon_info');
    const rows = [
      'salon_name', 'salon_address', 'salon_phone', 'salon_email',
      'salon_hours_weekday', 'salon_hours_saturday', 'salon_hours_sunday',
    ].map(key => ({ key, value: settings[key] || '', updated_at: new Date().toISOString() }));

    const { error } = await supabase.from('settings').upsert(rows, { onConflict: 'key' });
    if (error) {
      toast.error(`Failed to save salon info: ${error.message}`);
    } else {
      toast.success('Salon information saved!');
    }
    setSaving(null);
  };

  const saveAll = async () => {
    setSaving('all');
    const categoriesJson = JSON.stringify(categories);
    const rows = [
      { key: 'whatsapp_number',      value: settings.whatsapp_number,      updated_at: new Date().toISOString() },
      { key: 'terms_of_service',     value: settings.terms_of_service,     updated_at: new Date().toISOString() },
      { key: 'privacy_policy',       value: settings.privacy_policy,       updated_at: new Date().toISOString() },
      { key: 'home_categories',      value: categoriesJson,                  updated_at: new Date().toISOString() },
      { key: 'salon_name',           value: settings.salon_name,            updated_at: new Date().toISOString() },
      { key: 'salon_address',        value: settings.salon_address,         updated_at: new Date().toISOString() },
      { key: 'salon_phone',          value: settings.salon_phone,           updated_at: new Date().toISOString() },
      { key: 'salon_email',          value: settings.salon_email,           updated_at: new Date().toISOString() },
      { key: 'salon_hours_weekday',  value: settings.salon_hours_weekday,   updated_at: new Date().toISOString() },
      { key: 'salon_hours_saturday', value: settings.salon_hours_saturday,  updated_at: new Date().toISOString() },
      { key: 'salon_hours_sunday',   value: settings.salon_hours_sunday,    updated_at: new Date().toISOString() },
    ];
    const { error } = await supabase.from('settings').upsert(rows, { onConflict: 'key' });

    if (error) {
      toast.error(`Failed to save settings: ${error.message}`);
    } else {
      toast.success('All settings saved!');
    }
    setSaving(null);
  };

  const updateCategory = (key: string, field: keyof CategoryEntry, value: string) => {
    setCategories(prev => prev.map(c => c.key === key ? { ...c, [field]: value } : c));
  };

  const handleCategoryImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (!file || !uploadingForKey) return;

    setUploadingCat(uploadingForKey);
    const ext = file.name.split('.').pop();
    const path = `categories/${uploadingForKey}-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from('service-images').upload(path, file, { upsert: true });

    if (error) {
      toast.error('Upload failed: ' + error.message);
    } else {
      const { data } = supabase.storage.from('service-images').getPublicUrl(path);
      updateCategory(uploadingForKey, 'image', data.publicUrl);
      toast.success('Image uploaded! Click "Save Categories" to apply.');
    }
    setUploadingCat(null);
    setUploadingForKey(null);
  };

  const triggerCategoryUpload = (key: string) => {
    setUploadingForKey(key);
    setTimeout(() => fileInputRef.current?.click(), 50);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-600 mx-auto mb-4" />
          <p className="text-gray-500">Loading settings…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Hidden file input for category images */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleCategoryImageUpload}
      />

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold mb-1">Settings</h1>
          <p className="text-gray-500">Manage your salon's configuration and content.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={loadSettings} disabled={!!saving} className="gap-2" id="settings-refresh-btn">
            <RefreshCw className="h-4 w-4" />Refresh
          </Button>
          <Button onClick={saveAll} disabled={!!saving} className="gap-2 bg-pink-600 hover:bg-pink-700" id="settings-save-all-btn">
            <Save className="h-4 w-4" />{saving === 'all' ? 'Saving…' : 'Save All'}
          </Button>
        </div>
      </div>

      {/* ── Salon Information ─────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-pink-50 rounded-lg"><Store className="h-5 w-5 text-pink-600" /></div>
            <div>
              <CardTitle className="text-base">Salon Information</CardTitle>
              <CardDescription>Edit your salon name, contact details, and opening hours.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Salon Name */}
          <div className="space-y-1">
            <Label htmlFor="salon_name">Salon Name</Label>
            <Input
              id="salon_name"
              value={settings.salon_name}
              onChange={e => setSettings(p => ({ ...p, salon_name: e.target.value }))}
              placeholder="e.g. Luxe Salon"
            />
          </div>

          {/* Address */}
          <div className="space-y-1">
            <Label htmlFor="salon_address" className="flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" /> Address
            </Label>
            <Input
              id="salon_address"
              value={settings.salon_address}
              onChange={e => setSettings(p => ({ ...p, salon_address: e.target.value }))}
              placeholder="e.g. Kimathi Street, CBD, Nairobi, Kenya"
            />
          </div>

          {/* Phone & Email */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label htmlFor="salon_phone" className="flex items-center gap-1">
                <Phone className="h-3.5 w-3.5" /> Phone
              </Label>
              <Input
                id="salon_phone"
                value={settings.salon_phone}
                onChange={e => setSettings(p => ({ ...p, salon_phone: e.target.value }))}
                placeholder="+254 712 345 678"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="salon_email" className="flex items-center gap-1">
                <Mail className="h-3.5 w-3.5" /> Email
              </Label>
              <Input
                id="salon_email"
                type="email"
                value={settings.salon_email}
                onChange={e => setSettings(p => ({ ...p, salon_email: e.target.value }))}
                placeholder="info@luxesalon.co.ke"
              />
            </div>
          </div>

          {/* Opening Hours */}
          <div className="space-y-2">
            <Label className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> Opening Hours</Label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <p className="text-xs text-gray-500 font-medium">Mon – Fri</p>
                <Input
                  value={settings.salon_hours_weekday}
                  onChange={e => setSettings(p => ({ ...p, salon_hours_weekday: e.target.value }))}
                  placeholder="9:00 AM – 8:00 PM"
                />
              </div>
              <div className="space-y-1">
                <p className="text-xs text-gray-500 font-medium">Saturday</p>
                <Input
                  value={settings.salon_hours_saturday}
                  onChange={e => setSettings(p => ({ ...p, salon_hours_saturday: e.target.value }))}
                  placeholder="10:00 AM – 6:00 PM"
                />
              </div>
              <div className="space-y-1">
                <p className="text-xs text-gray-500 font-medium">Sunday</p>
                <Input
                  value={settings.salon_hours_sunday}
                  onChange={e => setSettings(p => ({ ...p, salon_hours_sunday: e.target.value }))}
                  placeholder="Closed"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <Button
              onClick={saveSalonInfo}
              disabled={saving === 'salon_info'}
              className="gap-2 bg-pink-600 hover:bg-pink-700"
              id="save-salon-info-btn"
            >
              <Save className="h-4 w-4" />
              {saving === 'salon_info' ? 'Saving…' : 'Save Salon Info'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ── WhatsApp Number ───────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-green-50 rounded-lg"><Phone className="h-5 w-5 text-green-600" /></div>
            <div>
              <CardTitle className="text-base">WhatsApp Booking Number</CardTitle>
              <CardDescription>The number customers use to send booking enquiries via WhatsApp.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label htmlFor="whatsapp_number">Phone Number (with country code)</Label>
            <div className="flex gap-2 mt-1.5">
              <Input
                id="whatsapp_number"
                placeholder="e.g. 254712345678"
                value={settings.whatsapp_number}
                onChange={e => setSettings(prev => ({ ...prev, whatsapp_number: e.target.value }))}
                className="font-mono"
              />
              <Button
                onClick={() => saveSetting('whatsapp_number')}
                disabled={saving === 'whatsapp_number'}
                variant="outline"
                id="save-whatsapp-btn"
              >
                {saving === 'whatsapp_number' ? 'Saving…' : 'Save'}
              </Button>
            </div>
            <p className="text-xs text-gray-400 mt-1">
              No spaces, dashes, or plus signs. Example: <code>254712345678</code>
            </p>
          </div>
        </CardContent>
      </Card>

      {/* ── Home Page Categories ──────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-pink-50 rounded-lg"><ImageIcon className="h-5 w-5 text-pink-600" /></div>
            <div>
              <CardTitle className="text-base">Home Page — Our Services Categories</CardTitle>
              <CardDescription>
                Edit the images, names, and descriptions shown on the home page services section.
                Changes are applied in real-time after saving.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {categories.map(cat => (
              <div key={cat.key} className="border border-gray-200 rounded-xl p-4 space-y-3">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                  {/* Image preview */}
                  <div className="relative w-20 h-16 flex-shrink-0 rounded-lg overflow-hidden bg-gray-100 border border-gray-200">
                    <img
                      src={cat.image || DEFAULT_IMAGES[cat.key]}
                      alt={cat.label}
                      className="w-full h-full object-cover"
                      onError={e => { (e.target as HTMLImageElement).src = DEFAULT_IMAGES[cat.key]; }}
                    />
                    <button
                      type="button"
                      onClick={() => triggerCategoryUpload(cat.key)}
                      disabled={!!uploadingCat}
                      className="absolute inset-0 bg-black/40 text-white flex flex-col items-center justify-center opacity-0 hover:opacity-100 transition-opacity cursor-pointer text-xs gap-0.5"
                    >
                      {uploadingCat === cat.key
                        ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                        : <><Upload className="h-4 w-4" /><span>Change</span></>
                      }
                    </button>
                  </div>

                  {/* Name & description */}
                  <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2 w-full">
                    <div>
                      <Label className="text-xs text-gray-500 mb-1 block flex items-center gap-1">
                        <Edit3 className="h-3 w-3" /> Category Name
                      </Label>
                      <Input
                        value={cat.label}
                        onChange={e => updateCategory(cat.key, 'label', e.target.value)}
                        className="h-8 text-sm"
                        placeholder="e.g. Hair Styling"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-gray-500 mb-1 block flex items-center gap-1">
                        <Edit3 className="h-3 w-3" /> Description
                      </Label>
                      <Input
                        value={cat.description}
                        onChange={e => updateCategory(cat.key, 'description', e.target.value)}
                        className="h-8 text-sm"
                        placeholder="Short description…"
                      />
                    </div>
                  </div>

                  {/* Remove custom image */}
                  {cat.image && (
                    <button
                      type="button"
                      onClick={() => updateCategory(cat.key, 'image', '')}
                      className="text-gray-400 hover:text-red-500 transition-colors cursor-pointer flex-shrink-0"
                      title="Reset to default image"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>

                {/* Image URL manual input */}
                <div>
                  <Label className="text-xs text-gray-500 mb-1 block">Image URL (or upload above)</Label>
                  <Input
                    value={cat.image}
                    onChange={e => updateCategory(cat.key, 'image', e.target.value)}
                    placeholder={`Default: ${DEFAULT_IMAGES[cat.key]}`}
                    className="h-8 text-xs font-mono"
                  />
                </div>
              </div>
            ))}
          </div>
          <div className="flex justify-end mt-4">
            <Button
              onClick={() => {
                const json = JSON.stringify(categories);
                setSettings(prev => ({ ...prev, home_categories: json }));
                saveSetting('home_categories', json);
              }}
              disabled={saving === 'home_categories'}
              className="gap-2 bg-pink-600 hover:bg-pink-700"
              id="save-categories-btn"
            >
              <Save className="h-4 w-4" />
              {saving === 'home_categories' ? 'Saving…' : 'Save Categories'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ── Terms of Service ─────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-blue-50 rounded-lg"><FileText className="h-5 w-5 text-blue-600" /></div>
            <div>
              <CardTitle className="text-base">Terms of Service</CardTitle>
              <CardDescription>Displayed on the public <strong>/terms</strong> page.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <Textarea
            id="terms_of_service"
            rows={14}
            placeholder="Enter your Terms of Service…"
            value={settings.terms_of_service}
            onChange={e => setSettings(prev => ({ ...prev, terms_of_service: e.target.value }))}
            className="font-mono text-sm resize-y"
          />
          <div className="flex justify-end">
            <Button
              onClick={() => saveSetting('terms_of_service')}
              disabled={saving === 'terms_of_service'}
              className="gap-2 bg-blue-600 hover:bg-blue-700"
              id="save-terms-btn"
            >
              <Save className="h-4 w-4" />
              {saving === 'terms_of_service' ? 'Saving…' : 'Save Terms'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ── Privacy Policy ───────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-purple-50 rounded-lg"><Shield className="h-5 w-5 text-purple-600" /></div>
            <div>
              <CardTitle className="text-base">Privacy Policy</CardTitle>
              <CardDescription>Displayed on the public <strong>/privacy</strong> page.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <Textarea
            id="privacy_policy"
            rows={14}
            placeholder="Enter your Privacy Policy…"
            value={settings.privacy_policy}
            onChange={e => setSettings(prev => ({ ...prev, privacy_policy: e.target.value }))}
            className="font-mono text-sm resize-y"
          />
          <div className="flex justify-end">
            <Button
              onClick={() => saveSetting('privacy_policy')}
              disabled={saving === 'privacy_policy'}
              className="gap-2 bg-purple-600 hover:bg-purple-700"
              id="save-privacy-btn"
            >
              <Save className="h-4 w-4" />
              {saving === 'privacy_policy' ? 'Saving…' : 'Save Privacy Policy'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
