import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Checkbox } from './ui/checkbox';
import { Building, CreditCard, DollarSign, Wallet } from 'lucide-react';

const SetupPage = ({ user, onSetupComplete }) => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [formData, setFormData] = useState({
    bank_accounts: [],
    credit_cards: [],
    cash_balance: '',
    savings_balance: ''
  });

  const bankOptions = [
    'Chase', 'Bank of America', 'Wells Fargo', 'Citibank', 'U.S. Bank',
    'PNC Bank', 'Capital One', 'TD Bank', 'Truist', 'Goldman Sachs'
  ];

  const creditCardOptions = [
    'American Express', 'Visa', 'Mastercard', 'Discover', 'Capital One',
    'Chase', 'Citi', 'Bank of America', 'Wells Fargo', 'US Bank'
  ];

  const handleBankAccountChange = (bank, checked) => {
    setFormData(prev => ({
      ...prev,
      bank_accounts: checked 
        ? [...prev.bank_accounts, bank]
        : prev.bank_accounts.filter(b => b !== bank)
    }));
  };

  const handleCreditCardChange = (card, checked) => {
    setFormData(prev => ({
      ...prev,
      credit_cards: checked 
        ? [...prev.credit_cards, card]
        : prev.credit_cards.filter(c => c !== card)
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/user/setup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          bank_accounts: formData.bank_accounts,
          credit_cards: formData.credit_cards,
          cash_balance: parseFloat(formData.cash_balance) || 0,
          savings_balance: parseFloat(formData.savings_balance) || 0
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || 'Setup failed');
      }

      setSuccess('Setup completed successfully!');
      onSetupComplete();
      
      setTimeout(() => {
        navigate('/dashboard');
      }, 2000);

    } catch (error) {
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gradient mb-4">
            Complete Your Financial Profile
          </h1>
          <p className="text-gray-600">
            Help us personalize your experience with some basic information about your finances
          </p>
        </div>

        <Card className="glass p-8 shadow-medium">
          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Bank Accounts Section */}
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <Building className="w-5 h-5 text-blue-600" />
                <Label className="text-lg font-semibold">Bank Accounts</Label>
              </div>
              <p className="text-sm text-gray-600 mb-4">
                Select the banks where you have checking or savings accounts
              </p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {bankOptions.map((bank) => (
                  <div key={bank} className="flex items-center space-x-2">
                    <Checkbox
                      id={`bank-${bank}`}
                      checked={formData.bank_accounts.includes(bank)}
                      onCheckedChange={(checked) => handleBankAccountChange(bank, checked)}
                    />
                    <Label 
                      htmlFor={`bank-${bank}`} 
                      className="text-sm font-medium cursor-pointer"
                    >
                      {bank}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            {/* Credit Cards Section */}
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <CreditCard className="w-5 h-5 text-green-600" />
                <Label className="text-lg font-semibold">Credit Cards</Label>
              </div>
              <p className="text-sm text-gray-600 mb-4">
                Select the credit cards you use regularly
              </p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {creditCardOptions.map((card) => (
                  <div key={card} className="flex items-center space-x-2">
                    <Checkbox
                      id={`card-${card}`}
                      checked={formData.credit_cards.includes(card)}
                      onCheckedChange={(checked) => handleCreditCardChange(card, checked)}
                    />
                    <Label 
                      htmlFor={`card-${card}`} 
                      className="text-sm font-medium cursor-pointer"
                    >
                      {card}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            {/* Balance Section */}
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <div className="flex items-center space-x-2 mb-2">
                  <Wallet className="w-5 h-5 text-purple-600" />
                  <Label htmlFor="cash_balance" className="font-semibold">
                    Cash Balance
                  </Label>
                </div>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                  <Input
                    id="cash_balance"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    className="pl-10"
                    value={formData.cash_balance}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      cash_balance: e.target.value
                    }))}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Your current checking account balance
                </p>
              </div>

              <div>
                <div className="flex items-center space-x-2 mb-2">
                  <Building className="w-5 h-5 text-orange-600" />
                  <Label htmlFor="savings_balance" className="font-semibold">
                    Savings Balance
                  </Label>
                </div>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                  <Input
                    id="savings_balance"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    className="pl-10"
                    value={formData.savings_balance}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      savings_balance: e.target.value
                    }))}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Your total savings account balance
                </p>
              </div>
            </div>

            {error && (
              <div className="error-message">
                {error}
              </div>
            )}

            {success && (
              <div className="success-message">
                {success}
              </div>
            )}

            <div className="flex space-x-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/dashboard')}
                className="flex-1"
              >
                Skip for Now
              </Button>
              <Button
                type="submit"
                className="flex-1 btn-primary"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <div className="loading-spinner mr-2" />
                    Saving...
                  </>
                ) : (
                  'Complete Setup'
                )}
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
};

export default SetupPage;