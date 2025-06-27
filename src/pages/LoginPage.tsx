import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom'; // 1. Import useNavigate
import { Header } from '../components/layout/Header';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { detectLocation, getCurrentUTCTime, type LocationData } from '../utils/location';
import { useAuthContext } from '../hooks/AuthContext';

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [location, setLocation] = useState<LocationData | null>(null);
  const { admin, login, loading, error } = useAuthContext();
  const navigate = useNavigate(); // 2. Initialize the navigate function

  useEffect(() => {
    // 3. If the user is already logged in, redirect them immediately.
    if (admin) {
      navigate('/dashboard', { replace: true });
    }
    detectLocation().then(setLocation);
  }, [admin, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const loggedInAdmin = await login(email, password);
      // 4. On successful login, navigate to the dashboard.
      if (loggedInAdmin) {
        navigate('/dashboard', { replace: true });
      }
    } catch (err) {
      // Error is already handled by the useAuth hook's state.
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-quickcart-50 to-quickcart-100">
      <Header title="Admin Login" />
      
      <div className="flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <Card>
            <CardHeader className="text-center">
              <CardTitle className="text-quickcart-700">Welcome Back</CardTitle>
              <p className="text-gray-600 mt-2">Sign in to your QuickCart dashboard</p>
            </CardHeader>
            
            <CardContent>
              <form onSubmit={handleLogin} className="space-y-6">
                <Input
                  label="Email Address"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@quickcart.com"
                  required
                />
                
                <Input
                  label="Password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                />
                
                {error && (
                  <div className="text-red-600 text-sm">{error}</div>
                )}
                
                <Button
                  type="submit"
                  className="w-full"
                  disabled={loading}
                >
                  {loading ? 'Signing in...' : 'Sign In'}
                </Button>
              </form>
              
              <div className="mt-6 p-4 bg-quickcart-50 rounded-lg">
                <p className="text-sm text-quickcart-700 font-medium">Demo Credentials:</p>
                <p className="text-sm text-gray-600">
                  Email: admin@quickcart.com<br />
                  Password: any password
                </p>
              </div>
              
              {location && (
                <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-700 font-medium">Login Location Detected:</p>
                  <p className="text-sm text-gray-600">
                    {location.city}, {location.country} • {getCurrentUTCTime().split('T')[1].split('.')[0]} UTC
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};