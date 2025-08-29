import React, { useState, useEffect } from 'react';

export default function PredictiveDebugger({ currentCode, language, onPredictions }) {
  const [predictions, setPredictions] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState('');
  const [autoAnalyze, setAutoAnalyze] = useState(true);
  const [riskLevel, setRiskLevel] = useState('medium');

  useEffect(() => {
    if (autoAnalyze && currentCode.trim()) {
      const timeoutId = setTimeout(() => {
        analyzePredictions();
      }, 2000); // Debounce for 2 seconds

      return () => clearTimeout(timeoutId);
    }
  }, [currentCode, autoAnalyze]);

  const analyzePredictions = async () => {
    if (!currentCode.trim()) return;

    setIsAnalyzing(true);
    setError('');

    try {
      const response = await fetch('/api/predictive-debugger', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code: currentCode,
          language,
          riskLevel,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to analyze predictions');
      }

      const data = await response.json();
      setPredictions(data);
      
      if (onPredictions) {
        onPredictions(data);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getRiskColor = (level) => {
    switch (level) {
      case 'low': return 'text-green-600 dark:text-green-400';
      case 'medium': return 'text-yellow-600 dark:text-yellow-400';
      case 'high': return 'text-red-600 dark:text-red-400';
      default: return 'text-slate-600 dark:text-slate-400';
    }
  };

  const getRiskBgColor = (level) => {
    switch (level) {
      case 'low': return 'bg-green-500/10 border-green-500/20';
      case 'medium': return 'bg-yellow-500/10 border-yellow-500/20';
      case 'high': return 'bg-red-500/10 border-red-500/20';
      default: return 'bg-slate-500/10 border-slate-500/20';
    }
  };

  return (
    <div className="p-6 rounded-3xl bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-r from-orange-500 to-red-600 flex items-center justify-center text-white text-2xl">
            🔮
          </div>
          <div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white">Predictive Debugger</h3>
            <p className="text-slate-600 dark:text-slate-400 text-sm">
              Anticipate and prevent bugs before they occur
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={autoAnalyze}
              onChange={(e) => setAutoAnalyze(e.target.checked)}
              className="rounded"
            />
            Auto-analyze
          </label>
          <select
            value={riskLevel}
            onChange={(e) => setRiskLevel(e.target.value)}
            className="px-3 py-1 rounded-xl bg-white/10 backdrop-blur-md border border-white/20 text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-orange-500/50 transition-all duration-300 text-sm"
          >
            <option value="low">Low Risk</option>
            <option value="medium">Medium Risk</option>
            <option value="high">High Risk</option>
          </select>
        </div>
      </div>

      {/* Manual Analysis Button */}
      {!autoAnalyze && (
        <button
          onClick={analyzePredictions}
          disabled={isAnalyzing || !currentCode.trim()}
          className="w-full mb-6 px-6 py-3 rounded-2xl bg-gradient-to-r from-orange-500 to-red-600 text-white font-bold shadow-lg hover:shadow-orange-500/25 transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isAnalyzing ? (
            <div className="flex items-center gap-3">
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              <span>Analyzing...</span>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <span>🔮</span>
              <span>Analyze Predictions</span>
            </div>
          )}
        </button>
      )}

      {/* Processing Status */}
      {isAnalyzing && autoAnalyze && (
        <div className="flex items-center gap-3 p-4 rounded-2xl bg-orange-500/10 border border-orange-500/20 mb-4">
          <div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-orange-700 dark:text-orange-300">Analyzing for potential issues...</span>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 mb-4">
          <div className="text-red-700 dark:text-red-300 text-sm">{error}</div>
        </div>
      )}

      {/* Predictions */}
      {predictions && (
        <div className="space-y-4">
          {/* Overall Risk Assessment */}
          <div className={`p-4 rounded-2xl border-2 ${getRiskBgColor(predictions.overallRisk)}`}>
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-semibold text-slate-900 dark:text-white">Overall Risk Assessment</h4>
              <span className={`px-3 py-1 rounded-full text-sm font-semibold ${getRiskColor(predictions.overallRisk)}`}>
                {predictions.overallRisk.toUpperCase()}
              </span>
            </div>
            <p className="text-slate-700 dark:text-slate-300 text-sm">
              {predictions.riskSummary}
            </p>
          </div>

          {/* Potential Issues */}
          {predictions.potentialIssues && predictions.potentialIssues.length > 0 && (
            <div>
              <h4 className="font-semibold text-slate-900 dark:text-white mb-3">Potential Issues:</h4>
              <div className="space-y-3">
                {predictions.potentialIssues.map((issue, index) => (
                  <div key={index} className="p-4 rounded-2xl bg-slate-900/30 border border-slate-700/30">
                    <div className="flex items-start gap-3">
                      <div className={`w-3 h-3 rounded-full mt-2 ${
                        issue.severity === 'high' ? 'bg-red-500' :
                        issue.severity === 'medium' ? 'bg-yellow-500' : 'bg-green-500'
                      }`}></div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="font-semibold text-slate-900 dark:text-white">
                            {issue.title}
                          </span>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            issue.severity === 'high' ? 'bg-red-500/20 text-red-600 dark:text-red-400' :
                            issue.severity === 'medium' ? 'bg-yellow-500/20 text-yellow-600 dark:text-yellow-400' :
                            'bg-green-500/20 text-green-600 dark:text-green-400'
                          }`}>
                            {issue.severity}
                          </span>
                        </div>
                        <p className="text-slate-600 dark:text-slate-400 text-sm mb-2">
                          {issue.description}
                        </p>
                        {issue.lineNumber && (
                          <div className="text-xs text-slate-500 dark:text-slate-500">
                            Line: {issue.lineNumber}
                          </div>
                        )}
                        {issue.suggestion && (
                          <div className="mt-2 p-2 rounded-xl bg-blue-500/10 border border-blue-500/20">
                            <div className="text-xs text-blue-700 dark:text-blue-300 font-semibold mb-1">
                              Suggestion:
                            </div>
                            <div className="text-xs text-blue-600 dark:text-blue-400">
                              {issue.suggestion}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Performance Predictions */}
          {predictions.performancePredictions && (
            <div>
              <h4 className="font-semibold text-slate-900 dark:text-white mb-3">Performance Predictions:</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {predictions.performancePredictions.map((prediction, index) => (
                  <div key={index} className="p-3 rounded-xl bg-slate-900/30 border border-slate-700/30">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-lg">⚡</span>
                      <span className="font-semibold text-slate-900 dark:text-white text-sm">
                        {prediction.metric}
                      </span>
                    </div>
                    <div className="text-sm text-slate-600 dark:text-slate-400">
                      {prediction.description}
                    </div>
                    {prediction.impact && (
                      <div className="mt-2 text-xs text-slate-500 dark:text-slate-500">
                        Impact: {prediction.impact}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recommendations */}
          {predictions.recommendations && predictions.recommendations.length > 0 && (
            <div>
              <h4 className="font-semibold text-slate-900 dark:text-white mb-3">Recommendations:</h4>
              <div className="space-y-2">
                {predictions.recommendations.map((recommendation, index) => (
                  <div key={index} className="flex items-start gap-3 p-3 rounded-xl bg-green-500/10 border border-green-500/20">
                    <span className="text-green-600 dark:text-green-400 mt-1">✓</span>
                    <div className="text-sm text-slate-700 dark:text-slate-300">
                      {recommendation}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Code Suggestions */}
          {predictions.codeSuggestions && predictions.codeSuggestions.length > 0 && (
            <div>
              <h4 className="font-semibold text-slate-900 dark:text-white mb-3">Code Improvements:</h4>
              <div className="space-y-3">
                {predictions.codeSuggestions.map((suggestion, index) => (
                  <div key={index} className="p-3 rounded-xl bg-slate-900/50 border border-slate-700/50">
                    <div className="text-sm text-slate-400 mb-2">{suggestion.description}</div>
                    <pre className="text-sm text-slate-200 font-mono whitespace-pre-wrap">
                      <code>{suggestion.code}</code>
                    </pre>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Instructions */}
      <div className="mt-6 p-4 rounded-2xl bg-slate-900/30 border border-slate-700/30">
        <h4 className="font-semibold text-slate-900 dark:text-white mb-2">How Predictive Debugging Works:</h4>
        <ul className="text-sm text-slate-600 dark:text-slate-400 space-y-1">
          <li>• Analyzes code patterns and common bug scenarios</li>
          <li>• Identifies potential performance bottlenecks</li>
          <li>• Suggests preventive measures and best practices</li>
          <li>• Provides early warnings for common issues</li>
          <li>• Helps you write more robust code from the start</li>
        </ul>
      </div>
    </div>
  );
} 