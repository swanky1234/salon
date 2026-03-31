import { useState, useEffect, useCallback } from 'react';
import { Heart, X, ChevronLeft, ChevronRight, LogIn } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardFooter } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { toast } from 'sonner';
import { Link, useNavigate } from 'react-router';
import { fetchServices, formatKES, type Service } from '../../lib/services-store';
import { supabase } from '../../lib/supabase';

function useTitle(title: string) {
  useEffect(() => {
    document.title = title;
    return () => { document.title = 'Luxe Salon — Premium Beauty & Wellness in Nairobi'; };
  }, [title]);
}

function ImageCarousel({ images, name }: { images: string[]; name: string }) {
  const [idx, setIdx] = useState(0);
  const imgs = images?.length ? images : ['https://images.unsplash.com/photo-1560869713-7d0a29430803?w=600'];
  return (
    <div className="relative w-full h-full overflow-hidden">
      <img
        src={imgs[idx]}
        alt={name}
        className="w-full h-full object-cover"
        onError={e => { (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1560869713-7d0a29430803?w=600'; }}
      />
      {imgs.length > 1 && (
        <>
          <button type="button" onClick={e => { e.stopPropagation(); setIdx(p => (p - 1 + imgs.length) % imgs.length); }} className="absolute left-1 top-1/2 -translate-y-1/2 bg-black/40 text-white rounded-full p-0.5 cursor-pointer">
            <ChevronLeft className="h-3 w-3" />
          </button>
          <button type="button" onClick={e => { e.stopPropagation(); setIdx(p => (p + 1) % imgs.length); }} className="absolute right-1 top-1/2 -translate-y-1/2 bg-black/40 text-white rounded-full p-0.5 cursor-pointer">
            <ChevronRight className="h-3 w-3" />
          </button>
          <div className="absolute bottom-1 left-1/2 -translate-x-1/2 flex gap-1">
            {imgs.map((_, i) => <span key={i} className={`block w-1.5 h-1.5 rounded-full ${i === idx ? 'bg-white' : 'bg-white/50'}`} />)}
          </div>
        </>
      )}
    </div>
  );
}

export function Favorites() {
  useTitle('My Favourites | Luxe Salon');

  const navigate = useNavigate();
  const [allServices, setAllServices] = useState<Service[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [authChecked, setAuthChecked] = useState(false);

  const loadAll = useCallback(async () => {
    setLoading(true);
    const svcs = await fetchServices();
    setAllServices(svcs);

    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setUserId(user.id);
      const { data: favs } = await supabase
        .from('favorites')
        .select('service_id')
        .eq('user_id', user.id);
      if (favs) setFavoriteIds(favs.map(f => f.service_id));
    } else {
      setUserId(null);
    }
    setAuthChecked(true);
    setLoading(false);
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  const removeFavorite = async (serviceId: string) => {
    if (!userId) return;
    await supabase.from('favorites').delete().eq('user_id', userId).eq('service_id', serviceId);
    setFavoriteIds(prev => prev.filter(id => id !== serviceId));
    toast.success('Removed from favourites');
  };

  const favoriteServices = allServices.filter(s => favoriteIds.includes(s.id));

  if (loading) {
    return (
      <div className="py-12 min-h-screen flex justify-center items-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-600" />
      </div>
    );
  }

  // Not logged in — show auth prompt
  if (authChecked && !userId) {
    return (
      <div className="py-12 md:py-16 bg-gray-50 min-h-screen flex items-center justify-center">
        <Card className="max-w-md w-full mx-4 shadow-lg">
          <CardContent className="p-10 text-center">
            <div className="w-16 h-16 bg-gradient-to-br from-pink-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-6">
              <LogIn className="h-8 w-8 text-white" />
            </div>
            <Heart className="h-10 w-10 text-pink-300 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">Sign In to View Favourites</h2>
            <p className="text-gray-600 mb-8">
              Your favourites are saved to your account. Sign in to see and manage them.
            </p>
            <div className="flex flex-col gap-3">
              <Link to="/login">
                <Button className="w-full h-12 text-base">Sign In</Button>
              </Link>
              <Link to="/signup">
                <Button variant="outline" className="w-full h-12 text-base">Create Account</Button>
              </Link>
              <Link to="/services">
                <Button variant="ghost" className="w-full">Browse Services</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="py-12 md:py-16 bg-gray-50 min-h-screen">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h1 className="text-3xl md:text-5xl font-bold mb-4 flex items-center justify-center gap-3">
            <Heart className="h-8 w-8 md:h-10 md:w-10 fill-pink-600 text-pink-600" />
            My Favourites
          </h1>
          <p className="text-gray-600">Services you love, all in one place</p>
        </div>

        {favoriteServices.length === 0 ? (
          <Card className="max-w-md mx-auto">
            <CardContent className="p-12 text-center">
              <Heart className="h-16 w-16 mx-auto mb-4 text-gray-300" />
              <h3 className="text-xl font-semibold mb-2">No favourites yet</h3>
              <p className="text-gray-600 mb-6">Browse our services and tap the heart icon to save your favourites</p>
              <Link to="/services"><Button>Browse Services</Button></Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 items-stretch">
            {favoriteServices.map(service => (
              <Card key={service.id} className="overflow-hidden hover:shadow-lg transition-shadow flex flex-col h-full">
                <div className="aspect-[4/3] overflow-hidden relative flex-shrink-0">
                  <ImageCarousel images={service.images} name={service.name} />
                  <button
                    type="button"
                    className="absolute top-2 right-2 bg-white/90 hover:bg-white z-10 rounded-full p-2 shadow cursor-pointer"
                    onClick={() => removeFavorite(service.id)}
                    title="Remove from favourites"
                  >
                    <X className="h-4 w-4 text-gray-600" />
                  </button>
                </div>
                <CardContent className="p-5 flex flex-col flex-1">
                  <div className="flex justify-between items-start mb-2 gap-2">
                    <h3 className="text-lg font-semibold leading-tight">{service.name}</h3>
                    <Badge variant="secondary" className="ml-2 shrink-0 bg-pink-100 text-pink-800">{formatKES(service.price)}</Badge>
                  </div>
                  <p className="text-sm text-gray-600 mb-3 flex-1">{service.description}</p>
                  <p className="text-xs text-gray-500 mt-auto">⏱ {service.duration}</p>
                </CardContent>
                {/* Book Now aligned at bottom */}
                <CardFooter className="p-5 pt-0">
                  <Link to="/booking" className="w-full">
                    <Button className="w-full cursor-pointer">Book Now</Button>
                  </Link>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
