import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Bot, User, Send, Sparkles, RefreshCw, Zap, Plus, MessageSquare, Trash2 } from 'lucide-react';
import { useAuthContext } from '../hooks/AuthContext';
import { dbService, supabase, type ChatSession, type ChatMessage } from '../lib/supabase';
import ReactMarkdown from 'react-markdown';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';

const QUICK_ACTIONS = [
  "What was our total revenue last month?",
  "How many units of 'Coca-Cola Classic 330ml' are in stock?",
  "Update stock for 'Pringles Original 165g' to 500 units.",
  "What were the total sales for 'Sony PlayStation 5 Console'?",
];

export const ChatPage: React.FC = () => {
  const { admin } = useAuthContext();
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSession, setActiveSession] = useState<ChatSession | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSidebarLoading, setIsSidebarLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const loadSessions = useCallback(async () => {
    if (!admin) return;
    setIsSidebarLoading(true);
    try {
      const data = await dbService.getChatSessions(admin.id);
      setSessions(data);
      if (data.length > 0 && !activeSession) {
        setActiveSession(data[0]);
      }
    } catch (error) {
      console.error("Failed to load chat sessions:", error);
    } finally {
      setIsSidebarLoading(false);
    }
  }, [admin, activeSession]);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  useEffect(() => {
    const fetchMessages = async () => {
      if (activeSession) {
        setIsLoading(true);
        const data = await dbService.getChatMessages(activeSession.id);
        setMessages(data);
        setIsLoading(false);
      } else {
        setMessages([]);
      }
    };
    fetchMessages();
  }, [activeSession]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleNewChat = async () => {
    if (!admin) return;
    const newSession = await dbService.createChatSession(admin.id, `New Chat ${sessions.length + 1}`);
    setSessions([newSession, ...sessions]);
    setActiveSession(newSession);
  };

  const handleSendMessage = async (messageText?: string) => {
    const query = (messageText || inputValue).trim();
    if (!query || isLoading || !activeSession || !admin) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      session_id: activeSession.id,
      role: 'user',
      content: query,
      created_at: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    // Persist user message
    await dbService.addChatMessage({ session_id: activeSession.id, role: 'user', content: query });

    const historyForAPI = messages.map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }]
    }));

    try {
      const { data, error } = await supabase.functions.invoke('ai-chat', {
        body: { query, history: historyForAPI, user: { id: admin.id, name: admin.full_name } },
      });

      if (error) throw new Error(error.message);

      const assistantMessage: ChatMessage = {
        id: Date.now().toString() + '-ai',
        session_id: activeSession.id,
        role: 'assistant',
        content: data.response,
        created_at: new Date().toISOString()
      };

      setMessages(prev => [...prev, assistantMessage]);
      await dbService.addChatMessage({ session_id: activeSession.id, role: 'assistant', content: data.response });

    } catch (error) {
      console.error('Failed to get AI response:', error);
      const errorMessageContent = "I'm sorry, I encountered an error. Please try again.";
      setMessages(prev => [...prev, { id: 'error', session_id: activeSession.id, role: 'assistant', content: errorMessageContent, created_at: new Date().toISOString() }]);
      await dbService.addChatMessage({ session_id: activeSession.id, role: 'assistant', content: errorMessageContent });
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
    <div className="flex h-[calc(100vh-4rem)]">
      {/* Sidebar for Chat History */}
      <div className="w-64 bg-gray-50 border-r flex flex-col">
        <div className="p-4 border-b">
          <Button onClick={handleNewChat} className="w-full">
            <Plus className="h-4 w-4 mr-2" /> New Chat
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {isSidebarLoading ? <LoadingSpinner text="Loading chats..." /> : (
            <nav className="p-2 space-y-1">
              {sessions.map(session => (
                <button
                  key={session.id}
                  onClick={() => setActiveSession(session)}
                  className={`w-full text-left flex items-center p-2 rounded-md text-sm transition-colors ${activeSession?.id === session.id ? 'bg-quickcart-100 text-quickcart-700' : 'hover:bg-gray-200'}`}
                >
                  <MessageSquare className="h-4 w-4 mr-2" />
                  <span className="flex-1 truncate">{session.title}</span>
                </button>
              ))}
            </nav>
          )}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        <div className="p-6 border-b">
          <h1 className="text-xl font-bold text-gray-900 flex items-center">
            <Bot className="h-6 w-6 text-quickcart-600 mr-3" />
            Stella - AI Business Assistant
          </h1>
          <p className="text-gray-600 mt-1">
            {activeSession ? `Chatting in: ${activeSession.title}` : "Start a new chat to begin."}
          </p>
        </div>

        <Card className="flex-1 flex flex-col rounded-none border-none">
          <CardContent className="flex-1 flex flex-col p-0">
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {messages.map((message, index) => (
                <div
                  key={index}
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

            {!activeSession && !isSidebarLoading && (
              <div className="text-center p-8">
                <h3 className="text-lg font-medium">No active chat</h3>
                <p className="text-gray-500">Click "New Chat" to start a conversation with Stella.</p>
              </div>
            )}

            {activeSession && messages.length === 0 && !isLoading && (
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
                  disabled={isLoading || !activeSession}
                  className="flex-1"
                  label=""
                />
                <Button
                  onClick={() => handleSendMessage()}
                  disabled={!inputValue.trim() || isLoading || !activeSession}
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