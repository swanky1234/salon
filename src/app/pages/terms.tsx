import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { supabase } from '../../lib/supabase';

export function Terms() {
  const [content, setContent] = useState('');

  useEffect(() => {
    loadTerms();
  }, []);

  const loadTerms = async () => {
    const { data } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'terms_of_service')
      .single();
    
    if (data) {
      setContent(data.value);
    } else {
      // Default terms
      setContent(getDefaultTerms());
    }
  };

  const getDefaultTerms = () => {
    return `**Terms of Service**

Last updated: March 29, 2026

**1. Acceptance of Terms**
By accessing and using Luxe Salon's services, you accept and agree to be bound by the terms and provision of this agreement.

**2. Booking and Cancellation Policy**
- Bookings must be made at least 24 hours in advance
- Cancellations must be made at least 12 hours before the appointment
- Late cancellations may incur a fee

**3. Payment Terms**
- All prices are listed in Kenyan Shillings (KES)
- Payment is due at the time of service
- We accept cash, M-Pesa, and card payments

**4. Service Quality**
- We strive to provide the highest quality services
- Customer satisfaction is our priority
- Any concerns should be reported immediately

**5. Privacy**
- Your personal information is protected
- We do not share your data with third parties
- See our Privacy Policy for more details

**6. Changes to Terms**
We reserve the right to modify these terms at any time. Please review them regularly.

**Contact Us**
For questions about these terms, please contact us at:
- Email: info@luxesalon.co.ke
- Phone: +254 712 345 678`;
  };

  return (
    <div className="py-12 md:py-16 bg-gray-50 min-h-screen">
      <div className="container mx-auto px-4 max-w-4xl">
        <Card>
          <CardHeader>
            <CardTitle className="text-3xl">Terms of Service</CardTitle>
          </CardHeader>
          <CardContent className="prose prose-sm md:prose max-w-none">
            <div className="whitespace-pre-wrap">{content}</div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
