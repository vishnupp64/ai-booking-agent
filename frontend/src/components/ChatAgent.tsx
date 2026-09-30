import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Bot, User, HeartPulse, Calendar, RefreshCw, Stethoscope, AlertCircle } from 'lucide-react';
import { ChatMessage, Service, TimeSlot, AvailabilityResult } from '../types/booking';
import { sendChatMessage, fetchServices } from '../services/api';
import { ConfirmationModal } from './ConfirmationModal';
import { format, parseISO } from 'date-fns';

const HEALTHCARE_QUICK_PROMPTS = [
  'Book a Cardiology Consultation tomorrow',
  'Schedule a Blood Test & Lab Diagnostic',
  'Book an MRI Scan for Friday',
  'Book a Surgical Operation slot',
  'Cancel my appointment',
];

export const ChatAgent: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome-1',
      sender: 'agent',
      text: "Welcome to LifeCare Medical Center! I'm Aura Health AI, your smart medical booking assistant.\n\nI can help you book Specialist Doctor Consultations (Cardiology, Neurology, Pediatrics), Blood Tests & Laboratory Diagnostics, MRI Diagnostic Scans, or Outpatient Surgical Operations.\n\nHow can I assist your health schedule today?",
      timestamp: new Date().toISOString(),
    },
  ]);

  const [inputQuery, setInputQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [services, setServices] = useState<Service[]>([]);

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [modalAction, setModalAction] = useState<'CREATE' | 'CANCEL' | 'RESCHEDULE'>('CREATE');
  const [modalService, setModalService] = useState<Service | undefined>();
  const [modalDate, setModalDate] = useState<string>('');
  const [modalSlot, setModalSlot] = useState<TimeSlot | undefined>();
  const [existingRefCode, setExistingRefCode] = useState<string>('');
  const [isSubmittingBooking, setIsSubmittingBooking] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchServices().then(setServices).catch(console.error);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputQuery).trim();
    if (!text || isLoading) return;

    const userMsgId = `user-${Date.now()}`;
    const userMsg: ChatMessage = {
      id: userMsgId,
      sender: 'user',
      text,
      timestamp: new Date().toISOString(),
    };

    setMessages(prev => [...prev, userMsg]);
    if (!textToSend) setInputQuery('');
    setIsLoading(true);

    try {
      const history = messages
        .filter(m => m.sender !== 'system')
        .map(m => ({
          role: (m.sender === 'user' ? 'user' : 'model') as 'user' | 'model',
          parts: [{ text: m.text }],
        }));

      const agentResponse = await sendChatMessage(text, history);
      setMessages(prev => [...prev, agentResponse]);
    } catch (err: any) {
      console.error('Chat error:', err);
      setMessages(prev => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          sender: 'agent',
          text: `⚠️ I encountered an issue processing your request: ${err.message || 'Server error'}. Please try again.`,
          timestamp: new Date().toISOString(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSlotClick = (avail: AvailabilityResult, slot: TimeSlot) => {
    const srv = services.find(s => s.id === avail.serviceId) || services[0];
    setModalService(srv);
    setModalDate(avail.date);
    setModalSlot(slot);
    setModalAction('CREATE');
    setModalOpen(true);
  };

  const handleConfirmModalSubmit = async (customerData: { name: string; email: string; phone: string; notes: string }) => {
    setIsSubmittingBooking(true);
    try {
      if (modalAction === 'CREATE' && modalSlot && modalDate && modalService) {
        const createPrompt = `Confirm medical appointment for ${modalService.name} on ${modalDate} at ${modalSlot.time}. Patient Name: ${customerData.name}, Email: ${customerData.email}, Phone: ${customerData.phone || 'N/A'}. Symptoms/Notes: ${customerData.notes || 'None'}.`;
        setModalOpen(false);
        await handleSendMessage(createPrompt);
      }
    } catch (err: any) {
      console.error('Modal confirm error:', err);
    } finally {
      setIsSubmittingBooking(false);
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto px-4 pb-12 relative z-10 flex flex-col h-[calc(100vh-140px)] min-h-[600px]">
      {/* Main Glass Booking Panel */}
      <div className="glass-panel flex-1 flex flex-col overflow-hidden relative border border-teal-500/20 shadow-2xl">
        
        {/* Panel Header */}
        <div className="p-4 sm:p-5 px-6 border-b border-white/10 bg-slate-900/40 backdrop-blur-md flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-teal-400 to-indigo-500 p-[1px]">
                <div className="w-full h-full bg-slate-950/90 rounded-[11px] flex items-center justify-center">
                  <Stethoscope className="w-5 h-5 text-teal-400" />
                </div>
              </div>
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-400 ring-2 ring-slate-950 animate-pulse" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white tracking-wide">Aura Health AI Assistant</h2>
              <p className="text-[11px] text-slate-400">Doctors • Blood Tests • Operations • MRI Scans</p>
            </div>
          </div>

          <button
            onClick={() => setMessages([messages[0]])}
            title="Reset Chat Session"
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {/* Message Stream Scroll Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 scrollbar-thin">
          <AnimatePresence initial={false}>
            {messages.map(msg => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25 }}
                className={`flex gap-3 sm:gap-4 max-w-3xl ${
                  msg.sender === 'user' ? 'ml-auto flex-row-reverse' : 'mr-auto'
                }`}
              >
                {/* Avatar */}
                <div className="shrink-0 mt-1">
                  {msg.sender === 'user' ? (
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-purple-500 to-indigo-500 flex items-center justify-center shadow-lg text-white">
                      <User className="w-4 h-4" />
                    </div>
                  ) : (
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-teal-400 via-cyan-500 to-indigo-500 p-[1px] shadow-lg shadow-teal-500/20">
                      <div className="w-full h-full bg-slate-950 rounded-[11px] flex items-center justify-center">
                        <HeartPulse className="w-4 h-4 text-teal-400" />
                      </div>
                    </div>
                  )}
                </div>

                {/* Bubble Content */}
                <div className="space-y-3 flex-1">
                  <div
                    className={`p-4 sm:p-5 rounded-2xl text-xs sm:text-sm leading-relaxed ${
                      msg.sender === 'user'
                        ? 'bg-gradient-to-r from-teal-600/90 via-cyan-600/90 to-indigo-600/90 text-white shadow-lg border border-white/20 rounded-tr-none'
                        : 'glass-card bg-slate-900/70 border border-white/12 text-slate-200 shadow-xl rounded-tl-none'
                    }`}
                  >
                    <div className="whitespace-pre-line font-normal">{msg.text}</div>

                    {/* Tool execution badge */}
                    {msg.toolCallsExecuted && msg.toolCallsExecuted.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-white/10 flex flex-wrap gap-2">
                        {msg.toolCallsExecuted.map((tc, idx) => (
                          <span
                            key={idx}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-mono bg-teal-500/15 text-teal-300 border border-teal-500/30"
                          >
                            <Stethoscope className="w-3 h-3 text-cyan-400" />
                            Tool: {tc.name}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Interactive Available Slots Buttons (If returned from DB tool call) */}
                  {msg.availableSlots && msg.availableSlots.slots && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="glass-card p-4 sm:p-5 bg-slate-950/80 border border-teal-500/30 shadow-2xl space-y-3"
                    >
                      <div className="flex items-center justify-between pb-2 border-b border-white/10">
                        <div className="flex items-center gap-2 text-xs font-semibold text-white">
                          <Calendar className="w-4 h-4 text-teal-400" />
                          <span>{msg.availableSlots.serviceName}</span>
                          {msg.availableSlots.doctorName && (
                            <span className="text-teal-300">({msg.availableSlots.doctorName})</span>
                          )}
                          <span className="text-slate-400">• {msg.availableSlots.dayOfWeek}, {msg.availableSlots.date}</span>
                        </div>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-300 font-mono">
                          {msg.availableSlots.slots.filter(s => s.available).length} slots open
                        </span>
                      </div>

                      {/* Slots Pill Grid */}
                      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2 pt-1">
                        {msg.availableSlots.slots.map((slot, idx) => (
                          <button
                            key={idx}
                            disabled={!slot.available}
                            onClick={() => handleSlotClick(msg.availableSlots!, slot)}
                            className="glass-slot-btn py-2 px-2 text-center text-xs font-semibold flex flex-col items-center justify-center gap-0.5"
                          >
                            <span>{slot.displayTime}</span>
                            <span className="text-[9px] opacity-75 font-normal">
                              {slot.available ? 'Available' : 'Booked'}
                            </span>
                          </button>
                        ))}
                      </div>
                      <p className="text-[11px] text-slate-400 italic pt-1 text-center sm:text-left">
                        💡 Click any available slot button to open your Medical Confirmation Summary.
                      </p>
                    </motion.div>
                  )}

                  <span className="text-[10px] text-slate-500 block px-1">
                    {format(parseISO(msg.timestamp), 'h:mm a')}
                  </span>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Typing Indicator */}
          {isLoading && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-3 items-center">
              <div className="w-8 h-8 rounded-xl bg-slate-900 border border-white/10 flex items-center justify-center">
                <HeartPulse className="w-4 h-4 text-teal-400 animate-spin" />
              </div>
              <div className="glass-card px-4 py-3 bg-slate-900/60 border border-white/10 rounded-2xl flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-teal-400 typing-dot" />
                <span className="w-2 h-2 rounded-full bg-cyan-400 typing-dot" />
                <span className="w-2 h-2 rounded-full bg-indigo-400 typing-dot" />
                <span className="text-xs text-slate-400 font-mono ml-2">Aura checking hospital schedule in PostgreSQL...</span>
              </div>
            </motion.div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Quick Prompt Pills Bar */}
        <div className="px-4 py-2 bg-slate-950/40 border-t border-white/5 flex items-center gap-2 overflow-x-auto no-scrollbar">
          <span className="text-[11px] text-slate-400 font-medium whitespace-nowrap flex items-center gap-1 shrink-0">
            <HeartPulse className="w-3 h-3 text-teal-400" /> Medical Prompts:
          </span>
          {HEALTHCARE_QUICK_PROMPTS.map((prompt, idx) => (
            <button
              key={idx}
              onClick={() => handleSendMessage(prompt)}
              disabled={isLoading}
              className="text-xs text-slate-300 hover:text-white px-3 py-1.5 rounded-full bg-white/5 hover:bg-teal-500/20 border border-white/10 hover:border-teal-500/30 whitespace-nowrap transition-all duration-200 shrink-0"
            >
              {prompt}
            </button>
          ))}
        </div>

        {/* Large Floating Glass Input */}
        <div className="p-4 sm:p-5 bg-slate-950/80 backdrop-blur-xl border-t border-white/10">
          <form
            onSubmit={e => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="relative flex items-center"
          >
            <input
              type="text"
              placeholder="Type your medical booking request (e.g., 'Book Dr. Sarah Jenkins tomorrow', 'Schedule a blood test')..."
              value={inputQuery}
              onChange={e => setInputQuery(e.target.value)}
              disabled={isLoading}
              className="w-full glass-input py-3.5 pl-5 pr-14 text-xs sm:text-sm font-normal text-white placeholder-slate-400 shadow-inner rounded-2xl"
            />
            <button
              type="submit"
              disabled={!inputQuery.trim() || isLoading}
              className="absolute right-2 p-2.5 rounded-xl glass-btn-primary shadow-lg disabled:opacity-40 disabled:hover:transform-none flex items-center justify-center transition-all"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onConfirm={handleConfirmModalSubmit}
        actionType={modalAction}
        service={modalService}
        selectedDate={modalDate}
        selectedSlot={modalSlot}
        existingRefCode={existingRefCode}
        isSubmitting={isSubmittingBooking}
      />
    </div>
  );
};
