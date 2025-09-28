'use client';

import React from 'react';
import { formatDistanceToNow, isToday, isYesterday } from 'date-fns';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { Search, Plus, Users, User } from 'lucide-react';
import type { Conversation, User as UserType } from '@/lib/contexts/MessagingContext';

interface ConversationListProps {
  conversations: Conversation[];
  activeConversation: Conversation | null;
  searchQuery: string;
  onConversationSelect: (conversation: Conversation) => void;
  onSearchChange: (query: string) => void;
  onNewConversation: () => void;
  getConversationName: (conversation: Conversation) => string;
  currentUserId?: string;
}

export function ConversationList({
  conversations,
  activeConversation,
  searchQuery,
  onConversationSelect,
  onSearchChange,
  onNewConversation,
  getConversationName,
  currentUserId
}: ConversationListProps) {
  const formatLastMessageTime = (date: Date) => {
    const messageDate = new Date(date);
    
    if (isToday(messageDate)) {
      return messageDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    
    if (isYesterday(messageDate)) {
      return 'Yesterday';
    }
    
    return formatDistanceToNow(messageDate, { addSuffix: false });
  };

  const getConversationAvatar = (conversation: Conversation) => {
    if (conversation.type === 'direct') {
      const otherParticipant = conversation.participants.find(p => p.id !== currentUserId);
      return {
        src: otherParticipant?.photoURL,
        fallback: otherParticipant?.name?.charAt(0) || '?',
        isOnline: otherParticipant?.isOnline
      };
    }
    
    return {
      src: undefined,
      fallback: conversation.name?.charAt(0) || 'G',
      isOnline: false
    };
  };

  const filteredConversations = conversations.filter(conversation => {
    const name = getConversationName(conversation).toLowerCase();
    const lastMessage = conversation.lastMessage?.content?.toLowerCase() || '';
    const query = searchQuery.toLowerCase();
    
    return name.includes(query) || lastMessage.includes(query);
  });

  return (
    <div className="w-1/3 bg-dark-card/80 backdrop-blur-sm border-r border-dark-border flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-dark-border">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-semibold text-text-primary">Messages</h1>
          <Button
            onClick={onNewConversation}
            size="sm"
            variant="outline"
            className="bg-dark-surface border-dark-border hover:bg-dark-surface/80"
          >
            <Plus className="w-4 h-4" />
          </Button>
        </div>
        
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-text-tertiary" />
          <Input
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search conversations..."
            className="pl-10 bg-dark-surface border-dark-border text-text-primary placeholder:text-text-tertiary"
          />
        </div>
      </div>

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto">
        {filteredConversations.length === 0 ? (
          <div className="p-8 text-center">
            <div className="w-16 h-16 bg-dark-surface rounded-full flex items-center justify-center mx-auto mb-4">
              <Users className="w-8 h-8 text-text-tertiary" />
            </div>
            <h3 className="text-lg font-medium text-text-primary mb-2">
              {searchQuery ? 'No conversations found' : 'No conversations yet'}
            </h3>
            <p className="text-text-secondary text-sm">
              {searchQuery 
                ? 'Try different search terms'
                : 'Start collaborating on projects to begin messaging with team members.'
              }
            </p>
          </div>
        ) : (
          filteredConversations.map((conversation) => {
            const avatar = getConversationAvatar(conversation);
            const isActive = activeConversation?.id === conversation.id;
            
            return (
              <div
                key={conversation.id}
                onClick={() => onConversationSelect(conversation)}
                className={`p-4 border-b border-dark-border/50 cursor-pointer hover:bg-dark-surface/30 transition-all duration-200 ${
                  isActive ? 'bg-brand-primary/10 border-brand-primary/20 shadow-sm' : ''
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div className="relative flex-shrink-0">
                    {conversation.type === 'direct' ? (
                      <Avatar className="w-12 h-12">
                        <AvatarImage src={avatar.src} />
                        <AvatarFallback className="bg-dark-surface text-text-secondary">
                          {avatar.fallback}
                        </AvatarFallback>
                      </Avatar>
                    ) : (
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                        conversation.type === 'project_group'
                          ? 'bg-gradient-to-r from-brand-primary to-brand-secondary'
                          : 'bg-gradient-to-r from-purple-500 to-pink-500'
                      }`}>
                        {conversation.type === 'project_group' ? (
                          <Users className="w-6 h-6 text-white" />
                        ) : (
                          <Users className="w-6 h-6 text-white" />
                        )}
                      </div>
                    )}
                    
                    {/* Online indicator */}
                    {conversation.type === 'direct' && avatar.isOnline && (
                      <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-green-500 border-2 border-dark-card rounded-full"></div>
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm font-medium text-text-primary truncate">
                        {getConversationName(conversation)}
                      </p>
                      {conversation.lastMessage && (
                        <p className="text-xs text-text-muted flex-shrink-0 ml-2">
                          {formatLastMessageTime(conversation.lastMessage.timestamp)}
                        </p>
                      )}
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-text-secondary truncate flex-1 mr-2">
                        {conversation.lastMessage?.content || 'No messages yet'}
                      </p>
                      
                      {conversation.unreadCount > 0 && (
                        <Badge className="bg-brand-primary hover:bg-brand-primary text-white text-xs px-2 py-0.5 min-w-[20px] flex items-center justify-center">
                          {conversation.unreadCount > 99 ? '99+' : conversation.unreadCount}
                        </Badge>
                      )}
                    </div>
                    
                    {/* Project indicator */}
                    {conversation.type === 'project_group' && conversation.projectTitle && (
                      <div className="flex items-center mt-1">
                        <div className="w-2 h-2 bg-brand-primary rounded-full mr-2"></div>
                        <p className="text-xs text-text-tertiary truncate">
                          Project: {conversation.projectTitle}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Typing indicator */}
                {conversation.isTyping && conversation.isTyping.length > 0 && (
                  <div className="mt-2 text-xs text-brand-primary italic">
                    {conversation.isTyping.length === 1
                      ? `${conversation.participants.find(p => p.id === conversation.isTyping![0])?.name} is typing...`
                      : `${conversation.isTyping.length} people are typing...`
                    }
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
