import React, { useState, useEffect, useRef } from 'react';
import { useSocketStore } from '../../store/socketStore.js';
import { useAuthStore } from '../../store/authStore.js';
import { Send, User as UserIcon, MessageCircle, ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Chat() {
  const { user } = useAuthStore();
  const {
    socket,
    messages,
    contacts,
    activeContact,
    setActiveContact,
    fetchContacts,
    sendLiveMessage,
    connectSocket,
  } = useSocketStore();

  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef(null);

  // Initialize socket connection and contact feeds
  useEffect(() => {
    if (user) {
      connectSocket(user._id);
      fetchContacts();
    }
  }, [user]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!inputText.trim() || !activeContact) return;

    await sendLiveMessage(activeContact, inputText.trim());
    setInputText('');
  };

  const selectedContactDetails = contacts.find((c) => c._id === activeContact);

  return (
    <div className="glass-panel border border-slate-200/50 dark:border-slate-800/50 rounded-3xl overflow-hidden h-[calc(100vh-10rem)] md:h-[calc(100vh-8rem)] flex transition-all duration-300">
      
      {/* Sidebar Contacts List */}
      <div className={`w-full md:w-1/3 border-r border-slate-200/50 dark:border-slate-800/50 flex flex-col h-full bg-slate-50/50 dark:bg-slate-900/10 ${activeContact ? 'hidden md:flex' : 'flex'}`}>
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 text-left">
          <h3 className="font-extrabold text-slate-800 dark:text-white">Conversations</h3>
          <p className="text-[10px] text-slate-400 mt-0.5">Click contact to begin chat</p>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
          {contacts.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400 space-y-2">
              <MessageCircle className="mx-auto text-slate-300" size={24} />
              <p>No active chat contacts.</p>
            </div>
          ) : (
            contacts.map((contact) => (
              <button
                key={contact._id}
                onClick={() => setActiveContact(contact)}
                className={`w-full p-4 flex items-center gap-3 text-left transition-all ${
                  activeContact === contact._id
                    ? 'bg-primary/5 dark:bg-primary/10 border-l-4 border-primary'
                    : 'hover:bg-slate-100/50 dark:hover:bg-slate-800/20'
                }`}
              >
                <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-primary/10 to-secondary/10 flex items-center justify-center font-bold text-slate-655 dark:text-slate-300">
                  {contact.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-slate-800 dark:text-white truncate">{contact.name}</p>
                  <p className="text-[10px] text-primary dark:text-secondary uppercase tracking-wider font-bold mt-0.5">{contact.role}</p>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Main Chat Thread Area */}
      <div className={`flex-1 flex flex-col h-full bg-white dark:bg-slate-900/20 ${activeContact ? 'flex' : 'hidden md:flex'}`}>
        {activeContact ? (
          <>
            {/* Thread Header */}
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center gap-3 text-left">
              <button
                onClick={() => setActiveContact(null)}
                className="md:hidden p-2 -ml-2 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white"
              >
                <ArrowLeft size={18} />
              </button>
              <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-primary/15 to-secondary/15 flex items-center justify-center font-bold text-slate-600 dark:text-slate-300">
                {selectedContactDetails?.name.charAt(0) || 'U'}
              </div>
              <div>
                <p className="text-sm font-bold text-slate-800 dark:text-white">{selectedContactDetails?.name}</p>
                <p className="text-[10px] text-slate-400">{selectedContactDetails?.email}</p>
              </div>
            </div>

            {/* Messages Bubbles */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.length === 0 && (
                <p className="text-xs text-slate-400 py-12 text-center">No messages yet. Send a greeting!</p>
              )}
              
              {messages.map((msg, index) => {
                const isSelf = msg.senderId === user._id || (msg.senderId?._id && msg.senderId._id === user._id);
                return (
                  <div key={index} className={`flex ${isSelf ? 'justify-end' : 'justify-start'}`}>
                    <div
                      className={`max-w-[70%] rounded-2xl px-4 py-2.5 text-sm ${
                        isSelf
                          ? 'bg-primary text-white rounded-tr-none shadow-md'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-tl-none border border-slate-200 dark:border-slate-800'
                      }`}
                    >
                      <p>{msg.content}</p>
                      <span className={`text-[8px] mt-1 block text-right ${isSelf ? 'text-white/60' : 'text-slate-400'}`}>
                        {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Chat Input Bar */}
            <form onSubmit={handleSend} className="p-4 border-t border-slate-100 dark:border-slate-800 flex gap-2">
              <input
                type="text"
                placeholder="Type your message here..."
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                className="flex-1 px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl outline-none text-sm focus:ring-2 focus:ring-primary"
              />
              <button
                type="submit"
                className="p-3 bg-primary hover:bg-primary-dark text-white rounded-xl shadow-md transition-colors"
              >
                <Send size={16} />
              </button>
            </form>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-8 space-y-2">
            <MessageCircle size={40} className="text-slate-300" />
            <h3 className="font-bold text-slate-655 dark:text-slate-300">No conversation selected</h3>
            <p className="text-xs max-w-xs text-center">Click a contact on the left panel to review past history or send direct messages.</p>
          </div>
        )}
      </div>

    </div>
  );
}
