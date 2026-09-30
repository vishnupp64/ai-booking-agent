import { getDb } from './index.js';

export async function seedDatabase() {
  const db = getDb();

  console.log('🌱 Seeding Hospital Departments, Doctors, Services, and Patient Records...');

  // 1. Seed Departments
  const departments = [
    {
      id: 'dept-cardiology',
      name: 'Cardiology',
      description: 'Comprehensive cardiovascular care, ECG, echocardiograms, and heart health screening.',
      icon_name: 'HeartPulse',
    },
    {
      id: 'dept-neurology',
      name: 'Neurology & Brain Health',
      description: 'Diagnosis and treatment of neurological disorders, stroke, migraines, and nerve care.',
      icon_name: 'Activity',
    },
    {
      id: 'dept-radiology',
      name: 'Radiology & Imaging',
      description: 'High-resolution MRI, CT Scans, Ultrasound, Mammography, and Digital X-Rays.',
      icon_name: 'Scan',
    },
    {
      id: 'dept-pathology',
      name: 'Laboratory & Pathology',
      description: 'Automated blood testing, hematology, lipid profiles, metabolic panels, and biopsies.',
      icon_name: 'TestTube',
    },
    {
      id: 'dept-surgery',
      name: 'Outpatient Surgical Suite',
      description: 'Minor procedures, endoscopy, biopsies, and day surgeries under sterile anesthesia.',
      icon_name: 'Scissors',
    },
    {
      id: 'dept-preventive',
      name: 'Preventive Health & Wellness',
      description: 'Full-body executive checkups, cardiac risk packages, and wellness screenings.',
      icon_name: 'ShieldCheck',
    },
  ];

  for (const dept of departments) {
    await db.query(
      `INSERT INTO departments (id, name, description, icon_name)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (id) DO UPDATE SET
         name = EXCLUDED.name,
         description = EXCLUDED.description,
         icon_name = EXCLUDED.icon_name;`,
      [dept.id, dept.name, dept.description, dept.icon_name]
    );
  }

  // 2. Seed Doctors
  const doctors = [
    {
      id: 'doc-jenkins',
      department_id: 'dept-cardiology',
      name: 'Dr. Sarah Jenkins, MD',
      specialty: 'Senior Cardiologist & Interventionalist',
      qualification: 'MBBS, MD (Cardiology), FACC',
      experience_years: 16,
      consultation_fee: 150.00,
      available_days: 'Mon-Sat',
    },
    {
      id: 'doc-mercer',
      department_id: 'dept-neurology',
      name: 'Dr. Alex Mercer, MD',
      specialty: 'Neurologist & Neurophysiologist',
      qualification: 'MBBS, DM (Neurology)',
      experience_years: 14,
      consultation_fee: 180.00,
      available_days: 'Mon-Fri',
    },
    {
      id: 'doc-vance',
      department_id: 'dept-radiology',
      name: 'Dr. Robert Vance, MD',
      specialty: 'Chief Radiologist & Diagnostic Imaging',
      qualification: 'MD (Radiodiagnosis)',
      experience_years: 18,
      consultation_fee: 140.00,
      available_days: 'Mon-Sat',
    },
    {
      id: 'doc-rostova',
      department_id: 'dept-surgery',
      name: 'Dr. Elena Rostova, FACS',
      specialty: 'General & Outpatient Surgeon',
      qualification: 'MS (Surgery), FACS',
      experience_years: 12,
      consultation_fee: 200.00,
      available_days: 'Tue-Sat',
    },
    {
      id: 'doc-wong',
      department_id: 'dept-preventive',
      name: 'Dr. Emily Wong, MD',
      specialty: 'Preventive Care & OPD Physician',
      qualification: 'MBBS, MD (Internal Medicine)',
      experience_years: 10,
      consultation_fee: 90.00,
      available_days: 'Mon-Sat',
    },
  ];

  for (const doc of doctors) {
    await db.query(
      `INSERT INTO doctors (id, department_id, name, specialty, qualification, experience_years, consultation_fee, available_days)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (id) DO UPDATE SET
         department_id = EXCLUDED.department_id,
         name = EXCLUDED.name,
         specialty = EXCLUDED.specialty,
         qualification = EXCLUDED.qualification,
         experience_years = EXCLUDED.experience_years,
         consultation_fee = EXCLUDED.consultation_fee,
         available_days = EXCLUDED.available_days;`,
      [doc.id, doc.department_id, doc.name, doc.specialty, doc.qualification, doc.experience_years, doc.consultation_fee, doc.available_days]
    );
  }

  // 3. Seed Hospital Services across all categories
  const services = [
    {
      id: 'srv-cardiology',
      category: 'Doctor Consultation',
      department_id: 'dept-cardiology',
      doctor_id: 'doc-jenkins',
      name: 'Cardiology Specialist Consultation & ECG',
      description: 'Specialist examination with Dr. Sarah Jenkins, blood pressure monitoring, and resting ECG.',
      prep_instructions: 'Avoid caffeine 2 hours prior to consultation. Bring previous medical history.',
      duration_minutes: 45,
      price: 150.00,
    },
    {
      id: 'srv-neurology',
      category: 'Doctor Consultation',
      department_id: 'dept-neurology',
      doctor_id: 'doc-mercer',
      name: 'Neurology Consultation',
      description: 'Expert neurological assessment for migraines, nerve care, and memory disorders.',
      prep_instructions: 'Bring list of current medications and diagnostic history.',
      duration_minutes: 45,
      price: 180.00,
    },
    {
      id: 'srv-blood-panel',
      category: 'Blood Test',
      department_id: 'dept-pathology',
      doctor_id: null,
      name: 'Comprehensive Blood Panel & Lipid Profile',
      description: 'Complete blood count (CBC), lipid profile, liver function, renal panel, and blood sugar.',
      prep_instructions: 'Requires 8-12 hours of overnight fasting. Water intake permitted.',
      duration_minutes: 15,
      price: 65.00,
    },
    {
      id: 'srv-thyroid-test',
      category: 'Laboratory Test',
      department_id: 'dept-pathology',
      doctor_id: null,
      name: 'Advanced Thyroid Profile (T3, T4, TSH)',
      description: 'Laboratory blood assay evaluating thyroid hormone levels and metabolic function.',
      prep_instructions: 'Fasting for 4 hours recommended. Morning collection preferred.',
      duration_minutes: 15,
      price: 50.00,
    },
    {
      id: 'srv-mri-scan',
      category: 'Scanning & Radiology',
      department_id: 'dept-radiology',
      doctor_id: 'doc-vance',
      name: 'High-Field 3T MRI Diagnostic Scan',
      description: 'High-resolution MRI scan for brain, spine, knee, or joint imaging.',
      prep_instructions: 'Remove all metal jewelry/piercings prior to entering scanning suite.',
      duration_minutes: 45,
      price: 350.00,
    },
    {
      id: 'srv-ct-scan',
      category: 'Scanning & Radiology',
      department_id: 'dept-radiology',
      doctor_id: 'doc-vance',
      name: 'Whole Body CT Scan & Radiographs',
      description: 'Cross-sectional computed tomography scan for chest, abdomen, or pelvis.',
      prep_instructions: 'Fasting 4 hours prior if contrast dye is administered.',
      duration_minutes: 30,
      price: 280.00,
    },
    {
      id: 'srv-executive-package',
      category: 'Health Package',
      department_id: 'dept-preventive',
      doctor_id: 'doc-wong',
      name: 'Master Executive Health Package (60+ Biomarkers)',
      description: 'Complete health checkup: Blood test, ECG, Chest X-Ray, Abdominal Ultrasound, and Physician Consultation.',
      prep_instructions: 'Requires 12 hours fasting. Arrive at 8:00 AM for lab specimen collection.',
      duration_minutes: 120,
      price: 299.00,
    },
    {
      id: 'srv-cardiac-checkup',
      category: 'Health Checkup',
      department_id: 'dept-cardiology',
      doctor_id: 'doc-jenkins',
      name: 'Comprehensive Cardiac Health Screening',
      description: 'Treadmill Stress Test (TMT), Echocardiogram, Lipid Assays, and Cardiologist Evaluation.',
      prep_instructions: 'Wear comfortable athletic footwear and clothing for treadmill test.',
      duration_minutes: 90,
      price: 240.00,
    },
    {
      id: 'srv-surgery',
      category: 'Surgical Operation',
      department_id: 'dept-surgery',
      doctor_id: 'doc-rostova',
      name: 'Minor Outpatient Surgical Operation',
      description: 'Day-care minor surgical excision, biopsy, lesion removal under local or sedation anesthesia.',
      prep_instructions: 'Strict NPO (Fasting) for 6 hours. Arrange an adult escort for post-op discharge.',
      duration_minutes: 90,
      price: 550.00,
    },
  ];

  for (const srv of services) {
    await db.query(
      `INSERT INTO services (id, category, department_id, doctor_id, name, description, prep_instructions, duration_minutes, price)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT (id) DO UPDATE SET
         category = EXCLUDED.category,
         department_id = EXCLUDED.department_id,
         doctor_id = EXCLUDED.doctor_id,
         name = EXCLUDED.name,
         description = EXCLUDED.description,
         prep_instructions = EXCLUDED.prep_instructions,
         duration_minutes = EXCLUDED.duration_minutes,
         price = EXCLUDED.price;`,
      [srv.id, srv.category, srv.department_id, srv.doctor_id, srv.name, srv.description, srv.prep_instructions, srv.duration_minutes, srv.price]
    );
  }

  // 4. Seed Patients (Pre-existing patient records for smart lookup testing)
  const existingPatients = [
    {
      id: 'pat-1001',
      uhid: 'UHID-98214',
      full_name: 'John Thomas',
      dob: '1988-05-14',
      gender: 'Male',
      mobile_number: '9876543210',
      email: 'john.thomas@example.com',
      address: '42 Marine Drive, Mumbai',
      emergency_contact: '+91 98765 00000 (Wife - Mary Thomas)',
    },
    {
      id: 'pat-1002',
      uhid: 'UHID-74125',
      full_name: 'Priya Sharma',
      dob: '1995-11-20',
      gender: 'Female',
      mobile_number: '9812345678',
      email: 'priya.sharma@example.com',
      address: '15 Connaught Place, New Delhi',
      emergency_contact: '+91 98123 11111 (Father - Rajesh Sharma)',
    },
  ];

  for (const pat of existingPatients) {
    await db.query(
      `INSERT INTO patients (id, uhid, full_name, dob, gender, mobile_number, email, address, emergency_contact)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT (id) DO UPDATE SET
         uhid = EXCLUDED.uhid,
         full_name = EXCLUDED.full_name,
         dob = EXCLUDED.dob,
         gender = EXCLUDED.gender,
         mobile_number = EXCLUDED.mobile_number,
         email = EXCLUDED.email,
         address = EXCLUDED.address,
         emergency_contact = EXCLUDED.emergency_contact;`,
      [pat.id, pat.uhid, pat.full_name, pat.dob, pat.gender, pat.mobile_number, pat.email, pat.address, pat.emergency_contact]
    );
  }

  // 5. Seed OPD Business Hours
  const hours = [
    { day_of_week: 0, start_time: '10:00', end_time: '14:00', is_open: true },
    { day_of_week: 1, start_time: '08:00', end_time: '18:00', is_open: true },
    { day_of_week: 2, start_time: '08:00', end_time: '18:00', is_open: true },
    { day_of_week: 3, start_time: '08:00', end_time: '18:00', is_open: true },
    { day_of_week: 4, start_time: '08:00', end_time: '18:00', is_open: true },
    { day_of_week: 5, start_time: '08:00', end_time: '18:00', is_open: true },
    { day_of_week: 6, start_time: '09:00', end_time: '16:00', is_open: true },
  ];

  for (const h of hours) {
    await db.query(
      `INSERT INTO business_hours (day_of_week, start_time, end_time, is_open)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (day_of_week) DO UPDATE SET
         start_time = EXCLUDED.start_time,
         end_time = EXCLUDED.end_time,
         is_open = EXCLUDED.is_open;`,
      [h.day_of_week, h.start_time, h.end_time, h.is_open]
    );
  }

  console.log('✅ Hospital Seeding completed successfully.');
}

// Standalone execution support
import { initDb } from './index.js';
if (process.argv[1] && process.argv[1].replace(/\\/g, '/').includes('seed')) {
  (async () => {
    try {
      await initDb();
      await seedDatabase();
      console.log('🎉 Seeding finished successfully!');
      process.exit(0);
    } catch (err) {
      console.error('❌ Seeding failed:', err);
      process.exit(1);
    }
  })();
}
