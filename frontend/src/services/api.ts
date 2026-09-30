import { Service, AvailabilityResult, Booking, ChatMessage, Department, Doctor, Patient } from '../types/booking';

const API_BASE = '/api';

export async function fetchDepartments(): Promise<Department[]> {
  const res = await fetch(`${API_BASE}/departments`);
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'Failed to fetch departments');
  return data.data;
}

export async function fetchDoctors(departmentId?: string): Promise<Doctor[]> {
  const url = departmentId 
    ? `${API_BASE}/doctors?departmentId=${encodeURIComponent(departmentId)}`
    : `${API_BASE}/doctors`;
  const res = await fetch(url);
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'Failed to fetch doctors');
  return data.data;
}

export async function fetchServices(category?: string, departmentId?: string): Promise<Service[]> {
  let url = `${API_BASE}/services`;
  const params = new URLSearchParams();
  if (category) params.append('category', category);
  if (departmentId) params.append('departmentId', departmentId);
  if (params.toString()) url += `?${params.toString()}`;

  const res = await fetch(url);
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'Failed to fetch services');
  return data.data;
}

export async function fetchAvailability(serviceId?: string, doctorId?: string, date?: string): Promise<AvailabilityResult> {
  const params = new URLSearchParams();
  if (serviceId) params.append('serviceId', serviceId);
  if (doctorId) params.append('doctorId', doctorId);
  if (date) params.append('date', date);

  const res = await fetch(`${API_BASE}/availability?${params.toString()}`);
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'Failed to fetch availability');
  return data.data;
}

export async function lookupPatient(query: string): Promise<Patient | null> {
  const res = await fetch(`${API_BASE}/patients/lookup?query=${encodeURIComponent(query)}`);
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'Failed to lookup patient');
  return data.data;
}

export async function createPatient(patientData: {
  fullName: string;
  dob?: string;
  gender?: string;
  mobileNumber: string;
  email: string;
  address?: string;
  emergencyContact?: string;
}): Promise<Patient> {
  const res = await fetch(`${API_BASE}/patients`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patientData),
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'Failed to register patient');
  return data.data;
}

export async function createBooking(payload: {
  serviceId: string;
  patientName: string;
  patientEmail: string;
  patientPhone: string;
  dob?: string;
  gender?: string;
  address?: string;
  emergencyContact?: string;
  startTime: string;
  notes?: string;
}): Promise<Booking> {
  const res = await fetch(`${API_BASE}/bookings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'Failed to create appointment');
  return data.data;
}

export async function searchBookings(query: string): Promise<Booking[]> {
  const res = await fetch(`${API_BASE}/bookings/search?query=${encodeURIComponent(query)}`);
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'Failed to search appointments');
  return data.data;
}

export async function cancelBooking(referenceCode: string, customerEmail?: string): Promise<Booking> {
  const res = await fetch(`${API_BASE}/bookings/cancel`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ referenceCode, customerEmail }),
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'Failed to cancel appointment');
  return data.data;
}

export async function rescheduleBooking(referenceCode: string, newStartTime: string): Promise<Booking> {
  const res = await fetch(`${API_BASE}/bookings/reschedule`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ referenceCode, newStartTime }),
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'Failed to reschedule appointment');
  return data.data;
}

export async function sendChatMessage(
  message: string,
  history: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }> = []
): Promise<ChatMessage> {
  const res = await fetch(`${API_BASE}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message, history }),
  });
  const data = await res.json();
  if (!data.success) throw new Error(data.error || 'Failed to send chat message');
  return data.data;
}

export async function checkBackendHealth(): Promise<{ status: string; geminiKeyConfigured: boolean }> {
  const res = await fetch(`${API_BASE}/health`);
  return res.json();
}
