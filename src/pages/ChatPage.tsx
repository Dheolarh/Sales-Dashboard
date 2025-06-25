import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Bot, User, Send, Sparkles, RefreshCw, Zap } from 'lucide-react';
import { useAuthContext } from '../hooks/AuthContext';
import { supabase } from '../lib/supabase'; // Using the Supabase client to call our Edge Function

// --- 1. INTERFACE DEFINITIONS ---
// Defines the structure for each message in our chat history.
interface ChatMessage {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  isTyping?: boolean; // Optional flag to show the "thinking..." animation
}

// --- 2. QUICK ACTIONS ---
// A list of sample prompts to help the user get started.
const QUICK_ACTIONS = [
  "What was our total revenue last month?",
  "How many units of 'Coca-Cola Classic 330ml' are in stock?",
  "Update stock for 'Pringles Original 165g' to 500 units.",
  "What were the total sales for 'Sony PlayStation 5 Console'?",
];

// --- 3. REACT COMPONENT ---
export const ChatPage: React.FC = () => {
  // --- State Management ---
  const { admin } = useAuthContext(); // Get the currently logged-in admin
  const [messages, setMessages] = useState<ChatMessage[]>([]); // Holds the entire conversation history
  const [inputValue, setInputValue] = useState(''); // The text currently in the input box
  const [isLoading, setIsLoading] = useState(false); // Tracks when we are waiting for the AI to respond
  const messagesEndRef = useRef<HTMLDivElement>(null); // A reference to the bottom of the chat, for auto-scrolling

  // --- Effects ---
  // This effect runs once to set up the initial welcome message from the AI.
  useEffect(() => {
    setMessages([
      {
        id: 'welcome',
        type: 'assistant',
        content: `Hi ${admin?.full_name || 'there'}! I'm Stella. How can I help you manage the QuickCart store today?`,
      },
    ]);
  }, [admin]);

  // This effect runs every time the `messages` array changes, to keep the chat scrolled to the bottom.
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);


  // --- 4. CORE FUNCTION: handleSendMessage ---
  // This function is the heart of the chat component. It triggers when the user sends a message.
  // Replace the existing handleSendMessage function in pages/ChatPage.tsx

  const handleSendMessage = async (messageText?: string) => {
    const query = (messageText || inputValue).trim();
    if (!query || isLoading) return;

    // The user's message is added to state immediately
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: query,
    };

    // Create the history to be sent to the backend
    // We map our internal state to the format Gemini expects: { role, parts }
    // We also exclude the very last "typing" message if it exists
    const historyForAPI = messages
      .filter(m => !m.isTyping)
      .map(m => ({
        role: m.type === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }]
      }));

    setMessages((prev) => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    const typingMessage: ChatMessage = {
      id: 'typing',
      type: 'assistant',
      content: '',
      isTyping: true,
    };
    setMessages((prev) => [...prev, typingMessage]);

    try {
      // *** MODIFIED: Pass the history and the new query in the body ***
      const { data, error } = await supabase.functions.invoke('ai-chat', {
        body: {
          query, // The new message
          history: historyForAPI, // The history of the conversation so far
          user: admin ? { id: admin.id, name: admin.full_name } : null
        },
      });

      if (error) throw new Error(error.message);

      const assistantMessage: ChatMessage = {
        id: Date.now().toString() + '-ai',
        type: 'assistant',
        content: data.response,
      };

      setMessages((prev) => [...prev.filter((m) => m.id !== 'typing'), assistantMessage]);
    } catch (error) {
      console.error('Failed to get AI response:', error);
      const errorMessage: ChatMessage = {
        id: Date.now().toString() + '-error',
        type: 'assistant',
        content: "I'm sorry, I encountered an error. Please try again.",
      };
      setMessages((prev) => [...prev.filter((m) => m.id !== 'typing'), errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  // --- Helper for sending message on Enter key press ---
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // --- 5. JSX: RENDERING THE UI ---
  // This is the structure of the page, using the components you provided.
  return (
    <div className="p-6 h-[calc(100vh-6rem)] flex flex-col">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center">
          <Bot className="h-8 w-8 text-quickcart-600 mr-3" />
          Stella - AI Business Assistant
        </h1>
        <p className="text-gray-600 mt-1">
          Ask me to check stock, analyze sales, or update products.
        </p>
      </div>

      {/* Main Chat Area */}
      <Card className="flex-1 flex flex-col">
        <CardContent className="flex-1 flex flex-col p-0">
          {/* Message History */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex items-start gap-3 max-w-3xl ${message.type === 'user' ? 'justify-end ml-auto' : 'justify-start'
                  }`}
              >
                {/* Assistant's Icon */}
                {message.type === 'assistant' && (
                  <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-gradient-to-r from-purple-500 to-pink-500 text-white">
                    <Sparkles className="h-4 w-4" />
                  </div>
                )}

                {/* The Message Bubble */}
                <div className={`p-4 rounded-lg ${message.type === 'user'
                  ? 'bg-quickcart-600 text-white'
                  : 'bg-gray-100 text-gray-900'
                  }`}>
                  {message.isTyping ? (
                    <div className="flex items-center space-x-1">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                    </div>
                  ) : (
                    <div className="whitespace-pre-wrap">{message.content}</div>
                  )}
                </div>

                {/* User's Icon */}
                {message.type === 'user' && (
                  <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-quickcart-600 text-white">
                    <User className="h-4 w-4" />
                  </div>
                )}
              </div>
            ))}
            <div ref={messagesEndRef} /> {/* This empty div is the target for auto-scrolling */}
          </div>

          {/* Quick Actions for when the chat is empty */}
          {messages.length <= 1 && (
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

          {/* Input Area */}
          <div className="border-t border-gray-200 p-4 bg-white">
            <div className="flex items-center space-x-3">
              <Input
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask Stella anything..."
                disabled={isLoading}
                className="flex-1"
                label="" // No label needed for the main chat input
              />
              <Button
                onClick={() => handleSendMessage()}
                disabled={!inputValue.trim() || isLoading}
                className="w-24"
              >
                {isLoading ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <><Send className="h-4 w-4 mr-2" /> Send</>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};