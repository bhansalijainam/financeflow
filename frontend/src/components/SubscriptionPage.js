import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { CheckCircle, Crown, Zap, Shield, TrendingUp } from 'lucide-react';

const SubscriptionPage = ({ user, success = false, cancelled = false }) => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isCheckingPayment, setIsCheckingPayment] = useState(false);

  useEffect(() => {
    if (success) {
      checkPaymentStatus();
    }
  }, [success]);

  const checkPaymentStatus = async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const sessionId = urlParams.get('session_id');
    
    if (!sessionId) return;

    setIsCheckingPayment(true);
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/subscription/status/${sessionId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (data.payment_status === 'paid') {
        // Update user data in localStorage
        const userData = JSON.parse(localStorage.getItem('userData'));
        userData.subscription_status = 'active';
        localStorage.setItem('userData', JSON.stringify(userData));
        
        setTimeout(() => {
          navigate('/setup');
        }, 3000);
      }
    } catch (error) {
      console.error('Error checking payment status:', error);
    } finally {
      setIsCheckingPayment(false);
    }
  };

  const handleSubscribe = async () => {
    setIsLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('token');
      const originUrl = window.location.origin;

      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/subscription/checkout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          package_id: 'monthly',
          origin_url: originUrl,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || 'Failed to create checkout session');
      }

      // Redirect to Stripe Checkout
      window.location.href = data.url;

    } catch (error) {
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="glass p-8 max-w-md w-full text-center shadow-medium">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Payment Successful!</h2>
          <p className="text-gray-600 mb-6">
            {isCheckingPayment ? 'Verifying your payment...' : 'Welcome to FinanceFlow Pro! Your subscription is now active.'}
          </p>
          {isCheckingPayment && (
            <div className="flex justify-center mb-6">
              <div className="loading-spinner" />
            </div>
          )}
          <Button 
            onClick={() => navigate('/setup')} 
            className="w-full btn-primary"
            disabled={isCheckingPayment}
          >
            {isCheckingPayment ? 'Processing...' : 'Continue to Setup'}
          </Button>
        </Card>
      </div>
    );
  }

  if (cancelled) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="glass p-8 max-w-md w-full text-center shadow-medium">
          <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Crown className="w-8 h-8 text-yellow-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Payment Cancelled</h2>
          <p className="text-gray-600 mb-6">
            No worries! You can subscribe whenever you're ready to unlock all features.
          </p>
          <div className="space-y-3">
            <Button onClick={handleSubscribe} className="w-full btn-primary">
              Try Again
            </Button>
            <Button onClick={() => navigate('/dashboard')} variant="outline" className="w-full">
              Continue with Free Version
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-4xl w-full">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gradient mb-4">
            Unlock Your Financial Potential
          </h1>
          <p className="text-xl text-gray-600">
            Get unlimited access to AI-powered financial insights and recommendations
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 items-center">
          {/* Features List */}
          <div className="space-y-6">
            <div className="flex items-start space-x-4">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <TrendingUp className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">AI Financial Recommendations</h3>
                <p className="text-gray-600">Get personalized advice on saving, investing, and optimizing your finances</p>
              </div>
            </div>

            <div className="flex items-start space-x-4">
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <Zap className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Unlimited AI Chat</h3>
                <p className="text-gray-600">Ask any financial question and get instant, expert-level responses</p>
              </div>
            </div>

            <div className="flex items-start space-x-4">
              <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <Shield className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Advanced Analytics</h3>
                <p className="text-gray-600">Detailed spending analysis, trends, and financial health insights</p>
              </div>
            </div>

            <div className="flex items-start space-x-4">
              <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center flex-shrink-0">
                <CheckCircle className="w-6 h-6 text-orange-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Unlimited Expense Tracking</h3>
                <p className="text-gray-600">Track unlimited transactions with automatic categorization</p>
              </div>
            </div>
          </div>

          {/* Pricing Card */}
          <div className="flex justify-center">
            <Card className="glass p-8 w-full max-w-sm shadow-medium">
              <div className="text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <Crown className="w-8 h-8 text-white" />
                </div>
                
                <h3 className="text-2xl font-bold text-gray-900 mb-2">FinanceFlow Pro</h3>
                <div className="text-4xl font-bold text-gradient mb-2">$29</div>
                <p className="text-gray-500 mb-8">per month</p>

                <div className="space-y-4 mb-8 text-left">
                  <div className="flex items-center space-x-3">
                    <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                    <span className="text-gray-700">Unlimited AI recommendations</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                    <span className="text-gray-700">24/7 AI financial chat</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                    <span className="text-gray-700">Advanced analytics dashboard</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                    <span className="text-gray-700">Unlimited expense tracking</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                    <span className="text-gray-700">CSV data export</span>
                  </div>
                </div>

                {error && (
                  <div className="error-message mb-4">
                    {error}
                  </div>
                )}

                <Button
                  onClick={handleSubscribe}
                  className="w-full btn-primary"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <div className="loading-spinner mr-2" />
                      Processing...
                    </>
                  ) : (
                    'Start Free Trial'
                  )}
                </Button>

                <p className="text-xs text-gray-500 mt-4">
                  Cancel anytime. No hidden fees.
                </p>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SubscriptionPage;