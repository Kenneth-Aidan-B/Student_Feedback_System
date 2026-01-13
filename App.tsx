import React, { useState } from 'react';
import StudentPortal from './views/StudentPortal';
import AdminDashboard from './views/AdminDashboard';
import HODDashboard from './views/HODDashboard';
import { Button, Card, Input } from './components/ui';
import { UserRole, AdminContext, HODContext, DepartmentCode } from './types';

// Extracted LandingPage to prevent re-rendering issues causing input focus loss
const LandingPage = ({ 
  onStudentEnter, 
  accessCode, 
  setAccessCode, 
  handleAccessCode 
}: { 
  onStudentEnter: () => void, 
  accessCode: string, 
  setAccessCode: (s: string) => void, 
  handleAccessCode: () => void 
}) => (
  <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
    <div className="text-center mb-10">
      <h1 className="text-4xl font-extrabold text-indigo-900 mb-2 tracking-tight">EduFeedback AI</h1>
      <p className="text-gray-500">Secure. Anonymous. Insightful.</p>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl w-full">
      <Card className="p-8 hover:shadow-lg transition-shadow border-t-4 border-indigo-500 cursor-pointer" >
         <div className="h-full flex flex-col items-center justify-center text-center" onClick={onStudentEnter}>
           <div className="text-6xl mb-4">🎓</div>
           <h2 className="text-2xl font-bold text-gray-800 mb-2">Student Portal</h2>
           <p className="text-gray-500 text-sm">Provide anonymous feedback on your courses and faculty.</p>
           <Button className="mt-6">Enter Portal</Button>
         </div>
      </Card>

      <Card className="p-8 border-t-4 border-gray-500">
         <div className="h-full flex flex-col">
           <div className="text-center mb-6">
              <div className="text-6xl mb-4">🔐</div>
              <h2 className="text-2xl font-bold text-gray-800">Staff Access</h2>
              <p className="text-gray-500 text-sm">Admin & HOD Dashboard</p>
           </div>
           
           <div className="space-y-4">
             <Input 
               placeholder="Enter Access Code (e.g. 23CSE, 35IT)" 
               value={accessCode}
               onChange={(e: any) => setAccessCode(e.target.value)}
             />
             <Button variant="secondary" className="w-full" onClick={handleAccessCode}>
               Access Dashboard
             </Button>
           </div>
           
           <div className="mt-6 text-xs text-gray-400 text-center border-t pt-4">
             <p>Admin Format: XYDEPT (Year, Sem, Dept)</p>
             <p>Example: 23CSE = Year 2, Sem 3, CSE</p>
           </div>
         </div>
      </Card>
    </div>
  </div>
);

const App = () => {
  const [role, setRole] = useState<UserRole>(null);
  
  // Auth State
  const [accessCode, setAccessCode] = useState('');
  
  // Context State
  const [adminContext, setAdminContext] = useState<AdminContext | null>(null);
  const [hodContext, setHodContext] = useState<HODContext | null>(null);

  const handleAccessCode = () => {
    const code = accessCode.trim().toUpperCase();

    // Admin Regex: XYDEPT (e.g., 23CSE -> Year 2, Sem 3, CSE)
    // Group 1: Year (1 digit)
    // Group 2: Semester (1 digit)
    // Group 3: Dept Code
    const adminMatch = code.match(/^(\d)(\d)([A-Z]+)$/);
    if (adminMatch) {
      const year = parseInt(adminMatch[1]);
      const semester = parseInt(adminMatch[2]);
      const dept = adminMatch[3] as DepartmentCode;
      
      const validDepts = ['CSE', 'ECE', 'MECH', 'CIVIL', 'EEE', 'IT', 'SH'];
      
      if (validDepts.includes(dept)) {
         setAdminContext({
           department: dept,
           year: year,
           semester: semester
         });
         setRole('ADMIN');
         return;
      }
    }

    // HOD Regex: HOD-DEPT
    const hodMatch = code.match(/^HOD-([A-Z]+)$/);
    if (hodMatch) {
      const dept = hodMatch[1] as DepartmentCode;
       const validDepts = ['CSE', 'ECE', 'MECH', 'CIVIL', 'EEE', 'IT', 'SH'];
       if (validDepts.includes(dept)) {
         setHodContext({ department: dept });
         setRole('HOD');
         return;
       }
    }

    alert("Invalid Access Code. Use format XYDEPT (e.g., 23CSE for Year 2 Sem 3).");
  };

  return (
    <div className="min-h-screen bg-gray-100 font-sans text-gray-900">
      {role === null && (
        <LandingPage 
          onStudentEnter={() => setRole('STUDENT')}
          accessCode={accessCode}
          setAccessCode={setAccessCode}
          handleAccessCode={handleAccessCode}
        />
      )}
      {role === 'STUDENT' && <StudentPortal onBack={() => setRole(null)} />}
      {role === 'ADMIN' && adminContext && <AdminDashboard context={adminContext} onLogout={() => setRole(null)} />}
      {role === 'HOD' && hodContext && <HODDashboard context={hodContext} onLogout={() => setRole(null)} />}
    </div>
  );
};

export default App;