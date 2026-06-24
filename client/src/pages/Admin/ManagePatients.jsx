import React, { useEffect, useState } from 'react';
import { PageWrapper, AnimatedItem } from '../../components/Shared/PageWrapper.jsx';
import { Trash2, Loader2, User } from 'lucide-react';
import API from '../../services/api.js';
import toast from 'react-hot-toast';

export default function ManagePatients() {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchPatients = async () => {
    setLoading(true);
    try {
      const res = await API.get('/admin/patients');
      setPatients(res.data.data);
    } catch (err) {
      toast.error('Failed to load patients');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPatients();
  }, []);

  const handleDelete = async (id) => {
    if (!window.confirm('Permanently delete this patient from database?')) return;
    try {
      await API.delete(`/admin/patients/${id}`);
      toast.success('Patient deleted from system');
      fetchPatients();
    } catch (err) {
      toast.error('Deletion failed');
    }
  };

  return (
    <PageWrapper className="space-y-6 text-left">
      <div>
        <h2 className="text-2xl font-extrabold text-slate-800 dark:text-white tracking-tight">Manage Patients</h2>
        <p className="text-xs text-slate-400">Review all registered patient files and delete profiles from system database.</p>
      </div>

      <div className="glass-panel border border-slate-200/50 dark:border-slate-800/50 rounded-3xl p-6 overflow-hidden">
        {loading ? (
          <div className="py-12 flex justify-center"><Loader2 className="animate-spin text-primary" /></div>
        ) : patients.length === 0 ? (
          <p className="text-sm text-slate-455 py-12 text-center font-bold">No patients registered in the database.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs block md:table">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 font-bold uppercase tracking-wider hidden md:table-row">
                  <th className="py-3 px-4">Patient Name</th>
                  <th className="py-3 px-4">Contact Email</th>
                  <th className="py-3 px-4">Phone Number</th>
                  <th className="py-3 px-4">Gender / DOB</th>
                  <th className="py-3 px-4 text-right">Delete Profile</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 block md:table-row-group">
                {patients.map((pat) => (
                  <tr key={pat._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/10 flex flex-col md:table-row p-4 border border-slate-200/50 dark:border-slate-800/50 rounded-2xl mb-4 bg-slate-50/20 dark:bg-slate-900/10 md:bg-transparent md:p-0 md:border-none md:rounded-none md:mb-0">
                    <td className="py-2.5 md:py-4 px-0 md:px-4 font-bold text-slate-800 dark:text-slate-205 flex items-center gap-2 md:table-cell border-b md:border-none border-slate-100 dark:border-slate-800 w-full">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 flex-shrink-0">
                          <User size={14} />
                        </div>
                        <span className="truncate">{pat.userId?.name}</span>
                      </div>
                    </td>
                    <td className="py-2.5 md:py-4 px-0 md:px-4 text-slate-500 dark:text-slate-400 flex justify-between items-center md:table-cell border-b md:border-none border-slate-100 dark:border-slate-800 w-full">
                      <span className="font-bold text-slate-400 dark:text-slate-550 uppercase text-[9px] md:hidden">Email</span>
                      <span className="truncate">{pat.userId?.email}</span>
                    </td>
                    <td className="py-2.5 md:py-4 px-0 md:px-4 font-semibold text-slate-700 dark:text-slate-300 flex justify-between items-center md:table-cell border-b md:border-none border-slate-100 dark:border-slate-800 w-full">
                      <span className="font-bold text-slate-400 dark:text-slate-550 uppercase text-[9px] md:hidden">Phone</span>
                      <span>{pat.phone || 'N/A'}</span>
                    </td>
                    <td className="py-2.5 md:py-4 px-0 md:px-4 flex justify-between items-center md:table-cell border-b md:border-none border-slate-100 dark:border-slate-800 w-full">
                      <span className="font-bold text-slate-400 dark:text-slate-550 uppercase text-[9px] md:hidden">Gender / DOB</span>
                      <div className="text-right md:text-left">
                        <p className="capitalize">{pat.gender || 'Not specified'}</p>
                        {pat.dob && <p className="text-[10px] text-slate-400 mt-0.5">DOB: {new Date(pat.dob).toLocaleDateString()}</p>}
                      </div>
                    </td>
                    <td className="py-2.5 md:py-4 px-0 md:px-4 flex justify-between items-center md:table-cell w-full">
                      <span className="font-bold text-slate-400 dark:text-slate-550 uppercase text-[9px] md:hidden">Actions</span>
                      <button
                        onClick={() => handleDelete(pat.userId?._id)}
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
