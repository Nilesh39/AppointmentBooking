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
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 font-bold uppercase tracking-wider">
                  <th className="py-3 px-4">Doctor Details</th>
                  <th className="py-3 px-4">Specialization</th>
                  <th className="py-3 px-4">Fees / Experience</th>
                  <th className="py-3 px-4">Approval Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {doctors.map((doc) => (
                  <tr key={doc._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/10">
                    <td className="py-4 px-4 font-bold text-slate-800 dark:text-slate-250">
                      <p className="text-sm">Dr. {doc.userId?.name}</p>
                      <p className="text-[10px] text-slate-400 font-normal">{doc.userId?.email}</p>
                    </td>
                    <td className="py-4 px-4 font-semibold text-slate-655 dark:text-slate-300">{doc.specialization}</td>
                    <td className="py-4 px-4">
                      <p className="font-bold">${doc.fees} Consultation</p>
                      <p className="text-slate-400 font-normal">{doc.experience} Years Experience</p>
                    </td>
                    <td className="py-4 px-4">
                      <span className={`px-2.5 py-0.5 rounded-full font-bold uppercase text-[9px] ${
                        doc.status === 'approved' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400' :
                        doc.status === 'pending' ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/20 dark:text-amber-400' :
                        'bg-red-100 text-red-700 dark:bg-red-950/20 dark:text-red-400'
                      }`}>
                        {doc.status}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-right flex justify-end gap-2">
                      {doc.status === 'pending' && (
                        <>
                          <button
                            onClick={() => handleApprove(doc.userId?._id)}
                            className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg font-bold shadow-sm transition-colors"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleReject(doc.userId?._id)}
                            className="px-3 py-1.5 border border-red-200 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/10 rounded-lg font-bold transition-colors"
                          >
                            Reject
                          </button>
                        </>
                      )}
                      
                      {doc.status === 'approved' && (
                        <button
                          onClick={() => handleSuspend(doc.userId?._id)}
                          className="px-3 py-1.5 border border-amber-250 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/10 rounded-lg font-bold transition-colors"
                        >
                          Suspend
                        </button>
                      )}
                      
                      {doc.status === 'suspended' && (
                        <button
                          onClick={() => handleApprove(doc.userId?._id)}
                          className="px-3 py-1.5 bg-primary hover:bg-primary-dark text-white rounded-lg font-bold shadow-sm transition-colors"
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
