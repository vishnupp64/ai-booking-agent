import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, X, Calendar, Clock, User, Mail, Phone, AlertCircle, FileText, Stethoscope, AlertTriangle, Search, ShieldCheck, MapPin, Heart } from 'lucide-react';
import { Service, TimeSlot, Patient } from '../types/booking';
import { lookupPatient } from '../services/api';
import { format, parseISO, isFuture } from 'date-fns';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (patientData: {
    name: string;
    email: string;
    phone: string;
    dob?: string;
    gender?: 'Male' | 'Female' | 'Other';
    address?: string;
    emergencyContact?: string;
    notes: string;
  }) => void;
  actionType: 'CREATE' | 'CANCEL' | 'RESCHEDULE';
  service?: Service;
  selectedDate?: string;
  selectedSlot?: TimeSlot;
  existingRefCode?: string;
  foundPatient?: Patient;
  isSubmitting?: boolean;
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  actionType,
  service,
  selectedDate,
  selectedSlot,
  existingRefCode,
  foundPatient,
  isSubmitting = false,
}) => {
  // Form State
  const [name, setName] = useState('');
  const [dob, setDob] = useState('');
  const [gender, setGender] = useState<'Male' | 'Female' | 'Other'>('Male');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [emergencyContact, setEmergencyContact] = useState('');
  const [notes, setNotes] = useState('');
  const [uhid, setUhid] = useState('');

  // Lookup State
  const [lookupQuery, setLookupQuery] = useState('');
  const [isSearchingPatient, setIsSearchingPatient] = useState(false);
  const [patientFoundBanner, setPatientFoundBanner] = useState<string | null>(null);

  // Validation Errors
  const [fieldErrors, setFieldErrors] = useState<{ [key: string]: string }>({});
  const [globalError, setGlobalError] = useState('');

  useEffect(() => {
    if (foundPatient) {
      populatePatient(foundPatient);
    }
  }, [foundPatient]);

  const populatePatient = (pat: Patient) => {
    setName(pat.full_name || '');
    setPhone(pat.mobile_number || '');
    setEmail(pat.email || '');
    setDob(pat.dob || '');
    if (pat.gender) setGender(pat.gender);
    setAddress(pat.address || '');
    setEmergencyContact(pat.emergency_contact || '');
    setUhid(pat.uhid || '');
    setPatientFoundBanner(`Found registered patient record: ${pat.full_name} (${pat.uhid})`);
  };

  const handlePatientLookup = async () => {
    if (!lookupQuery.trim()) return;
    setIsSearchingPatient(true);
    setGlobalError('');
    try {
      const pat = await lookupPatient(lookupQuery.trim());
      if (pat) {
        populatePatient(pat);
      } else {
        setPatientFoundBanner(null);
        setGlobalError(`No patient record found matching "${lookupQuery}". Registering as new patient.`);
      }
    } catch (err: any) {
      setGlobalError(err.message || 'Error looking up patient');
    } finally {
      setIsSearchingPatient(false);
    }
  };

  const validateFields = () => {
    const errors: { [key: string]: string } = {};

    // Full Name
    if (!name.trim() || name.trim().length < 2) {
      errors.name = 'Please enter a valid full name (at least 2 characters).';
    }

    // Indian Mobile Number validation (10 digits starting with 6,7,8,9)
    const cleanMobile = phone.replace(/\D/g, '');
    const indianMobileRegex = /^[6-9]\d{9}$/;
    if (!cleanMobile || !indianMobileRegex.test(cleanMobile.slice(-10))) {
      errors.phone = 'Please enter a valid 10-digit mobile number (e.g., 9876543210).';
    }

    // Email address validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.trim() || !emailRegex.test(email.trim())) {
      errors.email = 'Please enter a valid email address (e.g., name@example.com).';
    }

    // DOB validation if entered
    if (dob) {
      const parsedDob = parseISO(dob);
      if (isNaN(parsedDob.getTime())) {
        errors.dob = 'Please enter a valid date of birth.';
      } else if (isFuture(parsedDob) || dob === new Date().toISOString().split('T')[0]) {
        errors.dob = 'Date of birth cannot be today or in the future.';
      }
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (actionType === 'CREATE') {
      if (!validateFields()) return;
    }
    setGlobalError('');
    onConfirm({
      name,
      email,
      phone,
      dob,
      gender,
      address,
      emergencyContact,
      notes,
    });
  };

  if (!isOpen) return null;

  const formattedDateStr = selectedDate ? format(parseISO(selectedDate), 'EEEE, MMMM d, yyyy') : '';

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="glass-panel w-full max-w-xl p-6 sm:p-8 relative border border-teal-500/30 shadow-2xl overflow-hidden my-auto max-h-[90vh] overflow-y-auto"
        >
          {/* Subtle Ambient Background Highlight */}
          <div className="absolute -top-24 -right-24 w-48 h-48 rounded-full bg-teal-500/20 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -left-24 w-48 h-48 rounded-full bg-cyan-500/20 blur-3xl pointer-events-none" />

          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Modal Header */}
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 rounded-2xl bg-teal-500/20 border border-teal-500/30 flex items-center justify-center text-teal-400 shadow-inner shrink-0">
              <CheckCircle2 className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                {actionType === 'CREATE' && '✓ Patient Details & Confirmation'}
                {actionType === 'CANCEL' && '⚠️ Cancel Medical Appointment'}
                {actionType === 'RESCHEDULE' && '🔄 Reschedule Appointment'}
              </h2>
              <p className="text-xs text-slate-400">
                {actionType === 'CREATE' && 'Verify patient profile & appointment details'}
                {actionType === 'CANCEL' && `Confirm cancellation for ${existingRefCode}`}
                {actionType === 'RESCHEDULE' && `Confirm new date slot for ${existingRefCode}`}
              </p>
            </div>
          </div>

          {/* Existing Patient Search Quick Auto-Fill Bar */}
          {actionType === 'CREATE' && (
            <div className="glass-card p-3 mb-5 bg-slate-900/60 border border-teal-500/20 rounded-2xl space-y-2">
              <span className="text-[11px] font-semibold text-teal-300 uppercase tracking-wider block flex items-center gap-1">
                <Search className="w-3 h-3" /> Quick Lookup Existing Patient (UHID / Mobile / Email)
              </span>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Enter 10-digit Mobile, UHID (e.g., UHID-98214), or Email..."
                  value={lookupQuery}
                  onChange={e => setLookupQuery(e.target.value)}
                  className="glass-input px-3 py-1.5 text-xs flex-1"
                />
                <button
                  type="button"
                  onClick={handlePatientLookup}
                  disabled={isSearchingPatient || !lookupQuery.trim()}
                  className="px-4 py-1.5 text-xs font-semibold rounded-xl bg-teal-500/20 hover:bg-teal-500/30 text-teal-300 border border-teal-500/40 transition-colors disabled:opacity-40"
                >
                  {isSearchingPatient ? 'Searching...' : 'Lookup'}
                </button>
              </div>

              {patientFoundBanner && (
                <div className="text-[11px] text-emerald-300 bg-emerald-500/15 border border-emerald-500/30 p-2 rounded-xl flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                  {patientFoundBanner}
                </div>
              )}
            </div>
          )}

          {/* Appointment Summary Card */}
          <div className="glass-card p-4 sm:p-5 mb-5 space-y-3 bg-slate-900/60 border border-white/10 rounded-2xl">
            {service && (
              <>
                <div className="flex items-center justify-between pb-3 border-b border-white/10">
                  <div>
                    <span className="text-xs font-semibold text-teal-400 uppercase tracking-wider block">
                      {service.category} • {service.department_name || 'Hospital Department'}
                    </span>
                    <span className="text-sm font-bold text-white">{service.name}</span>
                  </div>
                  <span className="text-sm font-bold text-cyan-400">${service.price}</span>
                </div>

                {service.doctor_name && (
                  <div className="flex items-center gap-2 text-xs sm:text-sm text-slate-200">
                    <Stethoscope className="w-4 h-4 text-teal-400 shrink-0" />
                    <span>Doctor: <strong className="text-white">{service.doctor_name}</strong></span>
                  </div>
                )}

                {service.prep_instructions && (
                  <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400 mt-0.5" />
                    <span><strong>Prep Instructions:</strong> {service.prep_instructions}</span>
                  </div>
                )}
              </>
            )}

            {selectedDate && (
              <div className="flex items-center gap-2.5 text-xs sm:text-sm text-slate-300">
                <Calendar className="w-4 h-4 text-indigo-400 shrink-0" />
                <span>{formattedDateStr}</span>
              </div>
            )}

            {selectedSlot && (
              <div className="flex items-center gap-2.5 text-xs sm:text-sm text-slate-300">
                <Clock className="w-4 h-4 text-purple-400 shrink-0" />
                <span>
                  {selectedSlot.displayTime} ({service?.duration_minutes || 30} minutes)
                </span>
              </div>
            )}

            {existingRefCode && (
              <div className="flex items-center gap-2.5 text-xs sm:text-sm text-slate-300">
                <FileText className="w-4 h-4 text-cyan-400 shrink-0" />
                <span>Medical Reference: <strong className="text-white font-mono tracking-wider">{existingRefCode}</strong></span>
              </div>
            )}
          </div>

          {/* Patient Details & Validation Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {actionType === 'CREATE' && (
              <>
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-teal-300 flex items-center gap-1">
                    <User className="w-3.5 h-3.5" /> Patient Details & Registration
                  </h3>
                  {uhid && (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                      {uhid}
                    </span>
                  )}
                </div>

                {/* Patient Full Name */}
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Patient Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. John Thomas"
                    value={name}
                    onChange={e => {
                      setName(e.target.value);
                      if (fieldErrors.name) setFieldErrors(prev => ({ ...prev, name: '' }));
                    }}
                    className={`w-full glass-input px-4 py-2 text-sm ${
                      fieldErrors.name ? 'border-red-500 shadow-red-500/20' : ''
                    }`}
                  />
                  {fieldErrors.name && (
                    <p className="text-[11px] text-red-400 mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" /> {fieldErrors.name}
                    </p>
                  )}
                </div>

                {/* DOB & Gender */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Date of Birth
                    </label>
                    <input
                      type="date"
                      value={dob}
                      max={new Date().toISOString().split('T')[0]}
                      onChange={e => {
                        setDob(e.target.value);
                        if (fieldErrors.dob) setFieldErrors(prev => ({ ...prev, dob: '' }));
                      }}
                      className={`w-full glass-input px-3 py-2 text-sm ${
                        fieldErrors.dob ? 'border-red-500' : ''
                      }`}
                    />
                    {fieldErrors.dob && (
                      <p className="text-[11px] text-red-400 mt-1 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" /> {fieldErrors.dob}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Gender *
                    </label>
                    <select
                      value={gender}
                      onChange={e => setGender(e.target.value as any)}
                      className="w-full glass-input px-3 py-2 text-sm text-white bg-slate-900"
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>

                {/* Mobile & Email */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1 flex items-center gap-1">
                      <Phone className="w-3.5 h-3.5 text-teal-400" /> Mobile Number (10-Digit) *
                    </label>
                    <input
                      type="tel"
                      required
                      placeholder="9876543210"
                      value={phone}
                      onChange={e => {
                        setPhone(e.target.value);
                        if (fieldErrors.phone) setFieldErrors(prev => ({ ...prev, phone: '' }));
                      }}
                      className={`w-full glass-input px-4 py-2 text-sm ${
                        fieldErrors.phone ? 'border-red-500 shadow-red-500/20' : ''
                      }`}
                    />
                    {fieldErrors.phone && (
                      <p className="text-[11px] text-red-400 mt-1 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" /> {fieldErrors.phone}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1 flex items-center gap-1">
                      <Mail className="w-3.5 h-3.5 text-teal-400" /> Email Address *
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="patient@example.com"
                      value={email}
                      onChange={e => {
                        setEmail(e.target.value);
                        if (fieldErrors.email) setFieldErrors(prev => ({ ...prev, email: '' }));
                      }}
                      className={`w-full glass-input px-4 py-2 text-sm ${
                        fieldErrors.email ? 'border-red-500 shadow-red-500/20' : ''
                      }`}
                    />
                    {fieldErrors.email && (
                      <p className="text-[11px] text-red-400 mt-1 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" /> {fieldErrors.email}
                      </p>
                    )}
                  </div>
                </div>

                {/* Optional Address & Emergency Contact */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1 flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" /> Address (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="Street, City..."
                      value={address}
                      onChange={e => setAddress(e.target.value)}
                      className="w-full glass-input px-3 py-1.5 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1 flex items-center gap-1">
                      <Heart className="w-3.5 h-3.5 text-rose-400" /> Emergency Contact (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="Name / Phone..."
                      value={emergencyContact}
                      onChange={e => setEmergencyContact(e.target.value)}
                      className="w-full glass-input px-3 py-1.5 text-xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Symptoms / Notes (Optional)</label>
                  <input
                    type="text"
                    placeholder="Chief complaint or doctor notes..."
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    className="w-full glass-input px-3 py-1.5 text-xs"
                  />
                </div>
              </>
            )}

            {globalError && (
              <div className="p-3 rounded-xl bg-red-500/20 border border-red-500/30 text-red-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {globalError}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center gap-3 pt-4 border-t border-white/10">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full sm:w-1/2 glass-btn-primary py-3 text-sm flex items-center justify-center gap-2 shadow-lg disabled:opacity-50"
              >
                {isSubmitting ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Processing...
                  </span>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    {actionType === 'CREATE' && 'Confirm & Create Appointment'}
                    {actionType === 'CANCEL' && 'Yes, Cancel Appointment'}
                    {actionType === 'RESCHEDULE' && 'Confirm Reschedule'}
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={onClose}
                className="w-full sm:w-1/2 py-3 rounded-xl border border-white/15 bg-white/5 hover:bg-white/10 text-slate-300 text-sm font-medium transition-colors"
              >
                Change Details
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
