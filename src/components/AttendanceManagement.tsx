import React, { useState, useEffect, useRef } from 'react';
import { Profile, Event, Attendance, Student } from '../types';
import { supabase } from '../lib/supabase';
import { 
  Scan, 
  Search, 
  Download, 
  Calendar, 
  Clock, 
  CheckCircle2, 
  XCircle,
  ChevronRight,
  User,
  X,
  ClipboardCheck
} from 'lucide-react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { format } from 'date-fns';

export default function AttendanceManagement({ profile }: { profile: Profile | null }) {
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [attendance, setAttendance] = useState<(Attendance & { student: Student })[]>([]);
  const [loading, setLoading] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [currentDay, setCurrentDay] = useState(1);
  const [lastScanned, setLastScanned] = useState<string | null>(null);
  const [scanStatus, setScanStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [manualId, setManualId] = useState('');
  const [showManualEntry, setShowManualEntry] = useState(false);
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);

  useEffect(() => {
    fetchEvents();
  }, []);

  useEffect(() => {
    if (selectedEvent) {
      fetchAttendance(selectedEvent.id, currentDay);
    }
  }, [selectedEvent, currentDay]);

  async function fetchEvents() {
    try {
      let query = supabase
        .from('events')
        .select('*')
        .eq('status', 'ongoing');
      
      if (profile?.organization_name === 'HERO Organization') {
        // Show ongoing events for Education, General, or All
        query = query.or('participants_filter->>department.is.null,participants_filter->>department.in.("Education Dept. Student","General Student")');
      }

      const { data, error } = await query;
      if (error) throw error;
      setEvents(data || []);
    } catch (error) {
      console.error('Error fetching events:', error);
    }
  }

  async function fetchAttendance(eventId: string, day: number) {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('attendance')
        .select('*, student:students(*)')
        .eq('event_id', eventId)
        .eq('day_number', day);
      if (error) throw error;
      
      let filteredData = data || [];
      if (profile?.organization_name === 'HERO Organization') {
        filteredData = (data || []).filter((record: any) => 
          ['Education Dept. Student', 'General Student'].includes(record.student?.department)
        );
      }
      setAttendance(filteredData);
    } catch (error) {
      console.error('Error fetching attendance:', error);
    } finally {
      setLoading(false);
    }
  }

  const startScanner = () => {
    setIsScanning(true);
    setScanStatus('idle');
    setTimeout(() => {
      const scanner = new Html5QrcodeScanner(
        "reader",
        { 
          fps: 20, // Increased FPS for faster scanning
          qrbox: (viewfinderWidth, viewfinderHeight) => {
            const minEdgeSize = Math.min(viewfinderWidth, viewfinderHeight);
            const qrboxSize = Math.floor(minEdgeSize * 0.7);
            return {
              width: qrboxSize,
              height: qrboxSize
            };
          },
          aspectRatio: 1.0
        },
        /* verbose= */ false
      );
      
      scanner.render(onScanSuccess, onScanFailure);
      scannerRef.current = scanner;
    }, 100);
  };

  const stopScanner = () => {
    if (scannerRef.current) {
      scannerRef.current.clear().catch(err => console.error("Failed to clear scanner", err));
      scannerRef.current = null;
    }
    setIsScanning(false);
    setScanStatus('idle');
  };

  async function onScanSuccess(decodedText: string) {
    if (!selectedEvent || decodedText === lastScanned) return;
    
    setLastScanned(decodedText);
    // Reset lastScanned after 3 seconds to allow re-scanning if needed
    setTimeout(() => setLastScanned(null), 3000);

    try {
      setScanStatus('success');
      setTimeout(() => setScanStatus('idle'), 1000);

      let studentId = decodedText;
      try {
        const parsed = JSON.parse(decodedText);
        studentId = parsed.id || decodedText;
      } catch (e) {}

      await processAttendance(studentId);
    } catch (error: any) {
      setScanStatus('error');
      setTimeout(() => setScanStatus('idle'), 2000);
      console.error('Scanning error:', error.message);
    }
  }

  async function processAttendance(studentId: string) {
    if (!selectedEvent) return;

    // Find student with full details for filtering
    const { data: student, error: sError } = await supabase
      .from('students')
      .select('*')
      .eq('student_id', studentId)
      .single();

    if (sError || !student) throw new Error('Student not found');

    // RBAC for HERO Organization
    if (profile?.organization_name === 'HERO Organization') {
      const allowedDepartments = ['Education Dept. Student', 'General Student'];
      if (!allowedDepartments.includes(student.department)) {
        throw new Error('You are only authorized to process attendance for Education and General students.');
      }
    }

    // Apply Participants Filter
    const filter = selectedEvent.participants_filter;
    if (filter) {
      // Department Filter
      if (filter.department && student.department !== filter.department) {
        throw new Error(`Only students from ${filter.department} are allowed.`);
      }

      // Year Level Filter
      if (filter.year_level && student.year_level !== filter.year_level) {
        throw new Error(`Only Year ${filter.year_level} students are allowed.`);
      }

      // Program Filter
      if (filter.program && student.program !== filter.program) {
        throw new Error(`Only ${filter.program} students are allowed.`);
      }

      // College Filter
      if (filter.college && student.college !== filter.college) {
        throw new Error(`Only students from ${filter.college} are allowed.`);
      }
    }

    // Check existing attendance for the day
    const { data: existing, error: aError } = await supabase
      .from('attendance')
      .select('*')
      .eq('event_id', selectedEvent.id)
      .eq('student_id', student.id)
      .eq('day_number', currentDay)
      .single();

    if (existing) {
      if (!existing.time_out) {
        await supabase
          .from('attendance')
          .update({ 
            time_out: new Date().toISOString(),
            status: 'present'
          })
          .eq('id', existing.id);
      }
    } else {
      await supabase
        .from('attendance')
        .insert([{
          event_id: selectedEvent.id,
          student_id: student.id,
          day_number: currentDay,
          time_in: new Date().toISOString(),
          status: 'in_venue',
          organization_id: profile?.organization_id
        }]);
    }
    
    fetchAttendance(selectedEvent.id, currentDay);
  }

  const handleManualEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualId || !selectedEvent) return;
    
    try {
      setLoading(true);
      await processAttendance(manualId);
      setManualId('');
      setShowManualEntry(false);
      alert('Attendance recorded successfully!');
    } catch (error: any) {
      alert('Error: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  function onScanFailure(error: any) {
    // Silent fail for continuous scanning
  }

  const exportToCSV = () => {
    if (!attendance.length) return;
    
    const headers = ['Student ID', 'Name', 'Course', 'Year', 'Time In', 'Time Out', 'Status'];
    const rows = attendance.map(a => [
      a.student.student_id,
      a.student.full_name,
      a.student.course,
      a.student.year_level,
      a.time_in ? format(new Date(a.time_in), 'HH:mm:ss') : '-',
      a.time_out ? format(new Date(a.time_out), 'HH:mm:ss') : '-',
      a.status
    ]);

    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `Attendance_${selectedEvent?.name}_Day${currentDay}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Event Selection Header */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex-1">
            <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Select Active Event</label>
            <div className="flex items-center gap-3">
              <select 
                onChange={(e) => {
                  const ev = events.find(ev => ev.id === e.target.value);
                  setSelectedEvent(ev || null);
                }}
                className="flex-1 max-w-md px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#000080] outline-none font-bold text-[#000080]"
              >
                <option value="">Choose an ongoing event...</option>
                {events.map(ev => (
                  <option key={ev.id} value={ev.id}>{ev.name}</option>
                ))}
              </select>
              {selectedEvent && !selectedEvent.is_one_day && (
                <div className="flex items-center gap-2 bg-gray-50 p-1 rounded-lg border border-gray-100">
                  {[1, 2, 3].map(d => (
                    <button
                      key={d}
                      onClick={() => setCurrentDay(d)}
                      className={`px-3 py-1 rounded-md text-xs font-bold transition-colors ${
                        currentDay === d ? 'bg-[#000080] text-white' : 'text-gray-500 hover:bg-gray-200'
                      }`}
                    >
                      Day {d}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={exportToCSV}
              disabled={!attendance.length}
              className="px-4 py-2 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors flex items-center gap-2 text-sm font-medium disabled:opacity-50"
            >
              <Download size={18} />
              Export CSV
            </button>
            <button 
              onClick={() => setShowManualEntry(true)}
              disabled={!selectedEvent}
              className="px-4 py-2 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors flex items-center gap-2 text-sm font-medium disabled:opacity-50"
            >
              <User size={18} />
              Manual Entry
            </button>
            <button 
              onClick={startScanner}
              disabled={!selectedEvent}
              className="bg-[#000080] text-white px-6 py-2 rounded-xl hover:bg-[#000060] transition-colors flex items-center gap-2 font-bold disabled:opacity-50"
            >
              <Scan size={18} />
              Start Scanner
            </button>
          </div>
        </div>
      </div>

      {/* Manual Entry Modal */}
      {showManualEntry && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[80] p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-bold text-[#000080]">Manual Attendance Entry</h3>
              <button onClick={() => setShowManualEntry(false)} className="p-1 hover:bg-gray-100 rounded-lg">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleManualEntry} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Student ID</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 2023-0001"
                  value={manualId}
                  onChange={(e) => setManualId(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#000080] outline-none"
                />
              </div>
              <button 
                type="submit"
                disabled={loading}
                className="w-full bg-[#000080] text-white py-3 rounded-xl font-bold hover:bg-[#000060] transition-colors disabled:opacity-50"
              >
                {loading ? 'Processing...' : 'Record Attendance'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Attendance Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Student</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Course & Year</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Time In</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Time Out</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading && attendance.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#000080] mx-auto"></div>
                  </td>
                </tr>
              ) : attendance.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center">
                    <div className="max-w-xs mx-auto">
                      <ClipboardCheck size={48} className="text-gray-200 mx-auto mb-4" />
                      <p className="text-gray-500 font-medium">No attendance records yet.</p>
                      <p className="text-xs text-gray-400 mt-1">Select an event and start scanning to track attendance.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                attendance.map((record) => (
                  <tr key={record.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-[#000080] font-bold text-xs">
                          {record.student.full_name.charAt(0)}
                        </div>
                        <div>
                          <div className="text-sm font-bold text-gray-900">{record.student.full_name}</div>
                          <div className="text-xs text-gray-500">{record.student.student_id}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{record.student.course}</div>
                      <div className="text-xs text-gray-500">Year {record.student.year_level}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-1.5 text-sm text-gray-700">
                        <Clock size={14} className="text-gray-400" />
                        {record.time_in ? format(new Date(record.time_in), 'HH:mm:ss') : '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-1.5 text-sm text-gray-700">
                        <Clock size={14} className="text-gray-400" />
                        {record.time_out ? format(new Date(record.time_out), 'HH:mm:ss') : '-'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${
                        record.status === 'present' ? 'bg-green-100 text-green-700' : 
                        record.status === 'in_venue' ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {record.status.replace('_', ' ')}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Scanner Modal */}
      {isScanning && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[70] p-4">
          <div className={`bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden transition-all duration-300 ${
            scanStatus === 'success' ? 'ring-8 ring-green-500/50 scale-105' : 
            scanStatus === 'error' ? 'ring-8 ring-red-500/50' : ''
          }`}>
            <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-[#000080] text-white">
              <h3 className="font-bold flex items-center gap-2">
                <Scan size={18} />
                Attendance Scanner
              </h3>
              <button onClick={stopScanner} className="hover:bg-white/10 p-1 rounded-lg">
                <X size={24} />
              </button>
            </div>
            <div className="p-6">
              <div className="relative">
                <div id="reader" className="overflow-hidden rounded-xl border-2 border-[#FFD700]"></div>
                {scanStatus === 'success' && (
                  <div className="absolute inset-0 bg-green-500/20 flex items-center justify-center animate-in fade-in">
                    <CheckCircle2 size={80} className="text-green-500 drop-shadow-lg" />
                  </div>
                )}
                {scanStatus === 'error' && (
                  <div className="absolute inset-0 bg-red-500/20 flex items-center justify-center animate-in fade-in">
                    <XCircle size={80} className="text-red-500 drop-shadow-lg" />
                  </div>
                )}
              </div>
              <div className="mt-6 space-y-4">
                <div className="flex items-center justify-center gap-4 text-sm font-medium text-gray-600">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                    1st Scan: Time In
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-green-500"></div>
                    2nd Scan: Time Out
                  </div>
                </div>
                <p className="text-xs text-center text-gray-400">
                  Position the QR code or ID inside the frame to scan automatically.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
