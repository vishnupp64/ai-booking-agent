import { getDb } from '../db/index.js';
import {
  Department,
  Doctor,
  Service,
  Patient,
  Appointment,
  AvailabilityResult,
  TimeSlot,
  BusinessHours,
  BookingCategory,
} from '../types/index.js';
import { parseISO, format, addMinutes, isAfter, isBefore, isFuture } from 'date-fns';
import { v4 as uuidv4 } from 'uuid';

// Helper Generators
function generateUHID(): string {
  const digits = Math.floor(10000 + Math.random() * 90000);
  return `UHID-${digits}`;
}

function generateRefCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = 'MED-';
  for (let i = 0; i < 5; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// 1. Validation Utilities
export function validatePatientDetails(data: {
  fullName: string;
  dob?: string;
  gender?: string;
  mobileNumber: string;
  email: string;
}) {
  const errors: string[] = [];

  // Full Name Validation
  if (!data.fullName || data.fullName.trim().length < 2) {
    errors.push('Please enter a valid full name (minimum 2 characters).');
  }

  // Mobile Number Validation (Indian 10-digit mobile)
  const cleanMobile = data.mobileNumber ? data.mobileNumber.replace(/\D/g, '') : '';
  const indianMobileRegex = /^[6-9]\d{9}$/;
  if (!cleanMobile || !indianMobileRegex.test(cleanMobile.slice(-10))) {
    errors.push('Please enter a valid 10-digit mobile number (e.g., 9876543210).');
  }

  // Email Validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!data.email || !emailRegex.test(data.email.trim())) {
    errors.push('Please enter a valid email address (e.g., patient@example.com).');
  }

  // DOB Validation if provided
  if (data.dob) {
    const dobDate = parseISO(data.dob);
    if (isNaN(dobDate.getTime())) {
      errors.push('Please enter a valid date of birth (YYYY-MM-DD).');
    } else if (isFuture(dobDate) || dobDate.toISOString().split('T')[0] === new Date().toISOString().split('T')[0]) {
      errors.push('Date of birth cannot be today or in the future.');
    }
  }

  // Gender Validation if provided
  if (data.gender && !['Male', 'Female', 'Other'].includes(data.gender)) {
    errors.push('Please select a valid gender option (Male, Female, or Other).');
  }

  return {
    isValid: errors.length === 0,
    errors,
    cleanMobile: cleanMobile.slice(-10),
  };
}

// 2. Department Methods
export async function getDepartments(): Promise<Department[]> {
  const db = getDb();
  const res = await db.query('SELECT * FROM departments ORDER BY name ASC');
  return res.rows;
}

// 3. Doctor Methods
export async function getDoctors(departmentId?: string): Promise<Doctor[]> {
  const db = getDb();
  let sql = `
    SELECT doc.*, dept.name as department_name 
    FROM doctors doc 
    LEFT JOIN departments dept ON doc.department_id = dept.id
    WHERE 1=1
  `;
  const params: any[] = [];
  if (departmentId) {
    params.push(departmentId);
    sql += ` AND doc.department_id = $${params.length}`;
  }
  sql += ' ORDER BY doc.name ASC';
  const res = await db.query(sql, params);
  return res.rows.map(row => ({
    ...row,
    consultation_fee: parseFloat(row.consultation_fee),
    experience_years: parseInt(row.experience_years, 10),
  }));
}

// 4. Service / Package Methods
export async function getServices(category?: BookingCategory, departmentId?: string): Promise<Service[]> {
  const db = getDb();
  let sql = `
    SELECT srv.*, dept.name as department_name, doc.name as doctor_name 
    FROM services srv 
    LEFT JOIN departments dept ON srv.department_id = dept.id 
    LEFT JOIN doctors doc ON srv.doctor_id = doc.id 
    WHERE 1=1
  `;
  const params: any[] = [];
  if (category) {
    params.push(category);
    sql += ` AND srv.category = $${params.length}`;
  }
  if (departmentId) {
    params.push(departmentId);
    sql += ` AND srv.department_id = $${params.length}`;
  }
  sql += ' ORDER BY srv.price DESC';
  const res = await db.query(sql, params);
  return res.rows.map(row => ({
    ...row,
    price: parseFloat(row.price),
    duration_minutes: parseInt(row.duration_minutes, 10),
  }));
}

export async function getServiceById(serviceId: string): Promise<Service | null> {
  const db = getDb();
  const res = await db.query(
    `SELECT srv.*, dept.name as department_name, doc.name as doctor_name 
     FROM services srv 
     LEFT JOIN departments dept ON srv.department_id = dept.id 
     LEFT JOIN doctors doc ON srv.doctor_id = doc.id 
     WHERE srv.id = $1`,
    [serviceId]
  );
  if (res.rows.length === 0) return null;
  const row = res.rows[0];
  return {
    ...row,
    price: parseFloat(row.price),
    duration_minutes: parseInt(row.duration_minutes, 10),
  };
}

// 5. Patient Lookup & Registration
export async function lookupPatient(queryStr: string): Promise<Patient | null> {
  const db = getDb();
  const term = queryStr.trim().toLowerCase();
  const cleanMobile = queryStr.replace(/\D/g, '');

  let sql = `
    SELECT * FROM patients 
    WHERE LOWER(uhid) = $1 
       OR LOWER(email) = $1 
       OR LOWER(full_name) LIKE $2
  `;
  const params: any[] = [term, `%${term}%`];

  if (cleanMobile.length >= 7) {
    params.push(`%${cleanMobile.slice(-10)}%`);
    sql += ` OR mobile_number LIKE $${params.length}`;
  }

  sql += ' ORDER BY created_at DESC LIMIT 1';
  const res = await db.query(sql, params);

  if (res.rows.length === 0) return null;
  return res.rows[0];
}

export async function createOrUpdatePatient(params: {
  fullName: string;
  dob?: string;
  gender?: 'Male' | 'Female' | 'Other';
  mobileNumber: string;
  email: string;
  address?: string;
  emergencyContact?: string;
  uhid?: string;
}): Promise<Patient> {
  const validation = validatePatientDetails(params);
  if (!validation.isValid) {
    throw new Error(validation.errors.join(' '));
  }

  const db = getDb();
  const emailLower = params.email.toLowerCase().trim();
  const mobileClean = validation.cleanMobile;

  // Check if patient exists by UHID or mobile/email
  let existing: Patient | null = null;
  if (params.uhid) {
    existing = await lookupPatient(params.uhid);
  }
  if (!existing) {
    existing = await lookupPatient(mobileClean) || await lookupPatient(emailLower);
  }

  if (existing) {
    // Update existing patient details
    await db.query(
      `UPDATE patients 
       SET full_name = $1, dob = $2, gender = $3, address = $4, emergency_contact = $5 
       WHERE id = $6`,
      [
        params.fullName,
        params.dob || existing.dob || null,
        params.gender || existing.gender || null,
        params.address || existing.address || null,
        params.emergencyContact || existing.emergency_contact || null,
        existing.id,
      ]
    );
    const updatedRes = await db.query('SELECT * FROM patients WHERE id = $1', [existing.id]);
    return updatedRes.rows[0];
  }

  // Create new Patient
  const id = uuidv4();
  const uhid = params.uhid || generateUHID();

  await db.query(
    `INSERT INTO patients 
     (id, uhid, full_name, dob, gender, mobile_number, email, address, emergency_contact)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
    [
      id,
      uhid,
      params.fullName,
      params.dob || null,
      params.gender || null,
      mobileClean,
      emailLower,
      params.address || null,
      params.emergencyContact || null,
    ]
  );

  const newRes = await db.query('SELECT * FROM patients WHERE id = $1', [id]);
  return newRes.rows[0];
}

// 6. Availability Check
export async function checkAvailability(
  serviceId?: string,
  doctorId?: string,
  dateStr?: string
): Promise<AvailabilityResult> {
  const db = getDb();

  if (!dateStr) {
    throw new Error('Target date (YYYY-MM-DD) is required for availability check.');
  }

  let service: Service | null = null;
  if (serviceId) {
    service = await getServiceById(serviceId);
  } else if (doctorId) {
    const services = await getServices();
    service = services.find(s => s.doctor_id === doctorId) || services[0];
  } else {
    const services = await getServices();
    service = services[0];
  }

  if (!service) throw new Error('Selected hospital service/doctor not found.');

  const targetDate = parseISO(dateStr);
  if (isNaN(targetDate.getTime())) {
    throw new Error(`Invalid date format '${dateStr}'. Expected YYYY-MM-DD.`);
  }

  const dayOfWeek = targetDate.getDay();
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  const hoursRes = await db.query('SELECT * FROM business_hours WHERE day_of_week = $1', [dayOfWeek]);
  let businessHour: BusinessHours = hoursRes.rows[0] || {
    day_of_week: dayOfWeek,
    start_time: '08:00',
    end_time: '18:00',
    is_open: true,
  };

  if (!businessHour.is_open) {
    return {
      serviceId: service.id,
      serviceName: service.name,
      doctorId: service.doctor_id,
      doctorName: service.doctor_name,
      category: service.category,
      departmentName: service.department_name,
      durationMinutes: service.duration_minutes,
      date: dateStr,
      dayOfWeek: dayNames[dayOfWeek],
      isOpen: false,
      slots: [],
    };
  }

  const dayStartIso = `${dateStr}T00:00:00.000Z`;
  const dayEndIso = `${dateStr}T23:59:59.999Z`;

  const existingRes = await db.query(
    `SELECT start_time, end_time FROM bookings 
     WHERE status = 'CONFIRMED' 
     AND service_id = $1 
     AND start_time >= $2 AND start_time <= $3`,
    [service.id, dayStartIso, dayEndIso]
  );

  const existingBookings = existingRes.rows.map(r => ({
    start: new Date(r.start_time),
    end: new Date(r.end_time),
  }));

  const [startHour, startMin] = businessHour.start_time.split(':').map(Number);
  const [endHour, endMin] = businessHour.end_time.split(':').map(Number);

  const windowStart = new Date(targetDate);
  windowStart.setHours(startHour, startMin, 0, 0);

  const windowEnd = new Date(targetDate);
  windowEnd.setHours(endHour, endMin, 0, 0);

  const durationMs = service.duration_minutes * 60 * 1000;
  const intervalMinutes = 30;
  const slots: TimeSlot[] = [];

  let currentSlotStart = new Date(windowStart);
  const now = new Date();

  while (currentSlotStart.getTime() + durationMs <= windowEnd.getTime()) {
    const currentSlotEnd = new Date(currentSlotStart.getTime() + durationMs);
    const isPast = isBefore(currentSlotStart, now);

    const hasOverlap = existingBookings.some(b => {
      return (
        isBefore(currentSlotStart, b.end) && isAfter(currentSlotEnd, b.start)
      );
    });

    const isAvailable = !isPast && !hasOverlap;

    const hh = String(currentSlotStart.getHours()).padStart(2, '0');
    const mm = String(currentSlotStart.getMinutes()).padStart(2, '0');
    const time24 = `${hh}:${mm}`;
    const displayTime = format(currentSlotStart, 'h:mm a');

    slots.push({
      time: time24,
      displayTime,
      isoString: currentSlotStart.toISOString(),
      available: isAvailable,
    });

    currentSlotStart = addMinutes(currentSlotStart, intervalMinutes);
  }

  return {
    serviceId: service.id,
    serviceName: service.name,
    doctorId: service.doctor_id,
    doctorName: service.doctor_name,
    category: service.category,
    departmentName: service.department_name,
    durationMinutes: service.duration_minutes,
    date: dateStr,
    dayOfWeek: dayNames[dayOfWeek],
    isOpen: true,
    slots,
  };
}

// 7. Appointment Creation with Patient Sync & Duplicate Prevention
export async function createAppointment(params: {
  serviceId: string;
  patientName: string;
  patientEmail: string;
  patientPhone: string;
  dob?: string;
  gender?: 'Male' | 'Female' | 'Other';
  address?: string;
  emergencyContact?: string;
  startTime: string;
  notes?: string;
}): Promise<Appointment> {
  const db = getDb();

  // 1. Create or update patient record (generates UHID)
  const patient = await createOrUpdatePatient({
    fullName: params.patientName,
    email: params.patientEmail,
    mobileNumber: params.patientPhone,
    dob: params.dob,
    gender: params.gender,
    address: params.address,
    emergencyContact: params.emergencyContact,
  });

  const service = await getServiceById(params.serviceId);
  if (!service) throw new Error(`Selected service not found with ID '${params.serviceId}'`);

  const startDate = new Date(params.startTime);
  if (isNaN(startDate.getTime())) {
    throw new Error(`Invalid appointment start time format: ${params.startTime}`);
  }

  const endDate = addMinutes(startDate, service.duration_minutes);
  const startIso = startDate.toISOString();
  const endIso = endDate.toISOString();

  // 2. Duplicate Booking Prevention (Same Patient on Same Time Slot)
  const duplicateRes = await db.query(
    `SELECT id FROM bookings 
     WHERE status = 'CONFIRMED' 
     AND (customer_email = $1 OR uhid = $2)
     AND (start_time < $4 AND end_time > $3)`,
    [patient.email, patient.uhid, startIso, endIso]
  );

  if (duplicateRes.rows.length > 0) {
    throw new Error(`Duplicate Booking Warning: Patient ${patient.full_name} (${patient.uhid}) already has an active appointment scheduled at ${format(startDate, 'PPpp')}.`);
  }

  // 3. Room / Doctor Slot Overlap Prevention
  const conflictRes = await db.query(
    `SELECT id FROM bookings 
     WHERE status = 'CONFIRMED' 
     AND service_id = $1 
     AND (start_time < $3 AND end_time > $2)`,
    [service.id, startIso, endIso]
  );

  if (conflictRes.rows.length > 0) {
    throw new Error(`Slot Conflict: Time slot ${format(startDate, 'PPpp')} is no longer available. Please select another slot.`);
  }

  const id = uuidv4();
  const referenceCode = generateRefCode();

  await db.query(
    `INSERT INTO bookings 
     (id, reference_code, service_id, patient_id, uhid, customer_name, customer_email, customer_phone, dob, gender, emergency_contact, start_time, end_time, status, notes)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, 'CONFIRMED', $14)`,
    [
      id,
      referenceCode,
      service.id,
      patient.id,
      patient.uhid,
      patient.full_name,
      patient.email,
      patient.mobile_number,
      patient.dob || null,
      patient.gender || null,
      patient.emergency_contact || null,
      startIso,
      endIso,
      params.notes || '',
    ]
  );

  const bookingRes = await db.query('SELECT * FROM bookings WHERE id = $1', [id]);
  const row = bookingRes.rows[0];

  return {
    ...row,
    service_name: service.name,
    category: service.category,
    department_name: service.department_name,
    doctor_name: service.doctor_name,
  };
}

// 8. Appointment Lookup, Cancellation & Rescheduling
export async function getAppointment(queryStr: string): Promise<Appointment[]> {
  const db = getDb();
  const term = `%${queryStr.trim().toLowerCase()}%`;
  const res = await db.query(
    `SELECT b.*, s.name as service_name, s.category, s.prep_instructions, dept.name as department_name, doc.name as doctor_name 
     FROM bookings b 
     JOIN services s ON b.service_id = s.id 
     LEFT JOIN departments dept ON s.department_id = dept.id 
     LEFT JOIN doctors doc ON s.doctor_id = doc.id 
     WHERE LOWER(b.customer_email) LIKE $1 
        OR LOWER(b.reference_code) LIKE $1 
        OR LOWER(b.uhid) LIKE $1 
        OR b.customer_phone LIKE $1 
     ORDER BY b.start_time DESC`,
    [term]
  );
  return res.rows;
}

export async function cancelAppointment(params: {
  referenceCode: string;
  customerEmail?: string;
}): Promise<Appointment> {
  const db = getDb();
  const ref = params.referenceCode.toUpperCase().trim();

  const findRes = await db.query(
    `SELECT * FROM bookings WHERE UPPER(reference_code) = $1 OR UPPER(uhid) = $1`,
    [ref]
  );

  if (findRes.rows.length === 0) {
    throw new Error(`No active appointment found with reference ${ref}.`);
  }

  const booking = findRes.rows[0];
  if (booking.status === 'CANCELLED') {
    throw new Error(`Appointment ${booking.reference_code} is already cancelled.`);
  }

  const nowIso = new Date().toISOString();
  await db.query(
    `UPDATE bookings SET status = 'CANCELLED', updated_at = $1 WHERE id = $2`,
    [nowIso, booking.id]
  );

  const updatedRes = await db.query('SELECT * FROM bookings WHERE id = $1', [booking.id]);
  const service = await getServiceById(booking.service_id);

  return {
    ...updatedRes.rows[0],
    service_name: service?.name || 'Hospital Service',
    department_name: service?.department_name,
    doctor_name: service?.doctor_name,
  };
}

export async function rescheduleAppointment(params: {
  referenceCode: string;
  newStartTime: string;
}): Promise<Appointment> {
  const db = getDb();
  const ref = params.referenceCode.toUpperCase().trim();

  const findRes = await db.query(
    `SELECT * FROM bookings WHERE status = 'CONFIRMED' AND (UPPER(reference_code) = $1 OR UPPER(uhid) = $1)`,
    [ref]
  );

  if (findRes.rows.length === 0) {
    throw new Error('Appointment not found or is already cancelled.');
  }

  const existingBooking = findRes.rows[0];
  const service = await getServiceById(existingBooking.service_id);
  if (!service) throw new Error('Associated hospital service not found.');

  const newStartDate = new Date(params.newStartTime);
  if (isNaN(newStartDate.getTime())) {
    throw new Error(`Invalid new start time format: ${params.newStartTime}`);
  }

  const newEndDate = addMinutes(newStartDate, service.duration_minutes);
  const newStartIso = newStartDate.toISOString();
  const newEndIso = newEndDate.toISOString();

  const conflictRes = await db.query(
    `SELECT id FROM bookings 
     WHERE status = 'CONFIRMED' 
     AND service_id = $1 
     AND id != $2
     AND (start_time < $4 AND end_time > $3)`,
    [existingBooking.service_id, existingBooking.id, newStartIso, newEndIso]
  );

  if (conflictRes.rows.length > 0) {
    throw new Error(`Slot Conflict: New time slot ${format(newStartDate, 'PPpp')} is unavailable. Choose another slot.`);
  }

  const nowIso = new Date().toISOString();
  await db.query(
    `UPDATE bookings 
     SET start_time = $1, end_time = $2, status = 'RESCHEDULED', updated_at = $3 
     WHERE id = $4`,
    [newStartIso, newEndIso, nowIso, existingBooking.id]
  );

  const updatedRes = await db.query('SELECT * FROM bookings WHERE id = $1', [existingBooking.id]);
  return {
    ...updatedRes.rows[0],
    service_name: service.name,
    department_name: service.department_name,
    doctor_name: service.doctor_name,
  };
}
