// © 2026 Kenneth
// Academic & Non-Commercial Use Only
// Commercial use requires explicit permission

export type DepartmentCode = 'CSE' | 'ECE' | 'MECH' | 'CIVIL' | 'EEE' | 'IT' | 'SH';


export interface Subject {
  id: string;
  name: string;
  department_code: DepartmentCode;
  year: number;
  semester: number;
  is_lab: boolean;
  staff_name: string;
}

export interface Feedback {
  id: string;
  subject_id: string;
  staff_name: string;
  register_number: string; // Hashed or stored, but here we just store logic
  faculty_rating: number;
  difficulty_rating: number;
  sentiment: 'Positive' | 'Neutral' | 'Negative';
  text_feedback: string;
  chapters_completed: number;
  experiments_completed?: number; // For labs
  beyond_syllabus_topic?: string;
  created_at: string;
  department_code: DepartmentCode; // De-normalized for easier querying
  year: number;
  semester: number;
}

export interface StaffAnalytics {
  staff_name: string;
  subjects: string[];
  overall_rating: number;
  year_breakdown: {
    2: number;
    3: number;
    4: number;
  };
  sentiment_distribution: {
    Positive: number;
    Neutral: number;
    Negative: number;
  };
  total_feedback: number;
}

export interface SubjectAnalytics {
  subject_id: string;
  subject_name: string;
  avg_faculty_rating: number;
  avg_difficulty_rating: number;
  sentiment_distribution: {
    Positive: number;
    Neutral: number;
    Negative: number;
  };
  total_feedback: number;
  all_text_feedback: string[];
}

export interface AIInsights {
  strengths: string[];
  improvements: string[]; // For subject
  suggestions: string[]; // For subject
  areas_of_concern?: string[]; // For staff
  actionable_suggestions?: string[]; // For staff
}

// Access Context
export type UserRole = 'STUDENT' | 'ADMIN' | 'HOD' | null;

export interface AdminContext {
  department: DepartmentCode;
  year: number;
  semester: number;
}

export interface HODContext {
  department: DepartmentCode;
}
