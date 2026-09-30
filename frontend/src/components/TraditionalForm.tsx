import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Calendar, Clock, User, Mail, Phone, CheckCircle2, AlertCircle, Sparkles, Stethoscope, TestTube, Scan, Scissors, Activity, ShieldCheck, Heart, Search } from 'lucide-react';
import { Service, Doctor, TimeSlot, AvailabilityResult, BookingCategory, Patient } from '../types/booking';
import { fetchServices, fetchDoctors, fetchAvailability, createBooking, lookupPatient } from '../services/api';
import { format, addDays, parseISO, isFuture } from 'date-fns';

const CATEGORIES: BookingCategory[] = [
  'Doctor Consultation',
  'Blood Test',
  'Laboratory Test',
  'Scanning & Radiology',
  'Health Package',
  'Surgical Operation',
];

export const TraditionalForm: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState<BookingCategory>('Doctor Consultation');
  const [services, setServices] = useState<Service[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(format(addDays(new Date(), 1), 'yyyy-MM-dd'));
  const [availability, setAvailability] = useState<AvailabilityResult | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);

  // Patient Details State
  const [name, setName] = useState('');
  const [dob, setDob] = useState('');
  const [gender, setGender] = useState<'Male' | 'Female' | 'Other'>('Male');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [emergencyContact, setEmergencyContact] = useState('');
  const [notes, setNotes] = useState('');

  // Lookup State
  const [lookupQuery, setLookupQuery] = useState('');
  const [isSearchingPatient, setIsSearchingPatient] = useState(false);
  const [foundPatient, setFoundPatient] = useState<Patient | null>(null);

  // Validation & Submission
  const [loadingServices, setLoadingServices] = useState(true);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successAppointment, setSuccessAppointment] = useState<any | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ [key: string]: string }>({});
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    setLoadingServices(true);
    fetchServices(selectedCategory)
      .then(data => {
        setServices(data);
        if (data.length > 0) setSelectedService(data[0]);
        else setSelectedService(null);
      })
      .catch(err => setErrorMessage(err.message))
      .finally(() => setLoadingServices(false));
  }, [selectedCategory]);

  useEffect(() => {
    fetchDoctors().then(setDoctors).catch(console.error);
  }, []);

  useEffect(() => {
    if (!selectedService || !selectedDate) return;
    setLoadingSlots(true);
    setSelectedSlot(null);
    setErrorMessage('');

    fetchAvailability(selectedService.id, undefined, selectedDate)
      .then(res => setAvailability(res))
      .catch(err => setErrorMessage(err.message))
      .finally(() => setLoadingSlots(false));
  }, [selectedService, selectedDate]);

  const handlePatientLookup = async () => {
    if (!lookupQuery.trim()) return;
    setIsSearchingPatient(true);
    setErrorMessage('');
    try {
      const pat = await lookupPatient(lookupQuery.trim());
      if (pat) {
        setFoundPatient(pat);
        setName(pat.full_name || '');
        setPhone(pat.mobile_number || '');
        setEmail(pat.email || '');
        setDob(pat.dob || '');
        if (pat.gender) setGender(pat.gender as any);
        setAddress(pat.address || '');
        setEmergencyContact(pat.emergency_contact || '');
      } else {
        setFoundPatient(null);
        setErrorMessage(`No patient record found for "${lookupQuery}". Registering new patient.`);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Error looking up patient');
    } finally {
      setIsSearchingPatient(false);
    }
  };

  const validate = () => {
    const errors: { [key: string]: string } = {};

    if (!selectedService || !selectedSlot || !selectedDate) {
      setErrorMessage('Please select a hospital service, date, and available time slot.');
      return false;
    }

    if (!name.trim() || name.trim().length < 2) {
      errors.name = 'Please enter patient full name (minimum 2 characters).';
    }

    const cleanMobile = phone.replace(/\D/g, '');
    const indianMobileRegex = /^[6-9]\d{9}$/;
    if (!cleanMobile || !indianMobileRegex.test(cleanMobile.slice(-10))) {
      errors.phone = 'Please enter a valid 10-digit mobile number (e.g., 9876543210).';
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.trim() || !emailRegex.test(email.trim())) {
      errors.email = 'Please enter a valid email address (e.g., patient@example.com).';
    }

    if (dob) {
      const parsed = parseISO(dob);
      if (isNaN(parsed.getTime()) || isFuture(parsed)) {
        errors.dob = 'Date of birth cannot be in the future.';
      }
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      const result = await createBooking({
        serviceId: selectedService!.id,
        patientName: name,
        patientEmail: email,
        patientPhone: phone,
        dob,
        gender,
        address,
        emergencyContact,
        startTime: selectedSlot!.isoString,
        notes,
      });
      setSuccessAppointment(result);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to create medical appointment.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (successAppointment) {
    return (
      <div className="w-full max-w-3xl mx-auto px-4 pb-12 relative z-10">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass-panel p-8 sm:p-10 text-center space-y-6 border border-emerald-500/30 shadow-2xl"
        >
          <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/40 mx-auto flex items-center justify-center text-emerald-400 shadow-lg shadow-emerald-500/20">
            <CheckCircle2 className="w-8 h-8" />
          </div>

          <div>
            <h2 className="text-2xl font-bold text-white tracking-tight">Medical Appointment Confirmed!</h2>
            <p className="text-xs sm:text-sm text-slate-300 mt-1">
              Medical Reference Code: <strong className="text-cyan-400 font-mono text-base">{successAppointment.reference_code}</strong>
              {successAppointment.uhid && (
                <span className="block text-indigo-300 text-xs mt-1">UHID: {successAppointment.uhid}</span>
              )}
            </p>
          </div>

          <div className="glass-card p-5 max-w-md mx-auto text-left space-y-3 bg-slate-900/60 border border-white/10 rounded-2xl text-xs sm:text-sm">
            <div className="flex justify-between border-b border-white/10 pb-2">
              <span className="text-slate-400">Department / Service:</span>
              <span className="font-semibold text-white">{successAppointment.service_name}</span>
            </div>
            {successAppointment.doctor_name && (
              <div className="flex justify-between border-b border-white/10 pb-2">
                <span className="text-slate-400">Doctor:</span>
                <span className="font-semibold text-teal-300">{successAppointment.doctor_name}</span>
              </div>
            )}
            <div className="flex justify-between border-b border-white/10 pb-2">
              <span className="text-slate-400">Date & Time:</span>
              <span className="font-semibold text-indigo-300">
                {format(new Date(successAppointment.start_time), 'PPpp')}
              </span>
            </div>
            <div className="flex justify-between border-b border-white/10 pb-2">
              <span className="text-slate-400">Patient:</span>
              <span className="font-semibold text-white">{successAppointment.customer_name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Contact:</span>
              <span className="font-semibold text-white">{successAppointment.customer_phone}</span>
            </div>
          </div>

          <button
            onClick={() => setSuccessAppointment(null)}
            className="glass-btn-primary px-8 py-3 text-sm"
          >
            Book Another Appointment
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto px-4 pb-12 relative z-10">
      <div className="glass-panel p-6 sm:p-8 space-y-8 border border-teal-500/20 shadow-2xl">
        {/* Header */}
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <Stethoscope className="w-5 h-5 text-teal-400" /> Hospital Doctors & Diagnostics Form
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Book consultations, blood tests, radiology scans, and health packages with real-time PostgreSQL availability.
          </p>
        </div>

        {/* Category Filter Pills */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-teal-300 mb-2.5">
            1. Select Booking Category
          </label>
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
            {CATEGORIES.map((cat, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                  selectedCategory === cat
                    ? 'bg-gradient-to-r from-teal-500 to-indigo-500 text-white shadow-lg border border-white/20'
                    : 'glass-card text-slate-400 hover:text-white'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Step 2: Select Service Card */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-teal-300 mb-3">
            2. Choose Service / Doctor ({selectedCategory})
          </label>
          {loadingServices ? (
            <div className="p-6 text-center text-xs text-slate-400">Loading hospital catalog...</div>
          ) : services.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-400 glass-card">
              No services currently listed under {selectedCategory}.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {services.map(srv => {
                const isSelected = selectedService?.id === srv.id;
                return (
                  <div
                    key={srv.id}
                    onClick={() => setSelectedService(srv)}
                    className={`glass-card p-4 cursor-pointer transition-all ${
                      isSelected
                        ? 'border-teal-500/80 bg-teal-600/20 shadow-lg shadow-teal-500/20'
                        : 'hover:border-white/20'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-1.5">
                      <h3 className="text-sm font-bold text-white">{srv.name}</h3>
                      <span className="text-xs font-bold text-cyan-400">${srv.price}</span>
                    </div>

                    {srv.doctor_name && (
                      <p className="text-xs text-teal-300 font-medium mb-1 flex items-center gap-1">
                        <Stethoscope className="w-3.5 h-3.5" /> {srv.doctor_name}
                      </p>
                    )}

                    <p className="text-xs text-slate-400 mb-2 line-clamp-2">{srv.description}</p>
                    <div className="flex items-center gap-2 text-[11px] text-indigo-300 font-medium">
                      <Clock className="w-3.5 h-3.5" />
                      <span>{srv.duration_minutes} Mins</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Step 3: Select Date & Available Time Slot */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-teal-300 mb-3">
              3. Select Date
            </label>
            <input
              type="date"
              value={selectedDate}
              onChange={e => setSelectedDate(e.target.value)}
              min={format(new Date(), 'yyyy-MM-dd')}
              className="w-full glass-input p-3 text-sm font-medium mb-3"
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setSelectedDate(format(new Date(), 'yyyy-MM-dd'))}
                className="text-xs px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10"
              >
                Today
              </button>
              <button
                type="button"
                onClick={() => setSelectedDate(format(addDays(new Date(), 1), 'yyyy-MM-dd'))}
                className="text-xs px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10"
              >
                Tomorrow
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-teal-300 mb-3">
              4. Real-time Available Slots
            </label>
            {loadingSlots ? (
              <div className="p-6 text-center text-xs text-slate-400">Checking DB slots...</div>
            ) : availability && availability.isOpen ? (
              <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto pr-1">
                {availability.slots.map((slot, idx) => {
                  const isSelected = selectedSlot?.time === slot.time;
                  return (
                    <button
                      key={idx}
                      disabled={!slot.available}
                      onClick={() => setSelectedSlot(slot)}
                      className={`glass-slot-btn py-2 text-xs ${isSelected ? 'selected' : ''}`}
                    >
                      {slot.displayTime}
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-300">
                Closed or no open slots available on this date.
              </div>
            )}
          </div>
        </div>

        {/* Step 4: Patient Registration & Validation Form */}
        <form onSubmit={handleSubmit} className="space-y-4 pt-4 border-t border-white/10">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <label className="block text-xs font-semibold uppercase tracking-wider text-teal-300">
              5. Patient Registration & Validation
            </label>

            {/* Existing Patient Quick Lookup */}
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Lookup UHID / Phone..."
                value={lookupQuery}
                onChange={e => setLookupQuery(e.target.value)}
                className="glass-input px-3 py-1 text-xs w-48"
              />
              <button
                type="button"
                onClick={handlePatientLookup}
                disabled={isSearchingPatient || !lookupQuery.trim()}
                className="px-3 py-1 text-xs rounded-xl bg-teal-500/20 text-teal-300 border border-teal-500/30"
              >
                {isSearchingPatient ? 'Searching...' : 'Lookup'}
              </button>
            </div>
          </div>

          {foundPatient && (
            <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Loaded Patient Record: <strong>{foundPatient.full_name}</strong> ({foundPatient.uhid})</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-slate-300 mb-1">Patient Full Name *</label>
              <input
                type="text"
                required
                placeholder="e.g. John Thomas"
                value={name}
                onChange={e => {
                  setName(e.target.value);
                  if (fieldErrors.name) setFieldErrors(prev => ({ ...prev, name: '' }));
                }}
                className={`w-full glass-input px-4 py-2.5 text-sm ${fieldErrors.name ? 'border-red-500' : ''}`}
              />
              {fieldErrors.name && (
                <p className="text-[11px] text-red-400 mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> {fieldErrors.name}
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs text-slate-300 mb-1">Date of Birth</label>
              <input
                type="date"
                value={dob}
                max={new Date().toISOString().split('T')[0]}
                onChange={e => setDob(e.target.value)}
                className="w-full glass-input px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-slate-300 mb-1">Mobile Number (10-Digit) *</label>
              <input
                type="tel"
                required
                placeholder="9876543210"
                value={phone}
                onChange={e => {
                  setPhone(e.target.value);
                  if (fieldErrors.phone) setFieldErrors(prev => ({ ...prev, phone: '' }));
                }}
                className={`w-full glass-input px-4 py-2.5 text-sm ${fieldErrors.phone ? 'border-red-500' : ''}`}
              />
              {fieldErrors.phone && (
                <p className="text-[11px] text-red-400 mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> {fieldErrors.phone}
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs text-slate-300 mb-1">Email Address *</label>
              <input
                type="email"
                required
                placeholder="patient@example.com"
                value={email}
                onChange={e => {
                  setEmail(e.target.value);
                  if (fieldErrors.email) setFieldErrors(prev => ({ ...prev, email: '' }));
                }}
                className={`w-full glass-input px-4 py-2.5 text-sm ${fieldErrors.email ? 'border-red-500' : ''}`}
              />
              {fieldErrors.email && (
                <p className="text-[11px] text-red-400 mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> {fieldErrors.email}
                </p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-xs text-slate-300 mb-1">Medical Symptoms / Notes (Optional)</label>
            <input
              type="text"
              placeholder="Chief complaints or doctor notes..."
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="w-full glass-input px-4 py-2 text-sm"
            />
          </div>

          {errorMessage && (
            <div className="p-3 rounded-xl bg-red-500/20 border border-red-500/30 text-red-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {errorMessage}
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting || !selectedSlot}
            className="w-full glass-btn-primary py-3.5 text-sm flex items-center justify-center gap-2 shadow-xl disabled:opacity-40"
          >
            {isSubmitting ? 'Validating & Confirming Appointment...' : 'Complete Appointment Booking'}
          </button>
        </form>
      </div>
    </div>
  );
};
