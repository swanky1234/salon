import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router';
import {
  Calendar as CalendarIcon, Clock, User as UserIcon, Star,
  ChevronDown, ImageIcon, Briefcase, X, LogIn,
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Label } from '../components/ui/label';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '../components/ui/select';
import { Calendar } from '../components/ui/calendar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../components/ui/dialog';
import { Checkbox } from '../components/ui/checkbox';
import { Badge } from '../components/ui/badge';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth-context';
import {
  fetchServices, fetchStylists, fetchHolidays, fetchAvailability,
  generateTimeSlots, isDateAvailable, formatKES,
  type Service, type Stylist, type Holiday, type Availability,
} from '../../lib/services-store';

// SEO helper
function useTitle(title: string) {
  useEffect(() => {
    document.title = title;
    return () => { document.title = 'Luxe Salon — Premium Beauty & Wellness in Nairobi'; };
  }, [title]);
}

export function Booking() {
  const navigate = useNavigate();
  const { user: authUser, loading: authLoading } = useAuth(); // ← global reactive auth
  const [date, setDate] = useState<Date>();
  const [services, setServices] = useState<Service[]>([]);
  const [stylists, setStylists] = useState<Stylist[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [availability, setAvailability] = useState<Availability[]>([]);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [showServiceDropdown, setShowServiceDropdown] = useState(false);
  const [showStylistPortfolio, setShowStylistPortfolio] = useState(false);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [rating, setRating] = useState(0);
  const [ratingComment, setRatingComment] = useState('');
  const [bookingId, setBookingId] = useState('');
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useTitle('Book Appointment | Luxe Salon');

  // Category filter for services dropdown
  const [serviceCategory, setServiceCategory] = useState('all');

  const SERVICE_CATS = ['all', 'hair', 'nails', 'facial', 'massage', 'makeup', 'waxing'];

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    stylistId: '',
    time: '',
    notes: '',
  });

  // Pre-fill name/phone from auth user metadata when user loads
  useEffect(() => {
    if (authUser) {
      setFormData(p => ({
        ...p,
        name: p.name || authUser.user_metadata?.name || '',
        phone: p.phone || authUser.user_metadata?.phone || '',
      }));
    }
  }, [authUser]);

  useEffect(() => {
    Promise.all([
      fetchServices().then(setServices),
      fetchStylists().then(setStylists),
      fetchHolidays().then(setHolidays),
      fetchAvailability().then(setAvailability),
    ]);
    supabase.from('settings').select('value').eq('key', 'whatsapp_number').single()
      .then(({ data }) => { if (data) setWhatsappNumber(data.value); });
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('#service-dropdown-area')) {
        setShowServiceDropdown(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const isDateDisabled = (d: Date): boolean => {
    return !isDateAvailable(d, availability, holidays, formData.stylistId || undefined);
  };

  // Show which days of week the selected stylist works
  const stylistWorkingDays = (() => {
    if (!formData.stylistId) return null;
    const avail = availability.filter(
      a => a.stylist_id === formData.stylistId && a.is_available && a.day_of_week !== null
    );
    if (avail.length === 0) return null; // no schedule = all days OK
    const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return avail.map(a => DAY_NAMES[a.day_of_week!]).join(', ');
  })();

  const timeSlots = date
    ? generateTimeSlots(date, availability, holidays, formData.stylistId || undefined)
    : [];

  const isHoliday = (d: Date) => {
    const iso = d.toISOString().split('T')[0];
    return holidays.some(h => h.date === iso);
  };

  const toggleService = (id: string) => {
    setSelectedServices(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const selectedStylist = stylists.find(s => s.id === formData.stylistId);

  const getTotalPrice = () =>
    services.filter(s => selectedServices.includes(s.id)).reduce((sum, s) => sum + s.price, 0);

  const filteredDropdownServices = serviceCategory === 'all'
    ? services
    : services.filter(s => s.category === serviceCategory);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!authUser) {
      toast.error('Please sign in to book an appointment');
      navigate('/login');
      return;
    }

    if (!formData.name.trim()) { toast.error('Please enter your full name'); return; }
    if (!formData.phone.trim()) { toast.error('Please enter your phone number'); return; }
    if (selectedServices.length === 0) { toast.error('Please select at least one service'); return; }
    if (!date) { toast.error('Please select a date'); return; }
    if (!formData.time) { toast.error('Please select a time slot'); return; }

    setSubmitting(true);

    const selectedServiceDetails = services
      .filter(s => selectedServices.includes(s.id))
      .map(s => ({ id: s.id, name: s.name, price: s.price, image: s.images[0] || '' }));

    const booking = {
      user_id: authUser.id,
      name: formData.name.trim(),
      phone: formData.phone.trim(),
      stylist_id: formData.stylistId || null,
      booking_date: format(date, 'yyyy-MM-dd'),
      booking_time: formData.time,
      notes: formData.notes,
      status: 'pending',
      total_price: getTotalPrice(),
    };

    const { data, error } = await supabase.from('bookings').insert([booking]).select().single();

    if (error) {
      console.error('Booking error:', error);
      const msg = error.message || error.code || '';
      const isAvailError =
        msg.toLowerCase().includes('does not work') ||
        msg.toLowerCase().includes('not available') ||
        msg.toLowerCase().includes('unavailable') ||
        msg.toLowerCase().includes('availability');

      if (isAvailError && formData.stylistId) {
        const preferredName = stylists.find(s => s.id === formData.stylistId)?.name;
        const fallback = { ...booking, stylist_id: null, notes: `Preferred stylist: ${preferredName || 'requested'}. ${formData.notes}`.trim() };
        const { data: rd, error: re } = await supabase.from('bookings').insert([fallback]).select().single();
        if (re) { toast.error(`Failed to create booking: ${re.message}`); setSubmitting(false); return; }
        const svcRows = selectedServiceDetails.map(svc => ({ booking_id: rd.id, service_id: svc.id, service_name: svc.name, price: svc.price }));
        if (svcRows.length) await supabase.from('booking_services').insert(svcRows);
        setBookingId(rd.id);
        setSubmitting(false);
        toast.success('Booking confirmed! The salon will assign your preferred stylist.');
        const waMsg = [`Hello, I just booked a service at Luxe Salon.`, ``, `*New Booking Request*`, ``, `Service: ${selectedServiceDetails.map(s => s.name).join(', ')}`, `Price: ${formatKES(getTotalPrice())}`, `Date: ${format(date!, 'MMMM d, yyyy')}`, `Time: ${formData.time}`, `Preferred Stylist: ${preferredName || 'Any Available'}`, ``, `Style Link:`, `${window.location.origin}/services`, ``, `Customer Name: ${formData.name}`, `Phone: ${formData.phone}`].join('\n');
        if (whatsappNumber) { setTimeout(() => window.open(`https://wa.me/${whatsappNumber.replace(/\D/g, '')}?text=${encodeURIComponent(waMsg)}`, '_blank'), 500); }
        setShowRatingModal(true);
        return;
      }

      if (msg.toLowerCase().includes('conflict') || msg.toLowerCase().includes('already booked')) {
        toast.error('This time slot is already taken. Please choose a different time.');
      } else {
        toast.error(`Failed to create booking: ${msg || 'Please try again.'}`);
      }
      setSubmitting(false);
      return;
    }

    // Insert services into booking_services join table
    if (data && selectedServiceDetails.length > 0) {
      const serviceRows = selectedServiceDetails.map(svc => ({
        booking_id: data.id,
        service_id: svc.id,
        service_name: svc.name,
        price: svc.price,
      }));
      const { error: svcError } = await supabase.from('booking_services').insert(serviceRows);
      if (svcError) {
        console.warn('booking_services insert warning:', svcError.message);
        // Non-fatal: booking was created, services may not be linked
      }
    }

    setBookingId(data.id);
    setSubmitting(false);

    // ── Build WhatsApp message ─────────────────────────────────────────
    const stylistName = selectedStylist?.name || 'Any Available';
    const primaryService = selectedServiceDetails[0];
    const serviceNames  = selectedServiceDetails.map(s => s.name).join(', ');
    const totalPrice    = formatKES(getTotalPrice());
    const bookingDate   = format(date!, 'MMMM d, yyyy');
    const serviceUrl    = `${window.location.origin}/services`;

    const msg = [
      `Hello, I just booked a service at Luxe Salon.`,
      ``,
      `*New Booking Request*`,
      ``,
      `Service: ${serviceNames}`,
      `Price: ${totalPrice}`,
      `Date: ${bookingDate}`,
      `Time: ${formData.time}`,
      `Preferred Stylist: ${stylistName}`,
      ``,
      `Style Link:`,
      serviceUrl,
      ``,
      `Customer Name: ${formData.name}`,
      `Phone: ${formData.phone}`,
      formData.notes ? `Notes: ${formData.notes}` : '',
      ``,
      `Booking ID: ${data.id}`,
    ].filter(line => line !== undefined).join('\n');

    if (whatsappNumber) {
      const waUrl = `https://wa.me/${whatsappNumber.replace(/\D/g, '')}?text=${encodeURIComponent(msg)}`;
      setTimeout(() => window.open(waUrl, '_blank'), 500); // small delay so success toast shows first
    }

    toast.success('Booking created successfully!');
    setShowRatingModal(true);
  };

  const handleRatingSubmit = async () => {
    if (rating === 0) { toast.error('Please select a rating'); return; }
    await supabase.from('bookings').update({ rating, rating_comment: ratingComment }).eq('id', bookingId);
    toast.success('Thank you for your feedback!');
    setShowRatingModal(false);
    navigate('/profile');
  };

  const handleChange = (field: string, value: string) =>
    setFormData(prev => ({ ...prev, [field]: value }));


  // Show spinner while auth is loading to prevent false "Please Sign In" flash
  if (authLoading) {
    return (
      <div className="py-10 md:py-16 bg-gray-50 min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-600 mx-auto mb-4" />
          <p className="text-gray-500 text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  // Not logged in — show sign-in prompt
  if (!authUser) {
    return (
      <div className="py-10 md:py-16 bg-gray-50 min-h-screen flex items-center justify-center">
        <Card className="max-w-md w-full mx-4 shadow-lg">
          <CardContent className="p-10 text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-pink-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <LogIn className="h-8 w-8 text-white" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Sign In to Book</h2>
            <p className="text-gray-600 mb-8">
              You need to be signed in to book an appointment at Luxe Salon.
            </p>
            <div className="flex flex-col gap-3">
              <Link to="/login">
                <Button className="w-full h-12 text-base">Sign In</Button>
              </Link>
              <Link to="/signup">
                <Button variant="outline" className="w-full h-12 text-base">Create Account</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="py-10 md:py-16 bg-gray-50 min-h-screen">
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="text-center mb-10">
          <h1 className="text-3xl md:text-5xl font-bold mb-4">Book an Appointment</h1>
          <p className="text-gray-600">Schedule your visit and let us take care of you</p>
        </div>

        <Card className="shadow-md">
          <CardHeader><CardTitle>Appointment Details</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-8">

              {/* ── Personal Information ────────────────────────────────── */}
              <section className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2 text-gray-800">
                  <UserIcon className="h-5 w-5 text-pink-600" /> Personal Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label htmlFor="name">Full Name *</Label>
                    <Input id="name" placeholder="Wanjiku Mwangi" value={formData.name}
                      onChange={e => handleChange('name', e.target.value)} required />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="phone">Phone Number *</Label>
                    <Input id="phone" type="tel" placeholder="+254 712 345 678" value={formData.phone}
                      onChange={e => handleChange('phone', e.target.value)} required />
                  </div>
                </div>
              </section>

              {/* ── Service Selection ───────────────────────────────────── */}
              <section className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2 text-gray-800">
                  <CalendarIcon className="h-5 w-5 text-pink-600" /> Select Services *
                </h3>

                <div id="service-dropdown-area" className="relative">
                  {/* Trigger button */}
                  <button
                    type="button"
                    onClick={() => setShowServiceDropdown(p => !p)}
                    className="w-full flex items-center justify-between px-4 py-3 border-2 rounded-xl bg-white hover:border-pink-400 text-sm transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-pink-500"
                  >
                    <span className={selectedServices.length === 0 ? 'text-gray-400' : 'text-gray-800 font-medium'}>
                      {selectedServices.length === 0
                        ? 'Select one or more services…'
                        : `${selectedServices.length} service${selectedServices.length > 1 ? 's' : ''} selected`}
                    </span>
                    <ChevronDown className={`h-4 w-4 text-gray-500 transition-transform ${showServiceDropdown ? 'rotate-180' : ''}`} />
                  </button>

                  {/* Dropdown panel */}
                  {showServiceDropdown && (
                    <div className="absolute z-40 left-0 right-0 mt-2 bg-white border-2 border-pink-100 rounded-xl shadow-2xl max-h-80 overflow-hidden flex flex-col">
                      {/* Category filter tabs */}
                      <div className="flex gap-1 p-2 border-b flex-wrap bg-gray-50">
                        {SERVICE_CATS.map(cat => (
                          <button
                            key={cat}
                            type="button"
                            onClick={() => setServiceCategory(cat)}
                            className={`px-3 py-1 rounded-full text-xs font-medium cursor-pointer transition-all ${
                              serviceCategory === cat
                                ? 'bg-pink-600 text-white'
                                : 'bg-white text-gray-600 hover:bg-pink-50 border border-gray-200'
                            }`}
                          >
                            {cat === 'all' ? 'All' : cat.charAt(0).toUpperCase() + cat.slice(1)}
                          </button>
                        ))}
                      </div>
                      {/* Service list */}
                      <div className="overflow-y-auto flex-1">
                        {filteredDropdownServices.length === 0 ? (
                          <p className="text-center text-gray-400 py-6 text-sm">No services in this category</p>
                        ) : (
                          filteredDropdownServices.map(svc => (
                            <label
                              key={svc.id}
                              className="flex items-center gap-3 px-4 py-3 hover:bg-pink-50 cursor-pointer border-b last:border-0 transition-colors"
                            >
                              <Checkbox
                                id={`svc-${svc.id}`}
                                checked={selectedServices.includes(svc.id)}
                                onCheckedChange={() => toggleService(svc.id)}
                              />
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-sm truncate">{svc.name}</p>
                                <p className="text-xs text-gray-500">⏱ {svc.duration}</p>
                              </div>
                              <span className="text-sm font-semibold text-pink-600 shrink-0">{formatKES(svc.price)}</span>
                            </label>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Selected pills */}
                {selectedServices.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {services.filter(s => selectedServices.includes(s.id)).map(s => (
                      <Badge key={s.id} variant="secondary" className="bg-pink-100 text-pink-800 flex items-center gap-1 pr-1">
                        {s.name}
                        <button
                          type="button"
                          onClick={() => toggleService(s.id)}
                          className="ml-1 hover:text-red-600 cursor-pointer"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}

                {/* Total */}
                {selectedServices.length > 0 && (
                  <div className="bg-gradient-to-r from-pink-50 to-purple-50 p-4 rounded-xl border border-pink-100">
                    <p className="font-semibold text-lg">Total: {formatKES(getTotalPrice())}</p>
                    <p className="text-sm text-gray-600">
                      {selectedServices.length} service{selectedServices.length > 1 ? 's' : ''} selected
                    </p>
                  </div>
                )}
              </section>

              {/* ── Stylist ─────────────────────────────────────────────── */}
              <section className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-semibold text-gray-800">Preferred Stylist (Optional)</Label>
                  {formData.stylistId && (
                    <button type="button" onClick={() => { handleChange('stylistId', ''); setShowStylistPortfolio(false); }}
                      className="text-xs text-gray-500 hover:text-red-500 cursor-pointer underline">
                      Clear selection
                    </button>
                  )}
                </div>

                {stylists.length === 0 ? (
                  <p className="text-sm text-gray-400 italic">No stylists available — any stylist will assist you.</p>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {stylists.map(s => {
                      const selected = formData.stylistId === s.id;
                      return (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => { handleChange('stylistId', selected ? '' : s.id); setShowStylistPortfolio(false); }}
                          className={`flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all cursor-pointer text-center ${
                            selected
                              ? 'border-pink-500 bg-pink-50 shadow-md'
                              : 'border-gray-200 bg-white hover:border-pink-300 hover:bg-pink-50/50'
                          }`}
                        >
                          {s.profile_image ? (
                            <img src={s.profile_image} alt={s.name}
                              className={`w-14 h-14 rounded-full object-cover border-2 ${
                                selected ? 'border-pink-500' : 'border-gray-200'
                              }`}
                              onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                            />
                          ) : (
                            <div className={`w-14 h-14 rounded-full flex items-center justify-center text-xl font-bold ${
                              selected ? 'bg-pink-200 text-pink-700' : 'bg-gray-100 text-gray-500'
                            }`}>
                              {s.name[0]?.toUpperCase()}
                            </div>
                          )}
                          <div>
                            <p className={`text-sm font-semibold leading-tight ${selected ? 'text-pink-700' : 'text-gray-800'}`}>{s.name}</p>
                            {s.specialties?.length > 0 && (
                              <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{s.specialties.slice(0, 2).join(' · ')}</p>
                            )}
                          </div>
                          {selected && (
                            <span className="text-xs bg-pink-600 text-white px-2 py-0.5 rounded-full">Selected</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}

                {selectedStylist && (
                  <div>
                    <button
                      type="button"
                      onClick={() => setShowStylistPortfolio(p => !p)}
                      className="text-sm text-pink-600 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Briefcase className="h-4 w-4" />
                      {showStylistPortfolio ? 'Hide' : 'View'} portfolio
                    </button>

                    {showStylistPortfolio && (
                      <div className="mt-3 p-4 border-2 border-pink-100 rounded-xl bg-white space-y-3">
                        <div className="flex items-center gap-3">
                          {selectedStylist.profile_image ? (
                            <img
                              src={selectedStylist.profile_image}
                              alt={selectedStylist.name}
                              className="w-14 h-14 rounded-full object-cover border-2 border-pink-200"
                              onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                            />
                          ) : (
                            <div className="w-14 h-14 rounded-full bg-pink-100 flex items-center justify-center">
                              <UserIcon className="h-8 w-8 text-pink-400" />
                            </div>
                          )}
                          <div>
                            <p className="font-semibold">{selectedStylist.name}</p>
                            {selectedStylist.bio && <p className="text-sm text-gray-500">{selectedStylist.bio}</p>}
                          </div>
                        </div>
                        {selectedStylist.specialties?.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {selectedStylist.specialties.map(sp => (
                              <Badge key={sp} variant="secondary" className="text-xs">{sp}</Badge>
                            ))}
                          </div>
                        )}
                        {selectedStylist.portfolio_images?.length > 0 && (
                          <div>
                            <p className="text-xs text-gray-500 mb-2 flex items-center gap-1">
                              <ImageIcon className="h-3 w-3" /> Portfolio
                            </p>
                            <div className="grid grid-cols-3 gap-2">
                              {selectedStylist.portfolio_images.slice(0, 6).map((img, i) => (
                                <img
                                  key={i}
                                  src={img}
                                  alt={`Portfolio ${i + 1}`}
                                  className="aspect-square object-cover rounded-lg"
                                  onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                />
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </section>

              {/* ── Date & Time ─────────────────────────────────────────── */}
              <section className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2 text-gray-800">
                  <Clock className="h-5 w-5 text-pink-600" /> Date &amp; Time
                </h3>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Inline Calendar */}
                  <div className="space-y-2">
                    <Label>Select Date *</Label>
                    {stylistWorkingDays && (
                      <p className="text-xs text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg">
                        📅 {selectedStylist?.name} works on: <strong>{stylistWorkingDays}</strong>
                      </p>
                    )}
                    <div className="border-2 rounded-xl overflow-hidden bg-white shadow-sm">
                      <Calendar
                        mode="single"
                        selected={date}
                        onSelect={d => { setDate(d); handleChange('time', ''); }}
                        disabled={isDateDisabled}
                        className="w-full"
                      />
                    </div>
                    {date && (
                      <p className="text-sm font-medium text-pink-600 flex items-center gap-1">
                        <CalendarIcon className="h-4 w-4" />
                        {format(date, 'EEEE, MMMM d, yyyy')}
                      </p>
                    )}
                    {date && holidays.some(h => h.date === date.toISOString().split('T')[0]) && (
                      <p className="text-sm text-red-500">This date is a public holiday — please choose another.</p>
                    )}
                  </div>

                  {/* Time slot */}
                  <div className="space-y-2">
                    <Label>Select Time *</Label>
                    {!date ? (
                      <div className="border-2 border-dashed border-gray-200 rounded-xl h-32 flex items-center justify-center text-gray-400 text-sm">
                        Pick a date first
                      </div>
                    ) : timeSlots.length === 0 ? (
                      <div className="border-2 border-dashed border-gray-200 rounded-xl h-32 flex items-center justify-center text-gray-400 text-sm">
                        No slots available for this date
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-2 max-h-72 overflow-y-auto pr-1">
                        {timeSlots.map(t => (
                          <button
                            key={t}
                            type="button"
                            onClick={() => handleChange('time', t)}
                            className={`px-3 py-2.5 rounded-lg text-sm font-medium border-2 transition-all cursor-pointer ${
                              formData.time === t
                                ? 'bg-pink-600 text-white border-pink-600 shadow-md'
                                : 'bg-white text-gray-700 border-gray-200 hover:border-pink-400 hover:text-pink-600'
                            }`}
                          >
                            {t}
                          </button>
                        ))}
                      </div>
                    )}
                    {/* Custom time input */}
                    {date && (
                      <div className="pt-3 border-t border-gray-100 space-y-1">
                        <label className="text-xs text-gray-500 flex items-center gap-1">
                          <Clock className="h-3 w-3" /> Or enter a custom time
                        </label>
                        <input
                          type="time"
                          value={(() => {
                            if (formData.time && !timeSlots.includes(formData.time)) return formData.time;
                            return '';
                          })()}
                          onChange={e => handleChange('time', e.target.value)}
                          className="w-full h-10 px-3 text-sm border-2 border-gray-200 rounded-lg focus:outline-none focus:border-pink-400 focus:ring-1 focus:ring-pink-400"
                        />
                      </div>
                    )}
                  </div>
                </div>
              </section>

              {/* ── Notes ───────────────────────────────────────────────── */}
              <section className="space-y-2">
                <Label htmlFor="notes">Additional Notes (Optional)</Label>
                <Textarea
                  id="notes"
                  placeholder="Any special requests or information we should know..."
                  value={formData.notes}
                  onChange={e => handleChange('notes', e.target.value)}
                  rows={3}
                />
              </section>

              {/* ── Submit ──────────────────────────────────────────────── */}
              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <Button
                  type="submit"
                  className="flex-1 cursor-pointer h-12 text-base"
                  disabled={selectedServices.length === 0 || !date || !formData.time || submitting}
                >
                  {submitting ? (
                    <><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />Creating Booking…</>
                  ) : 'Confirm Booking'}
                </Button>
                <Button type="button" variant="outline" className="flex-1 cursor-pointer h-12" onClick={() => navigate(-1)}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Info Cards */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { icon: CalendarIcon, title: 'Flexible Scheduling', desc: 'Choose from available time slots' },
            { icon: Clock, title: 'Easy Rescheduling', desc: 'Change your appointment anytime' },
            { icon: UserIcon, title: 'Expert Stylists', desc: 'Choose your preferred professional' },
          ].map(({ icon: Icon, title, desc }) => (
            <Card key={title}>
              <CardContent className="p-6 text-center">
                <Icon className="h-8 w-8 mx-auto mb-2 text-pink-600" />
                <h3 className="font-semibold mb-1">{title}</h3>
                <p className="text-sm text-gray-600">{desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Rating Modal */}
      <Dialog open={showRatingModal} onOpenChange={setShowRatingModal}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Rate Your Experience</DialogTitle></DialogHeader>
          <div className="space-y-6 py-4">
            <div className="space-y-3">
              <Label>How would you rate our service?</Label>
              <div className="flex justify-center gap-3">
                {[1, 2, 3, 4, 5].map(star => (
                  <button key={star} type="button" onClick={() => setRating(star)} className="transition-transform hover:scale-110 cursor-pointer">
                    <Star className={`h-10 w-10 ${star <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`} />
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="ratingComment">Additional Comments (Optional)</Label>
              <Textarea id="ratingComment" placeholder="Tell us about your experience..." value={ratingComment}
                onChange={e => setRatingComment(e.target.value)} rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" className="cursor-pointer" onClick={() => { setShowRatingModal(false); navigate('/profile'); }}>Skip</Button>
            <Button className="cursor-pointer" onClick={handleRatingSubmit}>Submit Rating</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
