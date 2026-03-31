import { useState, useEffect, useRef } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router';
import { Menu, Heart, Calendar, User, LogOut, Settings, LayoutDashboard, Scissors, ChevronDown } from 'lucide-react';
import { Button } from './ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Sheet, SheetContent, SheetTrigger } from './ui/sheet';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../lib/auth-context';
import { toast } from 'sonner';

interface SalonInfo {
  salon_name: string;
  salon_address: string;
  salon_phone: string;
  salon_email: string;
  salon_hours_weekday: string;
  salon_hours_saturday: string;
  salon_hours_sunday: string;
}

const DEFAULT_SALON: SalonInfo = {
  salon_name: 'Luxe Salon',
  salon_address: 'Kimathi Street, CBD, Nairobi, Kenya',
  salon_phone: '+254 712 345 678',
  salon_email: 'info@luxesalon.co.ke',
  salon_hours_weekday: '9:00 AM – 8:00 PM',
  salon_hours_saturday: '10:00 AM – 6:00 PM',
  salon_hours_sunday: 'Closed',
};

const SERVICE_CATEGORIES = [
  { label: 'Hair Services', path: '/services?cat=hair' },
  { label: 'Nail Services', path: '/services?cat=nails' },
  { label: 'Facials', path: '/services?cat=facial' },
  { label: 'Massage', path: '/services?cat=massage' },
  { label: 'Makeup', path: '/services?cat=makeup' },
  { label: 'Waxing', path: '/services?cat=waxing' },
];

export function Layout() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user } = useAuth();            // ← global reactive auth state
  const [servicesOpen, setServicesOpen] = useState(false);
  const [salonInfo, setSalonInfo] = useState<SalonInfo>(DEFAULT_SALON);
  const servicesRef = useRef<HTMLDivElement>(null);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    // Load salon info for footer
    const SALON_KEYS = [
      'salon_name', 'salon_address', 'salon_phone', 'salon_email',
      'salon_hours_weekday', 'salon_hours_saturday', 'salon_hours_sunday',
    ];
    supabase.from('settings').select('key, value').in('key', SALON_KEYS).then(({ data }) => {
      if (data && data.length > 0) {
        const map: Record<string, string> = {};
        data.forEach((row: any) => { map[row.key] = row.value || ''; });
        setSalonInfo(prev => ({ ...prev, ...map }));
      }
    });
  }, []);

  // Close services dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (servicesRef.current && !servicesRef.current.contains(e.target as Node)) {
        setServicesOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      toast.success('Logged out successfully');
    } catch (err: any) {
      toast.error(err?.message || 'Logout failed. Please try again.');
    } finally {
      navigate('/');
    }
  };

  const getInitials = (name: string) =>
    name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white border-b shadow-sm">
        <nav className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between gap-4">

            {/* Logo */}
            <Link to="/" className="flex items-center gap-2 flex-shrink-0 cursor-pointer">
              <div className="w-9 h-9 bg-pink-600 rounded-full flex items-center justify-center">
                <Scissors className="text-white h-4 w-4" />
              </div>
              <span className="text-lg font-semibold hidden sm:block">Luxe Salon</span>
            </Link>

            {/* Desktop Navigation — centered */}
            <div className="hidden md:flex items-center justify-center gap-6 flex-1">
              <Link
                to="/"
                className={`transition-colors hover:text-pink-600 text-sm font-medium cursor-pointer ${location.pathname === '/' ? 'text-pink-600' : 'text-gray-700'}`}
              >
                Home
              </Link>

              {/* Services Dropdown */}
              <div className="relative" ref={servicesRef}>
                <button
                  onClick={() => setServicesOpen(p => !p)}
                  className={`flex items-center gap-1 text-sm font-medium transition-colors hover:text-pink-600 cursor-pointer ${location.pathname === '/services' ? 'text-pink-600' : 'text-gray-700'}`}
                >
                  Services
                  <ChevronDown className={`h-4 w-4 transition-transform ${servicesOpen ? 'rotate-180' : ''}`} />
                </button>
                {servicesOpen && (
                  <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-52 bg-white rounded-xl shadow-xl border border-gray-100 py-2 z-50">
                    <Link
                      to="/services"
                      onClick={() => setServicesOpen(false)}
                      className="block px-4 py-2 text-sm font-semibold text-pink-600 hover:bg-pink-50 cursor-pointer"
                    >
                      All Services
                    </Link>
                    <div className="border-t my-1" />
                    {SERVICE_CATEGORIES.map(cat => (
                      <Link
                        key={cat.path}
                        to={cat.path}
                        onClick={() => setServicesOpen(false)}
                        className="block px-4 py-2 text-sm text-gray-700 hover:bg-pink-50 hover:text-pink-600 cursor-pointer"
                      >
                        {cat.label}
                      </Link>
                    ))}
                  </div>
                )}
              </div>

              <Link
                to="/booking"
                className={`transition-colors hover:text-pink-600 text-sm font-medium cursor-pointer ${location.pathname === '/booking' ? 'text-pink-600' : 'text-gray-700'}`}
              >
                Book Now
              </Link>
              <Link
                to="/favorites"
                className={`transition-colors hover:text-pink-600 text-sm font-medium cursor-pointer ${location.pathname === '/favorites' ? 'text-pink-600' : 'text-gray-700'}`}
              >
                Favorites
              </Link>
            </div>

            {/* Desktop Auth & Profile */}
            <div className="hidden md:flex items-center gap-3 flex-shrink-0">
              {user ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      className="rounded-full p-0 border-0 bg-transparent cursor-pointer hover:opacity-80 transition-opacity focus:outline-none focus:ring-2 focus:ring-pink-500 focus:ring-offset-2"
                      aria-label="Open profile menu"
                    >
                      <Avatar className="h-9 w-9">
                        <AvatarImage src={user.user_metadata?.avatar_url || ''} />
                        <AvatarFallback className="bg-pink-600 text-white text-sm">
                          {getInitials(user.user_metadata?.name || user.email || 'U')}
                        </AvatarFallback>
                      </Avatar>
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <div className="px-2 py-2">
                      <p className="text-sm font-medium">{user.user_metadata?.name || 'User'}</p>
                      <p className="text-xs text-gray-500">{user.email}</p>
                    </div>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => navigate('/profile')} className="cursor-pointer">
                      <LayoutDashboard className="mr-2 h-4 w-4" />
                      My Dashboard
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate('/profile')} className="cursor-pointer">
                      <User className="mr-2 h-4 w-4" />
                      Profile &amp; Settings
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate('/favorites')} className="cursor-pointer">
                      <Heart className="mr-2 h-4 w-4" />
                      Favorites
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate('/booking')} className="cursor-pointer">
                      <Calendar className="mr-2 h-4 w-4" />
                      Book Appointment
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleLogout} className="text-red-600 cursor-pointer">
                      <LogOut className="mr-2 h-4 w-4" />
                      Logout
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={() => navigate('/login')} className="cursor-pointer">
                    Sign In
                  </Button>
                  <Button size="sm" onClick={() => navigate('/signup')} className="cursor-pointer">
                    Sign Up
                  </Button>
                </div>
              )}
            </div>

            {/* Mobile: user avatar + hamburger */}
            <div className="flex md:hidden items-center gap-2">
              {user && (
                <button
                  onClick={() => navigate('/profile')}
                  className="rounded-full cursor-pointer hover:opacity-80 focus:outline-none focus:ring-2 focus:ring-pink-500"
                  aria-label="Go to profile"
                >
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={user.user_metadata?.avatar_url || ''} />
                    <AvatarFallback className="bg-pink-600 text-white text-xs">
                      {getInitials(user.user_metadata?.name || user.email || 'U')}
                    </AvatarFallback>
                  </Avatar>
                </button>
              )}
              <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                <SheetTrigger asChild>
                  <button className="inline-flex items-center justify-center rounded-md p-2 text-gray-700 hover:bg-gray-100 focus:outline-none cursor-pointer">
                    <Menu className="h-5 w-5" />
                  </button>
                </SheetTrigger>
                <SheetContent side="right" className="w-[280px] p-0">
                  <div className="flex flex-col h-full">
                    {/* Mobile header */}
                    <div className="px-4 py-4 border-b bg-gradient-to-r from-pink-50 to-purple-50">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-pink-600 rounded-full flex items-center justify-center">
                          <Scissors className="text-white h-3 w-3" />
                        </div>
                        <span className="font-semibold">Luxe Salon</span>
                      </div>
                    </div>

                    <div className="flex flex-col gap-1 p-4 flex-1 overflow-y-auto">
                      {/* Mobile User Info */}
                      {user && (
                        <div className="pb-3 mb-2 border-b">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-10 w-10">
                              <AvatarImage src={user.user_metadata?.avatar_url || ''} />
                              <AvatarFallback className="bg-pink-600 text-white text-sm">
                                {getInitials(user.user_metadata?.name || user.email || 'U')}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="text-sm font-medium">{user.user_metadata?.name || 'User'}</p>
                              <p className="text-xs text-gray-500">{user.email}</p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Mobile Nav Links */}
                      {[
                        { name: 'Home', path: '/' },
                        { name: 'All Services', path: '/services' },
                        { name: 'Book Now', path: '/booking' },
                        { name: 'Favorites', path: '/favorites' },
                      ].map((link) => (
                        <Link
                          key={link.path}
                          to={link.path}
                          onClick={() => setMobileMenuOpen(false)}
                          className={`px-3 py-2.5 rounded-lg text-sm transition-colors cursor-pointer ${
                            location.pathname === link.path
                              ? 'bg-pink-50 text-pink-600 font-medium'
                              : 'text-gray-700 hover:bg-gray-100'
                          }`}
                        >
                          {link.name}
                        </Link>
                      ))}

                      {/* Service sub-categories */}
                      <div className="px-3 pb-1">
                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Services</p>
                        {SERVICE_CATEGORIES.map(cat => (
                          <Link
                            key={cat.path}
                            to={cat.path}
                            onClick={() => setMobileMenuOpen(false)}
                            className="block py-1.5 pl-2 text-sm text-gray-600 hover:text-pink-600 cursor-pointer"
                          >
                            {cat.label}
                          </Link>
                        ))}
                      </div>

                      {/* Mobile Auth */}
                      <div className="border-t pt-3 mt-2 space-y-1">
                        {user ? (
                          <>
                            <button onClick={() => { navigate('/profile'); setMobileMenuOpen(false); }}
                              className="w-full px-3 py-2.5 text-left rounded-lg text-sm hover:bg-gray-100 flex items-center gap-2 cursor-pointer">
                              <LayoutDashboard className="h-4 w-4" /> My Dashboard
                            </button>
                            <button onClick={() => { navigate('/profile'); setMobileMenuOpen(false); }}
                              className="w-full px-3 py-2.5 text-left rounded-lg text-sm hover:bg-gray-100 flex items-center gap-2 cursor-pointer">
                              <Settings className="h-4 w-4" /> Settings
                            </button>
                            <button onClick={() => { handleLogout(); setMobileMenuOpen(false); }}
                              className="w-full px-3 py-2.5 text-left rounded-lg text-sm hover:bg-red-50 text-red-600 flex items-center gap-2 cursor-pointer">
                              <LogOut className="h-4 w-4" /> Logout
                            </button>
                          </>
                        ) : (
                          <div className="space-y-2 pt-1">
                            <Button variant="ghost" className="w-full cursor-pointer" onClick={() => { navigate('/login'); setMobileMenuOpen(false); }}>
                              Sign In
                            </Button>
                            <Button className="w-full cursor-pointer" onClick={() => { navigate('/signup'); setMobileMenuOpen(false); }}>
                              Sign Up
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </SheetContent>
              </Sheet>
            </div>

          </div>
        </nav>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12 mt-auto">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-10 h-10 bg-pink-600 rounded-full flex items-center justify-center">
                  <Scissors className="text-white h-4 w-4" />
                </div>
                <span className="text-xl font-semibold">{salonInfo.salon_name}</span>
              </div>
              <p className="text-gray-400 text-sm">
                Your premier destination for beauty and wellness services.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Quick Links</h3>
              <ul className="space-y-2 text-sm text-gray-400">
                <li><Link to="/" className="hover:text-white transition-colors">Home</Link></li>
                <li><Link to="/services" className="hover:text-white transition-colors">Services</Link></li>
                <li><Link to="/booking" className="hover:text-white transition-colors">Book Appointment</Link></li>
                <li><Link to="/terms" className="hover:text-white transition-colors">Terms of Service</Link></li>
                <li><Link to="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Hours</h3>
              <ul className="space-y-2 text-sm text-gray-400">
                <li>Mon – Fri: {salonInfo.salon_hours_weekday}</li>
                <li>Saturday: {salonInfo.salon_hours_saturday}</li>
                <li>Sunday: {salonInfo.salon_hours_sunday}</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Contact</h3>
              <ul className="space-y-2 text-sm text-gray-400">
                <li>{salonInfo.salon_address}</li>
                <li>Phone: {salonInfo.salon_phone}</li>
                <li>Email: {salonInfo.salon_email}</li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-sm text-gray-400">
            <p>&copy; {new Date().getFullYear()} {salonInfo.salon_name}. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
