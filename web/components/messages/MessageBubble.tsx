'use client';

import React from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import type { Message, MessageReaction } from '@/lib/contexts/MessagingContext';

interface MessageBubbleProps {
  message: Message;
  isCurrentUser: boolean;
  showAvatar?: boolean;
  onAddReaction?: (emoji: string) => void;
  onRemoveReaction?: (emoji: string) => void;
}

export function MessageBubble({
  message,
  isCurrentUser,
  showAvatar = true,
  onAddReaction,
  onRemoveReaction
}: MessageBubbleProps) {
  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'} group`}>
      {!isCurrentUser && showAvatar && (
        <Avatar className="w-8 h-8 mr-2 mt-1">
          <AvatarImage src={message.senderPhoto} />
          <AvatarFallback className="bg-dark-surface text-text-secondary text-xs">
            {message.senderName.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
      )}
      
      <div className={`max-w-xs lg:max-w-md ${isCurrentUser ? 'ml-auto' : ''}`}>
        {!isCurrentUser && (
          <p className="text-xs text-text-tertiary mb-1 px-1">{message.senderName}</p>
        )}
        
        <div
          className={`relative px-4 py-3 rounded-2xl ${
            isCurrentUser
              ? 'bg-gradient-to-r from-brand-primary to-brand-secondary text-white rounded-br-md'
              : 'bg-dark-card/80 backdrop-blur-sm border border-dark-border text-text-primary rounded-bl-md'
          }`}
        >
          {message.replyTo && (
            <div className="mb-2 p-2 bg-black/20 rounded-lg border-l-2 border-current opacity-60">
              <p className="text-xs">Replying to message...</p>
            </div>
          )}
          
          <div className="flex items-end space-x-2">
            <div className="flex-1">
              {message.type === 'text' && (
                <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
              )}
              
              {message.type === 'image' && (
                <div className="space-y-2">
                  <img 
                    src={message.fileUrl} 
                    alt="Shared image"
                    className="max-w-full h-auto rounded-lg"
                  />
                  {message.content && (
                    <p className="text-sm">{message.content}</p>
                  )}
                </div>
              )}
              
              {message.type === 'file' && (
                <div className="flex items-center space-x-3 p-2 bg-black/10 rounded-lg">
                  <div className="w-10 h-10 bg-current/20 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{message.fileName}</p>
                    <p className="text-xs opacity-60">
                      {message.fileSize ? `${(message.fileSize / 1024 / 1024).toFixed(1)} MB` : 'Unknown size'}
                    </p>
                  </div>
                </div>
              )}
            </div>
            
            <div className="flex flex-col items-end space-y-1">
              <p
                className={`text-xs ${
                  isCurrentUser ? 'text-white/70' : 'text-text-muted'
                }`}
              >
                {formatTime(message.timestamp)}
              </p>
              
              {message.edited && (
                <p
                  className={`text-xs italic ${
                    isCurrentUser ? 'text-white/50' : 'text-text-muted'
                  }`}
                >
                  edited
                </p>
              )}
            </div>
          </div>
        </div>
        
        {/* Reactions */}
        {message.reactions && message.reactions.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1 px-1">
            {message.reactions.map((reaction) => (
              <Badge
                key={reaction.emoji}
                variant="secondary"
                className="px-2 py-1 text-xs bg-dark-surface hover:bg-dark-surface/80 cursor-pointer"
                onClick={() => onRemoveReaction?.(reaction.emoji)}
              >
                {reaction.emoji} {reaction.count}
              </Badge>
            ))}
          </div>
        )}
        
        {/* Quick reactions on hover */}
        <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-6 right-0 bg-dark-card border border-dark-border rounded-full px-2 py-1 shadow-lg">
          <div className="flex space-x-1">
            {['👍', '❤️', '😂', '😮', '😢', '😡'].map((emoji) => (
              <button
                key={emoji}
                onClick={() => onAddReaction?.(emoji)}
                className="hover:bg-dark-surface rounded p-1 text-sm transition-colors"
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      </div>
      
      {isCurrentUser && showAvatar && (
        <Avatar className="w-8 h-8 ml-2 mt-1">
          <AvatarImage src={message.senderPhoto} />
          <AvatarFallback className="bg-brand-primary text-white text-xs">
            {message.senderName.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
      )}
    </div>
  );
}