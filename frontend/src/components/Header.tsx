import React from 'react';
import { Stethoscope, Calendar, Search, HeartPulse, Database, ShieldCheck, Activity } from 'lucide-react';

interface HeaderProps {
  activeTab: 'agent' | 'traditional' | 'manage';
  setActiveTab: (tab: 'agent' | 'traditional' | 'manage') => void;
  geminiKeyConfigured: boolean;
}

export const Header: React.FC<HeaderProps> = ({ activeTab, setActiveTab, geminiKeyConfigured }) => {
  return (
    <header className="w-full max-w-6xl mx-auto pt-6 px-4 mb-6 relative z-10">
      <div className="glass-panel p-4 px-6 flex flex-col md:flex-row items-center justify-between gap-4 border border-teal-500/20 shadow-2xl">
        {/* Brand & Hospital Status */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-teal-400 via-cyan-500 to-indigo-500 p-[1px] shadow-lg shadow-teal-500/30">
            <div className="w-full h-full bg-slate-950/80 backdrop-blur-md rounded-[11px] flex items-center justify-center">
              <HeartPulse className="w-5 h-5 text-teal-400 animate-pulse" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-white font-sans">
                LIFECARE <span className="text-gradient-purple">Health AI</span>
              </h1>
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold tracking-wide uppercase px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-300 border border-teal-500/30">
                <Activity className="w-2.5 h-2.5 text-teal-400" /> OPD Live
              </span>
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-400 mt-0.5">
              <span className="flex items-center gap-1">
                <Database className="w-3 h-3 text-emerald-400" /> Medical PostgreSQL DB
              </span>
              <span className="text-slate-600">•</span>
              <span className="flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-cyan-400" />
                {geminiKeyConfigured ? 'Gemini 2.5 Active' : 'Healthcare Agent Router'}
              </span>
            </div>
          </div>
        </div>

        {/* View Navigation Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-900/60 rounded-2xl border border-white/10 backdrop-blur-md">
          <button
            onClick={() => setActiveTab('agent')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all duration-200 ${
              activeTab === 'agent'
                ? 'bg-gradient-to-r from-teal-600/90 via-cyan-600/90 to-indigo-600/90 text-white shadow-lg shadow-teal-500/25 border border-white/20'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Stethoscope className="w-4 h-4" />
            AI Hospital Agent
          </button>

          <button
            onClick={() => setActiveTab('traditional')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all duration-200 ${
              activeTab === 'traditional'
                ? 'bg-gradient-to-r from-teal-600/90 via-cyan-600/90 to-indigo-600/90 text-white shadow-lg shadow-teal-500/25 border border-white/20'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Calendar className="w-4 h-4" />
            Doctors & Labs Form
          </button>

          <button
            onClick={() => setActiveTab('manage')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all duration-200 ${
              activeTab === 'manage'
                ? 'bg-gradient-to-r from-teal-600/90 via-cyan-600/90 to-indigo-600/90 text-white shadow-lg shadow-teal-500/25 border border-white/20'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Search className="w-4 h-4" />
            My Medical Bookings
          </button>
        </div>
      </div>
    </header>
  );
};
