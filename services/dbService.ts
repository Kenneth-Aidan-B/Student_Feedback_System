import { Feedback, Subject, DepartmentCode } from "../types";

// Initial Dummy Data for Demo Purposes - Expanded for better coverage
const INITIAL_SUBJECTS: Subject[] = [
  // --- YEAR 1 (SH / Common) - Semester 1 (Batch 24) ---
  { id: 'sh_1', name: 'Communicative English', department_code: 'SH', year: 1, semester: 1, is_lab: false, staff_name: 'Dr. Sarah Jones' },
  { id: 'sh_2', name: 'Engineering Mathematics I', department_code: 'SH', year: 1, semester: 1, is_lab: false, staff_name: 'Dr. Ramanujan' },
  { id: 'sh_3', name: 'Engineering Physics', department_code: 'SH', year: 1, semester: 1, is_lab: false, staff_name: 'Dr. Albert Einstein' },
  { id: 'sh_4', name: 'Engineering Chemistry', department_code: 'SH', year: 1, semester: 1, is_lab: false, staff_name: 'Prof. Marie Curie' },
  { id: 'sh_lab_1', name: 'Physics Lab', department_code: 'SH', year: 1, semester: 1, is_lab: true, staff_name: 'Dr. Albert Einstein' },
  // Mapping Year 1 common subjects to other depts for robustness in demo
  { id: 'cse_1_1', name: 'Engineering Mathematics I', department_code: 'CSE', year: 1, semester: 1, is_lab: false, staff_name: 'Dr. Ramanujan' },
  { id: 'cse_1_2', name: 'Python Programming', department_code: 'CSE', year: 1, semester: 1, is_lab: false, staff_name: 'Prof. Guido' },

  // --- CSE YEAR 2 - Semester 3 (Batch 23) ---
  { id: 'cse_2_1', name: 'Data Structures', department_code: 'CSE', year: 2, semester: 3, is_lab: false, staff_name: 'Dr. Alan Turing' },
  { id: 'cse_2_2', name: 'Digital Principles', department_code: 'CSE', year: 2, semester: 3, is_lab: false, staff_name: 'Prof. Ada Lovelace' },
  { id: 'cse_2_3', name: 'Object Oriented Programming', department_code: 'CSE', year: 2, semester: 3, is_lab: false, staff_name: 'Prof. Bjarne' },
  { id: 'cse_lab_2_1', name: 'Data Structures Lab', department_code: 'CSE', year: 2, semester: 3, is_lab: true, staff_name: 'Dr. Alan Turing' },

  // --- CSE YEAR 3 - Semester 5 (Batch 22) ---
  { id: 'cse_3_1', name: 'Theory of Computation', department_code: 'CSE', year: 3, semester: 5, is_lab: false, staff_name: 'Prof. Noam Chomsky' },
  { id: 'cse_3_2', name: 'Database Management Systems', department_code: 'CSE', year: 3, semester: 5, is_lab: false, staff_name: 'Dr. Edgar Codd' },
  { id: 'cse_3_3', name: 'Computer Networks', department_code: 'CSE', year: 3, semester: 5, is_lab: false, staff_name: 'Dr. Vint Cerf' },
  { id: 'cse_lab_3_1', name: 'DBMS Lab', department_code: 'CSE', year: 3, semester: 5, is_lab: true, staff_name: 'Dr. Edgar Codd' },

  // --- CSE YEAR 4 - Semester 7 (Batch 21) ---
  { id: 'cse_4_1', name: 'Cloud Computing', department_code: 'CSE', year: 4, semester: 7, is_lab: false, staff_name: 'Prof. Jeff Bezos' },
  { id: 'cse_4_2', name: 'Machine Learning', department_code: 'CSE', year: 4, semester: 7, is_lab: false, staff_name: 'Dr. Andrew Ng' },
  { id: 'cse_4_3', name: 'Cyber Security', department_code: 'CSE', year: 4, semester: 7, is_lab: false, staff_name: 'Prof. Alice Bob' },

  // --- ECE SAMPLES ---
  { id: 'ece_2_1', name: 'Signals and Systems', department_code: 'ECE', year: 2, semester: 3, is_lab: false, staff_name: 'Dr. Fourier' },
  { id: 'ece_2_2', name: 'Electronic Circuits I', department_code: 'ECE', year: 2, semester: 3, is_lab: false, staff_name: 'Prof. Shockley' },
  { id: 'ece_3_1', name: 'Digital Signal Processing', department_code: 'ECE', year: 3, semester: 5, is_lab: false, staff_name: 'Dr. Shannon' },
  
  // --- MECH SAMPLES ---
  { id: 'mech_2_1', name: 'Thermodynamics', department_code: 'MECH', year: 2, semester: 3, is_lab: false, staff_name: 'Prof. Diesel' },
  { id: 'mech_3_1', name: 'Fluid Mechanics', department_code: 'MECH', year: 3, semester: 5, is_lab: false, staff_name: 'Prof. Pascal' },
];

const INITIAL_FEEDBACKS: Feedback[] = [
  { 
    id: 'fb_1', subject_id: 'cse_2_1', staff_name: 'Dr. Alan Turing', register_number: '21052321001', 
    faculty_rating: 5, difficulty_rating: 4, sentiment: 'Positive', text_feedback: 'Great explanations of trees.', 
    chapters_completed: 3, created_at: new Date().toISOString(), department_code: 'CSE', year: 2, semester: 3 
  },
  { 
    id: 'fb_2', subject_id: 'cse_2_1', staff_name: 'Dr. Alan Turing', register_number: '21052321002', 
    faculty_rating: 4, difficulty_rating: 5, sentiment: 'Neutral', text_feedback: 'A bit fast paced.', 
    chapters_completed: 3, created_at: new Date().toISOString(), department_code: 'CSE', year: 2, semester: 3 
  },
  {
    id: 'fb_3', subject_id: 'sh_2', staff_name: 'Dr. Ramanujan', register_number: '21052421001',
    faculty_rating: 5, difficulty_rating: 5, sentiment: 'Positive', text_feedback: 'Math is beautiful with him.',
    chapters_completed: 2, created_at: new Date().toISOString(), department_code: 'SH', year: 1, semester: 1
  }
];

class MockDB {
  private get<T>(key: string, initial: T): T {
    const stored = localStorage.getItem(key);
    if (!stored) {
      localStorage.setItem(key, JSON.stringify(initial));
      return initial;
    }
    return JSON.parse(stored);
  }

  private set<T>(key: string, data: T) {
    localStorage.setItem(key, JSON.stringify(data));
  }

  async getSubjects(dept: DepartmentCode, year: number, semester: number): Promise<Subject[]> {
    await new Promise(r => setTimeout(r, 400)); // Simulate latency
    const all = this.get<Subject[]>('subjects', INITIAL_SUBJECTS);
    
    // Strict match filter to ensure semesters don't leak
    const strictMatch = all.filter(s => s.department_code === dept && s.year === year && s.semester === semester);
    
    // For demo robustness: If strict match fails, try falling back to just Year match IF strict sem check returns empty.
    // However, user specifically complained about mismatches, so let's stick to strict matching for correctness,
    // assuming INITIAL_SUBJECTS covers the demo paths (1,3,5,7) correctly now.
    return strictMatch;
  }

  async getAllSubjects(): Promise<Subject[]> {
     const all = this.get<Subject[]>('subjects', INITIAL_SUBJECTS);
     return all;
  }

  // HOD View: Get subjects by staff or department logic
  async getSubjectsByDepartment(dept: DepartmentCode): Promise<Subject[]> {
      const all = this.get<Subject[]>('subjects', INITIAL_SUBJECTS);
      // For SH, it might be complex, but usually subjects are marked with dept code
      return all.filter(s => s.department_code === dept);
  }

  // Special for S&H HOD to get all 1st year subjects across depts (if schema supports)
  // Or simply fetch all subjects where Dept is SH
  async getSHSubjects(): Promise<Subject[]> {
      const all = this.get<Subject[]>('subjects', INITIAL_SUBJECTS);
      // Logic: S&H HOD sees First Year staff (often belong to SH dept or teaching 1st year)
      return all.filter(s => s.department_code === 'SH' || s.year === 1);
  }

  async checkFeedbackExists(regNo: string, semester: number, dept: DepartmentCode): Promise<boolean> {
    const all = this.get<Feedback[]>('feedbacks', INITIAL_FEEDBACKS);
    return all.some(f => f.register_number === regNo && f.semester === semester && f.department_code === dept);
  }

  async submitFeedbackBatch(feedbacks: Omit<Feedback, 'id' | 'created_at'>[]): Promise<void> {
    await new Promise(r => setTimeout(r, 800));
    const current = this.get<Feedback[]>('feedbacks', INITIAL_FEEDBACKS);
    const newEntries = feedbacks.map(f => ({
      ...f,
      id: Math.random().toString(36).substr(2, 9),
      created_at: new Date().toISOString()
    }));
    this.set('feedbacks', [...current, ...newEntries]);
  }

  async getFeedbackForAdmin(dept: DepartmentCode, year: number, semester: number): Promise<Feedback[]> {
    await new Promise(r => setTimeout(r, 500));
    const all = this.get<Feedback[]>('feedbacks', INITIAL_FEEDBACKS);
    return all.filter(f => f.department_code === dept && f.year === year && f.semester === semester);
  }

  async getFeedbackForHOD(dept: DepartmentCode): Promise<Feedback[]> {
    await new Promise(r => setTimeout(r, 600));
    const all = this.get<Feedback[]>('feedbacks', INITIAL_FEEDBACKS);
    
    if (dept === 'SH') {
      // SH HOD sees only 1st year data across all
      return all.filter(f => f.year === 1);
    } else {
      // Other HODs see their dept data for Year > 1
      return all.filter(f => f.department_code === dept && f.year > 1);
    }
  }

  async addSubject(subject: Omit<Subject, 'id'>): Promise<void> {
    const all = this.get<Subject[]>('subjects', INITIAL_SUBJECTS);
    const newSub = { ...subject, id: Math.random().toString(36).substr(2, 9) };
    this.set('subjects', [...all, newSub]);
  }

  async deleteSubject(id: string): Promise<void> {
    const all = this.get<Subject[]>('subjects', INITIAL_SUBJECTS);
    this.set('subjects', all.filter(s => s.id !== id));
  }
}

export const dbService = new MockDB();