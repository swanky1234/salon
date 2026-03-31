import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import {
  Calendar,
  DollarSign,
  Users,
  Clock,
  Download,
  Eye,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../components/ui/table';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/dialog';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { supabase } from '../../../lib/supabase';
import { toast } from 'sonner';

export function AdminDashboard() {
  const navigate = useNavigate();
  const [bookings, setBookings] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [selectedBooking, setSelectedBooking] = useState<any>(null);
  const [showBookingDetails, setShowBookingDetails] = useState(false);
  const [reportPeriod, setReportPeriod] = useState('monthly');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.title = 'Dashboard | Luxe Salon Admin';
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // ── Run all independent queries in parallel ──────────────────────────
      const [bookingsResult, servicesResult] = await Promise.all([
        supabase
          .from('bookings')
          .select('*, booking_services(*)')
          .order('created_at', { ascending: false }),
        supabase
          .from('services')
          .select('*')
          .is('deleted_at', null),
      ]);

      if (bookingsResult.data) setBookings(bookingsResult.data);
      if (servicesResult.data) setServices(servicesResult.data);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = () => {
    const totalRevenue = bookings.reduce((sum, b) => sum + (b.total_price || 0), 0);
    const completedBookings = bookings.filter(b => b.status === 'completed').length;
    const totalDuration = bookings.reduce((sum, b) => sum + (b.total_duration || 0), 0);
    const avgDuration = bookings.length > 0 ? totalDuration / bookings.length : 0;
    
    // Get unique customers
    const uniqueCustomers = new Set(bookings.map(b => b.user_id)).size;

    return {
      totalRevenue,
      totalBookings: bookings.length,
      activeCustomers: uniqueCustomers,
      avgDuration: Math.round(avgDuration),
    };
  };

  const stats = calculateStats();

  const getMonthlyRevenue = () => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
    return months.map(month => {
      const monthBookings = bookings.filter(b => {
        const bookingMonth = new Date(b.booking_date).toLocaleString('default', { month: 'short' });
        return bookingMonth === month;
      });
      const revenue = monthBookings.reduce((sum, b) => sum + (b.total_price || 0), 0);
      return { month, revenue };
    });
  };

  const getWeeklyBookings = () => {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    return days.map(day => {
      const dayBookings = bookings.filter(b => {
        const bookingDay = new Date(b.booking_date).toLocaleString('default', { weekday: 'short' });
        return bookingDay === day;
      });
      return { day, bookings: dayBookings.length };
    });
  };

  const getServiceDistribution = () => {
    const serviceCounts: { [key: string]: number } = {};
    bookings.forEach(booking => {
      if (booking.booking_services) {
        booking.booking_services.forEach((bs: any) => {
          const serviceName = bs.service_name;
          serviceCounts[serviceName] = (serviceCounts[serviceName] || 0) + 1;
        });
      }
    });

    const total = Object.values(serviceCounts).reduce((sum, count) => sum + count, 0);
    const colors = ['#ec4899', '#a855f7', '#8b5cf6', '#db2777', '#f472b6'];
    
    return Object.entries(serviceCounts)
      .map(([name, count], index) => ({
        name,
        value: Math.round((count / total) * 100),
        color: colors[index % colors.length],
      }))
      .slice(0, 5);
  };

  const exportReport = () => {
    const reportData = {
      period: reportPeriod,
      generatedAt: new Date().toISOString(),
      stats: {
        totalRevenue: `KES ${stats.totalRevenue.toLocaleString()}`,
        totalBookings: stats.totalBookings,
        activeCustomers: stats.activeCustomers,
        avgDuration: `${stats.avgDuration} mins`,
      },
      bookings: bookings.map(b => ({
        id: b.id,
        customer: b.name,
        phone: b.phone,
        date: b.booking_date,
        time: b.booking_time,
        services: b.booking_services?.map((bs: any) => bs.service_name).join(', '),
        totalPrice: `KES ${b.total_price}`,
        status: b.status,
        rating: b.rating || 'N/A',
      })),
    };

    // Create CSV
    const csvContent = [
      ['Luxe Salon - Business Report'],
      [`Period: ${reportPeriod}`],
      [`Generated: ${new Date().toLocaleString()}`],
      [],
      ['Summary Statistics'],
      ['Total Revenue', reportData.stats.totalRevenue],
      ['Total Bookings', reportData.stats.totalBookings],
      ['Active Customers', reportData.stats.activeCustomers],
      ['Avg Service Time', reportData.stats.avgDuration],
      [],
      ['Booking Details'],
      ['ID', 'Customer', 'Phone', 'Date', 'Time', 'Services', 'Total Price', 'Status', 'Rating'],
      ...reportData.bookings.map(b => [
        b.id,
        b.customer,
        b.phone,
        b.date,
        b.time,
        b.services,
        b.totalPrice,
        b.status,
        b.rating,
      ]),
    ]
      .map(row => row.join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `luxe-salon-report-${reportPeriod}-${Date.now()}.csv`;
    a.click();
    toast.success('Report exported successfully');
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'confirmed':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      case 'completed':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const viewBookingDetails = (booking: any) => {
    setSelectedBooking(booking);
    setShowBookingDetails(true);
  };

  const statCards = [
    {
      title: 'Total Revenue',
      value: `KES ${stats.totalRevenue.toLocaleString()}`,
      change: '+12.5%',
      icon: DollarSign,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
      onClick: () => {},
    },
    {
      title: 'Total Bookings',
      value: stats.totalBookings.toString(),
      change: '+8.2%',
      icon: Calendar,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
      onClick: () => {},
    },
    {
      title: 'Active Customers',
      value: stats.activeCustomers.toString(),
      change: '+15.3%',
      icon: Users,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
      onClick: () => {},
    },
    {
      title: 'Avg. Service Time',
      value: `${stats.avgDuration} mins`,
      change: '-5.2%',
      icon: Clock,
      color: 'text-pink-600',
      bgColor: 'bg-pink-100',
      onClick: () => {},
    },
  ];

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        {/* Header skeleton */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="h-8 w-36 bg-gray-200 rounded mb-2" />
            <div className="h-4 w-64 bg-gray-100 rounded" />
          </div>
          <div className="flex gap-2">
            <div className="h-10 w-44 bg-gray-200 rounded" />
            <div className="h-10 w-36 bg-gray-200 rounded" />
          </div>
        </div>

        {/* Stat cards skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl border p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="h-12 w-12 bg-gray-200 rounded-lg" />
                <div className="h-6 w-16 bg-gray-100 rounded-full" />
              </div>
              <div className="h-4 w-24 bg-gray-100 rounded" />
              <div className="h-7 w-32 bg-gray-200 rounded" />
            </div>
          ))}
        </div>

        {/* Charts skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl border p-6 space-y-4">
              <div className="h-5 w-40 bg-gray-200 rounded" />
              <div className="h-[300px] bg-gray-100 rounded-lg" />
            </div>
          ))}
        </div>

        {/* Bookings table skeleton */}
        <div className="bg-white rounded-xl border p-6 space-y-4">
          <div className="h-5 w-36 bg-gray-200 rounded" />
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex gap-4">
                <div className="h-4 flex-1 bg-gray-100 rounded" />
                <div className="h-4 w-24 bg-gray-100 rounded" />
                <div className="h-4 w-20 bg-gray-100 rounded" />
                <div className="h-4 w-20 bg-gray-100 rounded" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold mb-2">Dashboard</h1>
          <p className="text-gray-600">Welcome back! Here's what's happening today.</p>
        </div>
        <div className="flex gap-2">
          <Select value={reportPeriod} onValueChange={setReportPeriod}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="daily">Daily Report</SelectItem>
              <SelectItem value="weekly">Weekly Report</SelectItem>
              <SelectItem value="monthly">Monthly Report</SelectItem>
              <SelectItem value="yearly">Yearly Report</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={exportReport} className="gap-2">
            <Download className="h-4 w-4" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card 
              key={index}
              className="cursor-pointer hover:shadow-lg transition-shadow"
              onClick={stat.onClick}
            >
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className={`p-3 rounded-lg ${stat.bgColor}`}>
                    <Icon className={`h-6 w-6 ${stat.color}`} />
                  </div>
                  <Badge
                    variant="secondary"
                    className={
                      stat.change.startsWith('+')
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }
                  >
                    {stat.change}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-gray-600 mb-1">{stat.title}</p>
                  <p className="text-2xl font-bold">{stat.value}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Monthly Revenue (KES)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={getMonthlyRevenue()}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(value) => `KES ${value}`} />
                <Line
                  type="monotone"
                  dataKey="revenue"
                  stroke="#ec4899"
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Weekly Bookings Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Weekly Bookings</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={getWeeklyBookings()}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="day" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="bookings" fill="#a855f7" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Service Distribution and Recent Bookings */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Service Distribution */}
        {getServiceDistribution().length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Service Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={getServiceDistribution()}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {getServiceDistribution().map((entry, index) => (
                      <Cell key={`service-cell-${entry.name}-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="mt-4 space-y-2">
                {getServiceDistribution().map((item, index) => (
                  <div key={index} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: item.color }}
                      />
                      <span>{item.name}</span>
                    </div>
                    <span className="font-semibold">{item.value}%</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Recent Bookings */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Recent Bookings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Customer</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="hidden sm:table-cell">Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bookings.slice(0, 5).map((booking) => (
                    <TableRow key={booking.id}>
                      <TableCell className="font-medium">{booking.name}</TableCell>
                      <TableCell>
                        {new Date(booking.booking_date).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        KES {booking.total_price?.toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className={getStatusColor(booking.status)}
                        >
                          {booking.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => viewBookingDetails(booking)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Booking Details Modal */}
      <Dialog open={showBookingDetails} onOpenChange={setShowBookingDetails}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Booking Details</DialogTitle>
          </DialogHeader>
          {selectedBooking && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Customer Name</p>
                  <p className="font-semibold">{selectedBooking.name}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Phone</p>
                  <p className="font-semibold">{selectedBooking.phone}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Date</p>
                  <p className="font-semibold">
                    {new Date(selectedBooking.booking_date).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Time</p>
                  <p className="font-semibold">{selectedBooking.booking_time}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Status</p>
                  <Badge className={getStatusColor(selectedBooking.status)}>
                    {selectedBooking.status}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Total Price</p>
                  <p className="font-semibold">
                    KES {selectedBooking.total_price?.toLocaleString()}
                  </p>
                </div>
              </div>
              <div>
                <p className="text-sm text-gray-600 mb-2">Services</p>
                <div className="space-y-2">
                  {selectedBooking.booking_services?.map((bs: any, index: number) => (
                    <div key={index} className="flex justify-between p-2 bg-gray-50 rounded">
                      <span>{bs.service_name}</span>
                      <span className="font-semibold">KES {bs.price}</span>
                    </div>
                  ))}
                </div>
              </div>
              {selectedBooking.notes && (
                <div>
                  <p className="text-sm text-gray-600">Notes</p>
                  <p className="mt-1">{selectedBooking.notes}</p>
                </div>
              )}
              {selectedBooking.rating && (
                <div>
                  <p className="text-sm text-gray-600">Rating</p>
                  <div className="flex items-center gap-1 mt-1">
                    {[...Array(5)].map((_, i) => (
                      <span key={i} className={i < selectedBooking.rating ? 'text-yellow-400' : 'text-gray-300'}>
                        ★
                      </span>
                    ))}
                  </div>
                  {selectedBooking.rating_comment && (
                    <p className="mt-2 text-sm">{selectedBooking.rating_comment}</p>
                  )}
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
