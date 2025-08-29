import React, { useState, useRef } from 'react';

export default function ScreenshotAnalyzer({ onCodeExtracted, onAnalysisComplete }) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploadedImage, setUploadedImage] = useState(null);
  const [extractedCode, setExtractedCode] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);
  const canvasRef = useRef(null);

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileUpload(files[0]);
    }
  };

  const handleFileSelect = (e) => {
    const files = e.target.files;
    if (files.length > 0) {
      handleFileUpload(files[0]);
    }
  };

  const handleFileUpload = (file) => {
    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file');
      return;
    }

    setError('');
    const reader = new FileReader();
    reader.onload = (e) => {
      setUploadedImage(e.target.result);
      extractCodeFromImage(e.target.result);
    };
    reader.readAsDataURL(file);
  };

  const extractCodeFromImage = async (imageData) => {
    setIsAnalyzing(true);
    setError('');

    try {
      const response = await fetch('/api/screenshot-analyzer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image: imageData,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to analyze screenshot');
      }

      const data = await response.json();
      setExtractedCode(data.extractedCode);
      
      if (onCodeExtracted) {
        onCodeExtracted(data.extractedCode, data.language);
      }
      
      if (onAnalysisComplete) {
        onAnalysisComplete(data);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleRetake = () => {
    setUploadedImage(null);
    setExtractedCode('');
    setError('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(extractedCode);
      // Show success feedback
    } catch (err) {
      setError('Failed to copy code to clipboard');
    }
  };

  return (
    <div className="p-6 rounded-3xl bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-r from-green-500 to-emerald-600 flex items-center justify-center text-white text-2xl">
          📸
        </div>
        <div>
          <h3 className="text-xl font-bold text-slate-900 dark:text-white">Screenshot Analyzer</h3>
          <p className="text-slate-600 dark:text-slate-400 text-sm">
            Upload a screenshot of code to extract and analyze it
          </p>
        </div>
      </div>

      {/* Upload Area */}
      {!uploadedImage && (
        <div
          className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all duration-300 ${
            isDragging
              ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
              : 'border-slate-300 dark:border-slate-600 hover:border-blue-400'
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <div className="text-6xl mb-4">📸</div>
          <h4 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
            Upload Screenshot
          </h4>
          <p className="text-slate-600 dark:text-slate-400 mb-4">
            Drag and drop an image here, or click to select
          </p>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-6 py-3 rounded-2xl bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold hover:scale-105 transition-all duration-300"
          >
            Choose File
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>
      )}

      {/* Image Preview */}
      {uploadedImage && (
        <div className="space-y-4">
          <div className="relative">
            <img
              src={uploadedImage}
              alt="Uploaded screenshot"
              className="w-full rounded-2xl border border-slate-300 dark:border-slate-600"
            />
            <button
              onClick={handleRetake}
              className="absolute top-2 right-2 px-3 py-1 rounded-xl bg-red-500 text-white text-sm hover:bg-red-600 transition-colors"
            >
              ✕ Retake
            </button>
          </div>

          {/* Analysis Status */}
          {isAnalyzing && (
            <div className="flex items-center gap-3 p-4 rounded-2xl bg-blue-500/10 border border-blue-500/20">
              <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              <span className="text-blue-700 dark:text-blue-300">Analyzing screenshot...</span>
            </div>
          )}

          {/* Extracted Code */}
          {extractedCode && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-lg font-semibold text-slate-900 dark:text-white">
                  Extracted Code
                </h4>
                <button
                  onClick={handleCopyCode}
                  className="px-4 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 transition-colors"
                >
                  📋 Copy
                </button>
              </div>
              <div className="bg-slate-900 dark:bg-black rounded-lg overflow-hidden border border-slate-700 dark:border-slate-600">
                <div className="flex items-center justify-between px-4 py-2 bg-slate-800 dark:bg-slate-900 border-b border-slate-700 dark:border-slate-600">
                  <span className="text-xs text-slate-400 uppercase font-semibold tracking-wider">
                    Extracted Code
                  </span>
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-red-500"></div>
                    <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                    <div className="w-2 h-2 rounded-full bg-green-500"></div>
                  </div>
                </div>
                <div className="p-4 max-h-[300px] overflow-y-auto">
                  <pre className="text-sm text-slate-100 font-mono leading-relaxed whitespace-pre-wrap break-words">
                    <code>{extractedCode}</code>
                  </pre>
                </div>
              </div>
            </div>
          )}

          {/* Error Display */}
          {error && (
            <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20">
              <div className="text-red-700 dark:text-red-300 text-sm">{error}</div>
            </div>
          )}
        </div>
      )}

      {/* Instructions */}
      <div className="mt-6 p-4 rounded-2xl bg-slate-900/30 border border-slate-700/30">
        <h4 className="font-semibold text-slate-900 dark:text-white mb-2">Tips for Best Results:</h4>
        <ul className="text-sm text-slate-600 dark:text-slate-400 space-y-1">
          <li>• Ensure the code is clearly visible and well-lit</li>
          <li>• Use high-resolution screenshots for better accuracy</li>
          <li>• Make sure the code text is readable and not blurry</li>
          <li>• Crop the image to focus on the code area</li>
          <li>• Supported formats: PNG, JPG, JPEG, GIF</li>
        </ul>
      </div>
    </div>
  );
} 