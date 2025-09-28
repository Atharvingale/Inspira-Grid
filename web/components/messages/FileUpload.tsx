'use client';

import React, { useRef, useState } from 'react';
import Button from '@/components/ui/Button';
import { Paperclip, X, Upload, File, Image as ImageIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  onCancel: () => void;
  disabled?: boolean;
  acceptedTypes?: string[];
  maxSize?: number; // in bytes
}

export function FileUpload({ 
  onFileSelect, 
  onCancel, 
  disabled = false,
  acceptedTypes = ['image/*', 'application/*', 'text/*'],
  maxSize = 10 * 1024 * 1024 // 10MB
}: FileUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [error, setError] = useState<string>('');

  const handleFileSelect = (file: File) => {
    setError('');

    // Validate file size
    if (file.size > maxSize) {
      setError(`File size must be less than ${Math.round(maxSize / 1024 / 1024)}MB`);
      return;
    }

    // Validate file type
    const isValidType = acceptedTypes.some(type => {
      if (type.endsWith('/*')) {
        return file.type.startsWith(type.slice(0, -1));
      }
      return file.type === type;
    });

    if (!isValidType) {
      setError('Invalid file type. Please select an image or document.');
      return;
    }

    setSelectedFile(file);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    
    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleConfirm = () => {
    if (selectedFile) {
      onFileSelect(selectedFile);
      setSelectedFile(null);
    }
  };

  const handleCancel = () => {
    setSelectedFile(null);
    setError('');
    onCancel();
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
    return `${Math.round(bytes / 1024 / 1024)} MB`;
  };

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) {
      return <ImageIcon className="w-8 h-8 text-green-400" />;
    }
    return <File className="w-8 h-8 text-blue-400" />;
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
    >
      <motion.div
        initial={{ y: 20 }}
        animate={{ y: 0 }}
        className="bg-dark-card border border-dark-border rounded-2xl p-6 w-full max-w-md"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-text-primary">
            {selectedFile ? 'Confirm File Upload' : 'Upload File'}
          </h3>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleCancel}
            className="text-text-tertiary hover:text-text-primary"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        <AnimatePresence mode="wait">
          {!selectedFile ? (
            <motion.div
              key="upload"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              {/* Drop Zone */}
              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
                  dragOver
                    ? 'border-brand-primary bg-brand-primary/10'
                    : 'border-dark-border hover:border-brand-primary/50 hover:bg-dark-surface/30'
                }`}
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="w-12 h-12 text-text-tertiary mx-auto mb-4" />
                <p className="text-text-primary font-medium mb-2">
                  Click to upload or drag and drop
                </p>
                <p className="text-text-secondary text-sm">
                  Images, documents up to {Math.round(maxSize / 1024 / 1024)}MB
                </p>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept={acceptedTypes.join(',')}
                onChange={handleInputChange}
                className="hidden"
                disabled={disabled}
              />

              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg"
                >
                  <p className="text-red-400 text-sm">{error}</p>
                </motion.div>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="preview"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              {/* File Preview */}
              <div className="bg-dark-surface rounded-xl p-4 mb-6">
                <div className="flex items-center space-x-4">
                  {getFileIcon(selectedFile.type)}
                  <div className="flex-1 min-w-0">
                    <p className="text-text-primary font-medium truncate">
                      {selectedFile.name}
                    </p>
                    <p className="text-text-secondary text-sm">
                      {formatFileSize(selectedFile.size)}
                    </p>
                  </div>
                </div>

                {selectedFile.type.startsWith('image/') && (
                  <div className="mt-4">
                    <img
                      src={URL.createObjectURL(selectedFile)}
                      alt="Preview"
                      className="w-full h-32 object-cover rounded-lg"
                    />
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex space-x-3">
                <Button
                  onClick={handleCancel}
                  variant="secondary"
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleConfirm}
                  variant="primary"
                  className="flex-1"
                  disabled={disabled}
                >
                  <Paperclip className="w-4 h-4 mr-2" />
                  Send File
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}