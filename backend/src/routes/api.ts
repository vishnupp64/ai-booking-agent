import { Router } from 'express';
import {
  getDepartments,
  getDoctors,
  getServices,
  checkAvailability,
  lookupPatient,
  createOrUpdatePatient,
  createAppointment,
  getAppointment,
  cancelAppointment,
  rescheduleAppointment,
} from '../services/bookingService.js';
import { processUserMessage } from '../services/geminiAgent.js';

const router = Router();

// 1. Get Departments
router.get('/departments', async (req, res) => {
  try {
    const depts = await getDepartments();
    res.json({ success: true, data: depts });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 2. Get Doctors
router.get('/doctors', async (req, res) => {
  try {
    const departmentId = req.query.departmentId as string;
    const doctors = await getDoctors(departmentId);
    res.json({ success: true, data: doctors });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 3. Get Services (with category filter)
router.get('/services', async (req, res) => {
  try {
    const category = req.query.category as any;
    const departmentId = req.query.departmentId as string;
    const services = await getServices(category, departmentId);
    res.json({ success: true, data: services });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 4. Check Availability
router.get('/availability', async (req, res) => {
  try {
    const { serviceId, doctorId, date } = req.query;
    if (!date) {
      return res.status(400).json({ success: false, error: 'Query parameter "date" (YYYY-MM-DD) is required.' });
    }
    const availability = await checkAvailability(
      serviceId as string,
      doctorId as string,
      date as string
    );
    res.json({ success: true, data: availability });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 5. Patient Lookup
router.get('/patients/lookup', async (req, res) => {
  try {
    const query = req.query.query as string;
    if (!query) {
      return res.status(400).json({ success: false, error: 'Query parameter "query" (Mobile, Email, UHID, or Name) is required.' });
    }
    const patient = await lookupPatient(query);
    res.json({ success: true, data: patient });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 6. Create / Register Patient
router.post('/patients', async (req, res) => {
  try {
    const { fullName, dob, gender, mobileNumber, email, address, emergencyContact, uhid } = req.body;
    const patient = await createOrUpdatePatient({
      fullName,
      dob,
      gender,
      mobileNumber,
      email,
      address,
      emergencyContact,
      uhid,
    });
    res.json({ success: true, data: patient });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// 7. Create Appointment
router.post('/bookings', async (req, res) => {
  try {
    const { serviceId, patientName, patientEmail, patientPhone, dob, gender, address, emergencyContact, startTime, notes } = req.body;
    
    // Support legacy parameters for backwards compatibility
    const name = patientName || req.body.customerName;
    const email = patientEmail || req.body.customerEmail;
    const phone = patientPhone || req.body.customerPhone;

    if (!serviceId || !name || !email || !phone || !startTime) {
      return res.status(400).json({
        success: false,
        error: 'Missing required patient details: serviceId, patientName, patientEmail, patientPhone (10-digit mobile), startTime.',
      });
    }

    const appointment = await createAppointment({
      serviceId,
      patientName: name,
      patientEmail: email,
      patientPhone: phone,
      dob,
      gender,
      address,
      emergencyContact,
      startTime,
      notes,
    });
    res.json({ success: true, data: appointment });
  } catch (err: any) {
    res.status(409).json({ success: false, error: err.message });
  }
});

// 8. Search / Get Appointments
router.get('/bookings/search', async (req, res) => {
  try {
    const query = req.query.query as string;
    if (!query) {
      return res.status(400).json({ success: false, error: 'Query parameter "query" is required.' });
    }
    const appointments = await getAppointment(query);
    res.json({ success: true, data: appointments });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 9. Cancel Appointment
router.post('/bookings/cancel', async (req, res) => {
  try {
    const { referenceCode, customerEmail } = req.body;
    const cancelled = await cancelAppointment({ referenceCode, customerEmail });
    res.json({ success: true, data: cancelled });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// 10. Reschedule Appointment
router.post('/bookings/reschedule', async (req, res) => {
  try {
    const { referenceCode, newStartTime } = req.body;
    if (!newStartTime) {
      return res.status(400).json({ success: false, error: 'newStartTime ISO string is required.' });
    }
    const rescheduled = await rescheduleAppointment({ referenceCode, newStartTime });
    res.json({ success: true, data: rescheduled });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// 11. AI Chat tool calling endpoint
router.post('/chat', async (req, res) => {
  try {
    const { message, history } = req.body;
    if (!message || typeof message !== 'string') {
      return res.status(400).json({ success: false, error: 'User message string is required.' });
    }
    const responseMessage = await processUserMessage(message, history || []);
    res.json({ success: true, data: responseMessage });
  } catch (err: any) {
    console.error('Chat endpoint error:', err);
    res.status(500).json({ success: false, error: err.message || 'Error processing AI response' });
  }
});

// 12. Health check
router.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    system: 'LifeCare Hospital Booking Engine',
    timestamp: new Date().toISOString(),
    geminiKeyConfigured: !!process.env.GEMINI_API_KEY,
  });
});

export default router;
