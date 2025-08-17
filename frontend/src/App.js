import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import './App.css';

// Components
import AuthPage from './components/AuthPage';
import SubscriptionPage from './components/SubscriptionPage';
import SetupPage from './components/SetupPage';
import Dashboard from './components/Dashboard';
import ExpenseManager from './components/ExpenseManager';
import RecommendationsPage from './components/RecommendationsPage';
import ChatPage from './components/ChatPage';
import Navbar from './components/Navbar';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = () => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('userData');
    
    if (token && userData) {
      setUser(JSON.parse(userData));
    }
    setLoading(false);
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userData');
    setUser(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <Router>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
        {user && <Navbar user={user} onLogout={logout} />}
        
        <Routes>
          {/* Public routes */}
          <Route 
            path="/auth" 
            element={
              user ? <Navigate to="/dashboard" /> : 
              <AuthPage onAuthSuccess={setUser} />
            } 
          />
          
          {/* Protected routes */}
          <Route 
            path="/subscription" 
            element={
              user ? <SubscriptionPage user={user} /> : 
              <Navigate to="/auth" />
            } 
          />
          
          <Route 
            path="/subscription/success" 
            element={
              user ? <SubscriptionPage user={user} success={true} /> : 
              <Navigate to="/auth" />
            } 
          />
          
          <Route 
            path="/subscription/cancel" 
            element={
              user ? <SubscriptionPage user={user} cancelled={true} /> : 
              <Navigate to="/auth" />
            } 
          />
          
          <Route 
            path="/setup" 
            element={
              user ? <SetupPage user={user} onSetupComplete={() => setUser({...user, setup_completed: true})} /> : 
              <Navigate to="/auth" />
            } 
          />
          
          <Route 
            path="/dashboard" 
            element={
              user ? <Dashboard user={user} /> : 
              <Navigate to="/auth" />
            } 
          />
          
          <Route 
            path="/expenses" 
            element={
              user ? <ExpenseManager user={user} /> : 
              <Navigate to="/auth" />
            } 
          />
          
          <Route 
            path="/recommendations" 
            element={
              user ? <RecommendationsPage user={user} /> : 
              <Navigate to="/auth" />
            } 
          />
          
          <Route 
            path="/chat" 
            element={
              user ? <ChatPage user={user} /> : 
              <Navigate to="/auth" />
            } 
          />
          
          {/* Default redirect */}
          <Route 
            path="/" 
            element={
              user ? (
                user.subscription_status !== 'active' ? <Navigate to="/subscription" /> :
                !user.setup_completed ? <Navigate to="/setup" /> :
                <Navigate to="/dashboard" />
              ) : (
                <Navigate to="/auth" />
              )
            } 
          />
        </Routes>
      </div>
    </Router>
  );
}

export default App;