export type BookingCategory = 
  | 'Doctor Consultation' 
  | 'Scanning & Radiology' 
  | 'Blood Test' 
  | 'Laboratory Test' 
  | 'Health Checkup' 
  | 'Health Package' 
  | 'Surgical Operation' 
  | 'Other';

export interface Department {
  id: string;
  name: string;
  description: string;
  icon_name?: string;
}

export interface Doctor {
  id: string;
  department_id: string;
  department_name?: string;
  name: string;
  specialty: string;
  qualification: string;
  experience_years: number;
  consultation_fee: number;
  available_days?: string;
}

export interface Patient {
  id: string;
  uhid: string; // e.g. UHID-98214
  full_name: string;
  dob?: string; // YYYY-MM-DD
  gender?: 'Male' | 'Female' | 'Other';
  mobile_number: string; // 10 digits
  email: string;
  address?: string;
  emergency_contact?: string;
  created_at?: string;
}

export interface Service {
  id: string;
  category: BookingCategory;
  department_id?: string;
  department_name?: string;
  doctor_id?: string;
  doctor_name?: string;
  name: string;
  description: string;
  prep_instructions?: string;
  duration_minutes: number;
  price: number;
  created_at?: string;
}

export interface BusinessHours {
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_open: boolean;
}

export type AppointmentStatus = 'CONFIRMED' | 'CANCELLED' | 'RESCHEDULED';

export interface Appointment {
  id: string;
  reference_code: string;
  service_id: string;
  service_name?: string;
  category?: BookingCategory;
  department_id?: string;
  department_name?: string;
  doctor_id?: string;
  doctor_name?: string;
  patient_id?: string;
  uhid?: string;
  customer_name: string;
  customer_email: string;
  customer_phone?: string;
  dob?: string;
  gender?: string;
  emergency_contact?: string;
  start_time: string;
  end_time: string;
  status: AppointmentStatus;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface TimeSlot {
  time: string;
  displayTime: string;
  isoString: string;
  available: boolean;
}

export interface AvailabilityResult {
  serviceId?: string;
  serviceName?: string;
  doctorId?: string;
  doctorName?: string;
  category?: string;
  departmentName?: string;
  durationMinutes: number;
  date: string;
  dayOfWeek: string;
  isOpen: boolean;
  slots: TimeSlot[];
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'agent' | 'system';
  text: string;
  timestamp: string;
  toolCallsExecuted?: Array<{ name: string; args: any; result: any }>;
  availableSlots?: AvailabilityResult;
  departmentsList?: Department[];
  doctorsList?: Doctor[];
  servicesList?: Service[];
  foundPatient?: Patient;
  appointmentResult?: Appointment;
}
