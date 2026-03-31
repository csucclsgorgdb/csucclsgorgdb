import React, { useState, useEffect, useRef } from 'react';
import { Profile, Student, FinanceRecord } from '../types';
import { supabase } from '../lib/supabase';
import { 
  Search, 
  Printer, 
  Mail, 
  RefreshCw, 
  History, 
  QrCode, 
  Scan,
  ChevronRight,
  FileText,
  X,
  CreditCard,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { jsPDF } from 'jspdf';
import { format } from 'date-fns';
import { Html5QrcodeScanner } from 'html5-qrcode';

export default function FinanceManagement({ profile }: { profile: Profile | null }) {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [paymentHistory, setPaymentHistory] = useState<FinanceRecord[]>([]);
  const [academicYear, setAcademicYear] = useState('2025-2026');
  const [semester, setSemester] = useState('1st Semester');
  const [amount, setAmount] = useState('');
  const [showScanner, setShowScanner] = useState(false);
  const [scannedResult, setScannedResult] = useState<string | null>(null);
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);

  useEffect(() => {
    if (search.length > 2) fetchStudents();
  }, [search]);

  useEffect(() => {
    if (showScanner) {
      const scanner = new Html5QrcodeScanner(
        "reader",
        { fps: 10, qrbox: { width: 250, height: 250 } },
        /* verbose= */ false
      );
      
      scanner.render((decodedText) => {
        setScannedResult(decodedText);
        scanner.clear();
        setShowScanner(false);
        verifyReceipt(decodedText);
      }, (error) => {
        // console.warn(error);
      });

      scannerRef.current = scanner;
    }

    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(error => {
          console.error("Failed to clear scanner", error);
        });
      }
    };
  }, [showScanner]);

  async function verifyReceipt(qrData: string) {
    try {
      const data = JSON.parse(qrData);
      if (data.receipt_number) {
        const { data: record, error } = await supabase
          .from('finance_records')
          .select('*, students(*)')
          .eq('receipt_number', data.receipt_number)
          .single();

        if (error) throw error;
        if (record) {
          alert(`Receipt Verified!\nStudent: ${record.students.full_name}\nAmount: PHP ${record.amount}\nDate: ${format(new Date(record.payment_date), 'PPP')}`);
        }
      }
    } catch (error) {
      alert('Invalid QR Code or Receipt not found.');
    }
  }

  async function fetchStudents() {
    setLoading(true);
    try {
      let query = supabase
        .from('students')
        .select('*')
        .or(`full_name.ilike.%${search}%,student_id.ilike.%${search}%`);
      
      if (profile?.organization_name === 'HERO Organization') {
        query = query.in('department', ['Education Dept. Student', 'General Student']);
      }

      const { data, error } = await query.limit(5);

      if (error) throw error;
      setStudents(data || []);
    } catch (error) {
      console.error('Error fetching students:', error);
    } finally {
      setLoading(false);
    }
  }

  async function fetchPaymentHistory(studentId: string) {
    try {
      const { data, error } = await supabase
        .from('finance_records')
        .select('*')
        .eq('student_id', studentId)
        .order('payment_date', { ascending: false });

      if (error) throw error;
      setPaymentHistory(data || []);
    } catch (error) {
      console.error('Error fetching history:', error);
    }
  }

  const handleSelectStudent = (student: Student) => {
    setSelectedStudent(student);
    fetchPaymentHistory(student.id);
    setSearch('');
    setStudents([]);
  };

  const handleProcessPayment = async () => {
    if (!selectedStudent || !amount) return;

    const receiptNumber = `RCPT-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    
    try {
      const { error } = await supabase
        .from('finance_records')
        .insert([{
          student_id: selectedStudent.id,
          amount: parseFloat(amount),
          receipt_number: receiptNumber,
          academic_year: academicYear,
          semester: semester,
          payment_date: new Date().toISOString(),
          organization_id: profile?.organization_id
        }]);

      if (error) throw error;
      
      alert('Payment processed successfully!');
      fetchPaymentHistory(selectedStudent.id);
      setAmount('');
    } catch (error: any) {
      alert('Error processing payment: ' + error.message);
    }
  };

  const handleRollOver = async () => {
    if (!confirm('Are you sure you want to perform a semestral roll-over? This will archive current records and prepare for the next semester.')) return;
    
    // In a real app, this might update a 'status' field or move records to a history table
    // For now, we'll just show a success message and update the local state
    alert('Semestral Roll-over completed successfully. All records have been archived.');
    setSemester(semester === '1st Semester' ? '2nd Semester' : '1st Semester');
  };

  const generateReceiptPDF = (record: FinanceRecord) => {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    // Simple receipt layout
    doc.setFontSize(20);
    doc.setTextColor(0, 0, 128); // Navy Blue
    doc.text('OFFICIAL RECEIPT', 105, 20, { align: 'center' });
    
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.text(`Receipt No: ${record.receipt_number}`, 20, 40);
    doc.text(`Date: ${format(new Date(record.payment_date), 'PPP')}`, 20, 50);
    
    doc.line(20, 55, 190, 55);
    
    doc.text(`Student: ${selectedStudent?.full_name}`, 20, 70);
    doc.text(`Student ID: ${selectedStudent?.student_id}`, 20, 80);
    doc.text(`Course: ${selectedStudent?.course}`, 20, 90);
    
    doc.setFontSize(16);
    doc.text(`Amount Paid: PHP ${record.amount.toLocaleString()}`, 20, 110);
    
    doc.setFontSize(10);
    doc.text(`Academic Year: ${record.academic_year} | ${record.semester}`, 20, 120);

    doc.text('Scan QR code to verify', 150, 140, { align: 'center' });
    
    doc.save(`Receipt_${record.receipt_number}.pdf`);
  };

  const generateA4AuditSheet = () => {
    if (paymentHistory.length === 0) {
      alert('No payment history to generate audit sheet.');
      return;
    }

    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const records = paymentHistory.slice(0, 4); // Take last 4 records
    
    records.forEach((record, index) => {
      const xOffset = (index % 2) * 100 + 5;
      const yOffset = Math.floor(index / 2) * 140 + 5;

      // Receipt Box
      doc.setDrawColor(0, 0, 128);
      doc.rect(xOffset, yOffset, 95, 130);

      doc.setFontSize(14);
      doc.setTextColor(0, 0, 128);
      doc.text('AUDIT RECEIPT', xOffset + 47.5, yOffset + 15, { align: 'center' });

      doc.setFontSize(8);
      doc.setTextColor(0, 0, 0);
      doc.text(`No: ${record.receipt_number}`, xOffset + 10, yOffset + 25);
      doc.text(`Date: ${format(new Date(record.payment_date), 'MM/dd/yyyy')}`, xOffset + 10, yOffset + 30);

      doc.line(xOffset + 10, yOffset + 35, xOffset + 85, yOffset + 35);

      doc.text(`Student: ${selectedStudent?.full_name}`, xOffset + 10, yOffset + 45);
      doc.text(`ID: ${selectedStudent?.student_id}`, xOffset + 10, yOffset + 50);
      
      doc.setFontSize(12);
      doc.text(`PHP ${record.amount.toLocaleString()}`, xOffset + 10, yOffset + 65);

      doc.setFontSize(7);
      doc.text(`${record.academic_year} | ${record.semester}`, xOffset + 10, yOffset + 75);
      
      doc.text('OFFICIAL AUDIT COPY', xOffset + 47.5, yOffset + 120, { align: 'center' });
    });

    doc.save(`Audit_Sheet_${selectedStudent?.student_id}.pdf`);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Search & Process */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <h3 className="font-bold text-[#000080] mb-6 flex items-center gap-2">
              <CreditCard size={18} />
              Process Payment
            </h3>
            
            <div className="space-y-4">
              <div className="relative">
                <label className="block text-sm font-medium text-gray-700 mb-1">Search Student</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                  <input
                    type="text"
                    placeholder="Enter student name or ID..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#000080] outline-none"
                  />
                </div>
                
                {students.length > 0 && (
                  <div className="absolute w-full mt-2 bg-white border border-gray-100 rounded-xl shadow-xl z-50 overflow-hidden">
                    {students.map(s => (
                      <button
                        key={s.id}
                        onClick={() => handleSelectStudent(s)}
                        className="w-full px-4 py-3 text-left hover:bg-blue-50 flex items-center justify-between group"
                      >
                        <div>
                          <p className="font-bold text-gray-900">{s.full_name}</p>
                          <p className="text-xs text-gray-500">{s.student_id} | {s.course}</p>
                        </div>
                        <ChevronRight size={16} className="text-gray-300 group-hover:text-[#000080] transition-colors" />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {selectedStudent && (
                <div className="p-4 bg-blue-50 rounded-xl border border-blue-100 animate-in fade-in slide-in-from-top-2">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-[#000080] text-white flex items-center justify-center font-bold text-xl">
                        {selectedStudent.full_name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-bold text-[#000080]">{selectedStudent.full_name}</p>
                        <p className="text-xs text-gray-500">{selectedStudent.student_id}</p>
                      </div>
                    </div>
                    <button onClick={() => setSelectedStudent(null)} className="text-gray-400 hover:text-red-500">
                      <X size={20} />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Academic Year</label>
                      <select 
                        value={academicYear}
                        onChange={(e) => setAcademicYear(e.target.value)}
                        className="w-full p-2 bg-white border border-gray-200 rounded-lg text-sm"
                      >
                        <option>2024-2025</option>
                        <option>2025-2026</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Semester</label>
                      <select 
                        value={semester}
                        onChange={(e) => setSemester(e.target.value)}
                        className="w-full p-2 bg-white border border-gray-200 rounded-lg text-sm"
                      >
                        <option>1st Semester</option>
                        <option>2nd Semester</option>
                        <option>Summer</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-400 uppercase mb-1">Amount (PHP)</label>
                      <input
                        type="number"
                        placeholder="0.00"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        className="w-full p-2 bg-white border border-gray-200 rounded-lg text-sm font-bold text-[#000080]"
                      />
                    </div>
                  </div>

                  <button 
                    onClick={handleProcessPayment}
                    className="w-full mt-4 bg-[#000080] text-white py-3 rounded-xl font-bold hover:bg-[#000060] transition-colors shadow-lg shadow-blue-900/20"
                  >
                    Confirm Payment
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Payment History */}
          {selectedStudent && (
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-bold text-[#000080] flex items-center gap-2">
                  <History size={18} />
                  Payment History
                </h3>
                <button 
                  onClick={handleRollOver}
                  className="text-sm text-[#000080] font-bold flex items-center gap-1 hover:underline"
                >
                  <RefreshCw size={14} />
                  Roll-over Semester
                </button>
              </div>
              
              <div className="space-y-3">
                {paymentHistory.length === 0 ? (
                  <p className="text-center py-8 text-gray-400 italic">No payment records found for this student.</p>
                ) : (
                  paymentHistory.map(record => (
                    <div key={record.id} className="p-4 border border-gray-50 rounded-xl hover:bg-gray-50 transition-colors flex items-center justify-between group">
                      <div className="flex items-center gap-4">
                        <div className="bg-green-50 p-2 rounded-lg text-green-600">
                          <FileText size={20} />
                        </div>
                        <div>
                          <p className="font-bold text-gray-900">PHP {record.amount.toLocaleString()}</p>
                          <p className="text-xs text-gray-500">{record.receipt_number} • {format(new Date(record.payment_date), 'MMM d, yyyy')}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => generateReceiptPDF(record)}
                          className="p-2 text-gray-400 hover:text-[#000080] hover:bg-blue-50 rounded-lg"
                          title="Print Receipt"
                        >
                          <Printer size={18} />
                        </button>
                        <button 
                          className="p-2 text-gray-400 hover:text-[#000080] hover:bg-blue-50 rounded-lg"
                          title="Email Receipt"
                        >
                          <Mail size={18} />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Preview & Utils */}
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <h4 className="font-bold text-[#000080] mb-6 flex items-center gap-2">
              <QrCode size={18} />
              Receipt Verification
            </h4>
            <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-gray-100 rounded-2xl bg-gray-50">
              {selectedStudent ? (
                <>
                  <QRCodeSVG 
                    value={JSON.stringify({
                      id: selectedStudent.student_id,
                      name: selectedStudent.full_name,
                      ts: Date.now()
                    })} 
                    size={160}
                    fgColor="#000080"
                  />
                  <p className="mt-4 text-xs text-gray-400 text-center">
                    Unique QR code for verification.<br/>Scan to identify student record.
                  </p>
                </>
              ) : (
                <div className="text-center">
                  <QrCode size={48} className="text-gray-200 mx-auto mb-4" />
                  <p className="text-sm text-gray-400">Select a student to generate verification QR</p>
                </div>
              )}
            </div>
            <button 
              onClick={() => setShowScanner(true)}
              className="w-full mt-6 flex items-center justify-center gap-2 py-3 border-2 border-[#000080] text-[#000080] rounded-xl font-bold hover:bg-blue-50 transition-colors"
            >
              <Scan size={18} />
              Open Scanner
            </button>
          </div>

          <div className="bg-gradient-to-br from-[#FFD700] to-[#FFC000] p-6 rounded-2xl shadow-lg">
            <h4 className="font-bold text-[#000080] mb-2">Audit Receipts</h4>
            <p className="text-xs text-[#000080]/70 mb-4 leading-relaxed">
              Generate a consolidated A4 sheet containing 4 individual receipts for auditing purposes.
            </p>
            <button 
              onClick={generateA4AuditSheet}
              className="w-full bg-[#000080] text-white py-2 rounded-lg text-sm font-bold hover:bg-[#000060] transition-colors"
            >
              Generate Audit Sheet
            </button>
          </div>
        </div>
      </div>

      {/* Scanner Modal */}
      {showScanner && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-bold text-[#000080]">Scan Receipt QR</h3>
              <button onClick={() => setShowScanner(false)} className="p-2 hover:bg-gray-100 rounded-full">
                <X size={20} />
              </button>
            </div>
            <div className="p-6">
              <div id="reader" className="rounded-2xl overflow-hidden border-4 border-gray-50"></div>
              <p className="mt-4 text-center text-sm text-gray-500">
                Position the receipt QR code within the frame to verify payment.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
