import React, { useState } from 'react';
import { useTheme } from './ThemeContext';

export default function GitHubAnalyzer({ onAnalysisComplete }) {
  const { dark } = useTheme();
  const [githubUrl, setGithubUrl] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [error, setError] = useState(null);
  const [apiKey, setApiKey] = useState('');
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [toast, setToast] = useState({ message: '', type: 'success' });
  const showToast = (message, type = 'success') => setToast({ message, type });

  const handleAnalyze = async () => {
    if (!githubUrl.trim()) {
      setError('Please enter a GitHub repository URL');
      return;
    }

    setIsAnalyzing(true);
    setError(null);
    setAnalysisResult(null);

    try {
      const response = await fetch('/api/analyze-github', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          github_url: githubUrl.trim(),
          ...(apiKey && { api_key: apiKey })
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to analyze repository');
      }

      setAnalysisResult(data.data);
      if (onAnalysisComplete) {
        onAnalysisComplete(data.data);
      }
    } catch (error) {
      setError(error.message);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleVoiceCommand = (command) => {
    if (command.toLowerCase().includes('analyze') || command.toLowerCase().includes('visit')) {
      handleAnalyze();
    }
  };

  const handleDownloadPDF = async () => {
    if (!analysisResult) {
      setError('No analysis results available for PDF generation');
      return;
    }

    setIsGeneratingPDF(true);
    setError(null);

    try {
      const response = await fetch('/api/generate-pdf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          analysisData: analysisResult
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to generate PDF');
      }

      // Create blob from response
      const blob = await response.blob();
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `github-analysis-${analysisResult.summary.repository.replace('/', '-')}.pdf`;
      
      // Trigger download
      document.body.appendChild(link);
      link.click();
      
      // Cleanup
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      showToast('✅ PDF report downloaded successfully!', 'success');
    } catch (error) {
      setError(error.message);
      showToast('❌ Failed to generate PDF report', 'error');
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const getRiskLevel = (issuesCount, filesWithBugs) => {
    if (filesWithBugs > 3 || issuesCount > 10) return 'high';
    if (filesWithBugs > 1 || issuesCount > 5) return 'medium';
    return 'low';
  };

  const getRiskColor = (level) => {
    switch (level) {
      case 'high': return 'text-red-500';
      case 'medium': return 'text-yellow-500';
      case 'low': return 'text-green-500';
      default: return 'text-gray-500';
    }
  };

  const getRiskBgColor = (level) => {
    switch (level) {
      case 'high': return 'bg-red-500/10 border-red-500/20';
      case 'medium': return 'bg-yellow-500/10 border-yellow-500/20';
      case 'low': return 'bg-green-500/10 border-green-500/20';
      default: return 'bg-gray-500/10 border-gray-500/20';
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toast.message && (
        <div className={`fixed bottom-8 left-1/2 -translate-x-1/2 z-[9999] px-6 py-3 rounded-2xl shadow-2xl text-white font-semibold transition-all duration-300 animate-fade-in flex items-center gap-3 backdrop-blur-xl ${
          toast.type === 'error' 
            ? 'bg-red-500/90 border border-red-400/50' 
            : 'bg-green-600/90 border border-green-400/50'
        }`}
          onClick={() => setToast({ message: '', type: 'success' })}
          role="alert"
          style={{ cursor: 'pointer' }}
        >
          {toast.type === 'error' ? '🐛' : '💡'}
          {toast.message}
        </div>
      )}
      {/* Header */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
          🔍 GitHub Repository Analyzer
        </h2>
        <p className="text-slate-600 dark:text-slate-400">
          Paste a GitHub repository URL and get AI-powered analysis of bugs, issues, and suggested fixes
        </p>
      </div>

      {/* Input Section */}
      <div className="p-6 rounded-3xl bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl">
        <div className="space-y-4">
          {/* GitHub URL Input */}
          <div>
            <label className="block text-sm font-medium text-slate-900 dark:text-white mb-2">
              GitHub Repository URL
            </label>
            <input
              type="url"
              value={githubUrl}
              onChange={(e) => setGithubUrl(e.target.value)}
              placeholder="https://github.com/owner/repository or https://github.com/owner/repo/blob/main/file.js"
              className="w-full px-4 py-3 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 text-slate-700 dark:text-slate-300 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all duration-300"
            />
          </div>

          {/* API Key Input (Optional) */}
          <div>
            <label className="block text-sm font-medium text-slate-900 dark:text-white mb-2">
              API Key (Optional)
            </label>
            <input
              type="text"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Enter your API key for tracking"
              className="w-full px-4 py-3 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 text-slate-700 dark:text-slate-300 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all duration-300"
            />
          </div>

          {/* Analyze Button */}
          <button
            onClick={handleAnalyze}
            disabled={isAnalyzing || !githubUrl.trim()}
            className="w-full px-6 py-4 rounded-2xl bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold shadow-lg hover:shadow-blue-500/25 transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isAnalyzing ? (
              <div className="flex items-center justify-center gap-3">
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Analyzing Repository...</span>
              </div>
            ) : (
              '🔍 Analyze Repository'
            )}
          </button>

          {/* Voice Command Hint */}
          <p className="text-sm text-slate-500 dark:text-slate-400 text-center">
            💡 Try saying "Visit my given link" or "Analyze this repository" for voice commands
          </p>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20">
          <p className="text-red-600 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* Analysis Results */}
      {analysisResult && (
        <div className="space-y-6">
          {/* Summary Card */}
          <div className="p-6 rounded-3xl bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl">
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-4">
              📊 Analysis Summary
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <div className="p-4 rounded-2xl bg-blue-500/10 border border-blue-500/20">
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {analysisResult.summary.total_files}
                </div>
                <div className="text-sm text-slate-600 dark:text-slate-400">Files Analyzed</div>
              </div>
              
              <div className="p-4 rounded-2xl bg-yellow-500/10 border border-yellow-500/20">
                <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                  {analysisResult.summary.total_issues}
                </div>
                <div className="text-sm text-slate-600 dark:text-slate-400">Total Issues</div>
              </div>
              
              <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20">
                <div className="text-2xl font-bold text-red-600 dark:text-red-400">
                  {analysisResult.summary.files_with_bugs}
                </div>
                <div className="text-sm text-slate-600 dark:text-slate-400">Files with Bugs</div>
              </div>
              
              <div className={`p-4 rounded-2xl border ${getRiskBgColor(getRiskLevel(analysisResult.summary.total_issues, analysisResult.summary.files_with_bugs))}`}>
                <div className={`text-2xl font-bold ${getRiskColor(getRiskLevel(analysisResult.summary.total_issues, analysisResult.summary.files_with_bugs))}`}>
                  {getRiskLevel(analysisResult.summary.total_issues, analysisResult.summary.files_with_bugs).toUpperCase()}
                </div>
                <div className="text-sm text-slate-600 dark:text-slate-400">Risk Level</div>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900/30 border border-slate-700/30">
              <div className="text-sm text-slate-600 dark:text-slate-400 mb-2">Repository</div>
              <div className="text-lg font-mono text-slate-900 dark:text-white">
                {analysisResult.summary.repository}
              </div>
              <div className="text-sm text-slate-500 dark:text-slate-400">
                Branch: {analysisResult.summary.branch}
              </div>
            </div>

            {/* PDF Download Button */}
            <div className="flex justify-center mt-6">
              <button
                onClick={handleDownloadPDF}
                disabled={isGeneratingPDF}
                className="px-6 py-3 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold shadow-lg hover:shadow-indigo-500/25 transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-3"
              >
                {isGeneratingPDF ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Generating PDF...</span>
                  </>
                ) : (
                  <>
                    <span>📄</span>
                    <span>Download PDF Report</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* File Analysis Results */}
          <div className="space-y-4">
            <h3 className="text-xl font-bold text-slate-900 dark:text-white">
              📁 File Analysis Results
            </h3>
            
            {analysisResult.files.map((file, index) => (
              <div key={index} className="p-6 rounded-3xl bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h4 className="text-lg font-semibold text-slate-900 dark:text-white">
                      📄 {file.file}
                    </h4>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      Language: {file.language}
                    </p>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {file.bugs_detected && (
                      <span className="px-3 py-1 rounded-full text-xs font-bold bg-red-500 text-white">
                        🐛 Bugs Found
                      </span>
                    )}
                    {file.issues_count > 0 && (
                      <span className="px-3 py-1 rounded-full text-xs font-bold bg-yellow-500 text-white">
                        {file.issues_count} Issues
                      </span>
                    )}
                  </div>
                </div>

                {file.error ? (
                  <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20">
                    <p className="text-red-600 dark:text-red-400">{file.error}</p>
                  </div>
                ) : file.analysis ? (
                  <div className="space-y-4">
                    {/* Explanation */}
                    {file.analysis.explanation && (
                      <div className="p-4 rounded-2xl bg-blue-500/10 border border-blue-500/20">
                        <h5 className="font-semibold text-slate-900 dark:text-white mb-2">
                          📝 Analysis
                        </h5>
                        <p className="text-slate-700 dark:text-slate-300">
                          {file.analysis.explanation}
                        </p>
                      </div>
                    )}

                    {/* Issues */}
                    {file.analysis.issues && file.analysis.issues.length > 0 && (
                      <div className="p-4 rounded-2xl bg-yellow-500/10 border border-yellow-500/20">
                        <h5 className="font-semibold text-slate-900 dark:text-white mb-2">
                          ⚠️ Issues Found
                        </h5>
                        <ul className="space-y-2">
                          {file.analysis.issues.map((issue, issueIndex) => (
                            <li key={issueIndex} className="text-slate-700 dark:text-slate-300">
                              • {issue}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Suggested Fix */}
                    {file.analysis.suggested_fix && (
                      <div className="p-4 rounded-2xl bg-green-500/10 border border-green-500/20">
                        <h5 className="font-semibold text-slate-900 dark:text-white mb-2">
                          🔧 Suggested Fix
                        </h5>
                        <pre className="text-sm text-slate-700 dark:text-slate-300 bg-slate-900/30 p-3 rounded-xl overflow-x-auto">
                          <code>{file.analysis.suggested_fix}</code>
                        </pre>
                      </div>
                    )}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
} 