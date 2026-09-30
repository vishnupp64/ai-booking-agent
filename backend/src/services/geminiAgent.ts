import { GoogleGenerativeAI, FunctionDeclaration, SchemaType } from '@google/generative-ai';
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
} from './bookingService.js';
import { ChatMessage, AvailabilityResult, Appointment, Patient } from '../types/index.js';
import { format, addDays } from 'date-fns';

// 1. Tool Declarations for Gemini Function Calling
const getDepartmentsTool: FunctionDeclaration = {
  name: 'getDepartments',
  description: 'Retrieve hospital departments (Cardiology, Neurology, Radiology, Laboratory, Surgery, Preventive Health).',
  parameters: { type: SchemaType.OBJECT, properties: {} },
};

const getDoctorsTool: FunctionDeclaration = {
  name: 'getDoctors',
  description: 'Retrieve specialist doctors, qualifications, experience, and consultation fees.',
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      departmentId: { type: SchemaType.STRING, description: 'Optional department filter ID' },
    },
  },
};

const getServicesTool: FunctionDeclaration = {
  name: 'getServices',
  description: 'Retrieve services across categories: Doctor Consultation, Blood Test, Laboratory Test, Scanning & Radiology, Health Package, Surgical Operation.',
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      category: { type: SchemaType.STRING, description: 'Optional category filter' },
      departmentId: { type: SchemaType.STRING, description: 'Optional department ID' },
    },
  },
};

const checkAvailabilityTool: FunctionDeclaration = {
  name: 'checkAvailability',
  description: 'Check real-time slot availability from PostgreSQL DB for a doctor or service on a date (YYYY-MM-DD). NEVER guess or invent slots!',
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      serviceId: { type: SchemaType.STRING, description: 'Service ID (e.g. srv-cardiology, srv-blood-panel, srv-mri-scan, srv-surgery)' },
      doctorId: { type: SchemaType.STRING, description: 'Doctor ID' },
      date: { type: SchemaType.STRING, description: 'Target date YYYY-MM-DD' },
    },
    required: ['date'],
  },
};

const lookupPatientTool: FunctionDeclaration = {
  name: 'lookupPatient',
  description: 'Lookup existing patient record by mobile number, email, UHID, or full name. ALWAYS call this tool first when a patient name is mentioned!',
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      query: { type: SchemaType.STRING, description: 'Mobile number, email, UHID (e.g., UHID-98214), or Patient Full Name' },
    },
    required: ['query'],
  },
};

const createPatientTool: FunctionDeclaration = {
  name: 'createPatient',
  description: 'Register or update a patient record in PostgreSQL. Returns assigned UHID.',
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      fullName: { type: SchemaType.STRING, description: 'Full name of patient' },
      dob: { type: SchemaType.STRING, description: 'Date of birth YYYY-MM-DD' },
      gender: { type: SchemaType.STRING, description: 'Male, Female, or Other' },
      mobileNumber: { type: SchemaType.STRING, description: '10-digit Indian mobile number' },
      email: { type: SchemaType.STRING, description: 'Patient email address' },
      address: { type: SchemaType.STRING, description: 'Optional address' },
      emergencyContact: { type: SchemaType.STRING, description: 'Optional emergency contact' },
    },
    required: ['fullName', 'mobileNumber', 'email'],
  },
};

const createAppointmentTool: FunctionDeclaration = {
  name: 'createAppointment',
  description: 'Create a confirmed medical appointment in PostgreSQL after validating patient details.',
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      serviceId: { type: SchemaType.STRING, description: 'Service ID' },
      patientName: { type: SchemaType.STRING, description: 'Patient full name' },
      patientEmail: { type: SchemaType.STRING, description: 'Patient email' },
      patientPhone: { type: SchemaType.STRING, description: 'Patient mobile number' },
      dob: { type: SchemaType.STRING, description: 'Patient Date of Birth YYYY-MM-DD' },
      gender: { type: SchemaType.STRING, description: 'Gender' },
      startTime: { type: SchemaType.STRING, description: 'ISO 8601 start time' },
      notes: { type: SchemaType.STRING, description: 'Symptoms or notes' },
    },
    required: ['serviceId', 'patientName', 'patientEmail', 'patientPhone', 'startTime'],
  },
};

const getAppointmentTool: FunctionDeclaration = {
  name: 'getAppointment',
  description: 'Lookup existing medical appointment details by reference code (MED-XXXXX), UHID, or email.',
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      query: { type: SchemaType.STRING, description: 'Reference code (MED-XXXXX), UHID, or email' },
    },
    required: ['query'],
  },
};

const cancelAppointmentTool: FunctionDeclaration = {
  name: 'cancelAppointment',
  description: 'Cancel an existing confirmed medical appointment in PostgreSQL.',
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      referenceCode: { type: SchemaType.STRING, description: 'Medical reference code (MED-XXXXX) or UHID' },
      customerEmail: { type: SchemaType.STRING, description: 'Patient email' },
    },
    required: ['referenceCode'],
  },
};

const rescheduleAppointmentTool: FunctionDeclaration = {
  name: 'rescheduleAppointment',
  description: 'Reschedule an existing medical appointment to a new date/time slot in PostgreSQL.',
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      referenceCode: { type: SchemaType.STRING, description: 'Medical reference code (MED-XXXXX) or UHID' },
      newStartTime: { type: SchemaType.STRING, description: 'New start time ISO string' },
    },
    required: ['referenceCode', 'newStartTime'],
  },
};

const systemInstruction = `
You are Aura Health AI, the primary Medical & Hospital Booking Agent for LifeCare Cybernetic Medical Center.
You assist patients in booking Doctor Consultations, Laboratory Blood Tests, Radiology/MRI Scans, Health Checkups & Packages, and Surgical Operations.

CRITICAL OPERATIONAL RULES:
1. REAL-TIME AVAILABILITY SOURCE OF TRUTH: Slot availability MUST ALWAYS come directly from PostgreSQL via \`checkAvailability\`. NEVER invent or guess slots!
2. EXISTING PATIENT RECOGNITION: When a patient's name, email, phone, or UHID is mentioned, ALWAYS call \`lookupPatient\` first. If an existing record is found, acknowledge their UHID and DO NOT repeatedly ask for details already available! Only request missing required fields (such as mobile number or email).
3. PATIENT DETAILS COLLECTION: Missing patient details (Full Name, Date of Birth, Gender, 10-Digit Mobile, Email) must be collected naturally.
4. DUPLICATE BOOKING PREVENTION: Warn patients if they already have an overlapping appointment.
5. PREPARATION INSTRUCTIONS: Remind patients of fasting (8-12 hours for blood tests, 6 hours for operations) and MRI safety (remove metals).
6. CURRENT DATE CONTEXT: Today is ${format(new Date(), 'EEEE, MMMM d, yyyy')} (ISO: ${new Date().toISOString().split('T')[0]}). Convert relative dates like "tomorrow", "this Friday" to YYYY-MM-DD.
7. EMPATHETIC MEDICAL TONE: Maintain a supportive, highly clear, and reassuring tone.
`;

export async function processUserMessage(
  userText: string,
  history: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }> = []
): Promise<ChatMessage> {
  const apiKey = process.env.GEMINI_API_KEY;

  let capturedAvailableSlots: AvailabilityResult | undefined;
  let capturedPatient: Patient | undefined;
  let capturedAppointment: Appointment | undefined;
  const toolCallsExecuted: Array<{ name: string; args: any; result: any }> = [];

  const executeToolCall = async (name: string, args: any) => {
    console.log(`🤖 Hospital Agent executing tool '${name}' with args:`, JSON.stringify(args));
    let result: any;

    if (name === 'getDepartments') {
      result = await getDepartments();
    } else if (name === 'getDoctors') {
      result = await getDoctors(args.departmentId);
    } else if (name === 'getServices') {
      result = await getServices(args.category, args.departmentId);
    } else if (name === 'checkAvailability') {
      let date = args.date;
      if (!date || date.includes('tomorrow')) {
        date = format(addDays(new Date(), 1), 'yyyy-MM-dd');
      } else if (date.includes('today')) {
        date = format(new Date(), 'yyyy-MM-dd');
      }
      const serviceId = args.serviceId || 'srv-cardiology';
      result = await checkAvailability(serviceId, args.doctorId, date);
      capturedAvailableSlots = result;
    } else if (name === 'lookupPatient') {
      result = await lookupPatient(args.query);
      if (result) capturedPatient = result;
    } else if (name === 'createPatient') {
      result = await createOrUpdatePatient({
        fullName: args.fullName,
        dob: args.dob,
        gender: args.gender,
        mobileNumber: args.mobileNumber,
        email: args.email,
        address: args.address,
        emergencyContact: args.emergencyContact,
      });
      capturedPatient = result;
    } else if (name === 'createAppointment') {
      result = await createAppointment({
        serviceId: args.serviceId,
        patientName: args.patientName,
        patientEmail: args.patientEmail,
        patientPhone: args.patientPhone,
        dob: args.dob,
        gender: args.gender,
        startTime: args.startTime,
        notes: args.notes,
      });
      capturedAppointment = result;
    } else if (name === 'getAppointment') {
      result = await getAppointment(args.query);
    } else if (name === 'cancelAppointment') {
      result = await cancelAppointment({
        referenceCode: args.referenceCode,
        customerEmail: args.customerEmail,
      });
      capturedAppointment = result;
    } else if (name === 'rescheduleAppointment') {
      result = await rescheduleAppointment({
        referenceCode: args.referenceCode,
        newStartTime: args.newStartTime,
      });
      capturedAppointment = result;
    } else {
      throw new Error(`Unknown tool: ${name}`);
    }

    toolCallsExecuted.push({ name, args, result });
    return result;
  };

  if (apiKey) {
    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({
        model: 'gemini-2.5-flash',
        systemInstruction,
        tools: [
          {
            functionDeclarations: [
              getDepartmentsTool,
              getDoctorsTool,
              getServicesTool,
              checkAvailabilityTool,
              lookupPatientTool,
              createPatientTool,
              createAppointmentTool,
              getAppointmentTool,
              cancelAppointmentTool,
              rescheduleAppointmentTool,
            ],
          },
        ],
      });

      const chat = model.startChat({ history });
      let response = await chat.sendMessage(userText);
      let candidate = response.response;

      let turn = 0;
      while (candidate.functionCalls() && candidate.functionCalls()!.length > 0 && turn < 4) {
        turn++;
        const functionCalls = candidate.functionCalls()!;
        const functionResponses = [];

        for (const call of functionCalls) {
          const toolResult = await executeToolCall(call.name, call.args);
          functionResponses.push({
            functionResponse: {
              name: call.name,
              response: { result: toolResult },
            },
          });
        }

        response = await chat.sendMessage(functionResponses);
        candidate = response.response;
      }

      const replyText = candidate.text() || 'I have processed your hospital request.';

      return {
        id: `msg-${Date.now()}`,
        sender: 'agent',
        text: replyText,
        timestamp: new Date().toISOString(),
        toolCallsExecuted: toolCallsExecuted.length > 0 ? toolCallsExecuted : undefined,
        availableSlots: capturedAvailableSlots,
        foundPatient: capturedPatient,
        appointmentResult: capturedAppointment,
      };
    } catch (err: any) {
      console.error('Gemini API execution error:', err);
    }
  }

  // --- LOCAL FALLBACK AGENT ROUTER ---
  console.log('ℹ️ Running local fallback agent router with full hospital tool execution...');

  const lower = userText.toLowerCase();
  let agentReply = '';

  if (lower.includes('john') || lower.includes('john thomas') || lower.includes('patient') || lower.includes('uhid')) {
    const queryName = lower.includes('john') ? 'John Thomas' : userText;
    const pat = await executeToolCall('lookupPatient', { query: queryName });
    if (pat) {
      agentReply = `I found **${pat.full_name}**'s existing patient record (**${pat.uhid}**).\n\n` +
        `• Registered Mobile: **${pat.mobile_number}**\n` +
        `• Email: **${pat.email}**\n` +
        `• DOB: ${pat.dob || 'N/A'} | Gender: ${pat.gender || 'N/A'}\n\n` +
        `I will use these details for your booking. Please select an available slot below to proceed:`;
      const tomorrow = format(addDays(new Date(), 1), 'yyyy-MM-dd');
      await executeToolCall('checkAvailability', { serviceId: 'srv-blood-panel', date: tomorrow });
    } else {
      agentReply = `I could not find an existing patient record matching "${queryName}". Let's create a new patient registration. Please provide the patient's Full Name, Mobile Number, and Email.`;
    }
  } else if (lower.includes('blood') || lower.includes('lab') || lower.includes('test')) {
    const tomorrow = format(addDays(new Date(), 1), 'yyyy-MM-dd');
    const avail = await executeToolCall('checkAvailability', { serviceId: 'srv-blood-panel', date: tomorrow });
    agentReply = `I checked our Pathology Laboratory schedule for **${avail.serviceName}** on **${avail.dayOfWeek}, ${avail.date}**.\n\n` +
      `⚠️ **Fasting Notice**: Blood tests require 8-12 hours overnight fasting.\n\n` +
      `We have **${avail.slots.filter((s: any) => s.available).length} available specimen collection slots**. Click a slot below to proceed with patient confirmation:`;
  } else if (lower.includes('mri') || lower.includes('scan') || lower.includes('radiology')) {
    const tomorrow = format(addDays(new Date(), 1), 'yyyy-MM-dd');
    const avail = await executeToolCall('checkAvailability', { serviceId: 'srv-mri-scan', date: tomorrow });
    agentReply = `I checked the Radiology suite for **${avail.serviceName}** on **${avail.dayOfWeek}, ${avail.date}**.\n\n` +
      `⚠️ **MRI Prep**: Please remove all metallic jewelry/accessories prior to scanning.\n\n` +
      `Here are available MRI scan slots:`;
  } else if (lower.includes('doctor') || lower.includes('cardiologist') || lower.includes('neurologist')) {
    const tomorrow = format(addDays(new Date(), 1), 'yyyy-MM-dd');
    const serviceId = lower.includes('neurologist') ? 'srv-neurology' : 'srv-cardiology';
    const avail = await executeToolCall('checkAvailability', { serviceId, date: tomorrow });
    agentReply = `I checked the OPD schedule for **${avail.serviceName}** (${avail.doctorName}) on **${avail.dayOfWeek}, ${avail.date}**.\n\n` +
      `We have **${avail.slots.filter((s: any) => s.available).length} available consultation slots**. Click a time below to confirm:`;
  } else if (lower.includes('cancel')) {
    const match = userText.match(/MED-[A-Z0-9]{5}|UHID-[0-9]{5}/i);
    if (match) {
      try {
        const res = await executeToolCall('cancelAppointment', { referenceCode: match[0].toUpperCase() });
        agentReply = `✅ Medical Appointment **${res.reference_code}** has been successfully cancelled.`;
      } catch (err: any) {
        agentReply = `⚠️ Could not cancel appointment: ${err.message}`;
      }
    } else {
      agentReply = `To cancel your appointment, please state your medical reference code (e.g., **MED-89A42**) or UHID (e.g. **UHID-98214**).`;
    }
  } else {
    const tomorrow = format(addDays(new Date(), 1), 'yyyy-MM-dd');
    const avail = await executeToolCall('checkAvailability', { serviceId: 'srv-cardiology', date: tomorrow });
    agentReply = `Welcome to **LifeCare Cybernetic Medical Center**.\n\n` +
      `I checked our database for **${avail.serviceName}** on **${avail.dayOfWeek}, ${avail.date}**.\n\n` +
      `We have **${avail.slots.filter((s: any) => s.available).length} open slots**. Select a time slot below to proceed:`;
  }

  return {
    id: `msg-${Date.now()}`,
    sender: 'agent',
    text: agentReply,
    timestamp: new Date().toISOString(),
    toolCallsExecuted: toolCallsExecuted.length > 0 ? toolCallsExecuted : undefined,
    availableSlots: capturedAvailableSlots,
    foundPatient: capturedPatient,
    appointmentResult: capturedAppointment,
  };
}
