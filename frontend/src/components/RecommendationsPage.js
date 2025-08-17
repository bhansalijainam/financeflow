import React, { useState, useEffect } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Lightbulb, TrendingUp, CreditCard, DollarSign, RefreshCw, Sparkles } from 'lucide-react';

const RecommendationsPage = ({ user }) => {
  const [recommendations, setRecommendations] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [hasFinancialProfile, setHasFinancialProfile] = useState(true);

  useEffect(() => {
    checkFinancialProfile();
  }, []);

  const checkFinancialProfile = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/user/setup`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        const hasProfile = data.cash_balance !== undefined || data.savings_balance !== undefined;
        setHasFinancialProfile(hasProfile);
      } else {
        setHasFinancialProfile(false);
      }
    } catch (error) {
      setHasFinancialProfile(false);
    }
  };

  const getRecommendations = async () => {
    if (!hasFinancialProfile) {
      setError('Please complete your financial profile first to get personalized recommendations.');
      return;
    }

    setLoading(true);
    setError('');
    setRecommendations('');

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/recommendations`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.detail || 'Failed to get recommendations');
      }

      const data = await response.json();
      setRecommendations(data.recommendations);

    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const formatRecommendations = (text) => {
    if (!text) return '';
    
    // Split by numbered points or bullet points
    const sections = text.split(/\n(?=\d+\.|\*|\-)/);
    
    return sections.map((section, index) => {
      if (section.trim()) {
        return (
          <div key={index} className="mb-4 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-100">
            <div className="prose prose-sm max-w-none">
              <p className="text-gray-800 leading-relaxed whitespace-pre-wrap">
                {section.trim()}
              </p>
            </div>
          </div>
        );
      }
      return null;
    }).filter(Boolean);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Lightbulb className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-3xl font-bold text-gradient">AI Financial Recommendations</h1>
        <p className="text-gray-600 mt-2">
          Get personalized financial insights powered by artificial intelligence
        </p>
      </div>

      {/* How it works */}
      <div className="grid md:grid-cols-3 gap-6 mb-8">
        <Card className="glass p-6 text-center">
          <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mx-auto mb-4">
            <TrendingUp className="w-6 h-6 text-blue-600" />
          </div>
          <h3 className="font-semibold text-gray-900 mb-2">Analyze Your Data</h3>
          <p className="text-sm text-gray-600">
            We analyze your expenses, balances, and financial patterns
          </p>
        </Card>

        <Card className="glass p-6 text-center">
          <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mx-auto mb-4">
            <Sparkles className="w-6 h-6 text-green-600" />
          </div>
          <h3 className="font-semibold text-gray-900 mb-2">AI Processing</h3>
          <p className="text-sm text-gray-600">
            Advanced AI generates personalized recommendations for you
          </p>
        </Card>

        <Card className="glass p-6 text-center">
          <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mx-auto mb-4">
            <DollarSign className="w-6 h-6 text-purple-600" />
          </div>
          <h3 className="font-semibold text-gray-900 mb-2">Actionable Insights</h3>
          <p className="text-sm text-gray-600">
            Get specific advice on saving, investing, and optimizing finances
          </p>
        </Card>
      </div>

      {/* Generate Recommendations */}
      <Card className="glass p-8 mb-8">
        {!hasFinancialProfile ? (
          <div className="text-center">
            <div className="w-16 h-16 bg-amber-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <DollarSign className="w-8 h-8 text-amber-600" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Complete Your Financial Profile First
            </h2>
            <p className="text-gray-600 mb-6">
              We need your financial information to provide personalized recommendations
            </p>
            <div className="flex justify-center space-x-4">
              <a href="/setup" className="btn-primary px-8 py-3 text-lg rounded-lg text-white no-underline inline-block">
                Complete Financial Setup
              </a>
            </div>
          </div>
        ) : (
          <div className="text-center">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Ready for Your Financial Insights?
            </h2>
            <p className="text-gray-600 mb-6">
              Our AI will analyze your financial data and provide personalized recommendations
            </p>
            <Button
              onClick={getRecommendations}
              disabled={loading}
              className="btn-primary px-8 py-3 text-lg"
            >
              {loading ? (
                <>
                  <div className="loading-spinner mr-3" />
                  Analyzing Your Financial Data...
                </>
              ) : (
                <>
                  <Lightbulb className="w-5 h-5 mr-3" />
                  Get AI Recommendations
                </>
              )}
            </Button>
          </div>
        )}

        {user.subscription_status !== 'active' && (
          <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center mr-3">
                <CreditCard className="w-4 h-4 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-yellow-800">
                  Upgrade to Pro for unlimited recommendations
                </p>
                <p className="text-xs text-yellow-700">
                  Get personalized insights whenever you need them
                </p>
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* Error Display */}
      {error && (
        <Card className="glass p-6 mb-8">
          <div className="error-message">
            <div className="flex items-center justify-between">
              <span>{error}</span>
              <Button
                onClick={getRecommendations}
                variant="outline"
                size="sm"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Retry
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Recommendations Display */}
      {recommendations && (
        <Card className="glass p-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">
                  Your Personalized Recommendations
                </h2>
                <p className="text-sm text-gray-600">
                  Generated just for you based on your financial profile
                </p>
              </div>
            </div>
            <Button
              onClick={getRecommendations}
              variant="outline"
              size="sm"
              disabled={loading}
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh
            </Button>
          </div>

          <div className="space-y-6">
            {formatRecommendations(recommendations)}
          </div>

          <div className="mt-8 p-6 bg-gradient-to-r from-green-50 to-blue-50 rounded-xl border border-green-200">
            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                <TrendingUp className="w-4 h-4 text-green-600" />
              </div>
              <div>
                <h3 className="font-semibold text-green-900 mb-2">Take Action</h3>
                <p className="text-green-800 text-sm">
                  These recommendations are tailored to your specific financial situation. 
                  Consider implementing them gradually and track your progress over time.
                </p>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Sample Recommendations for Demo */}
      {!recommendations && !loading && !error && (
        <Card className="glass p-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">
            What You Can Expect
          </h2>
          
          <div className="space-y-4">
            <div className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-100 opacity-60">
              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                  <span className="text-xs font-bold text-blue-600">1</span>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900">Spending Analysis</h4>
                  <p className="text-sm text-gray-600">
                    Detailed breakdown of your spending patterns and areas for improvement
                  </p>
                </div>
              </div>
            </div>

            <div className="p-4 bg-gradient-to-r from-green-50 to-blue-50 rounded-lg border border-green-100 opacity-60">
              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                  <span className="text-xs font-bold text-green-600">2</span>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900">Credit Card Optimization</h4>
                  <p className="text-sm text-gray-600">
                    Recommendations on which credit cards to use for maximum rewards
                  </p>
                </div>
              </div>
            </div>

            <div className="p-4 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg border border-purple-100 opacity-60">
              <div className="flex items-start space-x-3">
                <div className="w-6 h-6 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                  <span className="text-xs font-bold text-purple-600">3</span>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900">Investment Suggestions</h4>
                  <p className="text-sm text-gray-600">
                    Personalized advice on where to invest your excess cash for better returns
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-500 italic">
              Click "Get AI Recommendations" above to see your personalized insights
            </p>
          </div>
        </Card>
      )}
    </div>
  );
};

export default RecommendationsPage;