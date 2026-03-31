import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { supabase } from '../../lib/supabase';

export function Privacy() {
  const [content, setContent] = useState('');

  useEffect(() => {
    loadPrivacy();
  }, []);

  const loadPrivacy = async () => {
    const { data } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'privacy_policy')
      .single();
    
    if (data) {
      setContent(data.value);
    } else {
      // Default privacy policy
      setContent(getDefaultPrivacy());
    }
  };

  const getDefaultPrivacy = () => {
    return `**Privacy Policy**

Last updated: March 29, 2026

**1. Information We Collect**
- Personal information (name, email, phone number)
- Booking preferences and history
- Payment information (processed securely)

**2. How We Use Your Information**
- To process and manage your bookings
- To communicate about appointments
- To improve our services
- To send promotional offers (with your consent)

**3. Information Sharing**
We do not sell, trade, or rent your personal information to third parties. We may share information with:
- Service providers who assist in our operations
- Legal authorities when required by law

**4. Data Security**
- We use industry-standard security measures
- Your payment information is encrypted
- Regular security audits are conducted

**5. Your Rights**
You have the right to:
- Access your personal data
- Request corrections to your data
- Request deletion of your data
- Opt-out of marketing communications

**6. Cookies**
We use cookies to enhance your browsing experience. You can disable cookies in your browser settings.

**7. Changes to Policy**
We may update this privacy policy from time to time. We will notify you of any significant changes.

**Contact Us**
For privacy concerns, please contact:
- Email: privacy@luxesalon.co.ke
- Phone: +254 712 345 678
- Address: Kimathi Street, CBD, Nairobi, Kenya`;
  };

  return (
    <div className="py-12 md:py-16 bg-gray-50 min-h-screen">
      <div className="container mx-auto px-4 max-w-4xl">
        <Card>
          <CardHeader>
            <CardTitle className="text-3xl">Privacy Policy</CardTitle>
          </CardHeader>
          <CardContent className="prose prose-sm md:prose max-w-none">
            <div className="whitespace-pre-wrap">{content}</div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
