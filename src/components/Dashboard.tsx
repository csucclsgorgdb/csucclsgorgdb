import React, { useState, useEffect } from 'react';
import { Profile } from '../types';
import { 
  Clock, 
  Calendar as CalendarIcon, 
  TrendingUp, 
  Users, 
  Activity,
  BookOpen,
  User as UserIcon
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  LineChart,
  Line
} from 'recharts';
import { format } from 'date-fns';

const BIBLE_VERSES = [
  { text: "For I know the plans I have for you, declares the LORD, plans for welfare and not for evil, to give you a future and a hope.", ref: "Jeremiah 29:11" },
  { text: "I can do all things through him who strengthens me.", ref: "Philippians 4:13" },
  { text: "Trust in the LORD with all your heart, and do not lean on your own understanding.", ref: "Proverbs 3:5" },
  { text: "The LORD is my shepherd; I shall not want.", ref: "Psalm 23:1" },
  { text: "But they who wait for the LORD shall renew their strength; they shall mount up with wings like eagles; they shall run and not be weary; they shall walk and not faint.", ref: "Isaiah 40:31" }
];

const COLLECTION_DATA = [
  { day: 'Mon', amount: 4500 },
  { day: 'Tue', amount: 5200 },
  { day: 'Wed', amount: 3800 },
  { day: 'Thu', amount: 6100 },
  { day: 'Fri', amount: 5900 },
  { day: 'Sat', amount: 2100 },
  { day: 'Sun', amount: 1500 },
];

const ATTENDANCE_DATA = [
  { date: '03/25', count: 850 },
  { date: '03/26', count: 920 },
  { date: '03/27', count: 780 },
  { date: '03/28', count: 450 },
  { date: '03/29', count: 320 },
  { date: '03/30', count: 980 },
  { date: '03/31', count: 1050 },
];

export default function Dashboard({ profile }: { profile: Profile | null }) {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [verse, setVerse] = useState(BIBLE_VERSES[0]);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    const dayOfYear = Math.floor((new Date().getTime() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
    setVerse(BIBLE_VERSES[dayOfYear % BIBLE_VERSES.length]);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="space-y-6">
      {/* Daily Bible Verse */}
      <div className="bg-gradient-to-r from-[#000080] to-[#000060] text-white p-6 rounded-2xl shadow-lg border-l-8 border-[#FFD700] relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
          <BookOpen size={120} />
        </div>
        <div className="flex items-start gap-4 relative z-10">
          <div className="bg-[#FFD700] p-2 rounded-lg text-[#000080] shadow-md">
            <BookOpen size={24} />
          </div>
          <div>
            <p className="text-sm font-semibold text-[#FFD700] uppercase tracking-wider mb-1">Daily Bible Verse</p>
            <p className="text-xl font-medium italic leading-relaxed">"{verse.text}"</p>
            <p className="text-sm text-[#FFD700] mt-2 font-bold">— {verse.ref}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Date & Time Card */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between hover:shadow-md transition-shadow">
          <div>
            <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Current Time</p>
            <p className="text-2xl font-black text-[#000080]">{format(currentTime, 'HH:mm:ss')}</p>
            <p className="text-xs text-gray-500 font-medium">{format(currentTime, 'EEEE, MMMM do')}</p>
          </div>
          <div className="bg-blue-50 p-3 rounded-xl text-[#000080]">
            <Clock size={24} />
          </div>
        </div>

        {/* Daily Collection Card */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between hover:shadow-md transition-shadow">
          <div>
            <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Daily Collection</p>
            <p className="text-2xl font-black text-[#000080]">₱5,900.00</p>
            <p className="text-xs text-green-500 font-bold flex items-center gap-1">
              <TrendingUp size={12} /> +12.5%
            </p>
          </div>
          <div className="bg-yellow-50 p-3 rounded-xl text-[#FFD700]">
            <TrendingUp size={24} />
          </div>
        </div>

        {/* Active Students Card */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between hover:shadow-md transition-shadow">
          <div>
            <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Total Students</p>
            <p className="text-2xl font-black text-[#000080]">1,248</p>
            <p className="text-xs text-gray-500 font-medium">98% Active</p>
          </div>
          <div className="bg-purple-50 p-3 rounded-xl text-purple-600">
            <Users size={24} />
          </div>
        </div>

        {/* System Health Card */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between hover:shadow-md transition-shadow">
          <div>
            <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">System Status</p>
            <p className="text-2xl font-black text-green-600">Healthy</p>
            <p className="text-xs text-gray-500 font-medium">Lat: 45ms</p>
          </div>
          <div className="bg-green-50 p-3 rounded-xl text-green-600">
            <Activity size={24} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Collection Chart */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-black text-[#000080] flex items-center gap-2">
                <TrendingUp size={18} />
                Weekly Collection Trend
              </h3>
              <p className="text-xs text-gray-400">Revenue analysis for the current week</p>
            </div>
          </div>
          <div className="h-64 min-h-[256px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={COLLECTION_DATA}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#9ca3af' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#9ca3af' }} />
                <Tooltip 
                  cursor={{ fill: '#f3f4f6' }}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="amount" fill="#000080" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Attendance Chart */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-black text-[#000080] flex items-center gap-2">
                <Users size={18} />
                Attendance Analytics
              </h3>
              <p className="text-xs text-gray-400">Student check-ins over the last 7 days</p>
            </div>
          </div>
          <div className="h-64 min-h-[256px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={ATTENDANCE_DATA}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#9ca3af' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#9ca3af' }} />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Line type="monotone" dataKey="count" stroke="#FFD700" strokeWidth={4} dot={{ r: 6, fill: '#FFD700', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 8 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Latest Activities */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <h3 className="font-bold text-[#000080] mb-6 flex items-center gap-2">
          <Activity size={18} />
          Latest Activities
        </h3>
        <div className="space-y-4">
          {[
            { user: 'Admin', action: 'Created new event', target: 'Foundation Day', time: '2 hours ago' },
            { user: 'Finance', action: 'Processed payment', target: 'John Doe', time: '3 hours ago' },
            { user: 'Attendance', action: 'Marked attendance', target: 'Seminar A', time: '5 hours ago' },
            { user: 'Super Admin', action: 'Added organization', target: 'College of Education', time: '1 day ago' },
          ].map((activity, i) => (
            <div key={i} className="flex items-start gap-4 p-3 hover:bg-gray-50 rounded-xl transition-colors">
              <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-[#000080] font-bold text-xs">
                {activity.user.charAt(0)}
              </div>
              <div className="flex-1">
                <p className="text-sm">
                  <span className="font-semibold text-[#000080]">{activity.user}</span>
                  {' '}{activity.action}{' '}
                  <span className="font-medium text-gray-700">{activity.target}</span>
                </p>
                <p className="text-xs text-gray-400 mt-1">{activity.time}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* System Information & Structure */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <h3 className="font-bold text-[#000080] mb-4">About the Web System</h3>
          <p className="text-sm text-gray-600 leading-relaxed">
            The Organization Automated System (OAS) is a comprehensive management tool designed to streamline school operations. 
            It integrates student records, event planning, financial tracking, and attendance monitoring into a single, 
            secure platform. Our goal is to provide administrators and student leaders with the data they need to manage 
            their organizations effectively and transparently.
          </p>
          <div className="grid grid-cols-2 gap-4 mt-6">
            <div className="p-4 bg-blue-50 rounded-xl">
              <p className="text-xs text-[#000080] font-bold uppercase">Version</p>
              <p className="text-lg font-bold text-[#000080]">v2.4.0</p>
            </div>
            <div className="p-4 bg-yellow-50 rounded-xl">
              <p className="text-xs text-[#FFD700] font-bold uppercase">Status</p>
              <p className="text-lg font-bold text-[#000080]">Operational</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <h3 className="font-bold text-[#000080] mb-4">Organizational Structure</h3>
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#000080] text-white flex items-center justify-center">
                <UserIcon size={20} />
              </div>
              <div>
                <p className="text-sm font-bold text-[#000080]">Dr. Jane Smith</p>
                <p className="text-xs text-gray-500">School Director</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#FFD700] text-[#000080] flex items-center justify-center">
                <UserIcon size={20} />
              </div>
              <div>
                <p className="text-sm font-bold text-[#000080]">Prof. Mark Wilson</p>
                <p className="text-xs text-gray-500">Dean of Students</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
