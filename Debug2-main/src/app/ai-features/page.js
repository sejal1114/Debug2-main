'use client';
import React, { useState } from 'react';
import VoiceDebugger from '../../components/VoiceDebugger';
import ScreenshotAnalyzer from '../../components/ScreenshotAnalyzer';
import NaturalLanguageQuery from '../../components/NaturalLanguageQuery';
import PredictiveDebugger from '../../components/PredictiveDebugger';
import GitHubAnalyzer from '../../components/GitHubAnalyzer';
import CodeEditor from '../../components/CodeEditor';
import { useTheme } from '../../components/ThemeContext';

const FEATURES = [
  // {
  //   id: 'voice',
  //   title: '🎤 Voice Debugging',
  //   description: 'Use voice commands to debug your code hands-free',
  //   icon: '🎤',
  //   gradient: 'from-blue-500 to-cyan-500',
  //   component: VoiceDebugger,
  //   demo: 'Say "debug this" to analyze your code for bugs'
  // },
  {
    id: 'screenshot',
    title: '📸 Screenshot Analysis',
    description: 'Upload screenshots of code and get instant analysis',
    icon: '📸',
    gradient: 'from-green-500 to-emerald-500',
    component: ScreenshotAnalyzer,
    demo: 'Drag and drop code screenshots for AI-powered extraction'
  },
  {
    id: 'natural-language',
    title: '💬 Natural Language Queries',
    description: 'Ask questions about your code in plain English',
    icon: '💬',
    gradient: 'from-purple-500 to-indigo-500',
    component: NaturalLanguageQuery,
    demo: 'Ask "Why is this loop slow?" and get detailed answers'
  },
  {
    id: 'predictive',
    title: '🔮 Predictive Debugging',
    description: 'Anticipate and prevent bugs before they occur',
    icon: '🔮',
    gradient: 'from-orange-500 to-red-500',
    component: PredictiveDebugger,
    demo: 'Get proactive warnings about potential issues'
  },
  {
    id: 'github',
    title: '🔍 GitHub Repository Analysis',
    description: 'Analyze entire GitHub repositories for bugs and issues',
    icon: '🔍',
    gradient: 'from-indigo-500 to-purple-600',
    component: GitHubAnalyzer,
    demo: 'Paste a GitHub repo URL and get comprehensive analysis'
  }
];

export default function AIFeaturesPage() {
  const { dark } = useTheme();
  const [activeFeature, setActiveFeature] = useState('voice');
  const [code, setCode] = useState(`function fibonacci(n) {
  if (n <= 1) return n;
  return fibonacci(n - 1) + fibonacci(n - 2);
}

console.log(fibonacci(10));`);
  const [language, setLanguage] = useState('javascript');
  const [isListening, setIsListening] = useState(false);

  const handleCodeExtracted = (extractedCode, detectedLanguage) => {
    setCode(extractedCode);
    if (detectedLanguage && detectedLanguage !== 'unknown') {
      setLanguage(detectedLanguage);
    }
  };

  const handleVoiceCommand = (command, fullTranscript) => {
    console.log('Voice command received:', command, fullTranscript);
    // Handle voice commands here
  };

  const handleQueryResult = (result) => {
    console.log('Query result:', result);
  };

  const handlePredictions = (predictions) => {
    console.log('Predictions:', predictions);
  };

  const handleGitHubAnalysis = (analysisResult) => {
    console.log('GitHub analysis completed:', analysisResult);
  };

  const activeFeatureData = FEATURES.find(f => f.id === activeFeature);
  const ActiveComponent = activeFeatureData?.component;

  // Render the active component with appropriate props
  const renderActiveComponent = () => {
    if (!ActiveComponent) return null;

    const baseProps = {
      currentCode: code,
      onCodeExtracted: handleCodeExtracted,
      onQueryResult: handleQueryResult,
      onPredictions: handlePredictions,
      onAnalysisComplete: handleGitHubAnalysis
    };

    // Add voice-specific props for VoiceDebugger
    if (activeFeature === 'voice') {
      return (
        <ActiveComponent
          {...baseProps}
          onVoiceCommand={handleVoiceCommand}
          isListening={isListening}
          setIsListening={setIsListening}
        />
      );
    }

    // For other components, add voice command handler if they support it
    if (activeFeature === 'screenshot') {
      return (
        <ActiveComponent
          {...baseProps}
          onVoiceCommand={handleVoiceCommand}
        />
      );
    }

    return <ActiveComponent {...baseProps} />;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 transition-all duration-700">
      {/* Animated background elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-gradient-to-r from-blue-400/10 to-purple-400/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute top-3/4 right-1/4 w-80 h-80 bg-gradient-to-r from-pink-400/10 to-orange-400/10 rounded-full blur-3xl animate-pulse delay-1000" />
        <div className="absolute bottom-1/4 left-1/3 w-72 h-72 bg-gradient-to-r from-cyan-400/10 to-blue-400/10 rounded-full blur-3xl animate-pulse delay-2000" />
      </div>

      <main className="relative z-10 max-w-7xl mx-auto px-4 lg:px-8 py-8">
        {/* Header Section */}
        <div className="text-center mb-12">
          <h1 className="text-4xl lg:text-6xl font-bold bg-gradient-to-r from-slate-900 to-slate-700 dark:from-white dark:to-slate-300 bg-clip-text text-transparent mb-6">
            AI-Powered Features
          </h1>
          <p className="text-xl lg:text-2xl text-slate-600 dark:text-slate-400 max-w-4xl mx-auto leading-relaxed">
            Experience the future of debugging with cutting-edge AI features that make coding faster, smarter, and more intuitive
          </p>
        </div>

        {/* Feature Navigation */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {FEATURES.map((feature) => (
            <button
              key={feature.id}
              onClick={() => setActiveFeature(feature.id)}
              className={`p-6 rounded-3xl transition-all duration-500 hover:scale-105 ${
                activeFeature === feature.id
                  ? `bg-gradient-to-r ${feature.gradient} text-white shadow-2xl`
                  : 'bg-white/10 backdrop-blur-xl border border-white/20 text-slate-900 dark:text-white hover:bg-white/20'
              }`}
            >
              <div className="text-3xl mb-3">{feature.icon}</div>
              <h3 className="font-bold text-lg mb-2">{feature.title}</h3>
              <p className="text-sm opacity-90">{feature.description}</p>
            </button>
          ))}
        </div>

        {/* Main Content Area */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left: Code Editor */}
          <div className="space-y-6">
            <div className="p-6 rounded-3xl bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl">
              <div className="flex items-center gap-3 mb-4">
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-r ${activeFeatureData?.gradient} flex items-center justify-center text-white`}>
                  {activeFeatureData?.icon}
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                    {activeFeatureData?.title}
                  </h2>
                  <p className="text-slate-600 dark:text-slate-400 text-sm">
                    {activeFeatureData?.demo}
                  </p>
                </div>
              </div>
              
              <div className="rounded-2xl overflow-hidden">
                <CodeEditor
                  value={code}
                  language={language}
                  onChange={setCode}
                  onLanguageChange={setLanguage}
                  readOnly={false}
                />
              </div>
            </div>
          </div>

          {/* Right: AI Feature Component */}
          <div className="space-y-6">
            {renderActiveComponent()}
          </div>
        </div>

        {/* Feature Details */}
        <div className="mt-16">
          <h2 className="text-3xl font-bold text-center text-slate-900 dark:text-white mb-12">
            How AI Features Work
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {FEATURES.map((feature) => (
              <div key={feature.id} className="p-6 rounded-3xl bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl">
                <div className={`w-16 h-16 rounded-2xl bg-gradient-to-r ${feature.gradient} flex items-center justify-center text-white text-2xl mb-4`}>
                  {feature.icon}
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-3">
                  {feature.title}
                </h3>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                  {feature.description}
                </p>
                
                <div className="mt-4 p-3 rounded-xl bg-slate-900/30 border border-slate-700/30">
                  <h4 className="font-semibold text-slate-900 dark:text-white mb-2">Try it:</h4>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    {feature.demo}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Benefits Section */}
        <div className="mt-16 p-8 rounded-3xl bg-gradient-to-r from-blue-600/10 via-purple-600/10 to-pink-600/10 backdrop-blur-xl border border-white/20">
          <h2 className="text-3xl font-bold text-center text-slate-900 dark:text-white mb-8">
            Why AI-Powered Debugging?
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-r from-green-500 to-emerald-600 flex items-center justify-center text-white text-2xl mx-auto mb-4">
                ⚡
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">10x Faster</h3>
              <p className="text-slate-600 dark:text-slate-400">
                Debug and analyze code in seconds, not minutes
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center text-white text-2xl mx-auto mb-4">
                🧠
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Smarter Insights</h3>
              <p className="text-slate-600 dark:text-slate-400">
                AI-powered analysis catches issues humans might miss
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-r from-orange-500 to-red-600 flex items-center justify-center text-white text-2xl mx-auto mb-4">
                🎯
              </div>
              <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Proactive Prevention</h3>
              <p className="text-slate-600 dark:text-slate-400">
                Anticipate and prevent bugs before they occur
              </p>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="mt-16 text-center">
          <div className="p-8 rounded-3xl bg-gradient-to-r from-blue-600/10 via-purple-600/10 to-pink-600/10 backdrop-blur-xl border border-white/20">
            <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-4">
              Ready to Transform Your Debugging?
            </h2>
            <p className="text-xl text-slate-600 dark:text-slate-400 mb-8 max-w-2xl mx-auto">
              Start using AI-powered features today and experience the future of code debugging
            </p>
            <a
              href="/debug"
              className="inline-block px-8 py-4 rounded-2xl bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 text-white font-bold text-lg shadow-2xl hover:shadow-blue-500/25 transition-all duration-300 hover:scale-105"
            >
              Start Debugging with AI
            </a>
          </div>
        </div>
      </main>
    </div>
  );
} 