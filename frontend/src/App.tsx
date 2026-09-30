import React, { useState, useEffect } from 'react';
import { BackgroundOrbs } from './components/BackgroundOrbs';
import { Header } from './components/Header';
import { ChatAgent } from './components/ChatAgent';
import { TraditionalForm } from './components/TraditionalForm';
import { ManageBookings } from './components/ManageBookings';
import { checkBackendHealth } from './services/api';
import { Sparkles, Database, Code, Globe } from 'lucide-react';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'agent' | 'traditional' | 'manage'>('agent');
  const [geminiKeyConfigured, setGeminiKeyConfigured] = useState(false);

  useEffect(() => {
    checkBackendHealth()
      .then(data => {
        setGeminiKeyConfigured(data.geminiKeyConfigured);
      })
      .catch(console.error);
  }, []);

  return (
    <div className="min-h-screen bg-[#070913] bg-mesh text-slate-100 relative overflow-hidden flex flex-col font-sans">
      {/* Dynamic Animated Ambient Orbs */}
      <BackgroundOrbs />

      {/* Top Header Navigation */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        geminiKeyConfigured={geminiKeyConfigured}
      />

      {/* Main Tab Views */}
      <main className="flex-1 w-full relative z-10 flex flex-col">
        {activeTab === 'agent' && <ChatAgent />}
        {activeTab === 'traditional' && <TraditionalForm />}
        {activeTab === 'manage' && <ManageBookings />}
      </main>

      {/* Footer */}
      <footer className="w-full py-4 text-center text-xs text-slate-500 relative z-10 border-t border-white/5 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-slate-400">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            <span>Aura AI Booking Engine • Gemini Tool Calling + PostgreSQL</span>
          </div>
          <div className="flex items-center gap-3 text-[11px] text-slate-500">
            <span>React + TypeScript</span>
            <span>•</span>
            <span>Express Backend</span>
            <span>•</span>
            <span>Glassmorphism UI</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default App;
