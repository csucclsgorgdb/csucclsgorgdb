import React, { useState, useEffect } from 'react';
import { Profile, Event } from '../types';
import { supabase } from '../lib/supabase';
import { 
  Plus, 
  Calendar, 
  Clock, 
  Users, 
  CheckCircle2, 
  X, 
  BarChart3,
  Download,
  MoreVertical,
  Play,
  Info,
  CalendarDays
} from 'lucide-react';
import { format } from 'date-fns';
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  Legend, 
  Tooltip 
} from 'recharts';

export default function EventManagement({ profile }: { profile: Profile | null }) {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newEvent, setNewEvent] = useState<Partial<Event>>({
    status: 'pending',
    is_one_day: true,
    participants_filter: {}
  });

  useEffect(() => {
    fetchEvents();
  }, []);

  async function fetchEvents() {
    setLoading(true);
    try {
      let query = supabase
        .from('events')
        .select('*');
      
      if (profile?.organization_name === 'HERO Organization') {
        // Show events for Education, General, or All
        query = query.or('participants_filter->>department.is.null,participants_filter->>department.in.("Education Dept. Student","General Student")');
      }

      const { data, error } = await query.order('created_at', { ascending: false });

      if (error) throw error;
      setEvents(data || []);
    } catch (error) {
      console.error('Error fetching events:', error);
    } finally {
      setLoading(false);
    }
  }

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const eventToCreate = { ...newEvent, organization_id: profile?.organization_id };
      
      const { error } = await supabase
        .from('events')
        .insert([eventToCreate]);

      if (error) throw error;
      setIsModalOpen(false);
      setNewEvent({ status: 'pending', is_one_day: true, participants_filter: {} });
      fetchEvents();
    } catch (error: any) {
      alert('Error creating event: ' + error.message);
    }
  };

  const startEvent = async (id: string) => {
    try {
      const { error } = await supabase
        .from('events')
        .update({ status: 'ongoing' })
        .eq('id', id);
      if (error) throw error;
      fetchEvents();
    } catch (error: any) {
      alert('Error starting event: ' + error.message);
    }
  };

  const markAsDone = async (id: string) => {
    try {
      const { error } = await supabase
        .from('events')
        .update({ status: 'done' })
        .eq('id', id);
      if (error) throw error;
      fetchEvents();
    } catch (error: any) {
      alert('Error updating event: ' + error.message);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'done':
        return (
          <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-green-100 text-green-700 border border-green-200">
            <CheckCircle2 size={12} />
            Done
          </span>
        );
      case 'ongoing':
        return (
          <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-blue-100 text-blue-700 border border-blue-200 animate-pulse">
            <Play size={12} />
            Ongoing
          </span>
        );
      default:
        return (
          <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-700 border border-amber-200">
            <Clock size={12} />
            Pending
          </span>
        );
    }
  };

  const attendanceStats = [
    { name: 'Present', value: 400, color: '#000080' },
    { name: 'Absent', value: 300, color: '#FFD700' },
    { name: 'Late', value: 100, color: '#94a3b8' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-[#000080]">Active & Recent Events</h3>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-[#000080] text-white px-4 py-2 rounded-xl hover:bg-[#000060] transition-colors flex items-center gap-2"
        >
          <Plus size={18} />
          Create Event
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Events List */}
        <div className="lg:col-span-2 space-y-4">
          {loading ? (
            <div className="flex justify-center p-12">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#000080]"></div>
            </div>
          ) : events.length === 0 ? (
            <div className="bg-white p-12 rounded-2xl text-center border border-dashed border-gray-200 text-gray-500">
              No events found. Create your first event!
            </div>
          ) : (
            events.map((event) => (
              <div key={event.id} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:border-[#FFD700] transition-all group">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      {getStatusBadge(event.status)}
                      <span className="text-xs text-gray-400">{format(new Date(event.created_at), 'MMM d, yyyy')}</span>
                    </div>
                    <h4 className="text-xl font-bold text-[#000080] mb-2">{event.name}</h4>
                    <p className="text-sm text-gray-600 line-clamp-2 mb-4">{event.description}</p>
                    
                    <div className="flex flex-wrap gap-4 text-xs text-gray-500">
                      <div className="flex items-center gap-1.5">
                        <Calendar size={14} className="text-[#FFD700]" />
                        {event.is_one_day ? format(new Date(event.start_date), 'MMM d, yyyy') : `${format(new Date(event.start_date), 'MMM d')} - ${format(new Date(event.end_date), 'MMM d, yyyy')}`}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Users size={14} className="text-[#FFD700]" />
                        {event.participants_filter.department ? `${event.participants_filter.department} Dept.` : 
                         event.participants_filter.program || 'All Participants'}
                        {event.participants_filter.year_level && ` - Year ${event.participants_filter.year_level}`}
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    {event.status === 'pending' && (
                      <button 
                        onClick={() => startEvent(event.id)}
                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Start Event"
                      >
                        <Play size={20} />
                      </button>
                    )}
                    {event.status === 'ongoing' && (
                      <button 
                        onClick={() => markAsDone(event.id)}
                        className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                        title="Mark as Done"
                      >
                        <CheckCircle2 size={20} />
                      </button>
                    )}
                    <button className="p-2 text-gray-400 hover:text-[#000080] hover:bg-blue-50 rounded-lg transition-colors">
                      <Download size={20} />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Stats Sidebar */}
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <h4 className="font-bold text-[#000080] mb-6 flex items-center gap-2">
              <BarChart3 size={18} />
              Recent Event Stats
            </h4>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={attendanceStats}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {attendanceStats.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend verticalAlign="bottom" height={36}/>
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Total Participants</span>
                <span className="font-bold">800</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Attendance Rate</span>
                <span className="font-bold text-green-600">50%</span>
              </div>
            </div>
          </div>

          <div className="bg-[#000080] p-6 rounded-2xl shadow-lg text-white">
            <h4 className="font-bold mb-2">Quick Tip</h4>
            <p className="text-xs text-blue-200 leading-relaxed">
              When creating an event, you can filter participants by program. 
              This will automatically limit the attendance list to those students, 
              making tracking much faster!
            </p>
          </div>
        </div>
      </div>

      {/* Create Event Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-[#000080] text-white">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/10 rounded-lg">
                  <CalendarDays size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-bold">Create New Event</h3>
                  <p className="text-[10px] text-blue-200 uppercase tracking-wider font-medium">Event Details & Configuration</p>
                </div>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="hover:bg-white/10 p-1.5 rounded-lg transition-colors">
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleCreateEvent} className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
              {/* Section 1: Basic Info */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-[#000080] font-bold text-sm border-b border-gray-100 pb-2">
                  <Info size={16} />
                  Basic Information
                </div>
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold text-gray-400 uppercase mb-1">Event Name</label>
                    <input
                      required
                      placeholder="e.g. Annual Foundation Day"
                      value={newEvent.name || ''}
                      onChange={(e) => setNewEvent({ ...newEvent, name: e.target.value })}
                      className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#000080] outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-gray-400 uppercase mb-1">Description</label>
                    <textarea
                      required
                      placeholder="Describe the event purpose and activities..."
                      value={newEvent.description || ''}
                      onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                      className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#000080] outline-none h-20 resize-none transition-all"
                    />
                  </div>
                </div>
              </div>

              {/* Section 2: Date & Time */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-[#000080] font-bold text-sm border-b border-gray-100 pb-2">
                  <Clock size={16} />
                  Schedule & Duration
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-200">
                    <label className="text-xs font-bold text-gray-600">One Day Event?</label>
                    <input 
                      type="checkbox" 
                      checked={newEvent.is_one_day}
                      onChange={(e) => setNewEvent({ ...newEvent, is_one_day: e.target.checked })}
                      className="w-5 h-5 accent-[#000080] cursor-pointer"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-gray-400 uppercase mb-1">Start Date</label>
                    <input
                      type="date"
                      required
                      value={newEvent.start_date || ''}
                      onChange={(e) => setNewEvent({ ...newEvent, start_date: e.target.value })}
                      className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#000080] outline-none transition-all"
                    />
                  </div>
                  {!newEvent.is_one_day && (
                    <div>
                      <label className="block text-[11px] font-bold text-gray-400 uppercase mb-1">End Date</label>
                      <input
                        type="date"
                        required
                        value={newEvent.end_date || ''}
                        onChange={(e) => setNewEvent({ ...newEvent, end_date: e.target.value })}
                        className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#000080] outline-none transition-all"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Section 3: Participants */}
              <div className="grid grid-cols-1 gap-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-[#000080] font-bold text-sm border-b border-gray-100 pb-2">
                    <Users size={16} />
                    Participants Filter
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <select
                      value={newEvent.participants_filter?.department || ''}
                      onChange={(e) => setNewEvent({ 
                        ...newEvent, 
                        participants_filter: { ...newEvent.participants_filter, department: e.target.value as any } 
                      })}
                      className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#000080] outline-none transition-all text-sm"
                    >
                      <option value="">All Departments</option>
                      {profile?.organization_name === 'HERO Organization' ? (
                        <>
                          <option value="Education Dept. Student">Education Dept. Student</option>
                          <option value="General Student">General Student</option>
                        </>
                      ) : (
                        <>
                          <option value="Education Dept. Student">Education Dept. Student</option>
                          <option value="Indus Tech Dept. Student">Indus Tech Dept. Student</option>
                          <option value="General Student">General Student</option>
                        </>
                      )}
                    </select>
                    <select
                      value={newEvent.participants_filter?.year_level || ''}
                      onChange={(e) => setNewEvent({ 
                        ...newEvent, 
                        participants_filter: { ...newEvent.participants_filter, year_level: e.target.value ? parseInt(e.target.value) : undefined } 
                      })}
                      className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#000080] outline-none transition-all text-sm"
                    >
                      <option value="">All Year Levels</option>
                      {[1, 2, 3, 4, 5].map(y => <option key={y} value={y}>Year {y}</option>)}
                    </select>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                <button 
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-6 py-2.5 text-sm font-bold text-gray-500 hover:bg-gray-50 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="px-8 py-2.5 bg-[#000080] text-white rounded-xl hover:bg-[#000060] transition-all font-bold shadow-lg shadow-blue-900/20 active:scale-95"
                >
                  Create Event
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
