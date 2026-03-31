import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { User, Calendar, Heart, Settings, Camera, Save, RefreshCw, X, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Badge } from '../components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '../components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '../components/ui/dialog';
import { Calendar as CalendarPicker } from '../components/ui/calendar';
import { supabase } from '../../lib/supabase';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { fetchHolidays, fetchAvailability, generateTimeSlots } from '../../lib/services-store';

export function Profile() {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [bookings, setBookings] = useState<any[]>([]);
  const [favorites, setFavorites] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({ name: '', phone: '' });

  // Reschedule state
  const [rescheduleBooking, setRescheduleBooking] = useState<any>(null);
  const [rescheduleDate, setRescheduleDate] = useState<Date | undefined>();
  const [rescheduleTime, setRescheduleTime] = useState('');
  const [rescheduleCustomTime, setRescheduleCustomTime] = useState('');
  const [rescheduleSaving, setRescheduleSaving] = useState(false);
  const [holidays, setHolidays] = useState<any[]>([]);
  const [availability, setAvailability] = useState<any[]>([]);

  useEffect(() => {
    document.title = 'My Profile | Luxe Salon';
    loadUserData();
    fetchHolidays().then(setHolidays);
    fetchAvailability().then(setAvailability);
    return () => { document.title = 'Luxe Salon — Premium Beauty & Wellness in Nairobi'; };
  }, []);

  const loadUserData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate('/login'); return; }

      setUser(user);
      setFormData({
        name: user.user_metadata?.name || '',
        phone: user.user_metadata?.phone || '',
      });

      const { data: bookingsData } = await supabase
        .from('bookings')
        .select('*, booking_services(*)')
        .eq('user_id', user.id)
        .order('booking_date', { ascending: false });

      if (bookingsData) setBookings(bookingsData);

      const { data: favoritesData } = await supabase
        .from('favorites')
        .select('*, services(*)')
        .eq('user_id', user.id);

      if (favoritesData) setFavorites(favoritesData);
    } catch (error) {
      console.error('Error loading user data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProfile = async () => {
    try {
      const { error } = await supabase.auth.updateUser({
        data: { name: formData.name, phone: formData.phone },
      });
      if (error) throw error;
      toast.success('Profile updated successfully');
      loadUserData();
    } catch (error: any) {
      toast.error(error.message || 'Failed to update profile');
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const file = e.target.files?.[0];
      if (!file) return;
      setUploading(true);

      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('profile-pictures')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('profile-pictures')
        .getPublicUrl(fileName);

      const { error: updateError } = await supabase.auth.updateUser({
        data: { avatar_url: publicUrl },
      });

      if (updateError) throw updateError;
      toast.success('Profile picture updated');
      loadUserData();
    } catch (error: any) {
      toast.error(error.message || 'Failed to upload picture');
    } finally {
      setUploading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'confirmed': return 'bg-green-100 text-green-800';
      case 'pending':   return 'bg-yellow-100 text-yellow-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      case 'completed': return 'bg-blue-100 text-blue-800';
      default:          return 'bg-gray-100 text-gray-800';
    }
  };

  const removeFavorite = async (favoriteId: string) => {
    try {
      const { error } = await supabase.from('favorites').delete().eq('id', favoriteId);
      if (error) throw error;
      toast.success('Removed from favorites');
      loadUserData();
    } catch {
      toast.error('Failed to remove favorite');
    }
  };

  // ── Reschedule helpers ───────────────────────────────────────────────
  const openReschedule = (booking: any) => {
    setRescheduleBooking(booking);
    setRescheduleDate(undefined);
    setRescheduleTime('');
    setRescheduleCustomTime('');
  };

  const isHoliday = (d: Date) => {
    const iso = d.toISOString().split('T')[0];
    return holidays.some(h => h.date === iso);
  };

  const timeSlots = rescheduleDate
    ? generateTimeSlots(rescheduleDate, availability, holidays, undefined)
    : [];

  const handleReschedule = async () => {
    const finalTime = rescheduleCustomTime.trim() || rescheduleTime;
    if (!rescheduleDate || !finalTime) {
      toast.error('Please select a new date and time');
      return;
    }
    setRescheduleSaving(true);
    const { error } = await supabase
      .from('bookings')
      .update({
        booking_date: format(rescheduleDate, 'yyyy-MM-dd'),
        booking_time: finalTime,
        status: 'pending',
        updated_at: new Date().toISOString(),
      })
      .eq('id', rescheduleBooking.id);

    if (error) {
      toast.error('Failed to reschedule. Please try again.');
    } else {
      toast.success('Booking rescheduled successfully!');
      setRescheduleBooking(null);
      loadUserData();
    }
    setRescheduleSaving(false);
  };

  // ── Render ──────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  const getInitials = (name: string) =>
    name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  const canReschedule = (status: string) =>
    ['pending', 'confirmed'].includes(status?.toLowerCase());

  return (
    <div className="py-12 md:py-16 bg-gray-50 min-h-screen">
      <div className="container mx-auto px-4 max-w-6xl">
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold mb-2">My Profile</h1>
          <p className="text-gray-600">Manage your bookings, favorites, and account settings</p>
        </div>

        {/* Profile Header */}
        <Card className="mb-8">
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
              <div className="relative">
                <Avatar className="h-24 w-24">
                  <AvatarImage src={user.user_metadata?.avatar_url || ''} />
                  <AvatarFallback className="bg-pink-600 text-white text-2xl">
                    {getInitials(user.user_metadata?.name || user.email || 'U')}
                  </AvatarFallback>
                </Avatar>
                <label
                  htmlFor="avatar-upload"
                  className="absolute bottom-0 right-0 p-2 bg-pink-600 rounded-full cursor-pointer hover:bg-pink-700 transition-colors"
                >
                  {uploading ? (
                    <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                  ) : (
                    <Camera className="h-4 w-4 text-white" />
                  )}
                </label>
                <input
                  id="avatar-upload"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarUpload}
                  disabled={uploading}
                />
              </div>
              <div className="flex-1 text-center sm:text-left">
                <h2 className="text-2xl font-bold mb-1">{user.user_metadata?.name || 'User'}</h2>
                <p className="text-gray-600 mb-4">{user.email}</p>
                <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
                  <Badge variant="secondary">
                    {bookings.length} Booking{bookings.length !== 1 ? 's' : ''}
                  </Badge>
                  <Badge variant="secondary">
                    {favorites.length} Favorite{favorites.length !== 1 ? 's' : ''}
                  </Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs defaultValue="dashboard" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 lg:w-auto">
            <TabsTrigger value="dashboard">
              <Calendar className="h-4 w-4 mr-2" />Dashboard
            </TabsTrigger>
            <TabsTrigger value="favorites">
              <Heart className="h-4 w-4 mr-2" />Favorites
            </TabsTrigger>
            <TabsTrigger value="settings">
              <Settings className="h-4 w-4 mr-2" />Settings
            </TabsTrigger>
          </TabsList>

          {/* Dashboard Tab */}
          <TabsContent value="dashboard" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>My Appointments</CardTitle>
              </CardHeader>
              <CardContent>
                {bookings.length === 0 ? (
                  <div className="text-center py-8">
                    <Calendar className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                    <p className="text-gray-600 mb-4">No appointments yet</p>
                    <Button onClick={() => navigate('/booking')}>Book Your First Appointment</Button>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Time</TableHead>
                          <TableHead className="hidden sm:table-cell">Services</TableHead>
                          <TableHead>Total</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {bookings.map(booking => (
                          <TableRow key={booking.id}>
                            <TableCell>
                              {new Date(booking.booking_date + 'T00:00:00').toLocaleDateString()}
                            </TableCell>
                            <TableCell>{booking.booking_time}</TableCell>
                            <TableCell className="hidden sm:table-cell">
                              <div className="space-y-0.5">
                                {Array.isArray(booking.booking_services) && booking.booking_services.length > 0
                                  ? booking.booking_services.map((bs: any, idx: number) => (
                                      <div key={idx} className="text-sm">{bs.service_name}</div>
                                    ))
                                  : Array.isArray(booking.services)
                                    ? booking.services.map((s: any, idx: number) => (
                                        <div key={idx} className="text-sm">{s.name || s.service_name}</div>
                                      ))
                                    : <span className="text-gray-400 text-sm">—</span>
                                }
                              </div>
                            </TableCell>
                            <TableCell className="font-semibold">
                              KES {booking.total_price?.toLocaleString()}
                            </TableCell>
                            <TableCell>
                              <Badge className={getStatusColor(booking.status)}>
                                {booking.status}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {canReschedule(booking.status) && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="gap-1 text-xs cursor-pointer border-pink-300 text-pink-700 hover:bg-pink-50"
                                  onClick={() => openReschedule(booking)}
                                >
                                  <RefreshCw className="h-3 w-3" />
                                  Reschedule
                                </Button>
                              )}
                              {booking.status?.toLowerCase() === 'cancelled' && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="text-xs cursor-pointer"
                                  onClick={() => navigate('/booking')}
                                >
                                  Book Again
                                </Button>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Favorites Tab */}
          <TabsContent value="favorites" className="space-y-6">
            <Card>
              <CardHeader><CardTitle>My Favorite Services</CardTitle></CardHeader>
              <CardContent>
                {favorites.length === 0 ? (
                  <div className="text-center py-8">
                    <Heart className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                    <p className="text-gray-600 mb-4">No favorites yet</p>
                    <Button onClick={() => navigate('/services')}>Browse Services</Button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {favorites.map(fav => (
                      <Card key={fav.id}>
                        <CardContent className="p-4">
                          <h3 className="font-semibold mb-2">{fav.services?.name}</h3>
                          <p className="text-sm text-gray-600 mb-3">{fav.services?.description}</p>
                          <div className="flex justify-between items-center">
                            <span className="font-semibold text-pink-600">
                              KES {fav.services?.price?.toLocaleString()}
                            </span>
                            <Button variant="ghost" size="sm" onClick={() => removeFavorite(fav.id)}>
                              Remove
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Settings Tab */}
          <TabsContent value="settings" className="space-y-6">
            <Card>
              <CardHeader><CardTitle>Profile Settings</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="profile-name">Full Name</Label>
                  <Input
                    id="profile-name"
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Wanjiku Mwangi"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="profile-phone">Phone Number</Label>
                  <Input
                    id="profile-phone"
                    value={formData.phone}
                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+254 712 345 678"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="profile-email">Email Address</Label>
                  <Input id="profile-email" value={user.email} disabled className="bg-gray-100" />
                  <p className="text-xs text-gray-500">Email cannot be changed</p>
                </div>
                <Button onClick={handleUpdateProfile} className="gap-2">
                  <Save className="h-4 w-4" />Save Changes
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Reschedule Dialog */}
      <Dialog open={!!rescheduleBooking} onOpenChange={open => { if (!open) setRescheduleBooking(null); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5 text-pink-600" />
              Reschedule Appointment
            </DialogTitle>
          </DialogHeader>

          {rescheduleBooking && (
            <div className="space-y-5 py-2">
              {/* Current booking info */}
              <div className="bg-gray-50 rounded-lg p-4 text-sm space-y-1">
                <p className="font-medium text-gray-700">Current appointment:</p>
                <p className="text-gray-600">
                  📅 {new Date(rescheduleBooking.booking_date + 'T00:00:00').toLocaleDateString('en-KE', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                  {' '}at {rescheduleBooking.booking_time}
                </p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Date picker */}
                <div className="space-y-2">
                  <Label className="font-semibold">Choose New Date</Label>
                  <div className="border-2 rounded-xl overflow-hidden bg-white shadow-sm">
                    <CalendarPicker
                      mode="single"
                      selected={rescheduleDate}
                      onSelect={d => { setRescheduleDate(d); setRescheduleTime(''); setRescheduleCustomTime(''); }}
                      disabled={d => d < new Date() || d.getDay() === 0 || isHoliday(d)}
                      className="w-full"
                    />
                  </div>
                  {rescheduleDate && (
                    <p className="text-sm font-medium text-pink-600">
                      📅 {format(rescheduleDate, 'EEEE, MMMM d, yyyy')}
                    </p>
                  )}
                </div>

                {/* Time slots */}
                <div className="space-y-2">
                  <Label className="font-semibold">Choose New Time</Label>
                  {!rescheduleDate ? (
                    <div className="border-2 border-dashed border-gray-200 rounded-xl h-32 flex items-center justify-center text-gray-400 text-sm">
                      Pick a date first
                    </div>
                  ) : timeSlots.length === 0 ? (
                    <div className="border-2 border-dashed border-gray-200 rounded-xl h-32 flex items-center justify-center text-gray-400 text-sm">
                      No slots available
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-2 max-h-52 overflow-y-auto pr-1">
                      {timeSlots.map(t => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => { setRescheduleTime(t); setRescheduleCustomTime(''); }}
                          className={`px-3 py-2 rounded-lg text-sm font-medium border-2 transition-all cursor-pointer ${
                            rescheduleTime === t && !rescheduleCustomTime
                              ? 'bg-pink-600 text-white border-pink-600 shadow-md'
                              : 'bg-white text-gray-700 border-gray-200 hover:border-pink-400'
                          }`}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Custom time */}
                  {rescheduleDate && (
                    <div className="pt-2 border-t border-gray-100">
                      <Label className="text-xs text-gray-500 mb-1 block flex items-center gap-1">
                        <Clock className="h-3 w-3" /> Or enter a custom time
                      </Label>
                      <Input
                        type="time"
                        value={rescheduleCustomTime}
                        onChange={e => { setRescheduleCustomTime(e.target.value); setRescheduleTime(''); }}
                        className="h-9 text-sm"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button variant="outline" className="cursor-pointer" onClick={() => setRescheduleBooking(null)}>
              <X className="h-4 w-4 mr-1" /> Cancel
            </Button>
            <Button
              className="cursor-pointer bg-pink-600 hover:bg-pink-700"
              onClick={handleReschedule}
              disabled={rescheduleSaving || !rescheduleDate || (!rescheduleTime && !rescheduleCustomTime)}
            >
              {rescheduleSaving ? (
                <><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />Saving...</>
              ) : (
                <><RefreshCw className="h-4 w-4 mr-1" />Confirm Reschedule</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
