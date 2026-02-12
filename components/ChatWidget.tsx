
import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { ChatMessage, UserRole } from '../types';
import { DatabaseService, generateId } from '../services/mockDatabase';
import { MessageCircle, X, Send, User } from 'lucide-react';

export const ChatWidget: React.FC = () => {
  const { user } = useApp();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [guestId, setGuestId] = useState('');

  // Initialize Guest ID for non-logged in users
  useEffect(() => {
    if (!user) {
      let stored = localStorage.getItem('guest_chat_id');
      if (!stored) {
        stored = 'guest_' + Math.random().toString(36).substr(2, 9);
        localStorage.setItem('guest_chat_id', stored);
      }
      setGuestId(stored);
    }
  }, [user]);

  // Determine current chat identity
  const currentUserId = user ? user.id : guestId;
  const currentUserName = user ? user.name : `Client ${guestId.substr(0,4)}`;

  // Poll for messages
  const loadMessages = async () => {
    if (!currentUserId) return;
    const allMsgs = await DatabaseService.getMessages();
    
    // Filter messages where I am sender OR receiver
    const myMsgs = allMsgs.filter(m => 
      (m.senderId === currentUserId) || (m.receiverId === currentUserId)
    ).sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    
    setMessages(myMsgs);
  };

  useEffect(() => {
    if (isOpen) {
      loadMessages();
      // Listen to event for real-time updates
      const handleChatUpdate = () => loadMessages();
      window.addEventListener('chat-update', handleChatUpdate);
      const interval = setInterval(loadMessages, 3000);
      
      return () => {
        window.removeEventListener('chat-update', handleChatUpdate);
        clearInterval(interval);
      };
    }
  }, [isOpen, currentUserId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !currentUserId) return;

    const msg: ChatMessage = {
      id: generateId(),
      senderId: currentUserId,
      senderName: currentUserName,
      receiverId: 'admin1', // Always send to Admin
      content: newMessage,
      timestamp: new Date().toISOString(),
      read: false
    };

    await DatabaseService.sendMessage(msg);
    setNewMessage('');
    loadMessages();
  };

  // If Admin is logged in, they don't use this widget (they use the Dashboard)
  if (user?.role === UserRole.ADMIN) return null;

  return (
    <>
      {/* Trigger Button */}
      <button 
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 bg-primary text-white p-4 rounded-full shadow-2xl hover:scale-110 transition-transform z-50 flex items-center gap-2"
      >
        <MessageCircle size={24} />
        <span className="font-bold hidden md:inline">Service Client</span>
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-20 right-4 w-80 md:w-96 h-[500px] bg-white rounded-xl shadow-2xl border border-gray-200 z-50 flex flex-col animate-scale-in">
          {/* Header */}
          <div className="bg-secondary text-white p-4 rounded-t-xl flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/10 rounded-full">
                <User size={20} />
              </div>
              <div>
                <h3 className="font-bold">Service Client</h3>
                <p className="text-xs text-gray-300">Nous vous répondons rapidement</p>
              </div>
            </div>
            <button onClick={() => setIsOpen(false)} className="hover:bg-white/20 p-1 rounded">
              <X size={20} />
            </button>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 bg-gray-50 space-y-4">
            {messages.length === 0 && (
              <div className="text-center text-gray-400 text-sm mt-10 p-4">
                <p>Bienvenue ! 👋</p>
                <p className="mt-2">Comment pouvons-nous vous aider aujourd'hui ?</p>
              </div>
            )}
            {messages.map(m => {
              const isMe = m.senderId === currentUserId;
              return (
                <div key={m.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] p-3 rounded-xl text-sm shadow-sm ${isMe ? 'bg-primary text-white rounded-br-none' : 'bg-white border rounded-bl-none text-gray-800'}`}>
                    <p>{m.content}</p>
                    <p className={`text-[10px] mt-1 ${isMe ? 'text-primary-100' : 'text-gray-400'}`}>
                      {new Date(m.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                    </p>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <form onSubmit={handleSend} className="p-4 border-t bg-white rounded-b-xl flex gap-2">
            <input 
              type="text" 
              value={newMessage}
              onChange={e => setNewMessage(e.target.value)}
              placeholder="Écrivez votre message..."
              className="flex-1 border-gray-300 rounded-lg focus:ring-primary focus:border-primary text-sm p-2 border outline-none text-gray-900 placeholder-gray-400"
            />
            <button type="submit" className="bg-primary text-white p-2 rounded-lg hover:bg-emerald-700 transition-colors">
              <Send size={18} />
            </button>
          </form>
        </div>
      )}
    </>
  );
};
