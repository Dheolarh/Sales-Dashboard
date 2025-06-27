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

  // --- MODIFIED: Call the secure edge function to create a new chat ---
  const handleNewChat = useCallback(async () => {
    if (!admin) return null;
    try {
      const { data: newSession, error } = await supabase.functions.invoke('ai-chat', {
        body: {
          task: 'create_chat_session',
          user: { id: admin.id },
          title: 'New Chat'
        },
      });

      if (error) throw error;

      setSessions(prev => [newSession, ...prev]);
      setActiveSession(newSession);
      return newSession;
    } catch (error) {
      console.error("Failed to create new chat session:", error);
      // You could show a toast notification here to the user
      return null;
    }
  }, [admin]);


  const loadSessions = useCallback(async () => {
    if (!admin) return;
    setIsSidebarLoading(true);
    try {
      const data = await dbService.getChatSessions(admin.id);
      setSessions(data);
      if (data.length > 0) {
        if (!activeSession || !data.find(s => s.id === activeSession.id)) {
          setActiveSession(data[0]);
        }
      } else {
        // If no sessions exist, create one.
        await handleNewChat();
      }
    } catch (error) {
      console.error("Failed to load chat sessions:", error);
    } finally {
      setIsSidebarLoading(false);
    }
  }, [admin, activeSession, handleNewChat]);

  useEffect(() => {
    if (admin) {
      loadSessions();
    }
  }, [admin, loadSessions]);

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
  }, [messages, isLoading]);

  const handleAutoRenameSession = async (sessionId: string, firstMessage: string) => {
    if (!admin) return;
    try {
      await supabase.functions.invoke('ai-chat', {
        body: {
          query: firstMessage,
          task: 'generate_title', // Special task for the AI
          sessionId,
          user: { id: admin.id, name: admin.full_name }
        },
      });
      // After the AI renames it, reload the sessions to get the new title
      await loadSessions();
    } catch (error) {
      console.error("Failed to trigger auto-rename:", error);
    }
  };

  const handleSendMessage = async (messageText?: string) => {
    const query = (messageText || inputValue).trim();
    if (!query || isLoading || !activeSession || !admin) return;

    const isFirstMessageInNewChat = messages.length === 0 && activeSession.title === 'New Chat';

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

    await dbService.addChatMessage({ session_id: activeSession.id, role: 'user', content: query });

    if (isFirstMessageInNewChat) {
      handleAutoRenameSession(activeSession.id, query);
    }

    const historyForAPI = [...messages, userMessage].map(m => ({
      role: m.role as 'user' | 'model',
      parts: [{ text: m.content }]
    }));

    try {
      const { data, error } = await supabase.functions.invoke('ai-chat', {
        body: { query, history: historyForAPI, user: { id: admin.id, name: admin.full_name } },
      });
      if (error) throw new Error(error.message);

      const assistantMessageContent = data.response || "Sorry, I couldn't generate a response.";
      const assistantMessage = await dbService.addChatMessage({ session_id: activeSession.id, role: 'assistant', content: assistantMessageContent });
      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Failed to get AI response:', error);
      const errorMessageContent = "I'm sorry, I encountered an error. Please try again.";
      const errorMsg = await dbService.addChatMessage({ session_id: activeSession.id, role: 'assistant', content: errorMessageContent });
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteSession = async (sessionId: string) => {
    if (!confirm("Are you sure you want to delete this chat?")) return;
    await dbService.deleteChatSession(sessionId);
    if (activeSession?.id === sessionId) {
      setActiveSession(null);
    }
    await loadSessions();
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
          {isSidebarLoading ? <div className="p-4"><LoadingSpinner text="Loading chats..." /></div> : (
            <nav className="p-2 space-y-1">
              {sessions.map(session => (
                <div key={session.id} className="group flex items-center">
                  <button
                    onClick={() => setActiveSession(session)}
                    className={`w-full text-left flex items-center p-2 rounded-md text-sm transition-colors ${activeSession?.id === session.id ? 'bg-quickcart-100 text-quickcart-700' : 'hover:bg-gray-200'}`}
                  >
                    <MessageSquare className="h-4 w-4 mr-2 flex-shrink-0" />
                    <span className="flex-1 truncate">{session.title}</span>
                  </button>
                  <button onClick={() => handleDeleteSession(session.id)} className="p-1 opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-opacity">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
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
            {activeSession ? `${activeSession.title}` : "Start a new chat to begin."}
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