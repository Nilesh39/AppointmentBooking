import React, { useEffect, useState } from 'react';
import { PageWrapper, AnimatedItem } from '../../components/Shared/PageWrapper.jsx';
import { Trash2, Loader2, Star, User } from 'lucide-react';
import API from '../../services/api.js';
import toast from 'react-hot-toast';

export default function ManageReviews() {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchReviews = async () => {
    setLoading(true);
    try {
      const res = await API.get('/admin/reviews');
      setReviews(res.data.data);
    } catch (err) {
      toast.error('Failed to load reviews');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReviews();
  }, []);

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this review? This will automatically recalculate the doctor\'s average rating.')) return;
    try {
      await API.delete(`/admin/reviews/${id}`);
      toast.success('Review deleted successfully');
      fetchReviews();
    } catch (err) {
      toast.error('Deletion failed');
    }
  };

  return (
    <PageWrapper className="space-y-6 text-left">
      <div>
        <h2 className="text-2xl font-extrabold text-slate-800 dark:text-white tracking-tight">Manage Reviews</h2>
        <p className="text-xs text-slate-400">Review feedback submissions and delete spam rating logs from the database.</p>
      </div>

      <div className="glass-panel border border-slate-200/50 dark:border-slate-800/50 rounded-3xl p-6 overflow-hidden">
        {loading ? (
          <div className="py-12 flex justify-center"><Loader2 className="animate-spin text-primary" /></div>
        ) : reviews.length === 0 ? (
          <p className="text-sm text-slate-455 py-12 text-center font-bold">No patient reviews submitted yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs block md:table">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 font-bold uppercase tracking-wider hidden md:table-row">
                  <th className="py-3 px-4">Patient</th>
                  <th className="py-3 px-4">Doctor Reviewed</th>
                  <th className="py-3 px-4">Rating Star Count</th>
                  <th className="py-3 px-4">Feedback Comments</th>
                  <th className="py-3 px-4 text-right">Delete Review</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 block md:table-row-group">
                {reviews.map((rev) => (
                  <tr key={rev._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/10 flex flex-col md:table-row p-4 border border-slate-200/50 dark:border-slate-800/50 rounded-2xl mb-4 bg-slate-50/20 dark:bg-slate-900/10 md:bg-transparent md:p-0 md:border-none md:rounded-none md:mb-0">
                    <td className="py-2.5 md:py-4 px-0 md:px-4 font-semibold text-slate-800 dark:text-slate-250 flex flex-col items-start gap-1 md:table-cell border-b md:border-none border-slate-100 dark:border-slate-800 w-full">
                      <span>{rev.patientId?.name || 'Anonymous'}</span>
                      <p className="text-[10px] text-slate-400 font-normal">{rev.patientId?.email}</p>
                    </td>
                    <td className="py-2.5 md:py-4 px-0 md:px-4 font-semibold text-slate-750 dark:text-slate-300 flex justify-between items-center md:table-cell border-b md:border-none border-slate-100 dark:border-slate-800 w-full">
                      <span className="font-bold text-slate-400 dark:text-slate-550 uppercase text-[9px] md:hidden">Doctor</span>
                      <span>Dr. {rev.doctorId?.name}</span>
                    </td>
                    <td className="py-2.5 md:py-4 px-0 md:px-4 text-amber-500 font-extrabold flex justify-between items-center md:table-cell border-b md:border-none border-slate-100 dark:border-slate-800 w-full">
                      <span className="font-bold text-slate-400 dark:text-slate-550 uppercase text-[9px] md:hidden">Rating</span>
                      <div className="flex items-center gap-1">
                        <Star size={14} fill="currentColor" /> {rev.rating} / 5
                      </div>
                    </td>
                    <td className="py-2.5 md:py-4 px-0 md:px-4 text-slate-500 dark:text-slate-400 italic flex justify-between items-center md:table-cell border-b md:border-none border-slate-100 dark:border-slate-800 w-full max-w-none md:max-w-xs">
                      <span className="font-bold text-slate-400 dark:text-slate-550 uppercase text-[9px] md:hidden">Comment</span>
                      <span className="truncate max-w-[60%] md:max-w-none">"{rev.comment}"</span>
                    </td>
                    <td className="py-2.5 md:py-4 px-0 md:px-4 flex justify-between items-center md:table-cell w-full">
                      <span className="font-bold text-slate-400 dark:text-slate-550 uppercase text-[9px] md:hidden">Actions</span>
                      <button
                        onClick={() => handleDelete(rev._id)}
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
