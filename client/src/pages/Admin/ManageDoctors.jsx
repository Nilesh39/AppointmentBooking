import React, { useEffect, useState } from 'react';
import { PageWrapper, AnimatedItem } from '../../components/Shared/PageWrapper.jsx';
import { ShieldCheck, ShieldAlert, Trash2, Loader2, Sparkles, FileText } from 'lucide-react';
import API from '../../services/api.js';
import toast from 'react-hot-toast';

export default function ManageDoctors() {
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchDoctors = async () => {
    setLoading(true);
    try {
      const res = await API.get('/admin/doctors');
      setDoctors(res.data.data);
    } catch (err) {
      toast.error('Failed to load doctors');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDoctors();
  }, []);

  const handleApprove = async (id) => {
    try {
      await API.put(`/admin/doctors/${id}/approve`);
      toast.success('Doctor application approved!');
      fetchDoctors();
    } catch (err) {
      toast.error('Approval failed');
    }
  };

  const handleReject = async (id) => {
    if (!window.confirm('Reject this application?')) return;
    try {
      await API.put(`/admin/doctors/${id}/reject`);
      toast.success('Doctor application rejected');
      fetchDoctors();
    } catch (err) {
      toast.error('Rejection failed');
    }
  };

  const handleSuspend = async (id) => {
    if (!window.confirm('Suspend this doctor? They won\'t be able to log in or take bookings.')) return;
    try {
      await API.put(`/admin/doctors/${id}/suspend`);
      toast.success('Doctor account suspended');
      fetchDoctors();
    } catch (err) {
      toast.error('Suspension failed');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Permanently delete this doctor from database?')) return;
    try {
      await API.delete(`/admin/doctors/${id}`);
      toast.success('Doctor deleted from system');
      fetchDoctors();
    } catch (err) {
      toast.error('Deletion failed');
    }
  };

  return (
    <PageWrapper className="space-y-6 text-left">
      <div>
        <h2 className="text-2xl font-extrabold text-slate-800 dark:text-white tracking-tight">Manage Doctors</h2>
        <p className="text-xs text-slate-400">Approve pending credentials, suspend accounts, or delete medical providers.</p>
      </div>

      <div className="glass-panel border border-slate-200/50 dark:border-slate-800/50 rounded-3xl p-6 overflow-hidden">
        {loading ? (
          <div className="py-12 flex justify-center"><Loader2 className="animate-spin text-primary" /></div>
        ) : doctors.length === 0 ? (
          <p className="text-sm text-slate-400 py-12 text-center font-bold">No doctor profiles found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs block md:table">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 font-bold uppercase tracking-wider hidden md:table-row">
                  <th className="py-3 px-4">Doctor Details</th>
                  <th className="py-3 px-4">Specialization</th>
                  <th className="py-3 px-4">Fees / Experience</th>
                  <th className="py-3 px-4">Approval Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 block md:table-row-group">
                {doctors.map((doc) => (
                  <tr key={doc._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/10 flex flex-col md:table-row p-4 border border-slate-200/50 dark:border-slate-800/50 rounded-2xl mb-4 bg-slate-50/20 dark:bg-slate-900/10 md:bg-transparent md:p-0 md:border-none md:rounded-none md:mb-0">
                    <td className="py-2.5 md:py-4 px-0 md:px-4 font-bold text-slate-800 dark:text-slate-250 flex flex-col items-start gap-1 md:table-cell border-b md:border-none border-slate-100 dark:border-slate-800 w-full">
                      <p className="text-sm">Dr. {doc.userId?.name}</p>
                      <p className="text-[10px] text-slate-400 font-normal">{doc.userId?.email}</p>
                    </td>
                    <td className="py-2.5 md:py-4 px-0 md:px-4 font-semibold text-slate-655 dark:text-slate-300 flex justify-between items-center md:table-cell border-b md:border-none border-slate-100 dark:border-slate-800 w-full">
                      <span className="font-bold text-slate-400 dark:text-slate-550 uppercase text-[9px] md:hidden">Specialization</span>
                      <span>{doc.specialization}</span>
                    </td>
                    <td className="py-2.5 md:py-4 px-0 md:px-4 flex justify-between items-center md:table-cell border-b md:border-none border-slate-100 dark:border-slate-800 w-full">
                      <span className="font-bold text-slate-400 dark:text-slate-550 uppercase text-[9px] md:hidden">Fees / Experience</span>
                      <div className="text-right md:text-left">
                        <p className="font-bold">${doc.fees} Consultation</p>
                        <p className="text-slate-400 font-normal">{doc.experience} Years Experience</p>
                      </div>
                    </td>
                    <td className="py-2.5 md:py-4 px-0 md:px-4 flex justify-between items-center md:table-cell border-b md:border-none border-slate-100 dark:border-slate-800 w-full">
                      <span className="font-bold text-slate-400 dark:text-slate-550 uppercase text-[9px] md:hidden">Approval Status</span>
                      <span className={`px-2.5 py-0.5 rounded-full font-bold uppercase text-[9px] ${
                        doc.status === 'approved' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400' :
                        doc.status === 'pending' ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/20 dark:text-amber-400' :
                        'bg-red-100 text-red-700 dark:bg-red-950/20 dark:text-red-400'
                      }`}>
                        {doc.status}
                      </span>
                    </td>
                    <td className="py-2.5 md:py-4 px-0 md:px-4 flex justify-between items-center md:table-cell w-full">
                      <span className="font-bold text-slate-400 dark:text-slate-550 uppercase text-[9px] md:hidden">Actions</span>
                      <div className="flex flex-wrap justify-end gap-2">
                        {doc.status === 'pending' && (
                          <>
                            <button
                              onClick={() => handleApprove(doc.userId?._id)}
                              className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg font-bold shadow-sm transition-colors text-[10px] md:text-xs"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handleReject(doc.userId?._id)}
                              className="px-3 py-1.5 border border-red-200 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/10 rounded-lg font-bold transition-colors text-[10px] md:text-xs"
                            >
                              Reject
                            </button>
                          </>
                        )}
                        
                        {doc.status === 'approved' && (
                          <button
                            onClick={() => handleSuspend(doc.userId?._id)}
                            className="px-3 py-1.5 border border-amber-250 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/10 rounded-lg font-bold transition-colors text-[10px] md:text-xs"
                          >
                            Suspend
                          </button>
                        )}
                        
                        {doc.status === 'suspended' && (
                          <button
                            onClick={() => handleApprove(doc.userId?._id)}
                            className="px-3 py-1.5 bg-primary hover:bg-primary-dark text-white rounded-lg font-bold shadow-sm transition-colors text-[10px] md:text-xs"
                          >
                            Re-Approve
                          </button>
                        )}

                        <button
                          onClick={() => handleDelete(doc.userId?._id)}
                          className="p-1.5 text-slate-500 hover:text-red-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </PageWrapper>
  );
}
