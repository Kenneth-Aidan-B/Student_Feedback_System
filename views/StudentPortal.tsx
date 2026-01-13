import React, { useState, useEffect } from 'react';
import { dbService } from '../services/dbService';
import { analyzeSentiment } from '../services/geminiService';
import { Subject, DepartmentCode, Feedback } from '../types';
import { Button, Card, Input, Select, StarRating, Loader } from '../components/ui';

interface Props {
  onBack: () => void;
}

const StudentPortal: React.FC<Props> = ({ onBack }) => {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  
  // Selection State
  const [dept, setDept] = useState<DepartmentCode>('CSE');
  const [year, setYear] = useState(1);
  const [semester, setSemester] = useState(1);
  const [regNo, setRegNo] = useState('');

  // Data State
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [feedbackData, setFeedbackData] = useState<Record<string, Partial<Feedback>>>({});

  const validateRegisterNumber = (reg: string, studentYear: number): boolean => {
    // Academic Logic (As requested):
    // Year 1 -> Batch 25 (210525...)
    // Year 2 -> Batch 24 (210524...)
    // Year 3 -> Batch 23 (210523...)
    // Year 4 -> Batch 22 (210522...)
    const batchYearMap: Record<number, string> = {
      1: '25',
      2: '24',
      3: '23',
      4: '22'
    };

    const batch = batchYearMap[studentYear];
    if (!batch) return false;

    // Strict Format: 2105 (College) + Batch + Digits
    const pattern = new RegExp(`^2105${batch}\\d{5,6}$`);
    return pattern.test(reg);
  };

  const handleLogin = async () => {
    // Basic formatting
    const cleanedRegNo = regNo.trim().toUpperCase();

    if (!validateRegisterNumber(cleanedRegNo, year)) {
      // Create helpful error message
      const batch = { 1: '25', 2: '24', 3: '23', 4: '22' }[year];
      alert(`Invalid Register Number for Year ${year}.\nMust start with 2105${batch}... and contain 11-12 digits.`);
      return;
    }

    setLoading(true);
    try {
      // Check duplicate
      const exists = await dbService.checkFeedbackExists(cleanedRegNo, semester, dept);
      if (exists) {
        alert("Feedback already submitted for this semester.");
        setLoading(false);
        return;
      }
      
      const subs = await dbService.getSubjects(dept, year, semester);
      if (subs.length === 0) {
        alert("No subjects found for this cohort (Department/Year/Semester).");
        setLoading(false);
        return;
      }

      setSubjects(subs);
      setStep(2);
    } catch (e) {
      console.error(e);
      alert("Error fetching subjects.");
    } finally {
      setLoading(false);
    }
  };

  const updateFeedback = (subId: string, field: keyof Feedback, value: any) => {
    setFeedbackData(prev => ({
      ...prev,
      [subId]: { ...prev[subId], [field]: value }
    }));
  };

  const handleSubmitAll = async () => {
    // Validation
    for (const sub of subjects) {
      const fb = feedbackData[sub.id];
      if (!fb || !fb.faculty_rating || !fb.difficulty_rating || !fb.chapters_completed) {
        alert(`Please complete feedback for ${sub.name}`);
        return;
      }
      if (!fb.text_feedback || fb.text_feedback.length < 5) {
        alert(`Please provide valid text feedback for ${sub.name} (at least 5 characters)`);
        return;
      }
    }

    setLoading(true);
    try {
      const payload: Omit<Feedback, 'id' | 'created_at'>[] = [];

      for (const sub of subjects) {
        const fb = feedbackData[sub.id]!;
        // AI Analysis
        const sentiment = await analyzeSentiment(fb.text_feedback || "");

        payload.push({
          subject_id: sub.id,
          staff_name: sub.staff_name,
          register_number: regNo,
          faculty_rating: fb.faculty_rating!,
          difficulty_rating: fb.difficulty_rating!,
          sentiment,
          text_feedback: fb.text_feedback!,
          chapters_completed: Number(fb.chapters_completed),
          experiments_completed: sub.is_lab ? Number(fb.experiments_completed || 0) : undefined,
          beyond_syllabus_topic: fb.beyond_syllabus_topic,
          department_code: dept,
          year,
          semester
        });
      }

      await dbService.submitFeedbackBatch(payload);
      setStep(3); // Success
    } catch (e) {
      console.error(e);
      alert("Submission Failed.");
    } finally {
      setLoading(false);
    }
  };

  if (step === 1) {
    return (
      <div className="max-w-md mx-auto mt-10">
        <Card className="p-8">
          <h2 className="text-2xl font-bold text-indigo-900 mb-6">Student Portal</h2>
          
          <Select 
            label="Department"
            value={dept}
            onChange={(e: any) => setDept(e.target.value)}
            options={['CSE', 'ECE', 'MECH', 'CIVIL', 'EEE', 'IT', 'SH'].map(d => ({label: d, value: d}))}
          />

          <div className="grid grid-cols-2 gap-4">
            <Select 
              label="Year" value={year} onChange={(e: any) => setYear(Number(e.target.value))}
              options={[1,2,3,4].map(y => ({label: `Year ${y}`, value: y}))}
            />
            <Select 
              label="Semester" value={semester} onChange={(e: any) => setSemester(Number(e.target.value))}
              options={[1,2,3,4,5,6,7,8].map(s => ({label: `Sem ${s}`, value: s}))}
            />
          </div>

          <Input 
            label="Register Number"
            value={regNo}
            onChange={(e: any) => setRegNo(e.target.value.toUpperCase())}
            placeholder={`e.g. 2105${{1:'25', 2:'24', 3:'23', 4:'22'}[year] || 'XX'}...`}
          />

          <Button onClick={handleLogin} className="w-full mt-4" disabled={loading}>
            {loading ? 'Verifying...' : 'Start Feedback'}
          </Button>
          <Button onClick={onBack} variant="secondary" className="w-full mt-2">Back</Button>
        </Card>
      </div>
    );
  }

  if (step === 3) {
    return (
      <div className="max-w-md mx-auto mt-20 text-center">
        <div className="bg-green-100 text-green-800 p-8 rounded-full h-24 w-24 mx-auto flex items-center justify-center text-4xl mb-4">✓</div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Feedback Submitted</h2>
        <p className="text-gray-600 mb-8">Thank you for your valuable feedback. Your responses have been recorded anonymously.</p>
        <Button onClick={onBack}>Return Home</Button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto py-8 px-4">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-indigo-900">Feedback Form</h2>
        <span className="text-sm bg-indigo-100 text-indigo-800 px-3 py-1 rounded-full">{dept} - Year {year}</span>
      </div>

      {loading && <div className="fixed inset-0 bg-white/80 z-50 flex flex-col items-center justify-center">
         <Loader />
         <p className="mt-4 text-indigo-600 font-medium">Analyzing Feedback with AI...</p>
      </div>}

      <div className="space-y-6">
        {subjects.map((sub, idx) => (
          <Card key={sub.id} className="p-6 border-l-4 border-l-indigo-500">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-bold text-gray-900">{sub.name}</h3>
                <p className="text-sm text-gray-500">{sub.staff_name}</p>
              </div>
              <span className="text-xs text-gray-400">Subject {idx + 1} of {subjects.length}</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Faculty Rating</label>
                <StarRating 
                  value={feedbackData[sub.id]?.faculty_rating || 0}
                  onChange={(v: number) => updateFeedback(sub.id, 'faculty_rating', v)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Difficulty Rating</label>
                <StarRating 
                  value={feedbackData[sub.id]?.difficulty_rating || 0}
                  onChange={(v: number) => updateFeedback(sub.id, 'difficulty_rating', v)}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <Input 
                label="Chapters Completed"
                type="number"
                value={feedbackData[sub.id]?.chapters_completed || ''}
                onChange={(e: any) => updateFeedback(sub.id, 'chapters_completed', e.target.value)}
              />
              {sub.is_lab && (
                 <Input 
                 label="Experiments Completed"
                 type="number"
                 value={feedbackData[sub.id]?.experiments_completed || ''}
                 onChange={(e: any) => updateFeedback(sub.id, 'experiments_completed', e.target.value)}
               />
              )}
            </div>

            <div className="mb-4">
               <label className="flex items-center space-x-2 mb-2">
                 <input type="checkbox" 
                    onChange={(e) => {
                      if(!e.target.checked) updateFeedback(sub.id, 'beyond_syllabus_topic', undefined);
                    }}
                    className="rounded text-indigo-600 focus:ring-indigo-500"
                 />
                 <span className="text-sm text-gray-700">Covered Beyond Syllabus Topic?</span>
               </label>
               <input 
                 type="text"
                 placeholder="If yes, specify topic..."
                 className="w-full px-3 py-2 border border-gray-300 rounded text-sm disabled:bg-gray-100"
                 onChange={(e) => updateFeedback(sub.id, 'beyond_syllabus_topic', e.target.value)}
               />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Detailed Feedback (Required)</label>
              <textarea 
                className="w-full border border-gray-300 rounded-md p-3 text-sm focus:ring-indigo-500 focus:border-indigo-500 bg-white text-gray-900"
                rows={3}
                placeholder="What did you like? What can be improved?"
                value={feedbackData[sub.id]?.text_feedback || ''}
                onChange={(e) => updateFeedback(sub.id, 'text_feedback', e.target.value)}
              />
            </div>
          </Card>
        ))}

        <div className="flex justify-end gap-4 pt-4 pb-12">
           <Button variant="secondary" onClick={onBack}>Cancel</Button>
           <Button onClick={handleSubmitAll} className="px-8">Submit Feedback</Button>
        </div>
      </div>
    </div>
  );
};

export default StudentPortal;