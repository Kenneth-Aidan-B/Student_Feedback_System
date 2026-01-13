// © 2026 Kenneth
// Academic & Non-Commercial Use Only
// Commercial use requires explicit permission

import React, { useEffect, useState } from 'react';

import { HODContext, Feedback, Subject, StaffAnalytics, AIInsights } from '../types';
import { dbService } from '../services/dbService';
import { generateStaffInsights } from '../services/geminiService';
import { Button, Card, Loader, StarRating } from '../components/ui';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

interface Props {
  context: HODContext;
  onLogout: () => void;
}

const HODDashboard: React.FC<Props> = ({ context, onLogout }) => {
  const [loading, setLoading] = useState(true);
  const [staffData, setStaffData] = useState<StaffAnalytics[]>([]);
  const [rawFeedback, setRawFeedback] = useState<Feedback[]>([]);

  // AI State
  const [selectedStaff, setSelectedStaff] = useState<string | null>(null);
  const [insights, setInsights] = useState<AIInsights | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  useEffect(() => {
    processData();
  }, [context]);

  const processData = async () => {
    setLoading(true);
    // 1. Fetch Subjects & Feedback based on HOD Logic
    let relevantSubjects: Subject[] = [];
    let relevantFeedback: Feedback[] = [];

    if (context.department === 'SH') {
      relevantSubjects = await dbService.getSHSubjects();
      relevantFeedback = await dbService.getFeedbackForHOD('SH');
    } else {
      relevantSubjects = await dbService.getSubjectsByDepartment(context.department);
      relevantFeedback = await dbService.getFeedbackForHOD(context.department);
    }

    setRawFeedback(relevantFeedback);

    // 2. Group by Staff
    const staffMap: Record<string, StaffAnalytics> = {};

    // Initialize with subjects to catch staff with no feedback yet
    relevantSubjects.forEach(sub => {
      if (!staffMap[sub.staff_name]) {
        staffMap[sub.staff_name] = {
          staff_name: sub.staff_name,
          subjects: [],
          overall_rating: 0,
          year_breakdown: { 2: 0, 3: 0, 4: 0 },
          sentiment_distribution: { Positive: 0, Neutral: 0, Negative: 0 },
          total_feedback: 0
        };
      }
      if (!staffMap[sub.staff_name].subjects.includes(sub.name)) {
        staffMap[sub.staff_name].subjects.push(sub.name);
      }
    });

    // Aggregate Feedback
    relevantFeedback.forEach(fb => {
      const staff = staffMap[fb.staff_name];
      if (staff) {
        staff.total_feedback++;
        staff.sentiment_distribution[fb.sentiment]++;
        // Store sum for now, average later
        staff.overall_rating += fb.faculty_rating;
      }
    });

    // Finalize Averages
    const finalData = Object.values(staffMap).map(s => {
      if (s.total_feedback > 0) {
        s.overall_rating /= s.total_feedback;
        // Recalculate year averages based on assumed counts? 
        const fbs = relevantFeedback.filter(f => f.staff_name === s.staff_name);
        [2, 3, 4].forEach(y => {
          const yFbs = fbs.filter(f => f.year === y);
          if (yFbs.length > 0) {
            (s.year_breakdown as any)[y] = yFbs.reduce((a, b) => a + b.faculty_rating, 0) / yFbs.length;
          }
        });
      }
      return s;
    });

    setStaffData(finalData);
    setLoading(false);
  };

  const generateAI = async (staffName: string) => {
    setSelectedStaff(staffName);
    setAiLoading(true);
    setInsights(null);

    const staffFbs = rawFeedback.filter(f => f.staff_name === staffName).map(f => f.text_feedback);
    if (staffFbs.length > 0) {
      const res = await generateStaffInsights(staffName, staffFbs);
      setInsights(res);
    }
    setAiLoading(false);
  };

  const SENTIMENT_COLORS = { Positive: '#10B981', Neutral: '#9CA3AF', Negative: '#EF4444' };

  if (loading) return <Loader />;

  return (
    <div className="p-6 max-w-7xl mx-auto bg-gray-50 min-h-screen">
      <header className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Department Dashboard</h1>
          <p className="text-gray-500 mt-1">HOD - {context.department}</p>
        </div>
        <Button variant="danger" onClick={onLogout}>Logout</Button>
      </header>

      <div className="grid grid-cols-1 gap-8">
        {staffData.map((staff) => {
          // Prepare Chart Data per staff
          const sentimentData = [
            { name: 'Positive', value: staff.sentiment_distribution.Positive },
            { name: 'Neutral', value: staff.sentiment_distribution.Neutral },
            { name: 'Negative', value: staff.sentiment_distribution.Negative },
          ].filter(d => d.value > 0);

          const yearData = [
            { name: 'Year 2', value: staff.year_breakdown[2] },
            { name: 'Year 3', value: staff.year_breakdown[3] },
            { name: 'Year 4', value: staff.year_breakdown[4] },
          ].filter(d => d.value > 0);

          return (
            <Card key={staff.staff_name} className="p-0 overflow-hidden">
              <div className="p-6 border-b border-gray-100 flex flex-col md:flex-row justify-between items-start md:items-center">
                <div>
                  <h2 className="text-xl font-bold text-indigo-900">{staff.staff_name}</h2>
                  <p className="text-sm text-gray-500 mt-1">Subjects: {staff.subjects.join(", ")}</p>
                </div>
                <div className="mt-4 md:mt-0 text-right">
                  <div className="text-sm text-gray-500">Overall Rating</div>
                  <div className="flex items-center gap-2 justify-end">
                    <span className="text-2xl font-bold text-gray-900">{staff.overall_rating.toFixed(1)}</span>
                    <span className="text-yellow-400 text-xl">★</span>
                  </div>
                  <div className="text-xs text-gray-400">{staff.total_feedback} feedback entries</div>
                </div>
              </div>

              <div className="p-6 bg-white grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {/* Sentiment Chart */}
                <div className="h-48">
                  <h4 className="text-xs font-bold text-gray-400 uppercase mb-2 text-center">Sentiment Distribution</h4>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={sentimentData}
                        cx="50%" cy="50%"
                        innerRadius={40} outerRadius={60}
                        paddingAngle={5} dataKey="value"
                      >
                        {sentimentData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={SENTIMENT_COLORS[entry.name as keyof typeof SENTIMENT_COLORS]} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend verticalAlign="bottom" height={36} iconSize={10} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                {/* Year Breakdown Chart */}
                <div className="h-48">
                  <h4 className="text-xs font-bold text-gray-400 uppercase mb-2 text-center">Year-wise Ratings</h4>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={yearData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                      <YAxis domain={[0, 5]} tick={{ fontSize: 12 }} />
                      <Tooltip />
                      <Bar dataKey="value" name="Avg Rating" fill="#6366f1" radius={[4, 4, 0, 0]} barSize={40} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* AI Action Area */}
                <div className="flex flex-col justify-center items-center border-l border-gray-100 pl-4">
                  <p className="text-sm text-gray-500 text-center mb-4">
                    Generate detailed AI insights based on the {staff.total_feedback} feedback entries received.
                  </p>
                  <Button variant="secondary" className="w-full max-w-xs" onClick={() => generateAI(staff.staff_name)}>
                    Analyze Performance
                  </Button>
                </div>
              </div>

              {/* AI Results Area */}
              {selectedStaff === staff.staff_name && (
                <div className="p-6 bg-indigo-50 border-t border-indigo-100 animate-fade-in">
                  <h4 className="font-bold text-indigo-900 mb-4 flex items-center gap-2">
                    ✨ AI Performance Analysis
                    {aiLoading && <span className="animate-pulse text-indigo-500 text-sm font-normal">Analyzing...</span>}
                  </h4>

                  {insights && !aiLoading && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="bg-white p-4 rounded-lg shadow-sm border border-green-200">
                        <strong className="block mb-2 text-green-700">Strengths</strong>
                        <ul className="list-disc ml-4 space-y-1 text-sm text-gray-600">{insights.strengths.map((s, i) => <li key={i}>{s}</li>)}</ul>
                      </div>
                      <div className="bg-white p-4 rounded-lg shadow-sm border border-red-200">
                        <strong className="block mb-2 text-red-700">Areas of Concern</strong>
                        <ul className="list-disc ml-4 space-y-1 text-sm text-gray-600">{insights.areas_of_concern?.map((s, i) => <li key={i}>{s}</li>)}</ul>
                      </div>
                      <div className="bg-white p-4 rounded-lg shadow-sm border border-blue-200">
                        <strong className="block mb-2 text-blue-700">Actionable Suggestions</strong>
                        <ul className="list-disc ml-4 space-y-1 text-sm text-gray-600">{insights.actionable_suggestions?.map((s, i) => <li key={i}>{s}</li>)}</ul>
                      </div>
                    </div>
                  )}
                  {!aiLoading && !insights && <p className="text-gray-500 italic text-sm">No textual feedback available for analysis.</p>}
                </div>
              )}
            </Card>
          );
        })}
        {staffData.length === 0 && <div className="text-center text-gray-500 py-12">No data found for this cohort.</div>}
      </div>
    </div>
  );
};

export default HODDashboard;