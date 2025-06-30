// frontend/src/components/Common/FileUpload.tsx

import React, { useState, useCallback } from 'react';
import { Upload, FileText, Image, X, CheckCircle, AlertCircle } from 'lucide-react';

interface FileUploadProps {
  onUpload: (files: File[]) => Promise<void>;
  maxFiles?: number;
  acceptedTypes?: string[];
}

interface UploadedFile {
  file: File;
  id: string;
  status: 'pending' | 'uploading' | 'success' | 'error';
  progress: number;
  error?: string;
}

export const FileUpload: React.FC<FileUploadProps> = ({
  onUpload,
  maxFiles = 3,
  acceptedTypes = ['.pdf', '.jpg', '.jpeg', '.png', '.doc', '.docx']
}) => {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    handleFiles(files);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      handleFiles(files);
    }
  };

  const handleFiles = async (files: File[]) => {
    // Filter and validate files
    const validFiles = files.slice(0, maxFiles - uploadedFiles.length).filter(file => {
      const extension = '.' + file.name.split('.').pop()?.toLowerCase();
      return acceptedTypes.includes(extension);
    });

    if (validFiles.length === 0) {
      alert(`Please upload valid files: ${acceptedTypes.join(', ')}`);
      return;
    }

    // Create file objects
    const newFiles: UploadedFile[] = validFiles.map(file => ({
      file,
      id: Date.now().toString() + Math.random(),
      status: 'pending' as const,
      progress: 0
    }));

    setUploadedFiles(prev => [...prev, ...newFiles]);

    // Simulate upload with progress
    for (const uploadFile of newFiles) {
      await simulateUpload(uploadFile);
    }

    // Call parent upload handler
    try {
      await onUpload(validFiles);
      
      // Mark all as success
      setUploadedFiles(prev => 
        prev.map(f => 
          newFiles.find(nf => nf.id === f.id) 
            ? { ...f, status: 'success' as const, progress: 100 }
            : f
        )
      );
    } catch (error) {
      // Mark all as error
      setUploadedFiles(prev => 
        prev.map(f => 
          newFiles.find(nf => nf.id === f.id) 
            ? { ...f, status: 'error' as const, error: 'Upload failed' }
            : f
        )
      );
    }
  };

  const simulateUpload = async (uploadFile: UploadedFile) => {
    setUploadedFiles(prev => 
      prev.map(f => f.id === uploadFile.id ? { ...f, status: 'uploading' as const } : f)
    );

    // Simulate progress
    for (let i = 0; i <= 100; i += 20) {
      await new Promise(resolve => setTimeout(resolve, 200));
      setUploadedFiles(prev => 
        prev.map(f => f.id === uploadFile.id ? { ...f, progress: i } : f)
      );
    }
  };

  const removeFile = (id: string) => {
    setUploadedFiles(prev => prev.filter(f => f.id !== id));
  };

  const getFileIcon = (filename: string) => {
    const extension = filename.split('.').pop()?.toLowerCase();
    if (['jpg', 'jpeg', 'png', 'gif'].includes(extension || '')) {
      return <Image size={20} />;
    }
    return <FileText size={20} />;
  };

  const getFileTypeLabel = (filename: string) => {
    const lower = filename.toLowerCase();
    if (lower.includes('deed')) return 'Deed';
    if (lower.includes('mls')) return 'MLS';
    if (lower.includes('inspection')) return 'Inspection';
    if (lower.match(/\.(jpg|jpeg|png|gif)$/)) return 'Photo';
    return 'Document';
  };

  return (
    <div className="w-full">
      {/* Drop Zone */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
          isDragging 
            ? 'border-blue-500 bg-blue-50' 
            : 'border-gray-300 hover:border-gray-400'
        } ${uploadedFiles.length >= maxFiles ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
      >
        <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <p className="text-lg font-medium mb-2">
          {isDragging ? 'Drop files here' : 'Drag and drop files here'}
        </p>
        <p className="text-sm text-gray-500 mb-4">
          or <label className="text-blue-600 hover:text-blue-700 cursor-pointer">
            browse files
            <input
              type="file"
              multiple
              accept={acceptedTypes.join(',')}
              onChange={handleFileSelect}
              className="hidden"
              disabled={uploadedFiles.length >= maxFiles}
            />
          </label>
        </p>
        <p className="text-xs text-gray-400">
          Maximum {maxFiles} files • Supported: {acceptedTypes.join(', ')}
        </p>
      </div>

      {/* Uploaded Files */}
      {uploadedFiles.length > 0 && (
        <div className="mt-4 space-y-2">
          {uploadedFiles.map(uploadFile => (
            <div
              key={uploadFile.id}
              className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
            >
              <div className="flex-shrink-0">
                {getFileIcon(uploadFile.file.name)}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium truncate">
                    {uploadFile.file.name}
                  </p>
                  <span className="text-xs px-2 py-0.5 bg-gray-200 rounded">
                    {getFileTypeLabel(uploadFile.file.name)}
                  </span>
                </div>
                <p className="text-xs text-gray-500">
                  {(uploadFile.file.size / 1024 / 1024).toFixed(2)} MB
                </p>
                
                {/* Progress Bar */}
                {uploadFile.status === 'uploading' && (
                  <div className="mt-1 w-full bg-gray-200 rounded-full h-1">
                    <div
                      className="bg-blue-600 h-1 rounded-full transition-all duration-300"
                      style={{ width: `${uploadFile.progress}%` }}
                    />
                  </div>
                )}
              </div>

              <div className="flex-shrink-0">
                {uploadFile.status === 'success' && (
                  <CheckCircle className="w-5 h-5 text-green-600" />
                )}
                {uploadFile.status === 'error' && (
                  <AlertCircle className="w-5 h-5 text-red-600" />
                )}
                {uploadFile.status === 'pending' && (
                  <div className="w-5 h-5 rounded-full border-2 border-gray-300" />
                )}
                {uploadFile.status === 'uploading' && (
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-blue-600 border-t-transparent" />
                )}
              </div>

              <button
                onClick={() => removeFile(uploadFile.id)}
                className="p-1 hover:bg-gray-200 rounded"
              >
                <X size={16} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Progress Ripple Effect */}
      {uploadedFiles.some(f => f.status === 'uploading') && (
        <div className="mt-4 flex items-center justify-center">
          <div className="relative">
            <div className="w-3 h-3 bg-blue-600 rounded-full animate-ping absolute"></div>
            <div className="w-3 h-3 bg-blue-600 rounded-full"></div>
          </div>
          <span className="ml-3 text-sm text-gray-600">Processing documents...</span>
        </div>
      )}
    </div>
  );
};