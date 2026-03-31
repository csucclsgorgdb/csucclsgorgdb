import React, { useState, useEffect } from 'react';
import { Profile, Organization, UserRole } from '../types';
import { supabase } from '../lib/supabase';
import { 
  User, 
  Shield, 
  Building2, 
  Palette, 
  Lock, 
  Plus, 
  Trash2, 
  Save,
  CheckCircle2,
  Settings as SettingsIcon,
  Layout
} from 'lucide-react';

export default function SettingsPage({ profile, onProfileUpdate }: { profile: Profile | null, onProfileUpdate: (id: string) => void }) {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [staff, setStaff] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(false);
  const [allAdmins, setAllAdmins] = useState<Profile[]>([]);
  const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'organization' | 'admins' | 'staff' | 'appearance'>('profile');
  
  // Form states
  const [fullName, setFullName] = useState(profile?.full_name || '');
  const [bgColor, setBgColor] = useState(profile?.background_color || '#f3f4f6');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [newOrgName, setNewOrgName] = useState('');
  const [newStaffEmail, setNewStaffEmail] = useState('');
  const [newStaffRole, setNewStaffRole] = useState<UserRole>('staff_finance');
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [newAdminOrgId, setNewAdminOrgId] = useState('');

  useEffect(() => {
    if (profile?.role === 'super_admin') {
      fetchOrganizations();
      fetchAllAdmins();
    }
    if (profile?.role === 'admin') fetchStaff();
  }, [profile]);

  async function fetchOrganizations() {
    const { data } = await supabase.from('organizations').select('*').order('name');
    setOrganizations(data || []);
  }

  async function fetchAllAdmins() {
    const { data } = await supabase
      .from('profiles')
      .select('*, organizations(name)')
      .eq('role', 'admin');
    setAllAdmins(data || []);
  }

  async function fetchStaff() {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('organization_id', profile?.organization_id)
      .neq('id', profile?.id);
    setStaff(data || []);
  }

  const handleUpdateProfile = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ 
          full_name: fullName,
          background_color: bgColor
        })
        .eq('id', profile?.id);

      if (error) throw error;
      alert('Profile updated successfully!');
      onProfileUpdate(profile!.id);
    } catch (error: any) {
      alert('Error updating profile: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      alert('Passwords do not match!');
      return;
    }
    if (newPassword.length < 6) {
      alert('Password must be at least 6 characters!');
      return;
    }

    setPasswordLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      alert('Password updated successfully!');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      alert('Error updating password: ' + error.message);
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleAddOrganization = async () => {
    if (!newOrgName) return;
    try {
      const { error } = await supabase
        .from('organizations')
        .insert([{ name: newOrgName }]);
      if (error) throw error;
      setNewOrgName('');
      fetchOrganizations();
    } catch (error: any) {
      alert('Error adding organization: ' + error.message);
    }
  };

  const handleDeleteOrganization = async (id: string) => {
    if (!confirm('Are you sure you want to delete this organization? This will affect all associated data.')) return;
    try {
      const { error } = await supabase.from('organizations').delete().eq('id', id);
      if (error) throw error;
      fetchOrganizations();
    } catch (error: any) {
      alert('Error deleting organization: ' + error.message);
    }
  };

  const handleAddAdmin = async () => {
    if (!newAdminEmail || !newAdminOrgId) return;
    setLoading(true);
    try {
      // In a real app, you'd use a service role or edge function to invite/create users.
      // For this demo, we'll upsert a profile that will be claimed when the user logs in.
      const { error } = await supabase
        .from('profiles')
        .upsert([{ 
          email: newAdminEmail, 
          role: 'admin', 
          organization_id: newAdminOrgId,
          full_name: 'Pending Admin'
        }], { onConflict: 'email' });
      
      if (error) throw error;
      setNewAdminEmail('');
      setNewAdminOrgId('');
      fetchAllAdmins();
      alert('Admin assigned successfully!');
    } catch (error: any) {
      alert('Error adding admin: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddStaff = async () => {
    if (!newStaffEmail || !profile?.organization_id) return;
    setLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .upsert([{ 
          email: newStaffEmail, 
          role: newStaffRole, 
          organization_id: profile.organization_id,
          full_name: 'Pending Staff'
        }], { onConflict: 'email' });
      
      if (error) throw error;
      setNewStaffEmail('');
      fetchStaff();
      alert('Staff assigned successfully!');
    } catch (error: any) {
      alert('Error adding staff: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteProfile = async (id: string) => {
    if (!confirm('Are you sure you want to remove this user?')) return;
    try {
      const { error } = await supabase.from('profiles').delete().eq('id', id);
      if (error) throw error;
      if (profile?.role === 'super_admin') fetchAllAdmins();
      else fetchStaff();
    } catch (error: any) {
      alert('Error removing user: ' + error.message);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="flex border-b border-gray-100">
          <button 
            onClick={() => setActiveTab('profile')}
            className={`px-6 py-4 text-sm font-bold flex items-center gap-2 transition-colors ${
              activeTab === 'profile' ? 'text-[#000080] border-b-2 border-[#000080]' : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            <User size={18} />
            My Profile
          </button>
          <button 
            onClick={() => setActiveTab('security')}
            className={`px-6 py-4 text-sm font-bold flex items-center gap-2 transition-colors ${
              activeTab === 'security' ? 'text-[#000080] border-b-2 border-[#000080]' : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            <Lock size={18} />
            Security
          </button>
          {profile?.role === 'super_admin' && (
            <>
              <button 
                onClick={() => setActiveTab('organization')}
                className={`px-6 py-4 text-sm font-bold flex items-center gap-2 transition-colors ${
                  activeTab === 'organization' ? 'text-[#000080] border-b-2 border-[#000080]' : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                <Building2 size={18} />
                Organizations
              </button>
              <button 
                onClick={() => setActiveTab('admins')}
                className={`px-6 py-4 text-sm font-bold flex items-center gap-2 transition-colors ${
                  activeTab === 'admins' ? 'text-[#000080] border-b-2 border-[#000080]' : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                <Shield size={18} />
                Admin Management
              </button>
            </>
          )}
          {profile?.role === 'admin' && (
            <button 
              onClick={() => setActiveTab('staff')}
              className={`px-6 py-4 text-sm font-bold flex items-center gap-2 transition-colors ${
                activeTab === 'staff' ? 'text-[#000080] border-b-2 border-[#000080]' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              <Shield size={18} />
              Staff Management
            </button>
          )}
          <button 
            onClick={() => setActiveTab('appearance')}
            className={`px-6 py-4 text-sm font-bold flex items-center gap-2 transition-colors ${
              activeTab === 'appearance' ? 'text-[#000080] border-b-2 border-[#000080]' : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            <Palette size={18} />
            Appearance
          </button>
        </div>

        <div className="p-8">
          {activeTab === 'profile' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                  <input
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#000080] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                  <input
                    disabled
                    value={profile?.email}
                    className="w-full px-4 py-2 border border-gray-100 rounded-xl bg-gray-50 text-gray-500 cursor-not-allowed"
                  />
                </div>
              </div>
              <div className="pt-4">
                <button 
                  onClick={handleUpdateProfile}
                  disabled={loading}
                  className="bg-[#000080] text-white px-8 py-2 rounded-xl font-bold hover:bg-[#000060] transition-colors flex items-center gap-2"
                >
                  <Save size={18} />
                  Save Changes
                </button>
              </div>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="max-w-md space-y-6">
              <div className="bg-yellow-50 p-4 rounded-xl border border-yellow-100 flex gap-3">
                <Shield className="text-yellow-600 shrink-0" size={20} />
                <p className="text-xs text-yellow-800">
                  Keep your account secure by using a strong password. You will be logged out of other devices after changing your password.
                </p>
              </div>

              <form onSubmit={handleChangePassword} className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">New Password</label>
                  <input
                    type="password"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#000080] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Confirm New Password</label>
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#000080] outline-none"
                  />
                </div>
                <div className="pt-2">
                  <button 
                    type="submit"
                    disabled={passwordLoading}
                    className="bg-[#000080] text-white px-8 py-2 rounded-xl font-bold hover:bg-[#000060] transition-colors flex items-center gap-2 disabled:opacity-50"
                  >
                    {passwordLoading ? (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        <Lock size={18} />
                        Update Password
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}

          {activeTab === 'organization' && (
            <div className="space-y-6">
              <div className="flex gap-3">
                <input
                  placeholder="Organization Name"
                  value={newOrgName}
                  onChange={(e) => setNewOrgName(e.target.value)}
                  className="flex-1 px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#000080] outline-none"
                />
                <button 
                  onClick={handleAddOrganization}
                  className="bg-[#000080] text-white px-6 py-2 rounded-xl font-bold hover:bg-[#000060] transition-colors flex items-center gap-2"
                >
                  <Plus size={18} />
                  Add
                </button>
              </div>
              <div className="space-y-3">
                {organizations.map(org => (
                  <div key={org.id} className="p-4 border border-gray-100 rounded-xl flex items-center justify-between hover:bg-gray-50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="bg-blue-50 p-2 rounded-lg text-[#000080]">
                        <Building2 size={18} />
                      </div>
                      <span className="font-bold text-gray-900">{org.name}</span>
                    </div>
                    <button 
                      onClick={() => handleDeleteOrganization(org.id)}
                      className="text-gray-400 hover:text-red-500 p-2"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'admins' && (
            <div className="space-y-6">
              <div className="bg-blue-50 p-6 rounded-2xl border border-blue-100">
                <h4 className="text-sm font-bold text-[#000080] mb-4 uppercase tracking-wider">Add Organization Admin</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <input
                    placeholder="Admin Email"
                    value={newAdminEmail}
                    onChange={(e) => setNewAdminEmail(e.target.value)}
                    className="px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#000080] outline-none bg-white"
                  />
                  <select 
                    value={newAdminOrgId}
                    onChange={(e) => setNewAdminOrgId(e.target.value)}
                    className="px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#000080] outline-none bg-white"
                  >
                    <option value="">Select Organization</option>
                    {organizations.map(org => (
                      <option key={org.id} value={org.id}>{org.name}</option>
                    ))}
                  </select>
                  <button 
                    onClick={handleAddAdmin}
                    disabled={loading}
                    className="bg-[#000080] text-white px-6 py-2 rounded-xl font-bold hover:bg-[#000060] transition-colors disabled:opacity-50"
                  >
                    Add Admin
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                {allAdmins.map(admin => (
                  <div key={admin.id} className="p-4 border border-gray-100 rounded-xl flex items-center justify-between hover:bg-gray-50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-[#000080]">
                        <Shield size={20} />
                      </div>
                      <div>
                        <p className="font-bold text-gray-900">{admin.full_name || admin.email}</p>
                        <p className="text-xs text-gray-500 uppercase tracking-widest">
                          {(admin as any).organizations?.name || 'No Organization'}
                        </p>
                      </div>
                    </div>
                    <button 
                      onClick={() => handleDeleteProfile(admin.id)}
                      className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'staff' && (
            <div className="space-y-6">
              <div className="bg-blue-50 p-6 rounded-2xl border border-blue-100">
                <h4 className="text-sm font-bold text-[#000080] mb-4 uppercase tracking-wider">Add New Staff</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <input
                    placeholder="Staff Email"
                    value={newStaffEmail}
                    onChange={(e) => setNewStaffEmail(e.target.value)}
                    className="md:col-span-1 px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#000080] outline-none bg-white"
                  />
                  <select 
                    value={newStaffRole}
                    onChange={(e) => setNewStaffRole(e.target.value as UserRole)}
                    className="px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#000080] outline-none bg-white"
                  >
                    <option value="staff_finance">Finance Staff</option>
                    <option value="staff_attendance">Attendance Staff</option>
                  </select>
                  <button 
                    onClick={handleAddStaff}
                    disabled={loading}
                    className="bg-[#000080] text-white px-6 py-2 rounded-xl font-bold hover:bg-[#000060] transition-colors disabled:opacity-50"
                  >
                    Add Staff
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                {staff.map(s => (
                  <div key={s.id} className="p-4 border border-gray-100 rounded-xl flex items-center justify-between hover:bg-gray-50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-[#000080]">
                        <User size={20} />
                      </div>
                      <div>
                        <p className="font-bold text-gray-900">{s.full_name || s.email}</p>
                        <p className="text-xs text-gray-500 uppercase tracking-widest">{s.role.replace('_', ' ')}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button className="p-2 text-gray-400 hover:text-[#000080] hover:bg-blue-50 rounded-lg">
                        <Lock size={18} />
                      </button>
                      <button 
                        onClick={() => handleDeleteProfile(s.id)}
                        className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'appearance' && (
            <div className="space-y-8">
              <div>
                <h4 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <Palette size={18} className="text-[#FFD700]" />
                  Background Color
                </h4>
                <div className="flex flex-wrap gap-4">
                  {['#f3f4f6', '#ffffff', '#eef2ff', '#fffbeb', '#f0fdf4'].map(color => (
                    <button
                      key={color}
                      onClick={() => setBgColor(color)}
                      className={`w-12 h-12 rounded-2xl border-4 transition-all ${
                        bgColor === color ? 'border-[#000080] scale-110' : 'border-transparent hover:scale-105'
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                  <input 
                    type="color" 
                    value={bgColor}
                    onChange={(e) => setBgColor(e.target.value)}
                    className="w-12 h-12 rounded-2xl border-none p-0 cursor-pointer"
                  />
                </div>
              </div>

              {profile?.role === 'admin' && (
                <div>
                  <h4 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <Layout size={18} className="text-[#FFD700]" />
                    Receipt Layout
                  </h4>
                  <div className="p-6 border-2 border-dashed border-gray-100 rounded-2xl bg-gray-50 text-center">
                    <SettingsIcon size={32} className="text-gray-200 mx-auto mb-2" />
                    <p className="text-sm text-gray-400">Custom receipt layout editor coming soon.</p>
                  </div>
                </div>
              )}

              <div className="pt-4">
                <button 
                  onClick={handleUpdateProfile}
                  disabled={loading}
                  className="bg-[#000080] text-white px-8 py-2 rounded-xl font-bold hover:bg-[#000060] transition-colors flex items-center gap-2"
                >
                  <Save size={18} />
                  Save Appearance
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
