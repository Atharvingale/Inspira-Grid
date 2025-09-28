'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Send,
  Paperclip,
  Smile,
  MoreVertical,
  Reply,
  Heart,
  ThumbsUp,
  Laugh,
  Search,
  Filter,
  Phone,
  Video,
  Info,
  Hash,
  Users,
  Pin,
  Archive,
  Bell,
  BellOff,
  MessageCircle,
  Image,
  File,
  Mic,
  X,
  Edit3,
  Trash2,
  Copy,
  Forward
} from 'lucide-react';
import { useMessaging } from '@/lib/hooks/useMessaging';
import { 
  Conversation, 
  EnhancedMessage, 
  MessageReaction,
  TypingIndicator as TypingIndicatorType 
} from '@/lib/types/messaging';
import { User } from '@/lib/types/collaboration';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import Textarea from '@/components/ui/Textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

interface MessagingInterfaceProps {
  currentUserId: string;
  projectId: string;
  className?: string;
}

// Emoji picker component
const emojis = ['👍', '❤️', '😂', '😮', '😢', '😡', '🔥', '👏', '🎉', '💯'];

function EmojiPicker({ 
  onEmojiSelect, 
  className 
}: { 
  onEmojiSelect: (emoji: string) => void;
  className?: string;
}) {
  return (
    <div className={cn('grid grid-cols-5 gap-2 p-2', className)}>
      {emojis.map(emoji => (
        <button
          key={emoji}
          onClick={() => onEmojiSelect(emoji)}
          className="p-2 hover:bg-dark-surface/50 dark:hover:bg-dark-surface/50 rounded transition-colors text-lg"
        >
          {emoji}
        </button>
      ))}
    </div>
  );
}

// Message component
function MessageItem({ 
  message, 
  currentUserId, 
  onReaction, 
  onReply, 
  onEdit, 
  onDelete,
  showThread = false
}: {
  message: EnhancedMessage;
  currentUserId: string;
  onReaction: (messageId: string, emoji: string) => void;
  onReply: (message: EnhancedMessage) => void;
  onEdit: (message: EnhancedMessage) => void;
  onDelete: (messageId: string) => void;
  showThread?: boolean;
}) {
  const [showActions, setShowActions] = useState(false);
  const isCurrentUser = message.senderId === currentUserId;
  const [expandedImage, setExpandedImage] = useState<string | null>(null);

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const groupedReactions = (message.reactions || []).reduce((acc, reaction) => {
    const key = reaction.emoji;
    if (!acc[key]) {
      acc[key] = { emoji: key, count: reaction.count, users: reaction.users };
    }
    return acc;
  }, {} as Record<string, { emoji: string; count: number; users: Array<{ id: string; name: string; avatar?: string }> }>);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'flex gap-3 p-3 hover:bg-dark-surface/30 dark:hover:bg-dark-surface/50/50 transition-colors group',
        isCurrentUser && 'flex-row-reverse'
      )}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      {/* Avatar */}
      <Avatar className="w-8 h-8 mt-1 flex-shrink-0">
        <AvatarImage src={message.senderAvatar} />
        <AvatarFallback>
          {message.senderName.charAt(0).toUpperCase()}
        </AvatarFallback>
      </Avatar>

      <div className={cn('flex-1 min-w-0', isCurrentUser && 'flex flex-col items-end')}>
        {/* Header */}
        <div className={cn('flex items-center gap-2 mb-1', isCurrentUser && 'flex-row-reverse')}>
          <span className="font-medium text-sm text-text-primary dark:text-white">
            {message.senderName}
          </span>
          <span className="text-xs text-text-tertiary dark:text-text-tertiary">
            {formatTime(message.createdAt)}
          </span>
          {message.metadata?.edited && (
            <span className="text-xs text-text-tertiary dark:text-text-tertiary">(edited)</span>
          )}
        </div>

        {/* Message content */}
        <div className={cn(
          'relative rounded-lg px-3 py-2 max-w-md',
          isCurrentUser 
            ? 'bg-brand-primary text-white' 
            : 'bg-dark-surface/50 dark:bg-dark-surface/50 text-text-primary dark:text-white',
          message.parentMessageId && 'border-l-4 border-dark-border dark:border-gray-600 pl-4'
        )}>
          {/* Reply preview */}
          {message.parentMessageId && (
            <div className="mb-2 p-2 bg-dark-surface/30 dark:bg-dark-surface/50 rounded text-sm opacity-75">
              <div className="font-medium">Replying to {message.senderName}</div>
              <div className="truncate">Original message...</div>
            </div>
          )}

          {/* Text content */}
          <div className="break-words whitespace-pre-wrap">
            {message.content}
          </div>

          {/* Media attachments */}
          {message.attachments && message.attachments.length > 0 && (
            <div className="mt-2 space-y-2">
              {message.attachments.map(media => (
                <div key={media.id} className="relative">
                  {media.mimeType.startsWith('image/') ? (
                    <img
                      src={media.fileUrl}
                      alt={media.fileName}
                      className="max-w-full rounded cursor-pointer hover:opacity-90 transition-opacity"
                      style={{ maxHeight: '300px' }}
                      onClick={() => setExpandedImage(media.fileUrl)}
                    />
                  ) : media.mimeType.startsWith('video/') ? (
                    <video
                      src={media.fileUrl}
                      controls
                      className="max-w-full rounded"
                      style={{ maxHeight: '300px' }}
                    />
                  ) : (
                    <div className="flex items-center gap-2 p-2 bg-white/5 rounded">
                      <File className="w-4 h-4" />
                      <span className="text-sm">{media.fileName}</span>
                      <span className="text-xs opacity-75">
                        {(media.fileSize / 1024 / 1024).toFixed(1)} MB
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Thread indicator */}
          {message.replyCount && message.replyCount > 0 && showThread && (
            <button
              className={cn(
                'mt-2 text-xs flex items-center gap-1 opacity-75 hover:opacity-100',
                isCurrentUser ? 'text-white' : 'text-brand-primary dark:text-brand-primary'
              )}
            >
              <MessageCircle className="w-3 h-3" />
              {message.replyCount} replies
            </button>
          )}
        </div>

        {/* Reactions */}
        {Object.keys(groupedReactions).length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {Object.values(groupedReactions).map(reaction => (
              <button
                key={reaction.emoji}
                onClick={() => onReaction(message.id, reaction.emoji)}
                className={cn(
                  'flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-dark-surface/50 dark:bg-dark-surface/50 hover:bg-dark-surface/50 dark:hover:bg-dark-surface/50 transition-colors',
                  reaction.users.some(user => user.id === currentUserId) && 
                  'bg-brand-primary dark:bg-brand-primary text-brand-primary dark:text-brand-primary'
                )}
                title={reaction.users.map(u => u.name).join(', ')}
              >
                <span>{reaction.emoji}</span>
                <span>{reaction.count}</span>
              </button>
            ))}
          </div>
        )}

        {/* Quick actions */}
        <AnimatePresence>
          {showActions && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className={cn(
                'flex items-center gap-1 mt-2',
                isCurrentUser && 'flex-row-reverse'
              )}
            >
              <Popover>
                <PopoverTrigger className="h-6 w-6 p-0 hover:bg-gray-100">
                  <Smile className="w-3 h-3" />
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <EmojiPicker 
                    onEmojiSelect={(emoji) => onReaction(message.id, emoji)} 
                  />
                </PopoverContent>
              </Popover>

              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
                onClick={() => onReply(message)}
              >
                <Reply className="w-3 h-3" />
              </Button>

              {isCurrentUser && (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    onClick={() => onEdit(message)}
                  >
                    <Edit3 className="w-3 h-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0 text-red-600"
                    onClick={() => onDelete(message.id)}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Expanded image modal */}
      <AnimatePresence>
        {expandedImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 flex items-center justify-center z-50"
            onClick={() => setExpandedImage(null)}
          >
            <motion.img
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.8 }}
              src={expandedImage}
              className="max-w-full max-h-full rounded"
              onClick={(e) => e.stopPropagation()}
            />
            <Button
              variant="ghost"
              size="sm"
              className="absolute top-4 right-4 text-white hover:bg-white/5"
              onClick={() => setExpandedImage(null)}
            >
              <X className="w-4 h-4" />
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// Typing indicator component
function TypingIndicator({ typingUsers }: { typingUsers: TypingIndicatorType[] }) {
  if (typingUsers.length === 0) return null;

  const names = typingUsers.map(t => t.userName);
  const text = names.length === 1 
    ? `${names[0]} is typing...`
    : names.length === 2
    ? `${names[0]} and ${names[1]} are typing...`
    : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]} are typing...`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      className="flex items-center gap-2 px-4 py-2 text-sm text-text-tertiary dark:text-text-tertiary"
    >
      <div className="flex gap-1">
        {[0, 1, 2].map(i => (
          <motion.div
            key={i}
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.5, 1, 0.5]
            }}
            transition={{
              duration: 1.4,
              repeat: Infinity,
              delay: i * 0.2
            }}
            className="w-2 h-2 bg-dark-surface/50 rounded-full"
          />
        ))}
      </div>
      <span>{text}</span>
    </motion.div>
  );
}

// Message input component
function MessageInput({
  onSendMessage,
  onTyping,
  placeholder = "Type a message...",
  replyTo,
  onCancelReply,
  disabled = false
}: {
  onSendMessage: (content: string, media?: File[]) => void;
  onTyping: (isTyping: boolean) => void;
  placeholder?: string;
  replyTo?: EnhancedMessage | null;
  onCancelReply?: () => void;
  disabled?: boolean;
}) {
  const [content, setContent] = useState('');
  const [attachments, setAttachments] = useState<File[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();

  const handleContentChange = (value: string) => {
    setContent(value);
    
    // Typing indicator
    onTyping(value.length > 0);
    
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    typingTimeoutRef.current = setTimeout(() => {
      onTyping(false);
    }, 2000);
  };

  const handleSend = () => {
    if (content.trim() || attachments.length > 0) {
      onSendMessage(content.trim(), attachments);
      setContent('');
      setAttachments([]);
      onTyping(false);
      
      if (textareaRef.current) {
        textareaRef.current.focus();
      }
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setAttachments(prev => [...prev, ...files]);
  };

  const removeAttachment = (index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="border-t border-dark-border/50 dark:border-gray-700 p-4">
      {/* Reply preview */}
      {replyTo && (
        <div className="mb-3 p-3 bg-dark-surface/30 dark:bg-dark-surface/50 rounded-lg flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-text-primary dark:text-white mb-1">
              Replying to {replyTo.senderName}
            </div>
            <div className="text-sm text-text-secondary dark:text-text-tertiary truncate">
              {replyTo.content}
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 ml-2"
            onClick={onCancelReply}
          >
            <X className="w-3 h-3" />
          </Button>
        </div>
      )}

      {/* Attachments preview */}
      {attachments.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-2">
          {attachments.map((file, index) => (
            <div
              key={index}
              className="flex items-center gap-2 bg-dark-surface/50 dark:bg-dark-surface/50 rounded-lg px-3 py-2"
            >
              {file.type.startsWith('image/') ? (
                <Image className="w-4 h-4" />
              ) : (
                <File className="w-4 h-4" />
              )}
              <span className="text-sm truncate max-w-32">{file.name}</span>
              <Button
                variant="ghost"
                size="sm"
                className="h-4 w-4 p-0"
                onClick={() => removeAttachment(index)}
              >
                <X className="w-3 h-3" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Input area */}
      <div className="flex items-end gap-3">
        {/* File attachment */}
        <div className="flex-shrink-0">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*,video/*,.pdf,.doc,.docx,.txt"
            className="hidden"
            onChange={handleFileSelect}
          />
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled}
          >
            <Paperclip className="w-4 h-4" />
          </Button>
        </div>

        {/* Text input */}
        <div className="flex-1">
          <Textarea
            ref={textareaRef}
            value={content}
            onChange={(e) => handleContentChange(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder={placeholder}
            disabled={disabled}
            className="min-h-[40px] max-h-32 resize-none"
          />
        </div>

        {/* Send button */}
        <div className="flex-shrink-0">
          <Button
            onClick={handleSend}
            disabled={disabled || (!content.trim() && attachments.length === 0)}
            size="sm"
            className="h-8 w-8 p-0"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

// Main messaging interface
export default function MessagingInterface({
  currentUserId,
  projectId,
  className
}: MessagingInterfaceProps) {
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [replyTo, setReplyTo] = useState<EnhancedMessage | null>(null);
  const [editingMessage, setEditingMessage] = useState<EnhancedMessage | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  const {
    conversations,
    messages,
    typingUsers,
    loading,
    actions
  } = useMessaging();

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollAreaRef.current && messages.length > 0) {
      scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = async (content: string, media?: File[]) => {
    if (!selectedConversation) return;

    await actions.sendMessage({
      conversationId: selectedConversation,
      content,
      attachments: media || [],
      replyToMessageId: replyTo?.id
    });

    setReplyTo(null);
  };

  const handleReaction = async (messageId: string, emoji: string) => {
    await actions.addReaction(messageId, emoji);
  };

  const handleDeleteMessage = async (messageId: string) => {
    // TODO: Implement message deletion when the action is available
    console.log('Delete message:', messageId);
  };

  const filteredConversations = conversations.filter((conv: any) =>
    conv.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    conv.participants.some((p: any) => 
      p.userName.toLowerCase().includes(searchQuery.toLowerCase())
    )
  );

  return (
    <div className={cn('flex h-full bg-dark-card/80 dark:bg-dark-surface/50', className)}>
      {/* Conversations sidebar */}
      <div className="w-80 border-r border-dark-border/50 dark:border-gray-700 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-dark-border/50 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-lg text-text-primary dark:text-white">
              Messages
            </h2>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <MoreVertical className="w-4 h-4" />
            </Button>
          </div>
          
          {/* Search */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-text-tertiary" />
            <Input
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Conversations list */}
        <ScrollArea className="flex-1">
          {filteredConversations.map((conversation: any) => (
            <button
              key={conversation.id}
              onClick={() => setSelectedConversation(conversation.id)}
              className={cn(
                'w-full flex items-start gap-3 p-4 hover:bg-dark-surface/30 dark:hover:bg-dark-surface/50 transition-colors text-left',
                selectedConversation === conversation.id && 'bg-brand-primary dark:bg-brand-primary/20'
              )}
            >
              <div className="relative flex-shrink-0">
                {conversation.isGroup ? (
                  <div className="w-10 h-10 bg-dark-surface/50 dark:bg-dark-surface/50 rounded-full flex items-center justify-center">
                    <Hash className="w-5 h-5" />
                  </div>
                ) : (
                  <Avatar className="w-10 h-10">
                    <AvatarImage src={conversation.participants[0]?.avatar} />
                    <AvatarFallback>
                      {conversation.participants[0]?.name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                )}
                {conversation.unreadCount > 0 && (
                  <Badge className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs">
                    {conversation.unreadCount}
                  </Badge>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="font-medium text-sm text-text-primary dark:text-white truncate">
                    {conversation.name}
                  </h3>
                  <span className="text-xs text-text-tertiary dark:text-text-tertiary">
                    {conversation.lastMessage && 
                      new Date(conversation.lastMessage.timestamp).toLocaleDateString()
                    }
                  </span>
                </div>
                
                {conversation.lastMessage && (
                  <p className="text-sm text-text-secondary dark:text-text-tertiary truncate">
                    <span className="font-medium">
                      {conversation.lastMessage.sender.name}:
                    </span>{' '}
                    {conversation.lastMessage.content || 'Media message'}
                  </p>
                )}

                <div className="flex items-center justify-between mt-2">
                  <div className="flex items-center gap-1">
                    {conversation.isGroup && (
                      <Users className="w-3 h-3 text-text-tertiary" />
                    )}
                    {conversation.isPinned && (
                      <Pin className="w-3 h-3 text-brand-primary" />
                    )}
                    {conversation.isMuted && (
                      <BellOff className="w-3 h-3 text-text-tertiary" />
                    )}
                  </div>
                  
                  <div className="text-xs text-text-tertiary">
                    {conversation.participants.length} members
                  </div>
                </div>
              </div>
            </button>
          ))}
        </ScrollArea>
      </div>

      {/* Chat area */}
      <div className="flex-1 flex flex-col">
        {selectedConversation ? (
          <>
            {/* Chat header */}
            <div className="p-4 border-b border-dark-border/50 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Avatar className="w-8 h-8">
                    <AvatarImage src={conversations.find((c: any) => c.id === selectedConversation)?.participants[0]?.userAvatar} />
                    <AvatarFallback>
                      {conversations.find((c: any) => c.id === selectedConversation)?.name?.charAt(0).toUpperCase() || 'C'}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="font-medium text-text-primary dark:text-white">
                      {conversations.find((c: any) => c.id === selectedConversation)?.name}
                    </h3>
                    <p className="text-sm text-text-tertiary dark:text-text-tertiary">
                      {conversations.find((c: any) => c.id === selectedConversation)?.participants.length} members
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <Phone className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <Video className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <Info className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Messages */}
            <ScrollArea ref={scrollAreaRef} className="flex-1">
              <div className="space-y-1">
                {messages.map((message: any) => (
                  <MessageItem
                    key={message.id}
                    message={message}
                    currentUserId={currentUserId}
                    onReaction={handleReaction}
                    onReply={setReplyTo}
                    onEdit={setEditingMessage}
                    onDelete={handleDeleteMessage}
                    showThread={true}
                  />
                ))}
              </div>
              
              {/* Typing indicator */}
              <AnimatePresence>
                <TypingIndicator typingUsers={typingUsers} />
              </AnimatePresence>
            </ScrollArea>

            {/* Message input */}
            <MessageInput
              onSendMessage={handleSendMessage}
              onTyping={(isTyping) => isTyping ? actions.startTyping(selectedConversation!) : actions.stopTyping(selectedConversation!)}
              replyTo={replyTo}
              onCancelReply={() => setReplyTo(null)}
              disabled={loading.sending}
            />
          </>
        ) : (
          // No conversation selected
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <MessageCircle className="w-16 h-16 mx-auto mb-4 text-text-tertiary" />
              <h3 className="text-lg font-medium text-text-primary dark:text-white mb-2">
                Select a conversation
              </h3>
              <p className="text-text-tertiary dark:text-text-tertiary">
                Choose a conversation from the sidebar to start messaging
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}