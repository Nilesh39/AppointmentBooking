import React, { useEffect, useState } from 'react';
import { PageWrapper, AnimatedItem } from '../../components/Shared/PageWrapper.jsx';
import { Download, Users, DollarSign, Calendar, AlertCircle, Loader2, Award, Package, Truck, X, Edit, Phone, Clock, MapPin, Tag, Star, Navigation } from 'lucide-react';
import API, { BACKEND_URL } from '../../services/api.js';
import toast from 'react-hot-toast';

export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  // Tracking Modal States
  const [selectedOrderForTracking, setSelectedOrderForTracking] = useState(null);
  const [shippingStatus, setShippingStatus] = useState('');
  const [estimatedDeliveryDate, setEstimatedDeliveryDate] = useState('');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [trackingActivity, setTrackingActivity] = useState('');
  const [trackingLocation, setTrackingLocation] = useState('');
  const [currentLocation, setCurrentLocation] = useState('');
  // Delivery Partner Profile
  const [dpName, setDpName] = useState('');
  const [dpPhone, setDpPhone] = useState('');
  const [dpVehicleType, setDpVehicleType] = useState('');
  const [dpVehicleNumber, setDpVehicleNumber] = useState('');
  const [dpRating, setDpRating] = useState('4.5');
  const [dpTotalDeliveries, setDpTotalDeliveries] = useState('0');

  const fetchStats = async () => {
    setLoading(true);
    try {
      const res = await API.get('/admin/analytics');
      setStats(res.data.data);
      await fetchOrders();
    } catch (err) {
      toast.error('Failed to load admin statistics');
    } finally {
      setLoading(false);
    }
  };

  const fetchOrders = async () => {
    try {
      const res = await API.get('/admin/orders');
      if (res.data.success) {
        setOrders(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load admin orders:', err);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const openTrackingModal = (order) => {
    setSelectedOrderForTracking(order);
    setShippingStatus(order.shippingStatus || 'processing');
    setEstimatedDeliveryDate(order.estimatedDeliveryDate ? order.estimatedDeliveryDate.substring(0, 10) : '');
    setTrackingNumber(order.trackingNumber || '');
    setCurrentLocation(order.currentLocation || '');
    setDpName(order.deliveryPartner?.name || '');
    setDpPhone(order.deliveryPartner?.phone || '');
    setDpVehicleType(order.deliveryPartner?.vehicleType || '');
    setDpVehicleNumber(order.deliveryPartner?.vehicleNumber || '');
    setDpRating(String(order.deliveryPartner?.rating || 4.5));
    setDpTotalDeliveries(String(order.deliveryPartner?.totalDeliveries || 0));
    setTrackingActivity('');
    setTrackingLocation('');
  };

  const handleSaveTracking = async (e) => {
    e.preventDefault();
    if (!selectedOrderForTracking) return;

    try {
      const res = await API.put(`/admin/orders/${selectedOrderForTracking._id}/shipping`, {
        shippingStatus,
        estimatedDeliveryDate: estimatedDeliveryDate || undefined,
        trackingNumber,
        currentLocation: currentLocation || undefined,
        deliveryPartner: {
          name: dpName,
          phone: dpPhone,
          vehicleType: dpVehicleType,
          vehicleNumber: dpVehicleNumber,
          rating: parseFloat(dpRating) || 4.5,
          totalDeliveries: parseInt(dpTotalDeliveries) || 0,
        },
        activity: trackingActivity || undefined,
        location: trackingLocation || undefined
      });

      if (res.data.success) {
        toast.success('Order tracking updated successfully!');
        setSelectedOrderForTracking(null);
        fetchOrders();
      }
    } catch (err) {
      toast.error('Failed to update order tracking details');
    }
  };

  const handleExportCSV = () => {
    // Navigate directly to the download route which attaches CSV headers
    window.open(`${BACKEND_URL}/api/admin/reports/export`, '_blank');
    toast.success('Dispatched CSV transaction download');
  };

  if (loading) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center">
        <Loader2 className="animate-spin text-primary" size={40} />
      </div>
    );
  }

  return (
    <PageWrapper className="space-y-6 text-left relative">
      
      {/* Welcome Card */}
      <div className="p-6 bg-gradient-to-r from-slate-900 to-slate-800 text-white rounded-3xl shadow-premium relative overflow-hidden flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="space-y-2 z-10">
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">System Operations Console</h1>
          <p className="text-sm text-slate-400 max-w-md">
            Review cross-platform statistics, export transactional reports, and supervise doctor approvals.
          </p>
        </div>
        <button
          onClick={handleExportCSV}
          className="px-5 py-2.5 bg-white text-slate-900 font-bold rounded-xl text-sm hover:shadow-md transition-all z-10 flex items-center gap-2"
        >
          <Download size={16} /> Export CSV Report
        </button>
        <div className="absolute right-0 bottom-0 w-32 h-32 bg-white/5 rounded-full blur-2xl -z-0" />
      </div>

      {/* Stats Widgets */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="p-5 glass-panel border border-slate-200/50 dark:border-slate-800/50 rounded-2xl flex items-center gap-4">
          <div className="p-3 bg-primary/10 text-primary rounded-xl"><DollarSign size={20} /></div>
          <div>
            <h4 className="text-xl font-bold text-slate-800 dark:text-white">${stats?.totalRevenue || 0}</h4>
            <p className="text-xs text-slate-400">Total Revenue</p>
          </div>
        </div>

        <div className="p-5 glass-panel border border-slate-200/50 dark:border-slate-800/50 rounded-2xl flex items-center gap-4">
          <div className="p-3 bg-secondary/10 text-secondary rounded-xl"><Award size={20} /></div>
          <div>
            <h4 className="text-xl font-bold text-slate-800 dark:text-white">{stats?.totalDoctors || 0}</h4>
            <p className="text-xs text-slate-400">Registered Doctors</p>
          </div>
        </div>

        <div className="p-5 glass-panel border border-slate-200/50 dark:border-slate-800/50 rounded-2xl flex items-center gap-4">
          <div className="p-3 bg-emerald-500/10 text-emerald-500 rounded-xl"><Users size={20} /></div>
          <div>
            <h4 className="text-xl font-bold text-slate-800 dark:text-white">{stats?.totalPatients || 0}</h4>
            <p className="text-xs text-slate-400">Total Patients</p>
          </div>
        </div>

        <div className="p-5 glass-panel border border-slate-200/50 dark:border-slate-800/50 rounded-2xl flex items-center gap-4">
          <div className="p-3 bg-amber-500/10 text-amber-500 rounded-xl"><Calendar size={20} /></div>
          <div>
            <h4 className="text-xl font-bold text-slate-800 dark:text-white">{stats?.todaysAppointmentsCount || 0}</h4>
            <p className="text-xs text-slate-400">Today's Consults</p>
          </div>
        </div>
      </div>

      {/* Activity Logs Panel */}
      <div className="glass-panel border border-slate-200/50 dark:border-slate-800/50 rounded-3xl p-6 space-y-4">
        <div>
          <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
            System Activity Log
          </h3>
          <p className="text-xs text-slate-400 mt-1">Real-time system events, doctor registrations, and booking payments.</p>
        </div>

        <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
          {stats?.activityLogs?.length === 0 ? (
            <p className="text-xs text-slate-400 py-12 text-center">No system operations logged today.</p>
          ) : (
            stats?.activityLogs?.map((log, idx) => (
              <div
                key={idx}
                className="p-3 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl flex items-center gap-3 text-xs"
              >
                <div className="p-2 bg-slate-200 dark:bg-slate-800 text-slate-500 rounded-lg flex-shrink-0">
                  <AlertCircle size={14} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-slate-800 dark:text-slate-250 leading-relaxed text-left">{log.message}</p>
                  <p className="text-[10px] text-slate-400 mt-1 text-left">
                    {new Date(log.timestamp).toLocaleTimeString()}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Pharmacy Orders Management */}
      <div className="glass-panel border border-slate-200/50 dark:border-slate-800/50 rounded-3xl p-6 space-y-4">
        <div>
          <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <Package size={18} className="text-primary" /> Pharmacy Orders Manager
          </h3>
          <p className="text-xs text-slate-400 mt-1">Supervise medicine orders, dispatch packages, and modify shipping status.</p>
        </div>

        <div className="overflow-x-auto text-left">
          {orders.filter(o => o.paymentStatus === 'paid').length === 0 ? (
            <p className="text-xs text-slate-400 py-12 text-center">No active pharmacy orders found.</p>
          ) : (
            <table className="w-full text-xs text-slate-550 dark:text-slate-400 border-collapse">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-850 text-[10px] font-bold text-slate-455 uppercase tracking-wider text-left">
                  <th className="py-3 px-2">Order ID</th>
                  <th className="py-3 px-2">Patient</th>
                  <th className="py-3 px-2">Doctor</th>
                  <th className="py-3 px-2">Medications</th>
                  <th className="py-3 px-2">Amount</th>
                  <th className="py-3 px-2">Address</th>
                  <th className="py-3 px-2">Shipping Status</th>
                  <th className="py-3 px-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-850">
                {orders.filter(o => o.paymentStatus === 'paid').map((ord) => (
                  <tr key={ord._id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30">
                    <td className="py-3 px-2 font-mono text-slate-400">{ord._id.substring(18)}</td>
                    <td className="py-3 px-2">
                      <p className="font-bold text-slate-800 dark:text-slate-250">{ord.patientId?.name}</p>
                      <p className="text-[10px] text-slate-450">{ord.patientId?.email}</p>
                    </td>
                    <td className="py-3 px-2">
                      Dr. {ord.appointmentId?.doctorId?.name}
                    </td>
                    <td className="py-3 px-2 font-medium max-w-[150px] truncate" title={ord.medicines.map(m => m.name).join(', ')}>
                      {ord.medicines.map(m => m.name).join(', ')}
                    </td>
                    <td className="py-3 px-2 font-bold text-primary dark:text-secondary">${ord.totalAmount.toFixed(2)}</td>
                    <td className="py-3 px-2 truncate max-w-[120px]" title={ord.shippingAddress}>{ord.shippingAddress}</td>
                    <td className="py-3 px-2">
                      <div className="flex flex-col">
                        <span className={`px-2 py-0.5 rounded-full text-[9px] uppercase font-bold tracking-wider w-fit ${
                          ord.shippingStatus === 'delivered' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-400' :
                          ord.shippingStatus === 'out_for_delivery' ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/30 dark:text-indigo-400' :
                          ord.shippingStatus === 'shipped' ? 'bg-blue-100 text-blue-800 dark:bg-blue-950/30 dark:text-blue-400' :
                          'bg-amber-100 text-amber-805 dark:bg-amber-950/30 dark:text-amber-400'
                        }`}>
                          {ord.shippingStatus.replace(/_/g, ' ')}
                        </span>
                        {ord.trackingNumber && (
                          <span className="text-[9px] text-slate-400 font-mono mt-1"># {ord.trackingNumber}</span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-2 text-right">
                      <button
                        onClick={() => openTrackingModal(ord)}
                        className="px-2.5 py-1 bg-primary/10 hover:bg-primary text-primary hover:text-white rounded-lg text-[10px] font-bold transition-all flex items-center gap-1 ml-auto cursor-pointer"
                      >
                        <Truck size={12} /> Manage
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {selectedOrderForTracking && (
        <div className="fixed inset-0 bg-slate-900/60 dark:bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 shadow-2xl rounded-3xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200 text-left">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-850 flex justify-between items-center bg-slate-50 dark:bg-slate-900/40">
              <div>
                <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                  <Truck className="text-primary animate-pulse" size={18} /> Manage Shipment Tracking
                </h3>
                <p className="text-[10px] text-slate-400 mt-0.5">Order ID: <span className="font-mono">{selectedOrderForTracking._id}</span></p>
              </div>
              <button 
                onClick={() => setSelectedOrderForTracking(null)} 
                className="text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>
            
            <form onSubmit={handleSaveTracking} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-450 uppercase tracking-wider">Shipping Status</label>
                  <select
                    value={shippingStatus}
                    onChange={(e) => setShippingStatus(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs font-semibold outline-none focus:border-primary transition-colors cursor-pointer text-slate-700 dark:text-slate-250"
                  >
                    <option value="processing">⏳ Processing</option>
                    <option value="packed">📦 Packed</option>
                    <option value="shipped">🚀 Shipped</option>
                    <option value="in_transit">🚛 In Transit</option>
                    <option value="out_for_delivery">🏍️ Out for Delivery</option>
                    <option value="delivered">✅ Delivered</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-450 uppercase tracking-wider flex items-center gap-1"><Calendar size={10} /> Estimated Delivery</label>
                  <input type="date" value={estimatedDeliveryDate} onChange={(e) => setEstimatedDeliveryDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs outline-none focus:border-primary transition-colors cursor-pointer text-slate-700 dark:text-slate-200" />
                </div>
              </div>

              {/* Delivery Partner Profile */}
              <div className="border border-primary/20 dark:border-primary/10 rounded-2xl p-4 space-y-3 bg-primary/[0.02] dark:bg-primary/[0.03]">
                <h4 className="text-[10px] font-extrabold text-primary uppercase tracking-wider flex items-center gap-1"><Truck size={11} /> Delivery Partner Profile</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-450 uppercase tracking-wider">Partner Name</label>
                    <input type="text" placeholder="e.g. Rajesh Kumar" value={dpName} onChange={(e) => setDpName(e.target.value)}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs outline-none focus:border-primary transition-colors text-slate-700 dark:text-slate-200" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-450 uppercase tracking-wider flex items-center gap-1"><Phone size={9} /> Phone</label>
                    <input type="tel" placeholder="+91 98765 43210" value={dpPhone} onChange={(e) => setDpPhone(e.target.value)}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs outline-none focus:border-primary transition-colors text-slate-700 dark:text-slate-200" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-450 uppercase tracking-wider">Vehicle Type</label>
                    <select value={dpVehicleType} onChange={(e) => setDpVehicleType(e.target.value)}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs outline-none focus:border-primary transition-colors cursor-pointer text-slate-700 dark:text-slate-200">
                      <option value="">Select vehicle</option>
                      <option value="Bike">🏍️ Bike</option>
                      <option value="Scooter">🛵 Scooter</option>
                      <option value="Van">🚐 Van</option>
                      <option value="Truck">🚛 Truck</option>
                      <option value="Car">🚗 Car</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-450 uppercase tracking-wider">Vehicle Number</label>
                    <input type="text" placeholder="e.g. MH-12 AB 3456" value={dpVehicleNumber} onChange={(e) => setDpVehicleNumber(e.target.value)}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs outline-none focus:border-primary transition-colors font-mono text-slate-700 dark:text-slate-200" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-450 uppercase tracking-wider flex items-center gap-1"><Star size={9} /> Rating</label>
                    <input type="number" step="0.1" min="1" max="5" value={dpRating} onChange={(e) => setDpRating(e.target.value)}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs outline-none focus:border-primary transition-colors text-slate-700 dark:text-slate-200" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-450 uppercase tracking-wider">Total Deliveries</label>
                    <input type="number" min="0" value={dpTotalDeliveries} onChange={(e) => setDpTotalDeliveries(e.target.value)}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs outline-none focus:border-primary transition-colors text-slate-700 dark:text-slate-200" />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-450 uppercase tracking-wider flex items-center gap-1"><Tag size={10} /> Tracking Number</label>
                  <input type="text" placeholder="TRK102394021" value={trackingNumber} onChange={(e) => setTrackingNumber(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs outline-none focus:border-primary transition-colors font-mono text-slate-700 dark:text-slate-200" />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-450 uppercase tracking-wider flex items-center gap-1"><Navigation size={10} /> Current Location</label>
                  <input type="text" placeholder="e.g. City Distribution Hub" value={currentLocation} onChange={(e) => setCurrentLocation(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs outline-none focus:border-primary transition-colors text-slate-700 dark:text-slate-200" />
                </div>
              </div>

              <div className="border-t border-slate-100 dark:border-slate-850 my-2 pt-3 space-y-3">
                <h4 className="text-[10px] font-bold text-slate-450 uppercase tracking-wide">Add Tracking Milestone (Optional)</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-450 uppercase tracking-wider flex items-center gap-1"><MapPin size={9} /> Location</label>
                    <input type="text" placeholder="Sorting Facility, Local Hub" value={trackingLocation} onChange={(e) => setTrackingLocation(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs outline-none focus:border-primary transition-colors text-slate-700 dark:text-slate-200" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-450 uppercase tracking-wider flex items-center gap-1"><Clock size={9} /> Description</label>
                    <input type="text" placeholder="Handed to courier partner" value={trackingActivity} onChange={(e) => setTrackingActivity(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs outline-none focus:border-primary transition-colors text-slate-700 dark:text-slate-200" />
                  </div>
                </div>
              </div>

              <div className="flex gap-3 justify-end pt-4 border-t border-slate-100 dark:border-slate-850">
                <button type="button" onClick={() => setSelectedOrderForTracking(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-850 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl text-xs font-semibold transition-all cursor-pointer">Cancel</button>
                <button type="submit"
                  className="px-5 py-2 bg-primary hover:bg-primary-dark text-white rounded-xl text-xs font-bold shadow-md shadow-primary/20 transition-all hover:scale-[1.01] cursor-pointer flex items-center gap-1.5"><Truck size={13} /> Update Shipment</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </PageWrapper>
  );
}
