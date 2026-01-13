import React, { useEffect, useState } from 'react';
import { AdminContext, Feedback, Subject, AIInsights } from '../types';
import { dbService } from '../services/dbService';
import { generateSubjectInsights, generateStaffInsights } from '../services/geminiService';
import { Button, Card, Loader, Input } from '../components/ui';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import * as XLSX from 'xlsx';

interface Props {
  context: AdminContext;
  onLogout: () => void;
}

const AdminDashboard: React.FC<Props> = ({ context, onLogout }) => {
  const [loading, setLoading] = useState(true);
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  
  // AI State
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null);
  const [selectedStaffName, setSelectedStaffName] = useState<string | null>(null);
  
  const [subjectInsights, setSubjectInsights] = useState<AIInsights | null>(null);
  const [staffInsights, setStaffInsights] = useState<AIInsights | null>(null);
  
  const [aiLoading, setAiLoading] = useState(false);
  const [viewMode, setViewMode] = useState<'analytics' | 'manage'>('analytics');

  // New Subject Form
  const [newSubName, setNewSubName] = useState('');
  const [newSubStaff, setNewSubStaff] = useState('');
  const [newSubIsLab, setNewSubIsLab] = useState(false);

  useEffect(() => {
    fetchData();
  }, [context]);

  const fetchData = async () => {
    setLoading(true);
    const [fbData, subData] = await Promise.all([
      dbService.getFeedbackForAdmin(context.department, context.year, context.semester),
      dbService.getSubjects(context.department, context.year, context.semester)
    ]);
    setFeedbacks(fbData);
    setSubjects(subData);
    setLoading(false);
  };

  const calculateSubjectStats = (subId: string) => {
    const subFbs = feedbacks.filter(f => f.subject_id === subId);
    const count = subFbs.length;
    if (count === 0) return null;
    
    const avgFac = subFbs.reduce((acc, c) => acc + c.faculty_rating, 0) / count;
    const avgDiff = subFbs.reduce((acc, c) => acc + c.difficulty_rating, 0) / count;
    
    return { name: subjects.find(s => s.id === subId)?.name, avgFac, avgDiff, count };
  };

  const chartData = subjects.map(s => calculateSubjectStats(s.id)).filter(Boolean);
  
  const sentimentCounts = feedbacks.reduce((acc, curr) => {
    acc[curr.sentiment] = (acc[curr.sentiment] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const pieData = Object.keys(sentimentCounts).map(k => ({ name: k, value: sentimentCounts[k] }));
  const COLORS = { Positive: '#10B981', Neutral: '#6B7280', Negative: '#EF4444' };

  // Derived Unique Staff list for this cohort
  const uniqueStaff = Array.from(new Set(subjects.map(s => s.staff_name)));

  const handleExport = () => {
    const ws = XLSX.utils.json_to_sheet(feedbacks);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Feedback");
    XLSX.writeFile(wb, `${context.department}_Year${context.year}_Feedback.xlsx`);
  };

  const handleSubjectAnalysis = async (subId: string) => {
    setAiLoading(true);
    setSelectedSubjectId(subId);
    setSelectedStaffName(null); // Clear other selection
    setSubjectInsights(null);
    
    const sub = subjects.find(s => s.id === subId);
    const subFbs = feedbacks.filter(f => f.subject_id === subId).map(f => f.text_feedback);
    
    if (sub && subFbs.length > 0) {
      const insights = await generateSubjectInsights(sub.name, subFbs);
      setSubjectInsights(insights);
    }
    setAiLoading(false);
  };

  const handleStaffAnalysis = async (staffName: string) => {
    setAiLoading(true);
    setSelectedStaffName(staffName);
    setSelectedSubjectId(null); // Clear other selection
    setStaffInsights(null);

    const staffFbs = feedbacks.filter(f => f.staff_name === staffName).map(f => f.text_feedback);
    if (staffFbs.length > 0) {
      const insights = await generateStaffInsights(staffName, staffFbs);
      setStaffInsights(insights);
    }
    setAiLoading(false);
  };

  const handleAddSubject = async () => {
    if (!newSubName || !newSubStaff) return;
    setLoading(true);
    await dbService.addSubject({
      name: newSubName,
      staff_name: newSubStaff,
      is_lab: newSubIsLab,
      department_code: context.department,
      year: context.year,
      semester: context.semester
    });
    setNewSubName(''); setNewSubStaff('');
    await fetchData(); // Wait for data refresh
  };

  const handleDeleteSubject = async (id: string) => {
    if (confirm("Delete this subject?")) {
      setLoading(true);
      await dbService.deleteSubject(id);
      await fetchData();
    }
  };

  if (loading && subjects.length === 0 && feedbacks.length === 0) return <Loader />;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <header className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-gray-500 mt-1">{context.department} | Year {context.year} | Sem {context.semester}</p>
        </div>
        <div className="flex gap-3">
           <Button variant="secondary" onClick={() => setViewMode(viewMode === 'analytics' ? 'manage' : 'analytics')}>
             {viewMode === 'analytics' ? 'Manage Subjects' : 'View Analytics'}
           </Button>
           <Button onClick={handleExport}>Export Data</Button>
           <Button variant="danger" onClick={onLogout}>Logout</Button>
        </div>
      </header>

      {viewMode === 'manage' ? (
        <Card className="p-6">
           <h2 className="text-xl font-bold mb-4">Manage Subjects</h2>
           <div className="flex flex-col md:flex-row gap-4 items-end mb-6 bg-gray-50 p-4 rounded-lg">
              <div className="flex-1 w-full"><Input label="Subject Name" value={newSubName} onChange={(e: any) => setNewSubName(e.target.value)} /></div>
              <div className="flex-1 w-full"><Input label="Staff Name" value={newSubStaff} onChange={(e: any) => setNewSubStaff(e.target.value)} /></div>
              <div className="mb-4 flex items-center h-full pb-2">
                 <input type="checkbox" checked={newSubIsLab} onChange={e => setNewSubIsLab(e.target.checked)} className="mr-2" />
                 <label>Is Lab?</label>
              </div>
              <div className="mb-4"><Button onClick={handleAddSubject}>Add Subject</Button></div>
           </div>
           <div className="overflow-x-auto border rounded-lg">
             <table className="min-w-full divide-y divide-gray-200">
               <thead className="bg-gray-100">
                 <tr>
                   <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Subject</th>
                   <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Staff</th>
                   <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase">Type</th>
                   <th className="px-6 py-3 text-right">Actions</th>
                 </tr>
               </thead>
               <tbody className="bg-white divide-y divide-gray-200">
                 {subjects.length > 0 ? (
                   subjects.map(s => (
                     <tr key={s.id}>
                       <td className="px-6 py-4 text-gray-900">{s.name}</td>
                       <td className="px-6 py-4 text-gray-900">{s.staff_name}</td>
                       <td className="px-6 py-4 text-gray-900">{s.is_lab ? 'Lab' : 'Theory'}</td>
                       <td className="px-6 py-4 text-right">
                         <button onClick={() => handleDeleteSubject(s.id)} className="text-red-600 hover:text-red-900 font-medium">Delete</button>
                       </td>
                     </tr>
                   ))
                 ) : (
                   <tr>
                     <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                       No subjects found for this semester. Add one above.
                     </td>
                   </tr>
                 )}
               </tbody>
             </table>
           </div>
        </Card>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
             <Card className="p-4 bg-indigo-50 border-indigo-100">
                <div className="text-gray-500 text-sm">Total Feedback</div>
                <div className="text-3xl font-bold text-indigo-900">{feedbacks.length}</div>
             </Card>
             <Card className="p-4">
                <div className="text-gray-500 text-sm">Avg Faculty Rating</div>
                <div className="text-3xl font-bold text-gray-900">
                  {(feedbacks.reduce((a, b) => a + b.faculty_rating, 0) / (feedbacks.length || 1)).toFixed(1)}
                </div>
             </Card>
             <Card className="p-4">
                <div className="text-gray-500 text-sm">Avg Difficulty</div>
                <div className="text-3xl font-bold text-gray-900">
                {(feedbacks.reduce((a, b) => a + b.difficulty_rating, 0) / (feedbacks.length || 1)).toFixed(1)}
                </div>
             </Card>
             <Card className="p-4">
                <div className="text-gray-500 text-sm">Positive Sentiment</div>
                <div className="text-3xl font-bold text-green-600">
                  {((sentimentCounts['Positive'] || 0) / (feedbacks.length || 1) * 100).toFixed(0)}%
                </div>
             </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="p-6">
              <h3 className="text-lg font-bold mb-4">Faculty vs Difficulty</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" hide />
                    <YAxis domain={[0, 5]} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="avgFac" name="Faculty Rating" fill="#4F46E5" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="avgDiff" name="Difficulty" fill="#9CA3AF" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>

            <Card className="p-6">
              <h3 className="text-lg font-bold mb-4">Sentiment Distribution</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[entry.name as keyof typeof COLORS]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Subject Insights */}
            <Card className="p-6 flex flex-col">
               <h3 className="text-lg font-bold mb-6">Subject AI Insights</h3>
               <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
                 {subjects.map(s => (
                   <button 
                     key={s.id}
                     onClick={() => handleSubjectAnalysis(s.id)}
                     className={`px-3 py-1.5 rounded-full whitespace-nowrap text-xs font-medium border transition-colors ${selectedSubjectId === s.id ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}
                   >
                     {s.name}
                   </button>
                 ))}
               </div>

               {aiLoading && selectedSubjectId ? <Loader /> : subjectInsights ? (
                 <div className="space-y-4 animate-fade-in flex-1">
                    <div className="bg-green-50 p-3 rounded border border-green-100">
                      <h4 className="font-bold text-green-800 text-sm mb-1">Strengths</h4>
                      <ul className="list-disc ml-4 text-xs text-green-700 space-y-1">
                        {subjectInsights.strengths.map((s, i) => <li key={i}>{s}</li>)}
                      </ul>
                    </div>
                    <div className="bg-yellow-50 p-3 rounded border border-yellow-100">
                      <h4 className="font-bold text-yellow-800 text-sm mb-1">Improvements</h4>
                      <ul className="list-disc ml-4 text-xs text-yellow-700 space-y-1">
                        {subjectInsights.improvements.map((s, i) => <li key={i}>{s}</li>)}
                      </ul>
                    </div>
                 </div>
               ) : (
                 <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">Select a subject</div>
               )}
            </Card>

            {/* Staff Insights (New) */}
            <Card className="p-6 flex flex-col">
               <h3 className="text-lg font-bold mb-6">Staff Performance AI</h3>
               <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
                 {uniqueStaff.map(name => (
                   <button 
                     key={name}
                     onClick={() => handleStaffAnalysis(name)}
                     className={`px-3 py-1.5 rounded-full whitespace-nowrap text-xs font-medium border transition-colors ${selectedStaffName === name ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}
                   >
                     {name}
                   </button>
                 ))}
               </div>

               {aiLoading && selectedStaffName ? <Loader /> : staffInsights ? (
                 <div className="space-y-4 animate-fade-in flex-1">
                    <div className="bg-blue-50 p-3 rounded border border-blue-100">
                      <h4 className="font-bold text-blue-800 text-sm mb-1">Strengths</h4>
                      <ul className="list-disc ml-4 text-xs text-blue-700 space-y-1">
                        {staffInsights.strengths.map((s, i) => <li key={i}>{s}</li>)}
                      </ul>
                    </div>
                    <div className="bg-red-50 p-3 rounded border border-red-100">
                      <h4 className="font-bold text-red-800 text-sm mb-1">Areas of Concern</h4>
                      <ul className="list-disc ml-4 text-xs text-red-700 space-y-1">
                        {staffInsights.areas_of_concern?.map((s, i) => <li key={i}>{s}</li>)}
                      </ul>
                    </div>
                    <div className="bg-indigo-50 p-3 rounded border border-indigo-100">
                      <h4 className="font-bold text-indigo-800 text-sm mb-1">Suggestions</h4>
                      <ul className="list-disc ml-4 text-xs text-indigo-700 space-y-1">
                        {staffInsights.actionable_suggestions?.map((s, i) => <li key={i}>{s}</li>)}
                      </ul>
                    </div>
                 </div>
               ) : (
                 <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">Select a staff member</div>
               )}
            </Card>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;