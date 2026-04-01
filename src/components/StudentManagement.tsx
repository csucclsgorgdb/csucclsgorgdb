import React, { useState, useEffect } from 'react';
import { Profile, Student } from '../types';
import { supabase } from '../lib/supabase';
import { 
  Search, 
  Plus, 
  Upload, 
  Edit2, 
  Trash2, 
  ChevronLeft, 
  ChevronRight,
  Filter,
  Download,
  FileSpreadsheet,
  X,
  FileUp
} from 'lucide-react';
import { cn } from '../lib/utils';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';

const PAGE_SIZE = 10;

const classifyStudent = (course: string) => {
  const c = course.toUpperCase();
  if (c.includes('BTLED') || c.includes('BTVTED')) return 'Education Dept. Student';
  if (c.includes('BSINDUSTECH')) return 'Indus Tech Dept. Student';
  return 'General Student';
};

export default function StudentManagement({ profile }: { profile: Profile | null }) {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterDept, setFilterDept] = useState('');
  const [filterCollege, setFilterCollege] = useState('');
  const [filterYear, setFilterYear] = useState('');
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Partial<Student> | null>(null);
  const [viewingStudent, setViewingStudent] = useState<Student | null>(null);
  const [studentToDelete, setStudentToDelete] = useState<Student | null>(null);

  useEffect(() => {
    fetchStudents();
  }, [page, search, filterDept, filterCollege, filterYear]);

  async function fetchStudents() {
    setLoading(true);
    try {
      let query = supabase
        .from('students')
        .select('*', { count: 'exact' });

      if (profile?.organization_name === 'HERO Organization') {
        query = query.in('department', ['Education Dept. Student', 'General Student']);
      }

      if (search) {
        query = query.or(`full_name.ilike.%${search}%,student_id.ilike.%${search}%`);
      }

      if (filterDept) {
        query = query.eq('department', filterDept);
      }

      if (filterCollege) {
        query = query.eq('college', filterCollege);
      }

      if (filterYear) {
        query = query.eq('year_level', parseInt(filterYear));
      }

      const { data, count, error } = await query
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setStudents(data || []);
      setTotalCount(count || 0);
    } catch (error) {
      console.error('Error fetching students:', error);
    } finally {
      setLoading(false);
    }
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.name.endsWith('.csv')) {
      Papa.parse(file, {
        header: true,
        complete: async (results) => {
          const newStudents = results.data
            .filter((row: any) => {
              const id = row.ID || row.id || row.student_id || row['Student ID'] || row['STUDENT ID'];
              const name = row['Full Name'] || row.full_name || row.fullName || row['FULL NAME'];
              return id && name;
            })
            .map((row: any) => {
              const id = row.ID || row.id || row.student_id || row['Student ID'] || row['STUDENT ID'];
              const fullName = row['Full Name'] || row.full_name || row.fullName || row['FULL NAME'] || '';
              const courseProgram = row['Course/Program'] || row.course_program || row.course || row.program || row['COURSE'] || row['PROGRAM'] || '';
              const college = row.College || row.college || row['COLLEGE'] || '';
              const yearLevel = parseInt(row['Year level'] || row.year_level || row['Year Level'] || row['YEAR LEVEL'] || '1');
              const email = row.Email || row.email || row['EMAIL'] || `${id}@example.com`;

              return {
                student_id: id,
                full_name: fullName,
                college: college,
                course: courseProgram,
                program: courseProgram,
                year_level: yearLevel,
                email: email,
                department: classifyStudent(courseProgram),
                organization_id: profile?.organization_id
              };
            });

          if (newStudents.length === 0) {
            alert('No valid student data found in file. Please check your column headers (e.g., Student ID, Full Name).');
            return;
          }

          const { error } = await supabase.from('students').upsert(newStudents, { onConflict: 'student_id' });
          if (error) alert('Error importing students: ' + error.message);
          else {
            alert('Students imported successfully!');
            fetchStudents();
          }
        }
      });
    } else if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
      const reader = new FileReader();
      reader.onload = async (evt) => {
        try {
          const data = evt.target?.result;
          const wb = XLSX.read(data, { type: 'array' });
          const wsname = wb.SheetNames[0];
          const ws = wb.Sheets[wsname];
          const jsonData = XLSX.utils.sheet_to_json(ws);
          
          if (!jsonData || jsonData.length === 0) {
            alert('The Excel file is empty.');
            return;
          }

          const newStudents = jsonData
            .filter((row: any) => {
              // Be very flexible with column names
              const id = row.ID || row.id || row.student_id || row['Student ID'] || row['STUDENT ID'] || row['Student_ID'] || row['studentId'];
              const name = row['Full Name'] || row.full_name || row.fullName || row['FULL NAME'] || row['Name'] || row['NAME'] || row['Student Name'];
              return id && name;
            })
            .map((row: any) => {
              const id = String(row.ID || row.id || row.student_id || row['Student ID'] || row['STUDENT ID'] || row['Student_ID'] || row['studentId']);
              const fullName = row['Full Name'] || row.full_name || row.fullName || row['FULL NAME'] || row['Name'] || row['NAME'] || row['Student Name'] || '';
              const courseProgram = row['Course/Program'] || row.course_program || row.course || row.program || row['COURSE'] || row['PROGRAM'] || row['Course_Program'] || '';
              const college = row.College || row.college || row['COLLEGE'] || row['College_Name'] || '';
              const yearLevel = parseInt(row['Year level'] || row.year_level || row['Year Level'] || row['YEAR LEVEL'] || row['Year_Level'] || '1');
              const email = row.Email || row.email || row['EMAIL'] || `${id}@example.com`;

              return {
                student_id: id,
                full_name: fullName,
                college: college,
                course: courseProgram,
                program: courseProgram,
                year_level: isNaN(yearLevel) ? 1 : yearLevel,
                email: email,
                department: classifyStudent(courseProgram),
                organization_id: profile?.organization_id
              };
            });

          if (newStudents.length === 0) {
            alert('No valid student data found in file. Please ensure your Excel file has columns like "Student ID" and "Full Name".');
            return;
          }

          const { error } = await supabase.from('students').upsert(newStudents, { onConflict: 'student_id' });
          if (error) alert('Error importing students: ' + error.message);
          else {
            alert('Students imported successfully!');
            fetchStudents();
          }
        } catch (err: any) {
          alert('Error reading Excel file: ' + err.message);
        }
      };
      reader.readAsArrayBuffer(file);
    }
  };

  const handleSaveStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStudent) return;

    const studentData = {
      ...editingStudent,
      department: classifyStudent(editingStudent.course || '')
    };

    try {
      if (editingStudent.id) {
        const { error } = await supabase
          .from('students')
          .update(studentData)
          .eq('id', editingStudent.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('students')
          .insert([{ ...studentData, organization_id: profile?.organization_id }]);
        if (error) throw error;
      }
      setIsModalOpen(false);
      setEditingStudent(null);
      fetchStudents();
    } catch (error: any) {
      alert('Error saving student: ' + error.message);
    }
  };

  const handleDeleteStudent = async () => {
    if (!studentToDelete) return;

    try {
      const { error } = await supabase
        .from('students')
        .delete()
        .eq('id', studentToDelete.id);

      if (error) throw error;
      setIsDeleteModalOpen(false);
      setStudentToDelete(null);
      fetchStudents();
    } catch (error: any) {
      alert('Error deleting student: ' + error.message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-1 flex-wrap items-center gap-3">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search ID or Name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#000080] outline-none"
            />
          </div>
          
          <div className="flex items-center gap-2">
            <select
              value={filterDept}
              onChange={(e) => setFilterDept(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#000080] outline-none"
            >
              <option value="">All Depts</option>
              <option value="Education Dept. Student">Education</option>
              <option value="Indus Tech Dept. Student">Indus Tech</option>
              <option value="General Student">General</option>
            </select>

            <select
              value={filterCollege}
              onChange={(e) => setFilterCollege(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#000080] outline-none"
            >
              <option value="">All Colleges</option>
              <option value="College of Education">Education</option>
              <option value="College of Technology">Technology</option>
            </select>

            <select
              value={filterYear}
              onChange={(e) => setFilterYear(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-[#000080] outline-none"
            >
              <option value="">All Years</option>
              <option value="1">Year 1</option>
              <option value="2">Year 2</option>
              <option value="3">Year 3</option>
              <option value="4">Year 4</option>
              <option value="5">Year 5</option>
            </select>

            {(filterDept || filterCollege || filterYear) && (
              <button 
                onClick={() => {
                  setFilterDept('');
                  setFilterCollege('');
                  setFilterYear('');
                }}
                className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                title="Clear Filters"
              >
                <X size={18} />
              </button>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <label className="bg-white border border-gray-200 text-gray-700 px-4 py-2 rounded-xl hover:bg-gray-50 transition-colors cursor-pointer flex items-center gap-2">
            <FileUp size={18} />
            Upload Excel/CSV
            <input type="file" accept=".csv,.xlsx,.xls" onChange={handleFileUpload} className="hidden" />
          </label>
          <button 
            onClick={() => {
              setEditingStudent({});
              setIsModalOpen(true);
            }}
            className="bg-[#000080] text-white px-4 py-2 rounded-xl hover:bg-[#000060] transition-colors flex items-center gap-2"
          >
            <Plus size={18} />
            Add Student
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Student ID</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Full Name</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Department</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">College</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Course/Program</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Year Level</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#000080] mx-auto"></div>
                  </td>
                </tr>
              ) : students.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-500">No students found.</td>
                </tr>
              ) : (
                students.map((student) => (
                  <tr 
                    key={student.id} 
                    className="hover:bg-gray-50 transition-colors cursor-pointer group/row"
                    onClick={() => {
                      setViewingStudent(student);
                      setIsViewModalOpen(true);
                    }}
                  >
                    <td className="px-6 py-4 whitespace-nowrap font-medium text-[#000080]">{student.student_id}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-semibold text-gray-900">{student.full_name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={cn(
                        "px-2 py-1 text-[10px] font-bold rounded-lg",
                        student.department === 'Education Dept. Student' ? "bg-green-50 text-green-700" :
                        student.department === 'Indus Tech Dept. Student' ? "bg-orange-50 text-orange-700" :
                        "bg-gray-50 text-gray-700"
                      )}>
                        {student.department || 'General'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{student.college}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{student.course} - {student.program}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 py-1 bg-blue-50 text-[#000080] text-xs font-bold rounded-lg">
                        Year {student.year_level}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => {
                            setEditingStudent(student);
                            setIsModalOpen(true);
                          }}
                          className="p-2 text-gray-400 hover:text-[#000080] hover:bg-blue-50 rounded-lg transition-colors"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button 
                          onClick={() => {
                            setStudentToDelete(student);
                            setIsDeleteModalOpen(true);
                          }}
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
          <p className="text-sm text-gray-500">
            Showing <span className="font-bold text-gray-900">{page * PAGE_SIZE + 1}</span> to <span className="font-bold text-gray-900">{Math.min((page + 1) * PAGE_SIZE, totalCount)}</span> of <span className="font-bold text-gray-900">{totalCount}</span> students
          </p>
          <div className="flex items-center gap-2">
            <button 
              disabled={page === 0}
              onClick={() => setPage(p => p - 1)}
              className="p-2 border border-gray-200 rounded-lg hover:bg-white disabled:opacity-50 transition-colors"
            >
              <ChevronLeft size={20} />
            </button>
            <button 
              disabled={(page + 1) * PAGE_SIZE >= totalCount}
              onClick={() => setPage(p => p + 1)}
              className="p-2 border border-gray-200 rounded-lg hover:bg-white disabled:opacity-50 transition-colors"
            >
              <ChevronRight size={20} />
            </button>
          </div>
        </div>
      </div>

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-[#000080] text-white">
              <h3 className="text-xl font-bold">{editingStudent?.id ? 'Edit Student' : 'Add New Student'}</h3>
              <button onClick={() => setIsModalOpen(false)} className="hover:bg-white/10 p-1 rounded-lg">
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleSaveStudent} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Student ID</label>
                  <input
                    required
                    value={editingStudent?.student_id || ''}
                    onChange={(e) => setEditingStudent({ ...editingStudent, student_id: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#000080] outline-none"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                  <input
                    required
                    value={editingStudent?.full_name || ''}
                    onChange={(e) => setEditingStudent({ ...editingStudent, full_name: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#000080] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">College</label>
                  <input
                    required
                    value={editingStudent?.college || ''}
                    onChange={(e) => setEditingStudent({ ...editingStudent, college: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#000080] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Course</label>
                  <input
                    required
                    value={editingStudent?.course || ''}
                    onChange={(e) => setEditingStudent({ ...editingStudent, course: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#000080] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Program</label>
                  <input
                    required
                    value={editingStudent?.program || ''}
                    onChange={(e) => setEditingStudent({ ...editingStudent, program: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#000080] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Year Level</label>
                  <select
                    required
                    value={editingStudent?.year_level || 1}
                    onChange={(e) => setEditingStudent({ ...editingStudent, year_level: parseInt(e.target.value) })}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#000080] outline-none"
                  >
                    {[1, 2, 3, 4, 5].map(y => <option key={y} value={y}>Year {y}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    required
                    value={editingStudent?.email || ''}
                    onChange={(e) => setEditingStudent({ ...editingStudent, email: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#000080] outline-none"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button 
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-6 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="px-6 py-2 bg-[#000080] text-white rounded-lg hover:bg-[#000060] transition-colors font-bold"
                >
                  Save Student
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* View Details Modal */}
      {isViewModalOpen && viewingStudent && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="p-6 bg-[#000080] text-white flex items-center justify-between">
              <h3 className="text-xl font-bold">Student Details</h3>
              <button onClick={() => setIsViewModalOpen(false)} className="hover:bg-white/10 p-1 rounded-lg">
                <X size={24} />
              </button>
            </div>
            <div className="p-6 space-y-6">
              <div className="flex flex-col items-center text-center">
                <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center text-[#000080] font-bold text-2xl mb-4">
                  {viewingStudent.full_name.charAt(0)}
                </div>
                <h4 className="text-xl font-bold text-gray-900">
                  {viewingStudent.full_name}
                </h4>
                <p className="text-sm text-gray-500">{viewingStudent.student_id}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-gray-50 rounded-xl col-span-2">
                  <p className="text-xs text-gray-400 font-bold uppercase mb-1">Department</p>
                  <p className="text-sm font-semibold text-gray-900">{viewingStudent.department || 'General'}</p>
                </div>
                <div className="p-3 bg-gray-50 rounded-xl">
                  <p className="text-xs text-gray-400 font-bold uppercase mb-1">College</p>
                  <p className="text-sm font-semibold text-gray-900">{viewingStudent.college}</p>
                </div>
                <div className="p-3 bg-gray-50 rounded-xl">
                  <p className="text-xs text-gray-400 font-bold uppercase mb-1">Year Level</p>
                  <p className="text-sm font-semibold text-gray-900">Year {viewingStudent.year_level}</p>
                </div>
                <div className="p-3 bg-gray-50 rounded-xl">
                  <p className="text-xs text-gray-400 font-bold uppercase mb-1">Course</p>
                  <p className="text-sm font-semibold text-gray-900">{viewingStudent.course}</p>
                </div>
                <div className="p-3 bg-gray-50 rounded-xl">
                  <p className="text-xs text-gray-400 font-bold uppercase mb-1">Program</p>
                  <p className="text-sm font-semibold text-gray-900">{viewingStudent.program}</p>
                </div>
                <div className="p-3 bg-gray-50 rounded-xl col-span-2">
                  <p className="text-xs text-gray-400 font-bold uppercase mb-1">Email Address</p>
                  <p className="text-sm font-semibold text-gray-900">{viewingStudent.email}</p>
                </div>
              </div>

              <div className="flex justify-center pt-4">
                <button 
                  onClick={() => setIsViewModalOpen(false)}
                  className="px-8 py-2 bg-[#000080] text-white rounded-xl font-bold hover:bg-[#000060] transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[70] p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 text-center">
              <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 size={32} />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Delete Student?</h3>
              <p className="text-gray-500 mb-6">
                Are you sure you want to delete <span className="font-bold text-gray-900">{studentToDelete?.full_name}</span>? 
                This action cannot be undone and will remove all associated records.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setIsDeleteModalOpen(false)}
                  className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-600 rounded-xl font-bold hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteStudent}
                  className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-colors shadow-lg shadow-red-200"
                >
                  Delete Student
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
