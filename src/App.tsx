/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';
import { Profile, UserRole } from './types';
import { 
  LayoutDashboard, 
  Users, 
  Calendar, 
  CircleDollarSign, 
  ClipboardCheck, 
  Settings, 
  LogOut, 
  Menu, 
  X,
  ChevronRight,
  User as UserIcon,
  Clock,
  BookOpen
} from 'lucide-react';
import { cn } from './lib/utils';
import Dashboard from './components/Dashboard';
import StudentManagement from './components/StudentManagement';
import EventManagement from './components/EventManagement';
import FinanceManagement from './components/FinanceManagement';
import AttendanceManagement from './components/AttendanceManagement';
import SettingsPage from './components/SettingsPage';
import AdminManagement from './components/AdminManagement';

type Page = 'dashboard' | 'students' | 'events' | 'finance' | 'attendance' | 'settings' | 'users';

export default function App() {
  const [session, setSession] = useState<any>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [activePage, setActivePage] = useState<Page>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) fetchProfile(session.user.id);
      else setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) fetchProfile(session.user.id);
      else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function bootstrapOrganizations() {
    const orgs = ['CITTE LSG', 'HERO Organization', 'PSTTS Organization'];
    try {
      const { data: existingOrgs } = await supabase
        .from('organizations')
        .select('name');
      
      const existingNames = existingOrgs?.map(o => o.name) || [];
      const missingOrgs = orgs.filter(name => !existingNames.includes(name));

      if (missingOrgs.length > 0) {
        const { error } = await supabase
          .from('organizations')
          .insert(missingOrgs.map(name => ({ name })));
        
        if (error) throw error;
        console.log('Bootstrapped organizations:', missingOrgs);
      }
    } catch (error) {
      console.error('Error bootstrapping organizations:', error);
    }
  }

  async function fetchProfile(userId: string) {
    setProfileError(null);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const userEmail = sessionData.session?.user.email;

      const { data, error } = await supabase
        .from('profiles')
        .select('*, organizations(name)')
        .eq('id', userId)
        .single();

      const superAdminEmails = ['adminsystem@gmail.com', 'daviesialongo37@gmail.com'];
      const isSuperAdmin = userEmail && superAdminEmails.includes(userEmail);

      if (error) {
        // If profile doesn't exist and email matches, create it
        if (error.code === 'PGRST116' && isSuperAdmin) {
          const { data: newProfile, error: createError } = await supabase
            .from('profiles')
            .insert([{
              id: userId,
              email: userEmail,
              role: 'super_admin',
              full_name: userEmail === 'adminsystem@gmail.com' ? 'System Super Admin' : 'Developer Admin'
            }])
            .select()
            .single();
          
          if (createError) throw createError;
          setProfile({
            ...newProfile,
            organization_name: 'System Admin'
          });
          bootstrapOrganizations(); // Bootstrap orgs for super admin
        } else if (error.code === 'PGRST116') {
          // Profile doesn't exist and not a super admin - this shouldn't happen if signed up via app
          setProfileError("Profile not found. Please try logging out and signing up again.");
        } else {
          throw error;
        }
      } else {
        // If profile exists but email is in superAdminEmails and role is not super_admin, update it
        if (isSuperAdmin && data.role !== 'super_admin') {
          const { data: updatedProfile, error: updateError } = await supabase
            .from('profiles')
            .update({ role: 'super_admin' })
            .eq('id', userId)
            .select()
            .single();
          
          if (updateError) throw updateError;
          setProfile(updatedProfile);
          bootstrapOrganizations(); // Bootstrap orgs for super admin
        } else {
          setProfile({
          ...data,
          organization_name: data.organizations?.name
        });
          if (isSuperAdmin) bootstrapOrganizations(); // Ensure orgs exist for super admin
        }
      }
    } catch (error: any) {
      console.error('Error fetching profile:', error);
      setProfileError(error.message || "An unexpected error occurred while setting up your profile.");
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#000080]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#FFD700]"></div>
      </div>
    );
  }

  if (!session) {
    return <Login />;
  }

  const sidebarItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['super_admin', 'admin', 'staff_finance', 'staff_attendance'] },
    { id: 'students', label: 'Student Management', icon: Users, roles: ['super_admin', 'admin'] },
    { id: 'events', label: 'Event Management', icon: Calendar, roles: ['super_admin', 'admin', 'staff_attendance'] },
    { id: 'finance', label: 'Finance Management', icon: CircleDollarSign, roles: ['super_admin', 'admin', 'staff_finance'] },
    { id: 'attendance', label: 'Attendance Management', icon: ClipboardCheck, roles: ['super_admin', 'admin', 'staff_attendance'] },
    { id: 'users', label: 'User Management', icon: UserIcon, roles: ['super_admin'] },
    { id: 'settings', label: 'Settings', icon: Settings, roles: ['super_admin', 'admin', 'staff_finance', 'staff_attendance'] },
  ];

  const filteredSidebarItems = sidebarItems.filter(item => 
    profile && item.roles.includes(profile.role)
  );

  const renderPage = () => {
    if (!profile) {
      return (
        <div className="flex flex-col items-center justify-center h-full text-gray-500 p-8 text-center">
          {profileError ? (
            <div className="max-w-md">
              <X size={48} className="text-red-500 mb-4 mx-auto" />
              <h3 className="text-xl font-bold text-gray-900 mb-2">Profile Setup Failed</h3>
              <p className="text-sm mb-6">{profileError}</p>
              <div className="flex gap-4 justify-center">
                <button 
                  onClick={() => fetchProfile(session.user.id)}
                  className="px-6 py-2 bg-[#000080] text-white rounded-xl font-bold hover:bg-[#000060] transition-colors"
                >
                  Retry
                </button>
                <button 
                  onClick={() => supabase.auth.signOut()}
                  className="px-6 py-2 border border-gray-300 text-gray-600 rounded-xl font-bold hover:bg-gray-50 transition-colors"
                >
                  Logout
                </button>
              </div>
              <div className="mt-8 p-4 bg-yellow-50 rounded-xl border border-yellow-100 text-left">
                <p className="text-xs text-yellow-800 font-bold mb-1 uppercase">Troubleshooting:</p>
                <p className="text-xs text-yellow-700">
                  If you see an RLS error, please ensure you have run the SQL schema in your Supabase SQL Editor.
                </p>
              </div>
            </div>
          ) : (
            <div className="animate-pulse flex flex-col items-center">
              <UserIcon size={48} className="text-gray-300 mb-4" />
              <h3 className="text-xl font-bold">Setting up your profile...</h3>
              <p className="text-sm">This usually takes a few seconds.</p>
            </div>
          )}
        </div>
      );
    }

    // Check if user has access to activePage
    const currentPageItem = sidebarItems.find(item => item.id === activePage);
    if (currentPageItem && !currentPageItem.roles.includes(profile.role)) {
      return (
        <div className="flex flex-col items-center justify-center h-full text-gray-500">
          <X size={48} className="text-red-500 mb-4" />
          <h3 className="text-xl font-bold">Access Denied</h3>
          <p>You do not have permission to view this page.</p>
          <button 
            onClick={() => setActivePage('dashboard')}
            className="mt-4 px-4 py-2 bg-[#000080] text-white rounded-lg"
          >
            Go to Dashboard
          </button>
        </div>
      );
    }

    switch (activePage) {
      case 'dashboard': return <Dashboard profile={profile} />;
      case 'students': return <StudentManagement profile={profile} />;
      case 'events': return <EventManagement profile={profile} />;
      case 'finance': return <FinanceManagement profile={profile} />;
      case 'attendance': return <AttendanceManagement profile={profile} />;
      case 'users': return <AdminManagement profile={profile} />;
      case 'settings': return <SettingsPage profile={profile} onProfileUpdate={fetchProfile} />;
      default: return <Dashboard profile={profile} />;
    }
  };

  return (
    <div className="min-h-screen flex bg-gray-100" style={{ backgroundColor: profile?.background_color || '#f3f4f6' }}>
      {/* Sidebar */}
      <aside 
        className={cn(
          "bg-[#000080] text-white transition-all duration-300 flex flex-col z-50",
          isSidebarOpen ? "w-64" : "w-20"
        )}
      >
        <div className="p-4 flex items-center justify-between border-b border-white/10">
          {isSidebarOpen && (
            <span className="font-bold text-lg text-[#FFD700] truncate">
              OAS System
            </span>
          )}
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        <nav className="flex-1 py-4 overflow-y-auto">
          {filteredSidebarItems.map((item) => {
            const Icon = item.icon;
            const isActive = activePage === item.id;
            
            return (
              <button
                key={item.id}
                onClick={() => setActivePage(item.id as Page)}
                className={cn(
                  "w-full flex items-center p-4 transition-colors relative group",
                  isActive ? "bg-[#FFD700] text-[#000080]" : "hover:bg-white/5 text-gray-300"
                )}
              >
                <Icon size={24} className={cn("min-w-[24px]", isActive ? "text-[#000080]" : "text-[#FFD700]")} />
                {isSidebarOpen && (
                  <span className="ml-4 font-medium truncate">{item.label}</span>
                )}
                {!isSidebarOpen && (
                  <div className="absolute left-full ml-2 px-2 py-1 bg-black text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap">
                    {item.label}
                  </div>
                )}
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-white/10">
          <button
            onClick={() => supabase.auth.signOut()}
            className={cn(
              "w-full flex items-center p-4 text-red-400 hover:bg-red-400/10 rounded-lg transition-colors",
              !isSidebarOpen && "justify-center"
            )}
          >
            <LogOut size={24} />
            {isSidebarOpen && <span className="ml-4 font-medium">Logout</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white shadow-sm h-16 flex items-center justify-between px-8 z-40">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-semibold text-[#000080] capitalize">
              {activePage.replace('-', ' ')}
            </h2>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium text-gray-900">{profile?.full_name}</p>
              <p className="text-xs text-gray-500 uppercase tracking-wider">{profile?.role.replace('_', ' ')}</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-[#FFD700] flex items-center justify-center text-[#000080] font-bold">
              {profile?.full_name?.charAt(0) || 'U'}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 overflow-y-auto p-8">
          {renderPage()}
        </div>
      </main>
    </div>
  );
}

function Login() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName
            }
          }
        });
        if (error) throw error;
        alert('Check your email for the confirmation link!');
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#000080] p-4">
      <div className="bg-white p-8 rounded-2xl shadow-2xl w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-[#000080] mb-2">OAS System</h1>
          <p className="text-gray-500">Organization Automated System</p>
        </div>

        <div className="flex bg-gray-100 p-1 rounded-xl mb-8">
          <button 
            onClick={() => setIsSignUp(false)}
            className={cn(
              "flex-1 py-2 text-sm font-bold rounded-lg transition-all",
              !isSignUp ? "bg-white text-[#000080] shadow-sm" : "text-gray-500 hover:text-gray-700"
            )}
          >
            Sign In
          </button>
          <button 
            onClick={() => setIsSignUp(true)}
            className={cn(
              "flex-1 py-2 text-sm font-bold rounded-lg transition-all",
              isSignUp ? "bg-white text-[#000080] shadow-sm" : "text-gray-500 hover:text-gray-700"
            )}
          >
            Sign Up
          </button>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm mb-6 border border-red-100">
            {error}
          </div>
        )}

        <form onSubmit={handleAuth} className="space-y-6">
          {isSignUp && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#000080] focus:border-transparent outline-none transition-all"
                placeholder="John Doe"
              />
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#000080] focus:border-transparent outline-none transition-all"
              placeholder="admin@school.edu"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#000080] focus:border-transparent outline-none transition-all"
              placeholder="••••••••"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#000080] text-white py-3 rounded-lg font-semibold hover:bg-[#000060] transition-colors disabled:opacity-50 flex items-center justify-center"
          >
            {loading ? <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-white"></div> : (isSignUp ? 'Create Account' : 'Sign In')}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-gray-100 text-center">
          <p className="text-xs text-gray-400">
            &copy; 2026 Organization Automated System. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}
