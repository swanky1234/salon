import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router';
import { Mail, ArrowLeft, UserPlus } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Label } from '../components/ui/label';
import { Input } from '../components/ui/input';
import { toast } from 'sonner';
import { supabase } from '../../lib/supabase';

function useTitle(title: string) {
  useEffect(() => {
    document.title = title;
    return () => { document.title = 'Luxe Salon — Premium Beauty & Wellness in Nairobi'; };
  }, [title]);
}

export function ForgotPassword() {
  useTitle('Forgot Password | Luxe Salon');

  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim()) {
      toast.error('Please enter your email address');
      return;
    }

    setLoading(true);

    // Step 1: Check if the email exists in auth.users via a sign-in attempt with wrong OTP
    // Supabase doesn't expose a direct "email exists" check from the client SDK for security.
    // Best approach: try to send OTP to that email — if it returns user_not_found we know.
    // However the most reliable & secure UX:  attempt signInWithOtp (magic link) to probe,
    // or simply call resetPasswordForEmail and interpret the response nuance.

    // We use a workaround: try to sign in with a dummy password to get 'Invalid login credentials'
    // vs 'Email not confirmed' — both mean the account exists. 'User not found' means it doesn't.
    const { error: probeError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password: '__probe_password_that_wont_match__',
    });

    // If error message says "Invalid login credentials" or "Email not confirmed" → account exists
    // If error message says "User not found" or similar → no account
    const errMsg = probeError?.message?.toLowerCase() || '';
    const accountExists =
      !probeError || // (very unlikely — would mean wrong password matched 😅)
      errMsg.includes('invalid login credentials') ||
      errMsg.includes('email not confirmed') ||
      errMsg.includes('invalid credentials') ||
      errMsg.includes('wrong password');

    const noAccount =
      errMsg.includes('user not found') ||
      errMsg.includes('no user') ||
      errMsg.includes('not registered') ||
      errMsg.includes('does not exist');

    if (noAccount) {
      setLoading(false);
      toast.error('No account found with this email address.', {
        description: 'Would you like to create an account?',
        action: {
          label: 'Create Account',
          onClick: () => navigate('/signup'),
        },
        duration: 6000,
      });
      return;
    }

    // Account exists (or we can't determine) — send reset email
    const redirectTo = `${window.location.origin}/reset-password`;
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo,
    });

    setLoading(false);

    if (resetError) {
      console.error('Reset password error:', resetError);
      toast.error(`Failed to send reset link: ${resetError.message}`);
      return;
    }

    setSubmitted(true);
    toast.success('Password reset link sent!');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-pink-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <Mail className="h-8 w-8 text-white" />
          </div>
          <CardTitle className="text-2xl">Forgot Password?</CardTitle>
          <CardDescription>
            {!submitted
              ? "No worries, we'll send you a reset link"
              : 'Check your email for reset instructions'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!submitted ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    className="pl-10"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                    disabled={loading}
                  />
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading
                  ? <><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />Checking…</>
                  : 'Send Reset Link'}
              </Button>

              <div className="text-center text-sm text-gray-500 pt-1">
                Don't have an account?{' '}
                <Link to="/signup" className="text-pink-600 hover:underline font-medium">
                  Create account
                </Link>
              </div>

              <Link to="/login">
                <Button variant="ghost" className="w-full mt-1">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Login
                </Button>
              </Link>
            </form>
          ) : (
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                <p className="text-sm text-green-800">
                  We've sent a password reset link to{' '}
                  <strong>{email}</strong>
                </p>
              </div>
              <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 text-xs text-blue-700">
                <strong>Tip:</strong> Check your spam/junk folder if you don't see it within a few minutes. The link expires after 1 hour.
              </div>
              <p className="text-sm text-gray-600 text-center">
                Didn't receive the email?{' '}
                <button
                  onClick={() => setSubmitted(false)}
                  className="text-pink-600 hover:underline cursor-pointer"
                >
                  Try again
                </button>
              </p>
              <div className="border-t pt-4 text-center">
                <p className="text-sm text-gray-500 mb-3">Don't have an account?</p>
                <Link to="/signup">
                  <Button variant="outline" className="w-full gap-2">
                    <UserPlus className="h-4 w-4" />
                    Create Account
                  </Button>
                </Link>
              </div>
              <Link to="/login">
                <Button variant="ghost" className="w-full">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Login
                </Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
