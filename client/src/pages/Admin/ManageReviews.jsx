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
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 text-slate-400 font-bold uppercase tracking-wider">
                  <th className="py-3 px-4">Patient</th>
                  <th className="py-3 px-4">Doctor Reviewed</th>
                  <th className="py-3 px-4">Rating Star Count</th>
                  <th className="py-3 px-4">Feedback Comments</th>
                  <th className="py-3 px-4 text-right">Delete Review</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {reviews.map((rev) => (
                  <tr key={rev._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/10">
                    <td className="py-4 px-4 font-semibold text-slate-800 dark:text-slate-250">
                      {rev.patientId?.name || 'Anonymous'}
                      <p className="text-[10px] text-slate-400 font-normal">{rev.patientId?.email}</p>
                    </td>
                    <td className="py-4 px-4 font-semibold text-slate-750 dark:text-slate-300">Dr. {rev.doctorId?.name}</td>
                    <td className="py-4 px-4 text-amber-500 font-extrabold flex items-center gap-1 mt-1">
                      <Star size={14} fill="currentColor" /> {rev.rating} / 5
                    </td>
                    <td className="py-4 px-4 text-slate-500 dark:text-slate-400 italic max-w-xs truncate">"{rev.comment}"</td>
                    <td className="py-4 px-4 text-right">
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
