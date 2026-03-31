import { useState, useEffect, useCallback, useRef } from 'react';
import { Plus, Save, Trash2, Upload, X, ChevronDown, ChevronUp, RefreshCw, Eye, EyeOff } from 'lucide-react';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Textarea } from '../../components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../../components/ui/select';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from '../../components/ui/alert-dialog';
import { Badge } from '../../components/ui/badge';
import { toast } from 'sonner';
import { supabase } from '../../../lib/supabase';

function useTitle(title: string) {
  useEffect(() => { document.title = title; }, [title]);
}

const CATEGORIES = ['hair', 'nails', 'facials', 'massage', 'makeup', 'waxing'] as const;
type Category = typeof CATEGORIES[number];

const CATEGORY_LABELS: Record<Category, string> = {
  hair: 'Hair', nails: 'Nails', facials: 'Facials',
  massage: 'Massage', makeup: 'Makeup', waxing: 'Waxing',
};

interface Service {
  id: string;
  name: string;
  description: string;
  price: number;
  duration: string;
  category: string;
  images: string[];
  is_visible_on_homepage: boolean;
  display_order: number;
  deleted_at: string | null;
}

const DEFAULT_IMAGES: Record<string, string> = {
  hair:    'https://images.unsplash.com/photo-1562322140-8baeececf3df?w=600',
  nails:   'https://images.unsplash.com/photo-1604654894610-df63bc536371?w=600',
  facials: 'https://images.unsplash.com/photo-1519823551278-64ac92734fb1?w=600',
  massage: 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=600',
  makeup:  'https://images.unsplash.com/photo-1487412947147-5cebf100ffc2?w=600',
  waxing:  'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=600',
};

const ALL_DEFAULT_SERVICES = [
  { name: 'Classic Haircut',      description: 'Professional haircut with styling',                       price: 2500,  duration: '45 min',   category: 'hair',    images: [] },
  { name: 'Hair Coloring',        description: 'Full hair coloring service with premium products',         price: 6500,  duration: '2 hours',  category: 'hair',    images: [] },
  { name: 'Balayage Highlights',  description: 'Natural-looking highlights with expert technique',         price: 9500,  duration: '3 hours',  category: 'hair',    images: [] },
  { name: 'Keratin Treatment',    description: 'Smoothing treatment for frizz-free hair',                 price: 13500, duration: '3-4 hours',category: 'hair',    images: [] },
  { name: 'Classic Manicure',     description: 'Traditional manicure with polish of your choice',         price: 1900,  duration: '45 min',   category: 'nails',   images: [] },
  { name: 'Gel Manicure',         description: 'Long-lasting gel polish manicure',                        price: 3000,  duration: '1 hour',   category: 'nails',   images: [] },
  { name: 'Spa Pedicure',         description: 'Luxurious pedicure with massage and moisturizing treatment',price: 3500, duration: '1.5 hours',category: 'nails',   images: [] },
  { name: 'Acrylic Nails',        description: 'Full set of acrylic nails with your choice of design',    price: 4000,  duration: '1.5 hours',category: 'nails',   images: [] },
  { name: 'Deep Cleansing Facial',description: 'Purifying facial for all skin types',                     price: 4500,  duration: '1 hour',   category: 'facials', images: [] },
  { name: 'Anti-Aging Facial',    description: 'Advanced facial targeting fine lines and wrinkles',       price: 6000,  duration: '1.5 hours',category: 'facials', images: [] },
  { name: 'Hydrating Facial',     description: 'Moisture-restoring treatment for dry skin',               price: 5200,  duration: '1 hour',   category: 'facials', images: [] },
  { name: 'Swedish Massage',      description: 'Relaxing full-body massage',                              price: 4900,  duration: '1 hour',   category: 'massage', images: [] },
  { name: 'Deep Tissue Massage',  description: 'Therapeutic massage for muscle tension',                  price: 5700,  duration: '1 hour',   category: 'massage', images: [] },
  { name: 'Hot Stone Massage',    description: 'Relaxing massage with heated stones',                     price: 6500,  duration: '1.5 hours',category: 'massage', images: [] },
  { name: 'Bridal Makeup',        description: 'Professional bridal makeup application',                  price: 8200,  duration: '2 hours',  category: 'makeup',  images: [] },
  { name: 'Evening Makeup',       description: 'Glamorous makeup for special occasions',                  price: 4400,  duration: '1 hour',   category: 'makeup',  images: [] },
  { name: 'Full Body Waxing',     description: 'Complete full body waxing for smooth skin',               price: 7500,  duration: '1.5 hours',category: 'waxing',  images: [] },
  { name: 'Leg Waxing',           description: 'Smooth legs with professional waxing',                   price: 2800,  duration: '45 min',   category: 'waxing',  images: [] },
];

type EditState = Map<string, Service>;
const emptyNew = (): Omit<Service, 'id' | 'deleted_at'> => ({
  name: '', description: '', price: 0, duration: '1 hour', category: 'hair',
  images: [], is_visible_on_homepage: true, display_order: 0,
});

export function AdminCatalogue() {
  useTitle('Catalogue | Luxe Salon Admin');

  const [services, setServices] = useState<Service[]>([]);
  const [edits, setEdits] = useState<EditState>(new Map());
  const [saving, setSaving] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [uploading, setUploading] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState<Set<Category>>(new Set());
  const [showAddForm, setShowAddForm] = useState(false);
  const [newService, setNewService] = useState(emptyNew());
  const [addingSaving, setAddingSaving] = useState(false);
  const uploadInputRef = useRef<HTMLInputElement>(null);
  const uploadForId = useRef<string | null>(null);
  const [filter, setFilter] = useState<'all' | Category>('all');

  const loadServices = useCallback(async () => {
    setLoading(true);
    const { data: existing, error: readErr } = await supabase
      .from('services')
      .select('*')
      .is('deleted_at', null)
      .order('display_order', { ascending: true, nullsFirst: false })
      .order('category');

    if (readErr) { toast.error('Failed to load: ' + readErr.message); setLoading(false); return; }

    if (!existing || existing.length === 0) {
      // Seed defaults only when DB is truly empty
      const toInsert = ALL_DEFAULT_SERVICES.map((s, i) => ({
        ...s, is_visible_on_homepage: true, display_order: i + 1,
        updated_at: new Date().toISOString(),
      }));
      const { data: inserted, error: insertErr } = await supabase
        .from('services').insert(toInsert).select();
      if (insertErr) toast.error('Seed failed: ' + insertErr.message);
      else if (inserted) setServices(inserted as Service[]);
    } else {
      setServices(existing as Service[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadServices(); }, [loadServices]);

  // ── Inline edit helpers ───────────────────────────────────────────────────
  const startEdit = (svc: Service) => {
    setEdits(prev => new Map(prev).set(svc.id, { ...svc }));
  };

  const updateEdit = (id: string, field: keyof Service, value: any) => {
    setEdits(prev => {
      const next = new Map(prev);
      const row = next.get(id);
      if (row) next.set(id, { ...row, [field]: value });
      return next;
    });
  };

  const cancelEdit = (id: string) => {
    setEdits(prev => { const m = new Map(prev); m.delete(id); return m; });
  };

  const saveEdit = async (id: string) => {
    const row = edits.get(id);
    if (!row) return;
    setSaving(prev => new Set(prev).add(id));
    const { name, description, price, duration, category, images, is_visible_on_homepage, display_order } = row;
    const { error } = await supabase.from('services').update({
      name, description, price: Number(price), duration, category, images,
      is_visible_on_homepage, display_order: Number(display_order),
      updated_at: new Date().toISOString(),
    }).eq('id', id);
    if (error) {
      toast.error(`Failed to save: ${error.message}`);
    } else {
      setServices(prev => prev.map(s => s.id === id ? { ...s, ...row } : s));
      cancelEdit(id);
      toast.success('Service updated!');
    }
    setSaving(prev => { const s = new Set(prev); s.delete(id); return s; });
  };

  // ── Image upload ─────────────────────────────────────────────────────────
  const triggerUpload = (serviceId: string) => {
    uploadForId.current = serviceId;
    uploadInputRef.current?.click();
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (uploadInputRef.current) uploadInputRef.current.value = '';
    if (!file || !uploadForId.current) return;
    const id = uploadForId.current;
    setUploading(id);

    const ext = file.name.split('.').pop();
    const path = `services/${id}-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from('service-images').upload(path, file, { upsert: true });
    if (error) {
      toast.error('Image upload failed: ' + error.message);
      setUploading(null);
      return;
    }
    const { data: urlData } = supabase.storage.from('service-images').getPublicUrl(path);
    const url = urlData.publicUrl;

    // Update the edit state if editing, else update directly
    const existing = edits.get(id);
    if (existing) {
      updateEdit(id, 'images', [url, ...existing.images.filter(u => u !== url)]);
    } else {
      // Start edit with the new image
      const svc = services.find(s => s.id === id);
      if (svc) {
        const updated = { ...svc, images: [url, ...svc.images] };
        setEdits(prev => new Map(prev).set(id, updated));
      }
    }
    toast.success('Image uploaded — click Save to apply.');
    setUploading(null);
    uploadForId.current = null;
  };

  // ── Add new service ───────────────────────────────────────────────────────
  const handleAdd = async () => {
    if (!newService.name.trim()) { toast.error('Name is required'); return; }
    if (!newService.price || newService.price < 0) { toast.error('Valid price required'); return; }
    setAddingSaving(true);
    const maxOrder = services.reduce((m, s) => Math.max(m, s.display_order || 0), 0);
    const { data, error } = await supabase.from('services').insert([{
      ...newService,
      price: Number(newService.price),
      display_order: maxOrder + 1,
      is_visible_on_homepage: true,
      updated_at: new Date().toISOString(),
    }]).select().single();
    if (error) {
      toast.error(`Failed to add: ${error.message}`);
    } else {
      setServices(prev => [...prev, data as Service]);
      setNewService(emptyNew());
      setShowAddForm(false);
      toast.success('Service added!');
    }
    setAddingSaving(false);
  };

  // ── Delete ────────────────────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!deleteId) return;
    await supabase.from('services').update({ deleted_at: new Date().toISOString() }).eq('id', deleteId);
    setServices(prev => prev.filter(s => s.id !== deleteId));
    setDeleteId(null);
    toast.success('Service removed');
  };

  const toggleCollapse = (cat: Category) => {
    setCollapsed(prev => {
      const s = new Set(prev);
      s.has(cat) ? s.delete(cat) : s.add(cat);
      return s;
    });
  };

  // ── Render ────────────────────────────────────────────────────────────────
  const filtered = filter === 'all' ? services : services.filter(s => s.category === filter);
  const grouped = CATEGORIES.reduce<Record<Category, Service[]>>((acc, cat) => {
    acc[cat] = filtered.filter(s => s.category === cat);
    return acc;
  }, {} as any);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-600 mx-auto mb-4" />
          <p className="text-gray-500">Loading catalogue…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Hidden image input */}
      <input ref={uploadInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold mb-1">Services Catalogue</h1>
          <p className="text-gray-500">
            {services.length} service{services.length !== 1 ? 's' : ''} — edit inline,
            changes save directly to Supabase and update the site in real time.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={loadServices} id="catalogue-refresh-btn" className="gap-2">
            <RefreshCw className="h-4 w-4" />Refresh
          </Button>
          <Button onClick={() => setShowAddForm(v => !v)} className="gap-2 bg-pink-600 hover:bg-pink-700" id="add-service-btn">
            <Plus className="h-4 w-4" />{showAddForm ? 'Cancel' : 'Add Service'}
          </Button>
        </div>
      </div>

      {/* Category filter pills */}
      <div className="flex flex-wrap gap-2">
        {(['all', ...CATEGORIES] as const).map(c => (
          <button
            key={c}
            type="button"
            onClick={() => setFilter(c)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors cursor-pointer ${
              filter === c
                ? 'bg-pink-600 text-white border-pink-600'
                : 'bg-white text-gray-600 border-gray-200 hover:border-pink-400'
            }`}
          >
            {c === 'all' ? `All (${services.length})` : `${CATEGORY_LABELS[c]} (${grouped[c].length})`}
          </button>
        ))}
      </div>

      {/* ── Add New Service Form ────────────────────────────────────────── */}
      {showAddForm && (
        <Card className="border-2 border-pink-300 border-dashed">
          <CardHeader>
            <CardTitle className="text-base text-pink-700">New Service</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>Name *</Label>
              <Input value={newService.name} onChange={e => setNewService(p => ({ ...p, name: e.target.value }))} placeholder="e.g. Hot Oil Treatment" />
            </div>
            <div className="space-y-1">
              <Label>Category</Label>
              <Select value={newService.category} onValueChange={v => setNewService(p => ({ ...p, category: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(c => <SelectItem key={c} value={c}>{CATEGORY_LABELS[c]}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Price (KES) *</Label>
              <Input type="number" value={newService.price || ''} onChange={e => setNewService(p => ({ ...p, price: Number(e.target.value) }))} placeholder="e.g. 3500" />
            </div>
            <div className="space-y-1">
              <Label>Duration</Label>
              <Input value={newService.duration} onChange={e => setNewService(p => ({ ...p, duration: e.target.value }))} placeholder="e.g. 1 hour" />
            </div>
            <div className="sm:col-span-2 space-y-1">
              <Label>Description</Label>
              <Textarea value={newService.description} onChange={e => setNewService(p => ({ ...p, description: e.target.value }))} rows={2} placeholder="Short description…" />
            </div>
            <div className="sm:col-span-2 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowAddForm(false)} className="cursor-pointer">Cancel</Button>
              <Button onClick={handleAdd} disabled={addingSaving} className="gap-2 bg-pink-600 hover:bg-pink-700 cursor-pointer">
                {addingSaving ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" /> : <Plus className="h-4 w-4" />}
                Add Service
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Services grouped by category ───────────────────────────────── */}
      {CATEGORIES.map(cat => {
        const svcList = grouped[cat];
        if (svcList.length === 0 && filter !== 'all') return null;
        const isCollapsed = collapsed.has(cat);
        return (
          <Card key={cat}>
            <CardHeader
              className="cursor-pointer select-none flex-row items-center justify-between py-4"
              onClick={() => toggleCollapse(cat)}
            >
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-pink-500" />
                <CardTitle className="text-base">{CATEGORY_LABELS[cat]}</CardTitle>
                <Badge variant="secondary">{svcList.length}</Badge>
              </div>
              {isCollapsed ? <ChevronDown className="h-5 w-5 text-gray-400" /> : <ChevronUp className="h-5 w-5 text-gray-400" />}
            </CardHeader>

            {!isCollapsed && (
              <CardContent className="pt-0 px-4 pb-4 space-y-4">
                {svcList.map(svc => {
                  const draft = edits.get(svc.id) ?? svc;
                  const isEditing = edits.has(svc.id);
                  const isSaving = saving.has(svc.id);
                  const isUploading = uploading === svc.id;
                  const displayImg = draft.images?.[0] || DEFAULT_IMAGES[cat];

                  return (
                    <div
                      key={svc.id}
                      className={`border rounded-xl p-4 transition-colors ${isEditing ? 'border-pink-300 bg-pink-50/30' : 'border-gray-100 bg-white hover:border-gray-200'}`}
                    >
                      <div className="flex flex-col sm:flex-row gap-4 items-start">
                        {/* Image */}
                        <div className="flex-shrink-0 relative">
                          <img
                            src={displayImg}
                            alt={draft.name}
                            className="w-24 h-20 object-cover rounded-lg border border-gray-200"
                            onError={e => { (e.target as HTMLImageElement).src = DEFAULT_IMAGES[cat]; }}
                          />
                          <button
                            type="button"
                            onClick={() => triggerUpload(svc.id)}
                            disabled={!!isUploading}
                            className="absolute inset-0 bg-black/40 rounded-lg text-white flex flex-col items-center justify-center text-xs opacity-0 hover:opacity-100 transition-opacity cursor-pointer"
                          >
                            {isUploading
                              ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                              : <><Upload className="h-4 w-4" /><span>Change</span></>}
                          </button>
                        </div>

                        {/* Fields */}
                        <div className="flex-1 w-full">
                          {isEditing ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div className="space-y-1">
                                <Label className="text-xs text-gray-500">Name</Label>
                                <Input value={draft.name} onChange={e => updateEdit(svc.id, 'name', e.target.value)} className="h-8 text-sm" />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-xs text-gray-500">Price (KES)</Label>
                                <Input type="number" value={draft.price} onChange={e => updateEdit(svc.id, 'price', e.target.value)} className="h-8 text-sm" />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-xs text-gray-500">Duration</Label>
                                <Input value={draft.duration} onChange={e => updateEdit(svc.id, 'duration', e.target.value)} className="h-8 text-sm" />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-xs text-gray-500">Category</Label>
                                <Select value={draft.category} onValueChange={v => updateEdit(svc.id, 'category', v)}>
                                  <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                                  <SelectContent>
                                    {CATEGORIES.map(c => <SelectItem key={c} value={c}>{CATEGORY_LABELS[c]}</SelectItem>)}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="sm:col-span-2 space-y-1">
                                <Label className="text-xs text-gray-500">Description</Label>
                                <Textarea value={draft.description} onChange={e => updateEdit(svc.id, 'description', e.target.value)} rows={2} className="text-sm resize-none" />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-xs text-gray-500">Display Order</Label>
                                <Input type="number" value={draft.display_order ?? 0} onChange={e => updateEdit(svc.id, 'display_order', Number(e.target.value))} className="h-8 text-sm" />
                              </div>
                              <div className="flex items-center gap-2 pt-4">
                                <input
                                  type="checkbox"
                                  id={`visible-${svc.id}`}
                                  checked={draft.is_visible_on_homepage !== false}
                                  onChange={e => updateEdit(svc.id, 'is_visible_on_homepage', e.target.checked)}
                                  className="cursor-pointer"
                                />
                                <label htmlFor={`visible-${svc.id}`} className="text-xs text-gray-600 cursor-pointer">Show on homepage</label>
                              </div>
                            </div>
                          ) : (
                            <div>
                              <div className="flex items-start justify-between gap-2">
                                <div>
                                  <div className="flex items-center gap-2">
                                    <p className="font-semibold text-sm">{svc.name}</p>
                                    {svc.is_visible_on_homepage === false && (
                                      <span className="text-xs bg-gray-200 text-gray-500 px-1.5 py-0.5 rounded">Hidden</span>
                                    )}
                                  </div>
                                  <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{svc.description}</p>
                                </div>
                                <div className="flex flex-col items-end gap-0.5 flex-shrink-0">
                                  <span className="text-sm font-bold text-pink-600">KES {svc.price.toLocaleString()}</span>
                                  <span className="text-xs text-gray-400">⏱ {svc.duration}</span>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="flex sm:flex-col gap-2 flex-shrink-0">
                          {isEditing ? (
                            <>
                              <Button
                                size="sm"
                                onClick={() => saveEdit(svc.id)}
                                disabled={isSaving}
                                className="gap-1 bg-pink-600 hover:bg-pink-700 cursor-pointer"
                              >
                                {isSaving
                                  ? <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white" />
                                  : <Save className="h-3 w-3" />}
                                Save
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => cancelEdit(svc.id)} className="cursor-pointer">
                                <X className="h-3 w-3 mr-1" />Cancel
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button size="sm" variant="outline" onClick={() => startEdit(svc)} className="cursor-pointer">
                                Edit
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                title={svc.is_visible_on_homepage !== false ? 'Hide from homepage' : 'Show on homepage'}
                                onClick={async () => {
                                  const next = svc.is_visible_on_homepage === false;
                                  await supabase.from('services').update({ is_visible_on_homepage: next }).eq('id', svc.id);
                                  setServices(prev => prev.map(s => s.id === svc.id ? { ...s, is_visible_on_homepage: next } : s));
                                  toast.success(next ? 'Visible on homepage' : 'Hidden from homepage');
                                }}
                                className="cursor-pointer text-gray-500 hover:text-pink-600"
                              >
                                {svc.is_visible_on_homepage !== false
                                  ? <Eye className="h-3 w-3" />
                                  : <EyeOff className="h-3 w-3" />}
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => setDeleteId(svc.id)} className="cursor-pointer text-red-500 hover:text-red-700 hover:bg-red-50">
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Extra images row */}
                      {isEditing && draft.images.length > 0 && (
                        <div className="mt-3 flex gap-2 flex-wrap">
                          {draft.images.map((img, i) => (
                            <div key={i} className="relative">
                              <img src={img} alt={`img-${i}`} className="w-14 h-14 object-cover rounded-lg border" />
                              <button
                                type="button"
                                onClick={() => updateEdit(svc.id, 'images', draft.images.filter((_, idx) => idx !== i))}
                                className="absolute -top-1 -right-1 bg-red-600 text-white rounded-full w-4 h-4 flex items-center justify-center cursor-pointer"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}

                {svcList.length === 0 && (
                  <p className="text-center text-gray-400 py-4 text-sm">No services in this category yet.</p>
                )}
              </CardContent>
            )}
          </Card>
        );
      })}

      {/* Delete confirm */}
      <AlertDialog open={!!deleteId} onOpenChange={open => { if (!open) setDeleteId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Service?</AlertDialogTitle>
            <AlertDialogDescription>
              This service will be removed from the catalogue and the booking form. Existing bookings are unaffected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="cursor-pointer" onClick={() => setDeleteId(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-red-600 hover:bg-red-700 cursor-pointer" onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
