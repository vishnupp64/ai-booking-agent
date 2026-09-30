import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Search, Calendar, Clock, User, Mail, FileText, AlertCircle, CheckCircle2, XCircle, RefreshCw } from 'lucide-react';
import { Booking } from '../types/booking';
import { searchBookings, cancelBooking, rescheduleBooking } from '../services/api';
import { ConfirmationModal } from './ConfirmationModal';
import { format } from 'date-fns';

export const ManageBookings: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [targetBooking, setTargetBooking] = useState<Booking | null>(null);
  const [modalAction, setModalAction] = useState<'CANCEL' | 'RESCHEDULE'>('CANCEL');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    setErrorMsg('');
    try {
      const results = await searchBookings(searchQuery.trim());
      setBookings(results);
      setHasSearched(true);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error searching bookings.');
    } finally {
      setIsSearching(false);
    }
  };

  const handleCancelClick = (b: Booking) => {
    setTargetBooking(b);
    setModalAction('CANCEL');
    setModalOpen(true);
  };

  const handleConfirmModal = async () => {
    if (!targetBooking) return;
    setIsSubmitting(true);
    try {
      if (modalAction === 'CANCEL') {
        await cancelBooking(targetBooking.reference_code, targetBooking.customer_email);
      }
      setModalOpen(false);
      handleSearch(); // Refresh search list
    } catch (err: any) {
      setErrorMsg(err.message || 'Action failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-4 pb-12 relative z-10">
      <div className="glass-panel p-6 sm:p-8 space-y-6 border border-white/15 shadow-2xl">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <Search className="w-5 h-5 text-indigo-400" /> Manage & Lookup Bookings
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Search your active or past appointments by email address or 5-character reference code (e.g., BK-89A42).
          </p>
        </div>

        {/* Search Bar */}
        <form onSubmit={handleSearch} className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-4 top-3.5" />
            <input
              type="text"
              placeholder="Enter email or Reference Code (e.g. john@example.com or BK-89A42)..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full glass-input py-3 pl-11 pr-4 text-xs sm:text-sm font-medium"
            />
          </div>
          <button
            type="submit"
            disabled={!searchQuery.trim() || isSearching}
            className="glass-btn-primary px-6 py-3 text-xs sm:text-sm font-semibold shrink-0 disabled:opacity-40"
          >
            {isSearching ? 'Searching...' : 'Search'}
          </button>
        </form>

        {errorMsg && (
          <div className="p-3 rounded-xl bg-red-500/20 border border-red-500/30 text-red-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {errorMsg}
          </div>
        )}

        {/* Bookings List */}
        {hasSearched && (
          <div className="space-y-4 pt-2">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Found {bookings.length} matching booking(s)</span>
            </div>

            {bookings.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400 glass-card">
                No bookings found matching "{searchQuery}". Please check your reference code or email address.
              </div>
            ) : (
              bookings.map(b => {
                const isConfirmed = b.status === 'CONFIRMED';
                const isCancelled = b.status === 'CANCELLED';
                return (
                  <motion.div
                    key={b.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="glass-card p-5 space-y-4 bg-slate-900/60 border border-white/10"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-white/10">
                      <div>
                        <span className="text-xs font-mono font-bold text-cyan-400 tracking-wider">
                          REF: {b.reference_code}
                        </span>
                        <h3 className="text-sm font-bold text-white mt-0.5">{b.service_name || 'Executive Service'}</h3>
                      </div>

                      <span
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold self-start sm:self-center ${
                          isConfirmed
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : isCancelled
                            ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                            : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        }`}
                      >
                        {isConfirmed && <CheckCircle2 className="w-3.5 h-3.5" />}
                        {isCancelled && <XCircle className="w-3.5 h-3.5" />}
                        {b.status}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-300">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-indigo-400 shrink-0" />
                        <span>{format(new Date(b.start_time), 'EEEE, MMMM d, yyyy')}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-purple-400 shrink-0" />
                        <span>{format(new Date(b.start_time), 'h:mm a')} - {format(new Date(b.end_time), 'h:mm a')}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-cyan-400 shrink-0" />
                        <span>{b.customer_name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4 text-slate-400 shrink-0" />
                        <span>{b.customer_email}</span>
                      </div>
                    </div>

                    {isConfirmed && (
                      <div className="pt-3 border-t border-white/10 flex justify-end gap-2">
                        <button
                          onClick={() => handleCancelClick(b)}
                          className="px-4 py-2 rounded-xl text-xs font-semibold bg-red-500/15 hover:bg-red-500/25 text-red-300 border border-red-500/30 transition-colors"
                        >
                          Cancel Appointment
                        </button>
                      </div>
                    )}
                  </motion.div>
                );
              })
            )}
          </div>
        )}
      </div>

      <ConfirmationModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onConfirm={handleConfirmModal}
        actionType={modalAction}
        existingRefCode={targetBooking?.reference_code}
        isSubmitting={isSubmitting}
      />
    </div>
  );
};
