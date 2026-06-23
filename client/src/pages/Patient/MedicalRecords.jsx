import React, { useState } from 'react';
import { PageWrapper, AnimatedItem } from '../../components/Shared/PageWrapper.jsx';
import { useAuthStore } from '../../store/authStore.js';
import { FileText, Upload, Trash2, Download, Loader, Sparkles } from 'lucide-react';
import toast from 'react-hot-toast';
import { BACKEND_URL } from '../../services/api.js';

export default function MedicalRecords() {
  const { profile, uploadRecord, deleteRecord } = useAuthStore();
  const [recordName, setRecordName] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleFileChange = (e) => {
    setSelectedFile(e.target.files[0]);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!recordName || !selectedFile) {
      toast.error('Please specify a title and attach a document file');
      return;
    }

    setLoading(true);
    const formData = new FormData();
    formData.append('name', recordName);
    formData.append('recordFile', selectedFile);

    const res = await uploadRecord(formData);
    if (res.success) {
      setRecordName('');
      setSelectedFile(null);
      // Reset file input value
      document.getElementById('recordFileInput').value = '';
    }
    setLoading(false);
  };

  return (
    <PageWrapper className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
      
      {/* Upload Column */}
      <div className="glass-panel border border-slate-200/50 dark:border-slate-800/50 rounded-3xl p-6 h-fit space-y-6">
        <div>
          <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
            Add Record <Sparkles className="text-primary" size={16} />
          </h3>
          <p className="text-xs text-slate-400 mt-1">Upload labs, prescriptions, or clinical files.</p>
        </div>

        <form onSubmit={handleFormSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Document Name / Title</label>
            <input
              type="text"
              required
              placeholder="e.g. Chest X-Ray Report"
              value={recordName}
              onChange={(e) => setRecordName(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl outline-none text-sm focus:ring-2 focus:ring-primary"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">File Attachment</label>
            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl p-6 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900 transition-all relative">
                <input
                  id="recordFileInput"
                  type="file"
                  required
                  accept=".pdf,image/*"
                  onChange={handleFileChange}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                />
                <div className="text-center text-xs text-slate-400 space-y-1">
                  <Upload className="mx-auto text-slate-300" size={20} />
                  <p className="font-bold text-slate-505">Click to choose document</p>
                  <p>PDF or image (Max 5MB)</p>
                </div>
              </div>
              {selectedFile && (
                <div className="text-xs text-primary font-bold truncate">
                  Selected: {selectedFile.name}
                </div>
              )}
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-primary hover:bg-primary-dark text-white rounded-xl font-bold flex items-center justify-center gap-2 transition-colors disabled:opacity-50 shadow-md"
          >
            {loading ? <Loader className="animate-spin" size={18} /> : 'Upload File'}
          </button>
        </form>
      </div>

      {/* History Catalog Column */}
      <div className="md:col-span-2 glass-panel border border-slate-200/50 dark:border-slate-800/50 rounded-3xl p-6 space-y-4">
        <div>
          <h3 className="text-lg font-bold text-slate-800 dark:text-white">Uploaded Records ({profile?.medicalRecords?.length || 0})</h3>
          <p className="text-xs text-slate-400 mt-1">Access all your medical history documents.</p>
        </div>

        <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
          {!profile?.medicalRecords || profile.medicalRecords.length === 0 ? (
            <p className="text-xs text-slate-400 py-16 text-center">No medical files uploaded yet.</p>
          ) : (
            profile.medicalRecords.map((rec) => (
              <div
                key={rec._id}
                className="p-4 bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 rounded-2xl flex items-center justify-between gap-4"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="p-2.5 bg-primary/10 text-primary rounded-xl flex-shrink-0">
                    <FileText size={18} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-800 dark:text-white truncate">{rec.name}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      Uploaded on {new Date(rec.uploadedAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                <div className="flex gap-1">
                  <a
                    href={rec.url.startsWith('/') ? `${BACKEND_URL}${rec.url}` : rec.url}
                    target="_blank"
                    className="p-2 text-slate-500 hover:text-primary dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
                  >
                    <Download size={16} />
                  </a>
                  <button
                    onClick={() => deleteRecord(rec._id)}
                    className="p-2 text-slate-500 hover:text-red-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

    </PageWrapper>
  );
}
