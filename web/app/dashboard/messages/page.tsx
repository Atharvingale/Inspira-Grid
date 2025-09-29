'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { useMessaging } from '@/lib/contexts/MessagingContext';
import Loading from '@/components/common/Loading';
import { ConversationList } from '@/components/messages/ConversationList';
import { MessageBubble } from '@/components/messages/MessageBubble';
import { FileUpload } from '@/components/messages/FileUpload';
import { NewConversationModal } from '@/components/messages/NewConversationModal';

const Messages = () => {
  const { currentUser } = useAuth();
  const {
    state,
    loadConversations,
    loadMessages,
    setActiveConversation,
    sendMessage,
    sendFile,
    addReaction,
    removeReaction,
    startTyping,
    stopTyping,
    getConversationName,
  } = useMessaging();
  
  const [newMessage, setNewMessage] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFileUpload, setShowFileUpload] = useState(false);
  const [showNewConversation, setShowNewConversation] = useState(false);
  const [typing, setTyping] = useState(false);
  const [typingTimeout, setTypingTimeout] = useState<NodeJS.Timeout | null>(null);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  useEffect(() => {
    if (state.activeConversation) {
      loadMessages(state.activeConversation.id);
    }
  }, [state.activeConversation, loadMessages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !state.activeConversation) return;

    try {
      setSendingMessage(true);
      await sendMessage(state.activeConversation.id, newMessage);
      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setSendingMessage(false);
    }
  };

  const handleNewConversation = () => {
    setShowNewConversation(true);
  };

  const handleFileUpload = async (file: File) => {
    if (!state.activeConversation) return;
    
    try {
      setSendingMessage(true);
      await sendFile(state.activeConversation.id, file);
      setShowFileUpload(false);
    } catch (error) {
      console.error('Error uploading file:', error);
    } finally {
      setSendingMessage(false);
    }
  };

  const handleAddReaction = async (messageId: string, emoji: string) => {
    if (!state.activeConversation) return;
    try {
      await addReaction(state.activeConversation.id, messageId, emoji);
    } catch (error) {
      console.error('Error adding reaction:', error);
    }
  };

  const handleRemoveReaction = async (messageId: string, emoji: string) => {
    if (!state.activeConversation) return;
    try {
      await removeReaction(state.activeConversation.id, messageId, emoji);
    } catch (error) {
      console.error('Error removing reaction:', error);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setNewMessage(value);
    
    if (!state.activeConversation) return;
    
    // Handle typing indicators
    if (value.trim() && !typing) {
      setTyping(true);
      startTyping(state.activeConversation.id);
    }
    
    // Clear existing timeout
    if (typingTimeout) {
      clearTimeout(typingTimeout);
    }
    
    // Set new timeout to stop typing
    const timeout = setTimeout(() => {
      if (typing) {
        setTyping(false);
        stopTyping(state.activeConversation!.id);
      }
    }, 2000);
    
    setTypingTimeout(timeout);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(e as any);
    }
  };

  const _formatTime = (date: Date | { seconds: number; nanoseconds: number }) => {
    const dateObj = date instanceof Date ? date : new Date(date.seconds * 1000);
    return dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (state.loading) {
    return <Loading message="Loading messages..." />;
  }

  return (
    <div className="h-screen bg-gradient-to-br from-dark-darker via-dark to-dark-lighter flex">
      <ConversationList
        conversations={state.conversations}
        activeConversation={state.activeConversation}
        searchQuery={searchQuery}
        onConversationSelect={setActiveConversation}
        onSearchChange={setSearchQuery}
        onNewConversation={handleNewConversation}
        getConversationName={getConversationName}
        currentUserId={currentUser?.uid}
      />

      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        {state.activeConversation ? (
          <>
            {/* Chat Header */}
            <div className="p-4 bg-dark-card/50 backdrop-blur-sm border-b border-dark-border">
              <h2 className="text-lg font-semibold text-text-primary">
                {getConversationName(state.activeConversation)}
              </h2>
              <p className="text-sm text-text-secondary">
                {state.activeConversation.participants.length} participants
              </p>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {(state.messages[state.activeConversation.id] || []).length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <svg className="w-12 h-12 text-text-muted mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                    <p className="text-text-secondary">Start the conversation by sending a message</p>
                  </div>
                </div>
              ) : (
                (state.messages[state.activeConversation.id] || []).map((message) => (
                  <MessageBubble
                    key={message.id}
                    message={message}
                    isCurrentUser={message.senderId === currentUser?.uid}
                    onAddReaction={(emoji) => handleAddReaction(message.id, emoji)}
                    onRemoveReaction={(emoji) => handleRemoveReaction(message.id, emoji)}
                  />
                ))
              )}
            </div>

            {/* Typing Indicators */}
            {state.typingIndicators
              .filter(t => t.conversationId === state.activeConversation?.id)
              .length > 0 && (
              <div className="px-4 py-2 text-sm text-text-secondary italic">
                {state.typingIndicators
                  .filter(t => t.conversationId === state.activeConversation?.id)
                  .map(t => t.userName)
                  .join(', ')}{' '}
                {state.typingIndicators.filter(t => t.conversationId === state.activeConversation?.id).length === 1
                  ? 'is typing...' 
                  : 'are typing...'}
              </div>
            )}

            {/* Message Input */}
            <div className="p-4 bg-dark-card/50 backdrop-blur-sm border-t border-dark-border">
              <form onSubmit={handleSendMessage} className="flex items-end space-x-3">
                {/* File Upload Button */}
                <button
                  type="button"
                  onClick={() => setShowFileUpload(true)}
                  className="p-3 text-text-tertiary hover:text-brand-primary hover:bg-brand-primary/10 rounded-xl transition-colors"
                  disabled={sendingMessage}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                  </svg>
                </button>

                <div className="flex-1">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={handleInputChange}
                    onKeyDown={handleKeyDown}
                    placeholder="Type a message..."
                    className="w-full px-4 py-3 bg-dark-surface/50 border border-dark-border rounded-xl text-white placeholder:text-text-tertiary focus:ring-2 focus:ring-brand-primary focus:border-brand-primary transition-all backdrop-blur-sm resize-none"
                    disabled={sendingMessage}
                  />
                </div>

                <button
                  type="submit"
                  disabled={sendingMessage || !newMessage.trim()}
                  className="px-4 py-3 bg-gradient-to-r from-brand-primary to-brand-secondary text-white rounded-xl hover:shadow-lg hover:shadow-brand-primary/30 hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                >
                  {sendingMessage ? (
                    <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                  )}
                </button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center bg-dark-surface/30">
            <div className="text-center">
              <svg className="w-16 h-16 text-text-muted mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <h3 className="text-xl font-medium text-text-primary mb-2">Select a Conversation</h3>
              <p className="text-text-secondary">Choose a conversation from the sidebar to start messaging</p>
            </div>
          </div>
        )}
      </div>
      
      {/* Modals */}
      {showFileUpload && (
        <FileUpload
          onFileSelect={handleFileUpload}
          onCancel={() => setShowFileUpload(false)}
          disabled={sendingMessage}
        />
      )}
      
      {showNewConversation && (
        <NewConversationModal
          isOpen={showNewConversation}
          onClose={() => setShowNewConversation(false)}
        />
      )}
    </div>
  );
};

export default Messages;
