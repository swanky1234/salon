import { useState, useEffect, useMemo } from 'react';
import {
  Download,
  TrendingUp,
  Calendar,
  Users,
  DollarSign,
  FileText,
  Filter,
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
import { Input } from '../../components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
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
  Legend,
} from 'recharts';
import { supabase } from '../../../lib/supabase';
import { toast } from 'sonner';

type Period = 'daily' | 'weekly' | 'monthly' | 'yearly';

const STATUS_COLORS: Record<string, string> = {
  confirmed: 'bg-green-100 text-green-800',
  pending: 'bg-yellow-100 text-yellow-800',
  cancelled: 'bg-red-100 text-red-800',
  completed: 'bg-blue-100 text-blue-800',
};

const PIE_COLORS = ['#ec4899', '#a855f7', '#8b5cf6', '#db2777', '#f472b6', '#c084fc'];
const fmt = (n: number) => `KES ${n.toLocaleString('en-KE')}`;

function getDateRange(period: Period): { start: Date; end: Date } {
  const now = new Date();
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);

  let start = new Date(now);
  switch (period) {
    case 'daily':
      start.setHours(0, 0, 0, 0);
      break;
    case 'weekly':
      const day = start.getDay();
      start.setDate(start.getDate() - day);
      start.setHours(0, 0, 0, 0);
      break;
    case 'monthly':
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
    case 'yearly':
      start = new Date(now.getFullYear(), 0, 1);
      break;
  }
  return { start, end };
}

function buildChartData(bookings: any[], period: Period) {
  if (period === 'daily') {
    const hours = Array.from({ length: 24 }, (_, i) => {
      const label = `${i.toString().padStart(2, '0')}:00`;
      const count = bookings.filter((b) => {
        const h = new Date(b.created_at).getHours();
        return h === i;
      }).length;
      const revenue = bookings
        .filter((b) => new Date(b.created_at).getHours() === i)
        .reduce((s, b) => s + (b.total_price || 0), 0);
      return { label, bookings: count, revenue };
    });
    return hours.filter((h) => h.bookings > 0 || h.revenue > 0);
  }

  if (period === 'weekly') {
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return dayNames.map((label, i) => {
      const filtered = bookings.filter(
        (b) => new Date(b.booking_date).getDay() === i,
      );
      return {
        label,
        bookings: filtered.length,
        revenue: filtered.reduce((s, b) => s + (b.total_price || 0), 0),
      };
    });
  }

  if (period === 'monthly') {
    const daysInMonth = new Date(
      new Date().getFullYear(),
      new Date().getMonth() + 1,
      0,
    ).getDate();
    return Array.from({ length: daysInMonth }, (_, i) => {
      const day = i + 1;
      const filtered = bookings.filter(
        (b) => new Date(b.booking_date).getDate() === day,
      );
      return {
        label: `${day}`,
        bookings: filtered.length,
        revenue: filtered.reduce((s, b) => s + (b.total_price || 0), 0),
      };
    });
  }

  // yearly - group by month
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return monthNames.map((label, i) => {
    const filtered = bookings.filter(
      (b) => new Date(b.booking_date).getMonth() === i,
    );
    return {
      label,
      bookings: filtered.length,
      revenue: filtered.reduce((s, b) => s + (b.total_price || 0), 0),
    };
  });
}

export function AdminReports() {
  const [allBookings, setAllBookings] = useState<any[]>([]);
  const [period, setPeriod] = useState<Period>('monthly');
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.title = 'Reports | Luxe Salon Admin';
    loadBookings();
  }, []);

  const loadBookings = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('bookings')
      .select('*, booking_services(*)')
      .order('booking_date', { ascending: false });
    if (error) {
      toast.error('Failed to load bookings');
    } else {
      setAllBookings(data || []);
    }
    setLoading(false);
  };

  // Filter by period
  const periodBookings = useMemo(() => {
    const { start, end } = getDateRange(period);
    return allBookings.filter((b) => {
      const d = new Date(b.booking_date);
      return d >= start && d <= end;
    });
  }, [allBookings, period]);

  // Further filter by status and search
  const filteredBookings = useMemo(() => {
    return periodBookings.filter((b) => {
      const matchStatus = statusFilter === 'all' || b.status === statusFilter;
      const matchSearch =
        !search ||
        b.name?.toLowerCase().includes(search.toLowerCase()) ||
        b.phone?.includes(search);
      return matchStatus && matchSearch;
    });
  }, [periodBookings, statusFilter, search]);

  const stats = useMemo(() => {
    const revenue = filteredBookings.reduce((s, b) => s + (b.total_price || 0), 0);
    const completed = filteredBookings.filter((b) => b.status === 'completed').length;
    const cancelled = filteredBookings.filter((b) => b.status === 'cancelled').length;
    const uniqueCustomers = new Set(filteredBookings.map((b) => b.phone)).size;
    const avgRating =
      filteredBookings.filter((b) => b.rating).length > 0
        ? filteredBookings.filter((b) => b.rating).reduce((s, b) => s + b.rating, 0) /
          filteredBookings.filter((b) => b.rating).length
        : 0;
    return { revenue, completed, cancelled, uniqueCustomers, avgRating };
  }, [filteredBookings]);

  const chartData = useMemo(() => buildChartData(filteredBookings, period), [filteredBookings, period]);

  // Service distribution from bookings.services JSON field
  const serviceDistribution = useMemo(() => {
    const counts: Record<string, number> = {};
    filteredBookings.forEach((b) => {
      const services = Array.isArray(b.booking_services)
        ? b.booking_services
        : Array.isArray(b.services) ? b.services : [];
      services.forEach((s: any) => {
        const name = s.service_name || s.name || 'Unknown';
        counts[name] = (counts[name] || 0) + 1;
      });
    });
    const total = Object.values(counts).reduce((s, v) => s + v, 0) || 1;
    return Object.entries(counts)
      .map(([name, count], i) => ({
        name,
        value: Math.round((count / total) * 100),
        count,
        color: PIE_COLORS[i % PIE_COLORS.length],
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);
  }, [filteredBookings]);

  const exportCSV = () => {
    const rows = [
      ['Luxe Salon – Business Report'],
      [`Period: ${period} | Generated: ${new Date().toLocaleString('en-KE')}`],
      [],
      ['SUMMARY'],
      ['Total Revenue', fmt(stats.revenue)],
      ['Total Bookings', filteredBookings.length],
      ['Completed', stats.completed],
      ['Cancelled', stats.cancelled],
      ['Unique Customers', stats.uniqueCustomers],
      ['Avg Rating', stats.avgRating.toFixed(1)],
      [],
      ['BOOKING DETAILS'],
      ['#', 'Customer', 'Phone', 'Date', 'Time', 'Services', 'Total (KES)', 'Status', 'Rating', 'Notes'],
      ...filteredBookings.map((b, i) => [
        i + 1,
        b.name,
        b.phone,
        b.booking_date,
        b.booking_time,
        (Array.isArray(b.booking_services)
          ? b.booking_services.map((s: any) => s.service_name || s.name)
          : Array.isArray(b.services)
            ? b.services.map((s: any) => s.name)
            : []).join(' | '),
        b.total_price || 0,
        b.status,
        b.rating || '',
        (b.notes || '').replace(/,/g, ';'),
      ]),
    ]
      .map((row) => row.join(','))
      .join('\n');

    const blob = new Blob([rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `luxe-salon-${period}-report-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('CSV report downloaded!');
  };

  const PERIOD_LABELS: Record<Period, string> = {
    daily: "Today's",
    weekly: "This Week's",
    monthly: "This Month's",
    yearly: "This Year's",
  };
  const periodLabel = PERIOD_LABELS[period];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading reports…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold mb-1 flex items-center gap-2">
            <FileText className="h-7 w-7 text-pink-600" />
            Reports
          </h1>
          <p className="text-gray-500">{periodLabel} performance summary</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Select value={period} onValueChange={(v) => setPeriod(v as Period)}>
            <SelectTrigger className="w-[160px]" id="report-period-select">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="daily">Daily</SelectItem>
              <SelectItem value="weekly">Weekly</SelectItem>
              <SelectItem value="monthly">Monthly</SelectItem>
              <SelectItem value="yearly">Yearly</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={exportCSV} className="gap-2 bg-pink-600 hover:bg-pink-700">
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Revenue', value: fmt(stats.revenue), icon: DollarSign, color: 'text-green-600', bg: 'bg-green-50' },
          { label: 'Bookings', value: filteredBookings.length, icon: Calendar, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Customers', value: stats.uniqueCustomers, icon: Users, color: 'text-purple-600', bg: 'bg-purple-50' },
          { label: 'Avg Rating', value: stats.avgRating > 0 ? `${stats.avgRating.toFixed(1)} ★` : '—', icon: TrendingUp, color: 'text-pink-600', bg: 'bg-pink-50' },
        ].map(({ label, value, icon: Icon, color, bg }) => (
          <Card key={label}>
            <CardContent className="p-5 flex items-center gap-4">
              <div className={`p-3 rounded-xl ${bg}`}>
                <Icon className={`h-6 w-6 ${color}`} />
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide">{label}</p>
                <p className="text-xl font-bold">{value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Status breakdown */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {(['pending', 'confirmed', 'completed', 'cancelled'] as const).map((s) => {
          const count = filteredBookings.filter((b) => b.status === s).length;
          return (
            <Card key={s} className="border-l-4" style={{ borderLeftColor: { pending: '#f59e0b', confirmed: '#22c55e', completed: '#3b82f6', cancelled: '#ef4444' }[s] }}>
              <CardContent className="p-4">
                <p className="text-xs text-gray-500 capitalize mb-1">{s}</p>
                <p className="text-2xl font-bold">{count}</p>
                <p className="text-xs text-gray-400">
                  {filteredBookings.length > 0 ? `${Math.round((count / filteredBookings.length) * 100)}%` : '0%'}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Revenue Over Time (KES)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis tickFormatter={(v) => `${(v / 1000).toFixed(0)}K`} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: any) => fmt(v)} />
                <Line type="monotone" dataKey="revenue" stroke="#ec4899" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Bookings Count</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="bookings" fill="#a855f7" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Service distribution */}
      {serviceDistribution.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top Services</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col md:flex-row items-center gap-6">
            <ResponsiveContainer width={220} height={220}>
              <PieChart>
                <Pie data={serviceDistribution} cx="50%" cy="50%" innerRadius={55} outerRadius={80} dataKey="value" paddingAngle={3}>
                  {serviceDistribution.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: any) => `${v}%`} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex-1 space-y-2 w-full">
              {serviceDistribution.map((s, i) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: s.color }} />
                    <span className="truncate max-w-[180px]">{s.name}</span>
                  </div>
                  <span className="font-semibold ml-4">{s.count} ({s.value}%)</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Full Bookings Table */}
      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <CardTitle className="text-base">All Bookings ({filteredBookings.length})</CardTitle>
          <div className="flex flex-wrap gap-2">
            <div className="relative">
              <Filter className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
              <Input
                id="report-search"
                placeholder="Search customer / phone…"
                className="pl-9 h-9 w-[220px]"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[130px] h-9" id="report-status-filter">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="confirmed">Confirmed</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead>Services</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Rating</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredBookings.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-gray-400">
                      No bookings found for this period.
                    </TableCell>
                  </TableRow>
                )}
                {filteredBookings.map((b, i) => (
                  <TableRow key={b.id}>
                    <TableCell className="text-gray-400 text-sm">{i + 1}</TableCell>
                    <TableCell className="font-medium whitespace-nowrap">{b.name}</TableCell>
                    <TableCell className="text-sm text-gray-600">{b.phone}</TableCell>
                    <TableCell className="whitespace-nowrap">
                      {new Date(b.booking_date).toLocaleDateString('en-KE')}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">{b.booking_time}</TableCell>
                    <TableCell className="max-w-[180px]">
                      <div className="truncate text-sm text-gray-600">
                        {Array.isArray(b.services)
                          ? b.services.map((s: any) => s.name).join(', ')
                          : '—'}
                      </div>
                    </TableCell>
                    <TableCell className="font-semibold whitespace-nowrap">
                      {b.total_price ? fmt(b.total_price) : '—'}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="secondary"
                        className={STATUS_COLORS[b.status] || 'bg-gray-100 text-gray-700'}
                      >
                        {b.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {b.rating ? (
                        <span className="text-yellow-500 font-semibold">{b.rating}★</span>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
