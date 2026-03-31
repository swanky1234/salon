import { useState, useEffect, useCallback } from 'react';
import { Heart, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardFooter } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { toast } from 'sonner';
import { Link, useSearchParams, useNavigate } from 'react-router';
import { fetchServices, formatKES, invalidateServicesCache, STATIC_SERVICES, type Service } from '../../lib/services-store';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth-context';

// Use the same static fallback as services-store so images are always consistent.
// Filter out 'Classic Haircut' (id: s1) which is not in the live DB — this gives
// exactly 17 services matching what Supabase serves after the initial data load.
const INSTANT_SERVICES: Service[] = STATIC_SERVICES.filter(s => s.id !== 's1');

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
        className="w-full h-full object-cover transition-opacity duration-300"
        onError={e => { (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1560869713-7d0a29430803?w=600'; }}
      />
      {imgs.length > 1 && (
        <>
          <button
            type="button"
            onClick={e => { e.stopPropagation(); setIdx(p => (p - 1 + imgs.length) % imgs.length); }}
            className="absolute left-1 top-1/2 -translate-y-1/2 bg-black/40 text-white rounded-full p-0.5 hover:bg-black/60 cursor-pointer"
          >
            <ChevronLeft className="h-3 w-3" />
          </button>
          <button
            type="button"
            onClick={e => { e.stopPropagation(); setIdx(p => (p + 1) % imgs.length); }}
            className="absolute right-1 top-1/2 -translate-y-1/2 bg-black/40 text-white rounded-full p-0.5 hover:bg-black/60 cursor-pointer"
          >
            <ChevronRight className="h-3 w-3" />
          </button>
          <div className="absolute bottom-1 left-1/2 -translate-x-1/2 flex gap-1">
            {imgs.map((_, i) => (
              <span key={i} className={`block w-1.5 h-1.5 rounded-full ${i === idx ? 'bg-white' : 'bg-white/50'}`} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

const TABS = [
  { value: 'all', label: 'All Services' },
  { value: 'hair', label: 'Hair' },
  { value: 'nails', label: 'Nails' },
  { value: 'facial', label: 'Facials' },
  { value: 'massage', label: 'Massage' },
  { value: 'makeup', label: 'Makeup' },
  { value: 'waxing', label: 'Waxing' },
];

export function Services() {
  useTitle('Our Services | Luxe Salon');

  const navigate = useNavigate();
  const { user } = useAuth(); // global reactive auth
  // Start with static services — no spinner, instant render
  const [services, setServices] = useState<Service[]>(INSTANT_SERVICES);
  const [favoriteIds, setFavoriteIds] = useState<string[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('all');
  const [searchParams] = useSearchParams();

  // Keep userId in sync with global auth
  useEffect(() => {
    setUserId(user?.id ?? null);
  }, [user]);

  // Sync tab from URL ?cat= param
  useEffect(() => {
    const cat = searchParams.get('cat');
    if (cat && TABS.some(t => t.value === cat)) {
      setActiveTab(cat);
    }
  }, [searchParams]);

  const loadAll = useCallback(async () => {
    // Bust cache so deletions/additions from admin always reflect here
    invalidateServicesCache();
    // Silent background update — page already shows static services
    const svcs = await fetchServices();
    if (svcs.length > 0) setServices(svcs);

    if (user) {
      const { data: favs } = await supabase
        .from('favorites')
        .select('service_id')
        .eq('user_id', user.id);
      if (favs) setFavoriteIds(favs.map(f => f.service_id));
    } else {
      setFavoriteIds([]);
    }
  }, [user]);

  useEffect(() => { loadAll(); }, [loadAll]);

  const isFavored = (id: string) => favoriteIds.includes(id);

  const toggleFavorite = async (serviceId: string) => {
    // Require login
    if (!userId) {
      toast.error('Please sign in to save favourites', {
        action: {
          label: 'Sign In',
          onClick: () => navigate('/login'),
        },
      });
      return;
    }

    if (isFavored(serviceId)) {
      await supabase.from('favorites').delete().eq('user_id', userId).eq('service_id', serviceId);
      setFavoriteIds(prev => prev.filter(id => id !== serviceId));
      toast.success('Removed from favourites');
    } else {
      await supabase.from('favorites').insert({ user_id: userId, service_id: serviceId });
      setFavoriteIds(prev => [...prev, serviceId]);
      toast.success('Added to favourites');
    }
  };

  const filterBy = (category: string) =>
    category === 'all' ? services : services.filter(s => s.category === category);

  const filtered = filterBy(activeTab);

  // ServiceCard defined outside render to keep stable reference
  const ServiceCard = ({ service }: { service: Service }) => (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow group flex flex-col h-full">
      <div className="aspect-[4/3] overflow-hidden relative flex-shrink-0">
        <ImageCarousel images={service.images} name={service.name} />
        <button
          type="button"
          className="absolute top-2 right-2 bg-white/90 hover:bg-white z-10 cursor-pointer rounded-full p-2 shadow transition-colors"
          onClick={() => toggleFavorite(service.id)}
          title={isFavored(service.id) ? 'Remove from favourites' : 'Add to favourites'}
        >
          <Heart className={`h-5 w-5 ${isFavored(service.id) ? 'fill-pink-600 text-pink-600' : 'text-gray-600'}`} />
        </button>
      </div>
      {/* flex-1 pushes footer to the bottom */}
      <CardContent className="p-4 md:p-5 flex flex-col flex-1">
        <div className="flex justify-between items-start mb-2 gap-2">
          <h3 className="text-base md:text-lg font-semibold leading-tight">{service.name}</h3>
          <Badge variant="secondary" className="ml-2 shrink-0 bg-pink-100 text-pink-800 text-xs">{formatKES(service.price)}</Badge>
        </div>
        <p className="text-sm text-gray-600 mb-3 flex-1">{service.description}</p>
        <p className="text-xs text-gray-500 mt-auto">⏱ {service.duration}</p>
      </CardContent>
      {/* Book Now always at card bottom */}
      <CardFooter className="p-4 md:p-5 pt-0">
        <Link to="/booking" className="w-full">
          <Button className="w-full cursor-pointer">Book Now</Button>
        </Link>
      </CardFooter>
    </Card>
  );

  return (
    <div className="py-10 md:py-16 bg-gray-50 min-h-screen">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-3xl md:text-5xl font-bold mb-4">Our Services</h1>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Explore our comprehensive range of beauty and wellness services
          </p>
        </div>

        {/* Tabs — centered, wraps on mobile */}
        <div className="flex justify-center mb-8">
          <div className="flex flex-wrap gap-2 justify-center max-w-3xl">
            {TABS.map(t => (
              <button
                key={t.value}
                onClick={() => setActiveTab(t.value)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all cursor-pointer border ${
                  activeTab === t.value
                    ? 'bg-pink-600 text-white border-pink-600 shadow-md'
                    : 'bg-white text-gray-700 border-gray-200 hover:border-pink-400 hover:text-pink-600'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Results count */}
        <p className="text-center text-sm text-gray-500 mb-6">
          {filtered.length} service{filtered.length !== 1 ? 's' : ''}{activeTab !== 'all' ? ` in ${TABS.find(t => t.value === activeTab)?.label}` : ''}
        </p>

        {/* Service Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 items-stretch">
          {filtered.map(service => (
            <ServiceCard key={service.id} service={service} />
          ))}
          {filtered.length === 0 && (
            <p className="text-gray-500 col-span-full text-center py-12">
              No services found in this category yet.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
