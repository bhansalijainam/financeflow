import React, { useState, useEffect, useRef } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { ScrollArea } from './ui/scroll-area';
import { Send, MessageCircle, Bot, User, Trash2, RefreshCw } from 'lucide-react';

const ChatPage = ({ user }) => {
  const [messages, setMessages] = useState([]);
  const [currentMessage, setCurrentMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [chatHistory, setChatHistory] = useState([]);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    fetchChatHistory();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchChatHistory = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/chat/history`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setChatHistory(data.history || []);
      }
    } catch (error) {
      console.error('Failed to fetch chat history:', error);
    }
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!currentMessage.trim() || loading) return;

    const userMessage = currentMessage.trim();
    setCurrentMessage('');
    setLoading(true);

    // Add user message to UI immediately
    const newUserMessage = {
      id: Date.now(),
      type: 'user',
      content: userMessage,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, newUserMessage]);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ message: userMessage }),
      });

      if (!response.ok) {
        throw new Error('Failed to get response');
      }

      const data = await response.json();

      // Add AI response to UI
      const aiMessage = {
        id: Date.now() + 1,
        type: 'assistant',
        content: data.response,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, aiMessage]);

      // Refresh chat history
      fetchChatHistory();

    } catch (error) {
      // Add error message
      const errorMessage = {
        id: Date.now() + 1,
        type: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date(),
        error: true
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(False);
    }
  };

  const clearChat = () => {
    setMessages([]);
  };

  const loadHistoryMessage = (historyItem) => {
    const userMessage = {
      id: Date.now(),
      type: 'user',
      content: historyItem.message,
      timestamp: new Date(historyItem.created_at)
    };
    
    const aiMessage = {
      id: Date.now() + 1,
      type: 'assistant',
      content: historyItem.response,
      timestamp: new Date(historyItem.created_at)
    };

    setMessages([userMessage, aiMessage]);
  };

  const formatMessageContent = (content) => {
    // Simple formatting for AI responses
    return content.split('\n').map((paragraph, index) => (
      <p key={index} className="mb-2 last:mb-0">
        {paragraph}
      </p>
    ));
  };

  const suggestedQuestions = [
    "What are the best ETFs for long-term growth?",
    "How should I allocate my portfolio at age 30?",
    "What's the difference between Roth and Traditional IRA?",
    "How can I improve my credit score?",
    "Should I pay off debt or invest first?",
    "What's a good emergency fund amount?"
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-teal-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <MessageCircle className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-3xl font-bold text-gradient">AI Financial Assistant</h1>
        <p className="text-gray-600 mt-2">
          Ask any financial question and get expert advice powered by AI
        </p>
      </div>

      <div className="grid lg:grid-cols-4 gap-8">
        {/* Chat History Sidebar */}
        <div className="lg:col-span-1">
          <Card className="glass p-6 h-fit sticky top-24">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">Recent Chats</h3>
              <Button
                variant="outline"
                size="sm"
                onClick={fetchChatHistory}
                className="h-8 w-8 p-0"
              >
                <RefreshCw className="w-3 h-3" />
              </Button>
            </div>
            
            {chatHistory.length > 0 ? (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {chatHistory.map((item) => (
                  <div
                    key={item.chat_id}
                    className="p-3 bg-white/50 rounded-lg cursor-pointer hover:bg-white/70 transition-colors"
                    onClick={() => loadHistoryMessage(item)}
                  >
                    <p className="text-sm text-gray-700 line-clamp-2">
                      {item.message}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(item.created_at).toLocaleDateString()}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 text-center py-4">
                No chat history yet
              </p>
            )}

            {/* Suggested Questions */}
            <div className="mt-6 pt-6 border-t border-gray-200">
              <h4 className="font-medium text-gray-900 mb-3">Try asking:</h4>
              <div className="space-y-2">
                {suggestedQuestions.slice(0, 3).map((question, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentMessage(question)}
                    className="w-full text-left text-xs p-2 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors text-blue-700"
                  >
                    {question}
                  </button>
                ))}
              </div>
            </div>
          </Card>
        </div>

        {/* Main Chat Area */}
        <div className="lg:col-span-3">
          <Card className="glass h-[600px] flex flex-col">
            {/* Chat Header */}
            <div className="p-6 border-b border-white/20">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-teal-600 rounded-xl flex items-center justify-center">
                    <Bot className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h2 className="font-semibold text-gray-900">Financial AI Assistant</h2>
                    <p className="text-sm text-gray-600">
                      {loading ? 'Thinking...' : 'Ready to help with your financial questions'}
                    </p>
                  </div>
                </div>
                {messages.length > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={clearChat}
                    className="flex items-center space-x-2"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Clear</span>
                  </Button>
                )}
              </div>
            </div>

            {/* Messages Area */}
            <ScrollArea className="flex-1 p-6">
              {messages.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-gradient-to-br from-gray-200 to-gray-300 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <MessageCircle className="w-8 h-8 text-gray-500" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Start a conversation
                  </h3>
                  <p className="text-gray-600 mb-6">
                    Ask me anything about personal finance, investing, or money management
                  </p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-2xl mx-auto">
                    {suggestedQuestions.map((question, index) => (
                      <button
                        key={index}
                        onClick={() => setCurrentMessage(question)}
                        className="p-3 text-left text-sm bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors text-blue-700 border border-blue-200"
                      >
                        {question}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[80%] ${
                          message.type === 'user'
                            ? 'chat-message user'
                            : `chat-message assistant ${message.error ? 'border-red-200 bg-red-50' : ''}`
                        }`}
                      >
                        <div className="flex items-start space-x-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                            message.type === 'user'
                              ? 'bg-blue-100'
                              : message.error
                              ? 'bg-red-100'
                              : 'bg-green-100'
                          }`}>
                            {message.type === 'user' ? (
                              <User className={`w-4 h-4 ${message.type === 'user' ? 'text-blue-600' : 'text-green-600'}`} />
                            ) : (
                              <Bot className={`w-4 h-4 ${message.error ? 'text-red-600' : 'text-green-600'}`} />
                            )}
                          </div>
                          <div className="flex-1">
                            <div className={`prose prose-sm max-w-none ${
                              message.type === 'user' ? 'text-white' : 'text-gray-800'
                            }`}>
                              {formatMessageContent(message.content)}
                            </div>
                            <div className={`text-xs mt-2 ${
                              message.type === 'user' ? 'text-blue-100' : 'text-gray-500'
                            }`}>
                              {message.timestamp.toLocaleTimeString()}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {loading && (
                    <div className="flex justify-start">
                      <div className="chat-message assistant">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                            <Bot className="w-4 h-4 text-green-600" />
                          </div>
                          <div className="flex space-x-1">
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse"></div>
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse delay-75"></div>
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse delay-150"></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <div ref={messagesEndRef} />
                </div>
              )}
            </ScrollArea>

            {/* Message Input */}
            <div className="p-6 border-t border-white/20">
              <form onSubmit={sendMessage} className="flex space-x-4">
                <div className="flex-1">
                  <Input
                    value={currentMessage}
                    onChange={(e) => setCurrentMessage(e.target.value)}
                    placeholder="Ask me anything about finance..."
                    disabled={loading}
                    className="w-full"
                  />
                </div>
                <Button
                  type="submit"
                  disabled={loading || !currentMessage.trim()}
                  className="btn-primary px-6"
                >
                  {loading ? (
                    <div className="loading-spinner" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </Button>
              </form>

              {user.subscription_status !== 'active' && (
                <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-xs text-yellow-700">
                    <strong>Free Plan:</strong> Limited to 5 questions per day. 
                    <a href="/subscription" className="underline ml-1">Upgrade to Pro</a> for unlimited access.
                  </p>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ChatPage;