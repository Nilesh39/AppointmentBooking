import React, { useState } from 'react';
import { PageWrapper, AnimatedItem } from '../../components/Shared/PageWrapper.jsx';
import { Megaphone, Send, Loader2 } from 'lucide-react';
import API from '../../services/api.js';
import toast from 'react-hot-toast';

export default function BroadcastNotifications() {
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [roleTarget, setRoleTarget] = useState('all'); // all, patient, doctor
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title || !message) return;

    setLoading(true);
    try {
      const res = await API.post('/admin/notifications', { title, message, roleTarget });
      if (res.data.success) {
        toast.success(res.data.message || 'Notification broadcast successfully!');
        setTitle('');
        setMessage('');
        setRoleTarget('all');
      }
    } catch (err) {
      toast.error('Failed to send broadcast notification');
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageWrapper className="max-w-xl mx-auto glass-panel border border-slate-200/50 dark:border-slate-800/50 rounded-3xl p-8 space-y-6 text-left">
      <div>
        <h2 className="text-2xl font-extrabold text-slate-800 dark:text-white tracking-tight flex items-center gap-2">
          Broadcast Notifications <Megaphone className="text-primary animate-bounce" size={22} />
        </h2>
        <p className="text-xs text-slate-400">Send instant alert banners to user notification feeds based on roles.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Broadcast Title</label>
          <input
            type="text"
            required
            placeholder="e.g. Schedule Maintenance Alert"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl outline-none text-sm focus:ring-2 focus:ring-primary"
          />
        </div>

        <div className="space-y-2">
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Target Recipient Role</label>
          <select
            value={roleTarget}
            onChange={(e) => setRoleTarget(e.target.value)}
            className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl outline-none text-sm focus:ring-2 focus:ring-primary"
          >
            <option value="all">All Accounts (Patients & Doctors)</option>
            <option value="patient">Patients Only</option>
            <option value="doctor">Doctors Only</option>
          </select>
        </div>

        <div className="space-y-2">
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Message Content</label>
          <textarea
            required
            rows="5"
            placeholder="Write details of the broadcast alert..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl outline-none text-sm resize-none focus:ring-2 focus:ring-primary"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 bg-primary hover:bg-primary-dark text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-colors disabled:opacity-50 shadow-md"
        >
          {loading ? <Loader2 className="animate-spin" size={18} /> : <><Send size={16} /> Broadcast Message</>}
        </button>
      </form>
    </PageWrapper>
  );
}
