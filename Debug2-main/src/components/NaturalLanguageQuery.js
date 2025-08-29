import React, { useState, useRef, useEffect } from 'react';

const SUGGESTED_QUERIES = [
  'Why is this loop slow?',
  'What does this function do?',
  'How can I optimize this code?',
  'Is there a memory leak here?',
  'What are the potential bugs?',
  'How does this algorithm work?',
  'Can this be written more efficiently?',
  'What are the edge cases?',
  'How do I fix this error?',
  'What\'s the time complexity?'
];

export default function NaturalLanguageQuery({ currentCode, onQueryResult }) {
  const [query, setQuery] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState('');
  const [recentQueries, setRecentQueries] = useState([]);
  const inputRef = useRef(null);

  useEffect(() => {
    // Load recent queries from localStorage
    const saved = localStorage.getItem('debug_recent_queries');
    if (saved) {
      try {
        setRecentQueries(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to load recent queries:', e);
      }
    }
  }, []);

  const saveRecentQuery = (newQuery) => {
    const updated = [newQuery, ...recentQueries.filter(q => q !== newQuery)].slice(0, 5);
    setRecentQueries(updated);
    localStorage.setItem('debug_recent_queries', JSON.stringify(updated));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!query.trim() || !currentCode.trim()) {
      setError('Please enter a question and ensure there is code to analyze');
      return;
    }

    setIsProcessing(true);
    setError('');
    setResults(null);

    try {
      const response = await fetch('/api/natural-language-query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: query.trim(),
          code: currentCode,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to process query');
      }

      const data = await response.json();
      setResults(data);
      saveRecentQuery(query.trim());
      
      if (onQueryResult) {
        onQueryResult(data);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSuggestedQuery = (suggestedQuery) => {
    setQuery(suggestedQuery);
    inputRef.current?.focus();
  };

  const handleRecentQuery = (recentQuery) => {
    setQuery(recentQuery);
    inputRef.current?.focus();
  };

  const clearRecentQueries = () => {
    setRecentQueries([]);
    localStorage.removeItem('debug_recent_queries');
  };

  return (
    <div className="p-6 rounded-3xl bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-r from-purple-500 to-indigo-600 flex items-center justify-center text-white text-2xl">
          💬
        </div>
        <div>
          <h3 className="text-xl font-bold text-slate-900 dark:text-white">Natural Language Query</h3>
          <p className="text-slate-600 dark:text-slate-400 text-sm">
            Ask questions about your code in plain English
          </p>
        </div>
      </div>

      {/* Query Input */}
      <form onSubmit={handleSubmit} className="mb-6">
        <div className="relative">
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ask a question about your code..."
            className="w-full px-4 py-3 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 text-slate-700 dark:text-slate-300 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all duration-300"
            disabled={isProcessing}
          />
          <button
            type="submit"
            disabled={isProcessing || !query.trim() || !currentCode.trim()}
            className="absolute right-2 top-2 px-4 py-1 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-semibold hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isProcessing ? '🤔' : '💬'}
          </button>
        </div>
      </form>

      {/* Processing Status */}
      {isProcessing && (
        <div className="flex items-center gap-3 p-4 rounded-2xl bg-purple-500/10 border border-purple-500/20 mb-4">
          <div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-purple-700 dark:text-purple-300">Analyzing your question...</span>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 mb-4">
          <div className="text-red-700 dark:text-red-300 text-sm">{error}</div>
        </div>
      )}

      {/* Results */}
      {results && (
        <div className="space-y-4 mb-6">
          <div className="flex items-center justify-between">
            <h4 className="text-lg font-semibold text-slate-900 dark:text-white">Answer</h4>
            <button
              onClick={() => setResults(null)}
              className="px-3 py-1 rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 transition-colors"
            >
              ✕ Clear
            </button>
          </div>
          
          <div className="p-4 rounded-2xl bg-gradient-to-r from-purple-50 to-indigo-50 dark:from-purple-900/20 dark:to-indigo-900/20 border border-purple-200 dark:border-purple-800">
            <div className="text-slate-700 dark:text-slate-300 leading-relaxed">
              {results.answer}
            </div>
            
            {results.codeSuggestion && (
              <div className="mt-4 p-3 rounded-xl bg-slate-900/50 border border-slate-700/50">
                <div className="text-sm text-slate-400 mb-2">Suggested Code:</div>
                <pre className="text-sm text-slate-200 font-mono whitespace-pre-wrap">
                  <code>{results.codeSuggestion}</code>
                </pre>
              </div>
            )}
            
            {results.explanation && (
              <div className="mt-4 p-3 rounded-xl bg-blue-500/10 border border-blue-500/20">
                <div className="text-sm text-blue-700 dark:text-blue-300">
                  <strong>Explanation:</strong> {results.explanation}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Suggested Queries */}
      <div className="mb-6">
        <h4 className="font-semibold text-slate-900 dark:text-white mb-3">Suggested Questions:</h4>
        <div className="flex flex-wrap gap-2">
          {SUGGESTED_QUERIES.map((suggestedQuery) => (
            <button
              key={suggestedQuery}
              onClick={() => handleSuggestedQuery(suggestedQuery)}
              className="px-3 py-2 rounded-xl bg-slate-900/30 border border-slate-700/30 text-slate-300 hover:bg-slate-800/50 transition-colors text-sm"
            >
              {suggestedQuery}
            </button>
          ))}
        </div>
      </div>

      {/* Recent Queries */}
      {recentQueries.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-semibold text-slate-900 dark:text-white">Recent Questions:</h4>
            <button
              onClick={clearRecentQueries}
              className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
            >
              Clear All
            </button>
          </div>
          <div className="space-y-2">
            {recentQueries.map((recentQuery, index) => (
              <button
                key={index}
                onClick={() => handleRecentQuery(recentQuery)}
                className="w-full text-left p-3 rounded-xl bg-slate-900/20 border border-slate-700/30 text-slate-300 hover:bg-slate-800/30 transition-colors text-sm"
              >
                {recentQuery}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Instructions */}
      <div className="mt-6 p-4 rounded-2xl bg-slate-900/30 border border-slate-700/30">
        <h4 className="font-semibold text-slate-900 dark:text-white mb-2">How to Ask Questions:</h4>
        <ul className="text-sm text-slate-600 dark:text-slate-400 space-y-1">
          <li>• Be specific about what you want to know</li>
          <li>• Ask about performance, bugs, or understanding</li>
          <li>• Use natural language - no need for technical jargon</li>
          <li>• Questions can be about specific lines or the entire code</li>
          <li>• You can ask for explanations, optimizations, or fixes</li>
        </ul>
      </div>
    </div>
  );
} 