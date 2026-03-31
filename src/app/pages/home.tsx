import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Star, Clock, MapPin, ArrowRight, Check, ChevronLeft, ChevronRight } from 'lucide-react';
import { fetchHomepageServices, formatKES, type Service } from '../../lib/services-store';
import { supabase } from '../../lib/supabase';

function useTitle(title: string) {
  useEffect(() => {
    document.title = title;
  }, [title]);
}

// Carousel for a service card's images — real-time index changes on category-image
function ServiceImageCarousel({ images, name }: { images: string[]; name: string }) {
  const [idx, setIdx] = useState(0);
  const imgs = images?.length ? images : ['https://images.unsplash.com/photo-1560869713-7d0a29430803?w=600'];

  useEffect(() => { setIdx(0); }, [imgs[0]]);

  // No auto-advance — removes lag from interval timers
  return (
    <div className="relative w-full h-full overflow-hidden">
      <img
        key={imgs[idx]}
        src={imgs[idx]}
        alt={name}
        className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
        onError={e => { (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1560869713-7d0a29430803?w=600'; }}
      />
      {imgs.length > 1 && (
        <>
          <button
            type="button"
            onClick={e => { e.preventDefault(); e.stopPropagation(); setIdx(p => (p - 1 + imgs.length) % imgs.length); }}
            className="absolute left-1 top-1/2 -translate-y-1/2 bg-black/40 text-white rounded-full p-0.5 hover:bg-black/60"
          >
            <ChevronLeft className="h-3 w-3" />
          </button>
          <button
            type="button"
            onClick={e => { e.preventDefault(); e.stopPropagation(); setIdx(p => (p + 1) % imgs.length); }}
            className="absolute right-1 top-1/2 -translate-y-1/2 bg-black/40 text-white rounded-full p-0.5 hover:bg-black/60"
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

const DEFAULT_CATEGORY_IMAGES: Record<string, string> = {
  hair: 'https://images.unsplash.com/photo-1562322140-8baeececf3df?w=600',
  nails: 'https://images.unsplash.com/photo-1604654894610-df63bc536371?w=600',
  facial: 'https://images.unsplash.com/photo-1519823551278-64ac92734fb1?w=600',
  massage: 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=600',
  makeup: 'https://images.unsplash.com/photo-1487412947147-5cebf100ffc2?w=600',
  waxing: 'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=600',
};

const DEFAULT_FEATURED_CATEGORIES = [
  { key: 'hair', label: 'Hair Styling', description: 'Cut, colour & style' },
  { key: 'nails', label: 'Nail Services', description: 'Manicure & pedicure' },
  { key: 'facial', label: 'Facial Treatments', description: 'Skin care & rejuvenation' },
  { key: 'massage', label: 'Massage Therapy', description: 'Relaxation & wellness' },
  { key: 'makeup', label: 'Makeup', description: 'Everyday & bridal looks' },
  { key: 'waxing', label: 'Waxing', description: 'Smooth & hair-free skin' },
];

const TESTIMONIALS = [
  { name: 'Wanjiru Njoroge', rating: 5, text: 'Bora kabisa! Their hair treatment left me feeling like royalty. I will never go anywhere else in Nairobi.' },
  { name: 'Akinyi Odhiambo', rating: 5, text: 'Perfect manicure and the staff are so friendly. Prices are very fair for the quality you get here.' },
  { name: 'Kamau Mwangi', rating: 5, text: 'Came with my wife for a couples massage — absolutely divine. The best salon experience in the city!' },
];

const FEATURES = [
  'Experienced professionals',
  'Premium KES-friendly prices',
  'Modern facilities',
  'Flexible scheduling',
  'Nairobi-local expertise',
  'Customer satisfaction',
];

// Maximum service cards to show on homepage before "View All"
const HOME_SERVICES_LIMIT = 6;

export function Home() {
  useTitle('Luxe Salon — Premium Beauty & Wellness in Nairobi');

  const navigate = useNavigate();
  const [services, setServices] = useState<Service[]>([]);
  const [featuredCategories, setFeaturedCategories] = useState(DEFAULT_FEATURED_CATEGORIES);
  const [categoryImages, setCategoryImages] = useState<Record<string, string>>(DEFAULT_CATEGORY_IMAGES);
  // Keep a ref so realtime channel can update state
  const categoryImagesRef = useRef(DEFAULT_CATEGORY_IMAGES);

  const applyCategories = (parsed: any[]) => {
    if (!Array.isArray(parsed) || parsed.length === 0) return;
    setFeaturedCategories(parsed.map((cat: any) => ({
      key: cat.key,
      label: cat.label || DEFAULT_FEATURED_CATEGORIES.find(d => d.key === cat.key)?.label || cat.key,
      description: cat.description || DEFAULT_FEATURED_CATEGORIES.find(d => d.key === cat.key)?.description || '',
    })));
    const imgs: Record<string, string> = { ...DEFAULT_CATEGORY_IMAGES };
    parsed.forEach((cat: any) => {
      if (cat.image) imgs[cat.key] = cat.image;
    });
    categoryImagesRef.current = imgs;
    setCategoryImages({ ...imgs });
  };

  useEffect(() => {
    fetchHomepageServices().then(setServices);

    // Load custom category settings from Supabase
    supabase
      .from('settings')
      .select('value')
      .eq('key', 'home_categories')
      .single()
      .then(({ data }) => {
        if (data?.value) {
          try { applyCategories(JSON.parse(data.value)); } catch { /* ignore */ }
        }
      });

    // Realtime — listen to ALL settings changes and filter by key in JS
    const channel = supabase
      .channel('home-settings-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'settings' },
        payload => {
          const row = payload.new as any;
          if (row?.key === 'home_categories') {
            try {
              const parsed = JSON.parse(row.value);
              applyCategories(parsed);
            } catch { /* ignore */ }
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  // pick one representative service per featured category
  const getFeaturedService = (category: string) =>
    services.find(s => s.category === category);

  // Show only up to HOME_SERVICES_LIMIT categories
  const visibleCategories = featuredCategories.slice(0, HOME_SERVICES_LIMIT);

  return (
    <div>
      {/* Hero Section */}
      <section className="relative h-[600px] md:h-[700px] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0">
          <img
            src="https://images.unsplash.com/photo-1681965823525-b684fb97e9fe?w=1600"
            alt="Luxury salon interior"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-black/55" />
        </div>
        <div className="relative z-10 text-center text-white px-4 max-w-4xl mx-auto">
          <h1 className="text-4xl md:text-6xl font-bold mb-6">Welcome to Luxe Salon</h1>
          <p className="text-xl md:text-2xl mb-8 text-gray-200">
            Experience luxury beauty services tailored just for you — right here in Nairobi
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/booking">
              <Button size="lg" className="bg-pink-600 hover:bg-pink-700 text-white">
                Book Appointment <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Link to="/services">
              <Button size="lg" variant="outline" className="bg-white/10 backdrop-blur-sm border-white text-white hover:bg-white/20">
                View Services
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Our Services Grid — Supabase-driven, fully clickable cards, max 6 */}
      <section className="py-16 md:py-24 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Our Services</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Discover our wide range of premium beauty and wellness services
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
            {visibleCategories.map(cat => {
              const svc = getFeaturedService(cat.key);
              const images = svc?.images?.length ? svc.images : [categoryImages[cat.key] || DEFAULT_CATEGORY_IMAGES[cat.key]];
              return (
                <div
                  key={cat.key}
                  className="group cursor-pointer"
                  onClick={() => navigate('/services')}
                >
                  <Card className="overflow-hidden hover:shadow-xl transition-all duration-300 h-full flex flex-col group-hover:-translate-y-1">
                    <div className="aspect-[4/3] overflow-hidden flex-shrink-0">
                      <ServiceImageCarousel images={images} name={cat.label} />
                    </div>
                    <CardContent className="p-6 flex flex-col flex-1">
                      <h3 className="text-xl font-semibold mb-2 group-hover:text-pink-600 transition-colors">{cat.label}</h3>
                      <p className="text-gray-600 mb-2 flex-1">{cat.description}</p>
                      {svc && (
                        <p className="text-sm text-pink-600 font-medium mt-auto pt-2 border-t border-gray-100">
                          From {formatKES(svc.price)}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                </div>
              );
            })}
          </div>
          <div className="text-center mt-12">
            <Link to="/services">
              <Button size="lg" variant="outline">View All Services</Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Why Choose Us */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Why Choose Luxe Salon</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              We provide exceptional service with attention to every detail
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {FEATURES.map((feature, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-pink-100 flex items-center justify-center">
                  <Check className="h-4 w-4 text-pink-600" />
                </div>
                <span className="text-gray-700">{feature}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials — Kenyan names */}
      <section className="py-16 md:py-24 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">What Our Clients Say</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">Read reviews from our satisfied Nairobi customers</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
            {TESTIMONIALS.map((t, i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <div className="flex gap-1 mb-4">
                    {[...Array(t.rating)].map((_, j) => (
                      <Star key={j} className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                  <p className="text-gray-700 mb-4">"{t.text}"</p>
                  <p className="font-semibold">{t.name}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 md:py-24 bg-gradient-to-r from-pink-500 to-purple-600 text-white">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Ready to Transform Your Look?</h2>
          <p className="text-xl mb-8 text-white/90 max-w-2xl mx-auto">
            Book your appointment today and experience the luxury you deserve
          </p>
          <Link to="/booking">
            <Button size="lg" variant="secondary" className="bg-white text-pink-600 hover:bg-gray-100">
              Book Now <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Location & Hours */}
      <section className="py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            <div>
              <div className="flex items-center gap-2 mb-6">
                <MapPin className="h-6 w-6 text-pink-600" />
                <h3 className="text-2xl font-bold">Visit Us</h3>
              </div>
              <p className="text-gray-700 mb-4">
                Kimathi Street, CBD<br />
                Nairobi, Kenya<br />
              </p>
              <p className="text-gray-700">
                Phone: +254 712 345 678<br />
                Email: info@luxesalon.co.ke
              </p>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-6">
                <Clock className="h-6 w-6 text-pink-600" />
                <h3 className="text-2xl font-bold">Opening Hours</h3>
              </div>
              <div className="space-y-2 text-gray-700">
                <div className="flex justify-between"><span>Monday – Friday:</span><span>9:00 AM – 7:00 PM</span></div>
                <div className="flex justify-between"><span>Saturday:</span><span>9:00 AM – 6:00 PM</span></div>
                <div className="flex justify-between"><span>Sunday:</span><span>Closed</span></div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
