import React, { useState, useEffect } from 'react';
import { Profile, Organization } from '../types';
import { supabase } from '../lib/supabase';
import { 
  UserPlus, 
  Mail, 
  Lock, 
  Shield, 
  Building2,
  Trash2,
  Search,
  X,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

export default function AdminManagement({ profile }: { profile: Profile | null }) {
  const [admins, setAdmins] = useState<Profile[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newAdmin, setNewAdmin] = useState({
    email: '',
    password: '',
    full_name: '',
    role: 'admin' as Profile['role'],
    organization_id: ''
  });
  const [status, setStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setLoading(true);
    try {
      const [profilesRes, orgsRes] = await Promise.all([
        supabase.from('profiles').select('*').neq('role', 'super_admin'),
        supabase.from('organizations').select('*')
      ]);

      if (profilesRes.error) throw profilesRes.error;
      if (orgsRes.error) throw orgsRes.error;

      setAdmins(profilesRes.data || []);
      setOrganizations(orgsRes.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  }

  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setStatus(null);

    try {
      // We'll use a backend API route for this because creating Auth users 
      // with passwords requires the service_role key which we keep on the server.
      const response = await fetch('/api/admin/create-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newAdmin)
      });

      const result = await response.json();

      if (!response.ok) throw new Error(result.error || 'Failed to create user');

      setStatus({ type: 'success', message: 'Admin user created successfully!' });
      setNewAdmin({ email: '', password: '', full_name: '', role: 'admin', organization_id: '' });
      setTimeout(() => setIsModalOpen(false), 2000);
      fetchData();
    } catch (error: any) {
      setStatus({ type: 'error', message: error.message });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-[#000080]">User Management</h2>
          <p className="text-sm text-gray-500">Create and manage organization admins and staff</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-[#000080] text-white px-4 py-2 rounded-xl hover:bg-[#000060] transition-colors flex items-center gap-2 shadow-md"
        >
          <UserPlus size={18} />
          Add New User
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">User</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Role</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Organization</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Joined</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#000080] mx-auto"></div>
                  </td>
                </tr>
              ) : admins.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-500">No users found.</td>
                </tr>
              ) : (
                admins.map((admin) => (
                  <tr key={admin.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-[#000080] font-bold text-xs">
                          {admin.full_name?.charAt(0) || admin.email.charAt(0)}
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-gray-900">{admin.full_name || 'No Name'}</div>
                          <div className="text-xs text-gray-500">{admin.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 rounded-lg text-xs font-bold uppercase tracking-wider ${
                        admin.role === 'admin' ? 'bg-purple-50 text-purple-600' :
                        admin.role === 'staff_finance' ? 'bg-green-50 text-green-600' :
                        'bg-orange-50 text-orange-600'
                      }`}>
                        {admin.role.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Building2 size={14} />
                        {organizations.find(o => o.id === admin.organization_id)?.name || 'N/A'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(admin.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create User Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="p-6 bg-[#000080] text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UserPlus size={24} />
                <h3 className="text-xl font-bold">Create New User</h3>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="hover:bg-white/10 p-1 rounded-lg">
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleCreateAdmin} className="p-6 space-y-4">
              {status && (
                <div className={`p-4 rounded-xl flex items-center gap-3 ${
                  status.type === 'success' ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-red-50 text-red-700 border border-red-100'
                }`}>
                  {status.type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
                  <p className="text-sm font-medium">{status.message}</p>
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1 flex items-center gap-2">
                    <Mail size={14} /> Email Address
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="admin@example.com"
                    value={newAdmin.email}
                    onChange={(e) => setNewAdmin({ ...newAdmin, email: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#000080] outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1 flex items-center gap-2">
                    <Lock size={14} /> Temporary Password
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={newAdmin.password}
                    onChange={(e) => setNewAdmin({ ...newAdmin, password: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#000080] outline-none"
                  />
                  <p className="text-[10px] text-gray-400 mt-1">Users can change this password after their first login.</p>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    placeholder="John Doe"
                    value={newAdmin.full_name}
                    onChange={(e) => setNewAdmin({ ...newAdmin, full_name: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#000080] outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1 flex items-center gap-2">
                      <Shield size={14} /> Role
                    </label>
                    <select
                      required
                      value={newAdmin.role}
                      onChange={(e) => setNewAdmin({ ...newAdmin, role: e.target.value as Profile['role'] })}
                      className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#000080] outline-none"
                    >
                      <option value="admin">Admin</option>
                      <option value="staff_finance">Finance Staff</option>
                      <option value="staff_attendance">Attendance Staff</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1 flex items-center gap-2">
                      <Building2 size={14} /> Organization
                    </label>
                    <select
                      required
                      value={newAdmin.organization_id}
                      onChange={(e) => setNewAdmin({ ...newAdmin, organization_id: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#000080] outline-none"
                    >
                      <option value="">Select Org</option>
                      {organizations.map(org => (
                        <option key={org.id} value={org.id}>{org.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button 
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-3 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors font-bold text-gray-600"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-3 bg-[#000080] text-white rounded-xl hover:bg-[#000060] transition-colors font-bold shadow-lg disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : 'Create User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
