import React, { useState, useEffect, useRef } from 'react'
import { Card, CardContent } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { 
  MessageSquare, 
  Send, 
  Bot, 
  User, 
  Sparkles,
  RefreshCw,
  Copy
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuthContext } from '../hooks/AuthContext'

interface ChatMessage {
  id: string
  type: 'user' | 'assistant'
  content: string
  timestamp: Date
  isTyping?: boolean
}

const SAMPLE_QUESTIONS = [
  "What are some strategies to increase average order value?",
  "Give me three marketing ideas for our top-selling products.",
  "How should I handle a stock discrepancy error?",
  "What's a good way to analyze customer sales data?",
]

export const ChatPage: React.FC = () => {
  const { admin } = useAuthContext()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    initializeChat()
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const initializeChat = () => {
    const welcomeMessage: ChatMessage = {
      id: 'welcome',
      type: 'assistant',
      content: `Hello ${admin?.full_name || 'there'}! I'm Stella, your AI business assistant.\n\nAsk me anything for business advice or data analysis strategies.`,
      timestamp: new Date()
    }
    setMessages([welcomeMessage])
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const handleSendMessage = async (messageText?: string) => {
    const query = messageText || inputValue.trim()
    if (!query || isLoading) return

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: query,
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setInputValue('')
    setIsLoading(true)

    // Add typing indicator
    const typingMessage: ChatMessage = {
      id: 'typing',
      type: 'assistant',
      content: '',
      timestamp: new Date(),
      isTyping: true
    }
    setMessages(prev => [...prev, typingMessage])

    try {
      // Call the new database function
      const { data, error } = await supabase.rpc('ask_gemini_stella', {
        query_text: query
      })

      if (error) throw error
      
      const aiResponse: ChatMessage = {
        id: Date.now().toString() + '-ai',
        type: 'assistant',
        content: data,
        timestamp: new Date(),
      }

      setMessages(prev => prev.filter(m => m.id !== 'typing').concat(aiResponse))

    } catch (error) {
      console.error('Failed to process query:', error)
      const errorMessage: ChatMessage = {
        id: Date.now().toString() + '-err',
        type: 'assistant',
        content: "I'm sorry, I encountered an error while processing your request. Please try again.",
        timestamp: new Date()
      }
      setMessages(prev => prev.filter(m => m.id !== 'typing').concat(errorMessage))
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const copyMessage = (content: string) => {
    navigator.clipboard.writeText(content)
  }

  return (
    <div className="p-6 h-[calc(100vh-6rem)] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center">
            <Bot className="h-8 w-8 text-quickcart-600 mr-3" />
            Stella - AI Business Assistant
          </h1>
          <p className="text-gray-600 mt-1">Your intelligent business companion for data insights and analysis</p>
        </div>
        <div className="flex items-center space-x-2 text-sm text-gray-600">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          <span>AI Assistant Online</span>
        </div>
      </div>

      {/* Chat Messages */}
      <Card className="flex-1 flex flex-col">
        <CardContent className="flex-1 flex flex-col p-0">
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`flex items-start space-x-3 max-w-3xl ${message.type === 'user' ? 'flex-row-reverse space-x-reverse' : ''}`}>
                  <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                    message.type === 'user' 
                      ? 'bg-quickcart-600 text-white' 
                      : 'bg-gradient-to-r from-purple-500 to-pink-500 text-white'
                  }`}>
                    {message.type === 'user' ? <User className="h-4 w-4" /> : <Sparkles className="h-4 w-4" />}
                  </div>
                  
                  <div className={`flex-1 ${message.type === 'user' ? 'text-right' : ''}`}>
                    <div className={`inline-block p-4 rounded-lg ${
                      message.type === 'user'
                        ? 'bg-quickcart-600 text-white'
                        : 'bg-gray-100 text-gray-900'
                    }`}>
                      {message.isTyping ? (
                        <div className="flex items-center space-x-1">
                          <div className="flex space-x-1">
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                          </div>
                          <span className="text-sm text-gray-600 ml-2">Stella is thinking...</span>
                        </div>
                      ) : (
                        <div className="whitespace-pre-line">{message.content}</div>
                      )}
                    </div>
                    
                    {message.type === 'assistant' && !message.isTyping && (
                      <div className="flex items-center space-x-2 mt-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => copyMessage(message.content)}
                          className="text-xs"
                        >
                          <Copy className="h-3 w-3 mr-1" />
                          Copy
                        </Button>
                        <span className="text-xs text-gray-500">
                          {message.timestamp.toLocaleTimeString()}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
          
          {/* Input Area */}
          <div className="border-t border-gray-200 p-4">
            <div className="flex items-center space-x-3">
              <div className="flex-1 relative">
                <Input
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Ask me anything for business advice..."
                  disabled={isLoading}
                />
              </div>
              <Button
                onClick={() => handleSendMessage()}
                disabled={!inputValue.trim() || isLoading}
                className="flex items-center"
              >
                {isLoading ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
            
            <div className="mt-3">
              <p className="text-xs text-gray-500 mb-2">Try asking:</p>
              <div className="flex flex-wrap gap-2">
                {SAMPLE_QUESTIONS.map((question, index) => (
                  <Button
                    key={index}
                    size="sm"
                    variant="ghost"
                    onClick={() => handleSendMessage(question)}
                    className="text-xs text-gray-600 hover:text-quickcart-600"
                  >
                    "{question}"
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}