import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Bot, User, Send, Sparkles, RefreshCw, Zap } from 'lucide-react';
import { useAuthContext } from '../hooks/AuthContext';
import { supabase, type ChatMessage } from '../lib/supabase';
import ReactMarkdown from 'react-markdown';

const QUICK_ACTIONS = [
  "What was our total revenue last month?",
  "How many units of 'Coca-Cola Classic 330ml' are in stock?",
  "Update stock for 'Pringles Original 165g' to 500 units.",
  "What were the total sales for 'Sony PlayStation 5 Console'?",
];

export const ChatPage: React.FC = () => {
  const { admin } = useAuthContext();
  // State is now simplified to only hold the messages for the current conversation.
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Automatically scroll to the latest message.
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // The send message handler is now much simpler.
  const handleSendMessage = async (messageText?: string) => {
    const query = (messageText || inputValue).trim();
    if (!query || isLoading || !admin) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      session_id: 'local_session',
      role: 'user',
      content: query,
      created_at: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    const historyForAPI = [...messages, userMessage].map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user', // Correctly map the role
      parts: [{ text: m.content }]
    }));

    try {
      const { data, error } = await supabase.functions.invoke('ai-chat', {
        body: { query, history: historyForAPI, user: { id: admin.id, name: admin.full_name } },
      });

      if (error) throw new Error(error.message);

      const assistantMessageContent = data.response || "Sorry, I couldn't generate a response.";
      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        session_id: 'local_session',
        role: 'assistant',
        content: assistantMessageContent,
        created_at: new Date().toISOString()
      };

      setMessages(prev => [...prev, assistantMessage]);

    } catch (error) {
      console.error('Failed to get AI response:', error);
      const errorMessageContent = "I'm sorry, I encountered an error. Please try again.";
      const errorMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        session_id: 'local_session',
        role: 'assistant',
        content: errorMessageContent,
        created_at: new Date().toISOString()
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    // The main container now takes up the full space.
    <div className="flex h-[calc(100vh-4rem)]">
      {/* The entire chat session sidebar has been removed. */}

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        <div className="p-6 border-b">
          <h1 className="text-xl font-bold text-gray-900 flex items-center">
            <Bot className="h-6 w-6 text-quickcart-600 mr-3" />
            Stella - AI Business Assistant
          </h1>
          <p className="text-gray-600 mt-1">
            Your personal AI assistant. Start a conversation below.
          </p>
        </div>

        <Card className="flex-1 flex flex-col rounded-none border-none">
          <CardContent className="flex-1 flex flex-col p-0">
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex items-start gap-3 max-w-3xl ${message.role === 'user' ? 'justify-end ml-auto' : 'justify-start'}`}
                >
                  {message.role === 'assistant' && (
                    <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-gradient-to-r from-purple-500 to-pink-500 text-white">
                      <Sparkles className="h-4 w-4" />
                    </div>
                  )}
                  <div className={`p-4 rounded-lg ${message.role === 'user' ? 'bg-quickcart-600 text-white' : 'bg-gray-100 text-gray-900'}`}>
                    <ReactMarkdown className="prose max-w-none">{message.content}</ReactMarkdown>
                  </div>
                  {message.role === 'user' && (
                    <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-quickcart-600 text-white">
                      <User className="h-4 w-4" />
                    </div>
                  )}
                </div>
              ))}
              {isLoading && (
                <div className="flex items-start gap-3 max-w-3xl justify-start">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-gradient-to-r from-purple-500 to-pink-500 text-white">
                    <Sparkles className="h-4 w-4" />
                  </div>
                  <div className="p-4 rounded-lg bg-gray-100 text-gray-900">
                    <div className="flex items-center space-x-1">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* The quick actions bar is shown when the chat is empty. */}
            {messages.length === 0 && !isLoading && (
              <div className="p-4 border-t">
                <div className="flex items-center gap-2 mb-2">
                  <Zap className="h-4 w-4 text-yellow-500" />
                  <h4 className="text-sm font-medium">Try asking:</h4>
                </div>
                <div className="flex flex-wrap gap-2">
                  {QUICK_ACTIONS.map(q => (
                    <Button key={q} size="sm" variant="outline" onClick={() => handleSendMessage(q)}>{q}</Button>
                  ))}
                </div>
              </div>
            )}

            <div className="border-t border-gray-200 p-4 bg-white">
              <div className="flex items-center space-x-3">
                <Input
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Ask Stella anything..."
                  disabled={isLoading}
                  className="flex-1"
                  label=""
                />
                <Button
                  onClick={() => handleSendMessage()}
                  disabled={!inputValue.trim() || isLoading}
                  className="w-24"
                >
                  {isLoading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <><Send className="h-4 w-4 mr-2" /> Send</>}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};