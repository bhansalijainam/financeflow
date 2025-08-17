import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { 
  DollarSign, 
  TrendingUp, 
  CreditCard, 
  Wallet, 
  Download,
  Plus,
  Lightbulb,
  MessageCircle,
  ArrowRight
} from 'lucide-react';

const Dashboard = ({ user }) => {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/dashboard`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch dashboard data');
      }

      const data = await response.json();
      setDashboardData(data);
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/expenses/export`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to export data');
      }

      const data = await response.json();
      
      // Create and download CSV file
      const blob = new Blob([data.csv_data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = 'expenses.csv';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="glass p-8 max-w-md w-full text-center">
          <p className="text-red-600">{error}</p>
          <Button onClick={fetchDashboardData} className="mt-4">
            Retry
          </Button>
        </Card>
      </div>
    );
  }

  // Process data for charts
  const categoryData = Object.entries(dashboardData?.category_breakdown || {}).map(([name, value]) => ({
    name,
    value: parseFloat(value),
  }));

  const colors = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#84cc16'];

  const balanceData = [
    { name: 'Cash', amount: dashboardData?.cash_balance || 0 },
    { name: 'Savings', amount: dashboardData?.savings_balance || 0 },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gradient">Financial Dashboard</h1>
          <p className="text-gray-600 mt-1">Overview of your financial health</p>
        </div>
        <Button onClick={handleExport} variant="outline" className="flex items-center space-x-2">
          <Download className="w-4 h-4" />
          <span>Export CSV</span>
        </Button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card className="glass p-6 card-hover">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Monthly Expenses</p>
              <p className="text-2xl font-bold text-gray-900">
                ${dashboardData?.monthly_expenses?.toFixed(2) || '0.00'}
              </p>
            </div>
            <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
              <CreditCard className="w-6 h-6 text-red-600" />
            </div>
          </div>
        </Card>

        <Card className="glass p-6 card-hover">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Cash Balance</p>
              <p className="text-2xl font-bold text-gray-900">
                ${dashboardData?.cash_balance?.toFixed(2) || '0.00'}
              </p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
              <Wallet className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </Card>

        <Card className="glass p-6 card-hover">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Savings Balance</p>
              <p className="text-2xl font-bold text-gray-900">
                ${dashboardData?.savings_balance?.toFixed(2) || '0.00'}
              </p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </Card>

        <Card className="glass p-6 card-hover">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Transactions</p>
              <p className="text-2xl font-bold text-gray-900">
                {dashboardData?.total_expenses || 0}
              </p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Expense Breakdown Pie Chart */}
        <Card className="glass p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Expense Breakdown</h3>
          {categoryData.length > 0 ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [`$${value.toFixed(2)}`, 'Amount']} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-500">
              <div className="text-center">
                <CreditCard className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No expense data available</p>
                <Link to="/expenses" className="text-blue-600 hover:underline">
                  Add your first expense
                </Link>
              </div>
            </div>
          )}
        </Card>

        {/* Balance Overview */}
        <Card className="glass p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Account Balances</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={balanceData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" stroke="#64748b" />
                <YAxis stroke="#64748b" />
                <Tooltip formatter={(value) => [`$${value.toFixed(2)}`, 'Balance']} />
                <Bar dataKey="amount" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Recent Recommendations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <Card className="glass p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Recent AI Recommendations</h3>
            <Link to="/recommendations">
              <Button variant="outline" size="sm" className="flex items-center space-x-2">
                <Lightbulb className="w-4 h-4" />
                <span>Get New Insights</span>
              </Button>
            </Link>
          </div>
          
          {dashboardData?.recent_recommendations?.length > 0 ? (
            <div className="space-y-4">
              {dashboardData.recent_recommendations.slice(0, 3).map((recommendation, index) => (
                <div key={index} className="p-4 bg-blue-50 rounded-lg border border-blue-100">
                  <p className="text-sm text-gray-700 line-clamp-3">
                    {recommendation.length > 150 
                      ? `${recommendation.substring(0, 150)}...` 
                      : recommendation
                    }
                  </p>
                </div>
              ))}
              <Link to="/recommendations" className="inline-flex items-center text-blue-600 hover:text-blue-700 text-sm font-medium">
                View all recommendations
                <ArrowRight className="w-4 h-4 ml-1" />
              </Link>
            </div>
          ) : (
            <div className="text-center py-8">
              <Lightbulb className="w-12 h-12 mx-auto mb-3 text-gray-400" />
              <p className="text-gray-500 mb-4">No recommendations yet</p>
              <Link to="/recommendations">
                <Button className="btn-primary">
                  Get Your First Recommendation
                </Button>
              </Link>
            </div>
          )}
        </Card>

        {/* Quick Actions */}
        <Card className="glass p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
          <div className="space-y-3">
            <Link to="/expenses" className="block">
              <Button variant="outline" className="w-full justify-start">
                <Plus className="w-4 h-4 mr-2" />
                Add New Expense
              </Button>
            </Link>
            
            <Link to="/recommendations" className="block">
              <Button variant="outline" className="w-full justify-start">
                <Lightbulb className="w-4 h-4 mr-2" />
                Get Financial Insights
              </Button>
            </Link>
            
            <Link to="/chat" className="block">
              <Button variant="outline" className="w-full justify-start">
                <MessageCircle className="w-4 h-4 mr-2" />
                Ask AI Financial Question
              </Button>
            </Link>

            <div className="pt-4 border-t border-gray-200">
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-4">
                <h4 className="font-medium text-gray-900 mb-2">Financial Health Score</h4>
                <div className="flex items-center space-x-2">
                  <div className="flex-1 bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-gradient-to-r from-blue-500 to-purple-600 h-2 rounded-full"
                      style={{ width: '75%' }}
                    ></div>
                  </div>
                  <span className="text-sm font-medium text-gray-700">75/100</span>
                </div>
                <p className="text-xs text-gray-600 mt-2">
                  Good progress! Consider increasing your savings rate.
                </p>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* Subscription Status */}
      {user.subscription_status !== 'active' && (
        <Card className="glass p-6 border-yellow-200 bg-yellow-50">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-yellow-800">Upgrade to Pro</h3>
              <p className="text-yellow-700">Unlock unlimited AI recommendations and advanced features</p>
            </div>
            <Link to="/subscription">
              <Button className="bg-yellow-600 hover:bg-yellow-700 text-white">
                Upgrade Now
              </Button>
            </Link>
          </div>
        </Card>
      )}
    </div>
  );
};

export default Dashboard;