import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { CreditCard, QrCode, Building2, ShieldCheck, ArrowLeft, Loader2, Lock, CheckCircle2 } from 'lucide-react';
import API from '../../services/api.js';
import toast from 'react-hot-toast';

export default function Checkout() {
  const { appointmentId } = useParams();
  const navigate = useNavigate();
  const [appointment, setAppointment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [paymentMethod, setPaymentMethod] = useState('card'); // 'card' | 'upi' | 'netbanking'
  
  // Card Form State
  const [cardNumber, setCardNumber] = useState('');
  const [cardName, setCardName] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');

  // UPI Form State
  const [upiId, setUpiId] = useState('');
  
  // Net Banking State
  const [selectedBank, setSelectedBank] = useState('');

  // Processing payment animation states
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState(0);
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  useEffect(() => {
    const fetchAppointmentDetails = async () => {
      try {
        const res = await API.get('/appointments');
        const found = res.data.data.find(app => app._id === appointmentId);
        if (!found) {
          toast.error('Appointment details not found');
          navigate('/patient/appointments');
          return;
        }
        setAppointment(found);
      } catch (err) {
        toast.error('Failed to load checkout details');
        navigate('/patient/appointments');
      } finally {
        setLoading(false);
      }
    };
    fetchAppointmentDetails();
  }, [appointmentId, navigate]);

  // Card formatting
  const handleCardNumberChange = (e) => {
    let value = e.target.value.replace(/\D/g, ''); // numbers only
    value = value.substring(0, 16); // max 16 digits
    const formatted = value.replace(/(\d{4})(?=\d)/g, '$1 '); // add spaces every 4 digits
    setCardNumber(formatted);
  };

  const handleExpiryChange = (e) => {
    let value = e.target.value.replace(/\D/g, ''); // numbers only
    value = value.substring(0, 4); // max 4 digits MMYY
    if (value.length > 2) {
      value = `${value.substring(0, 2)}/${value.substring(2)}`;
    }
    setCardExpiry(value);
  };

  const handleCvvChange = (e) => {
    let value = e.target.value.replace(/\D/g, '');
    value = value.substring(0, 3);
    setCardCvv(value);
  };

  // Card vendor detection
  const getCardType = (num) => {
    const cleanNum = num.replace(/\s+/g, '');
    if (cleanNum.startsWith('4')) return 'Visa';
    if (cleanNum.startsWith('5')) return 'Mastercard';
    if (cleanNum.startsWith('3')) return 'Amex';
    return 'Generic';
  };

  const cardType = getCardType(cardNumber);

  // Simulated multi-step payment gateway process
  const handlePaymentSubmit = (e) => {
    e.preventDefault();

    // Validation
    if (paymentMethod === 'card') {
      if (cardNumber.replace(/\s+/g, '').length < 16) {
        toast.error('Please enter a valid 16-digit card number');
        return;
      }
      if (!cardName.trim()) {
        toast.error('Please enter the cardholder name');
        return;
      }
      if (cardExpiry.length < 5) {
        toast.error('Please enter a valid expiry date (MM/YY)');
        return;
      }
      if (cardCvv.length < 3) {
        toast.error('Please enter a valid CVV');
        return;
      }
    } else if (paymentMethod === 'upi') {
      if (!upiId.includes('@') || upiId.length < 5) {
        toast.error('Please enter a valid UPI ID (e.g. user@okhdfc)');
        return;
      }
    } else if (paymentMethod === 'netbanking') {
      if (!selectedBank) {
        toast.error('Please select your bank');
        return;
      }
    }

    setIsProcessing(true);
    setProcessingStep(0);
  };

  // Animate the payment processor steps
  useEffect(() => {
    if (!isProcessing) return;

    const steps = [
      'Establishing 256-bit SSL encrypted connection...',
      'Securing transaction tokens with merchant gateway...',
      'Verifying payment credentials with your issuer...',
      'Confirming ledger balance & clearing funds...',
      'Payment verified successfully!'
    ];

    const timer = setInterval(() => {
      setProcessingStep((prev) => {
        if (prev >= steps.length - 1) {
          clearInterval(timer);
          setPaymentSuccess(true);
          
          // Redirect to verified payment success page after completion animation
          setTimeout(() => {
            navigate(`/payment-success?appointment_id=${appointmentId}&mock=true`);
          }, 1200);

          return prev;
        }
        return prev + 1;
      });
    }, 900);

    return () => clearInterval(timer);
  }, [isProcessing, appointmentId, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center">
        <Loader2 className="animate-spin text-primary mb-4" size={40} />
        <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">Loading secure checkout environment...</p>
      </div>
    );
  }

  // Fees calculation
  const consultationFee = appointment ? appointment.amount : 0;
  const platformFee = 2.50;
  const taxes = Number((consultationFee * 0.05).toFixed(2));
  const totalAmount = Number((consultationFee + platformFee + taxes).toFixed(2));

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 py-12 px-4 sm:px-6 lg:px-8 transition-colors">
      <div className="max-w-5xl mx-auto">
        {/* Back Button / Header */}
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={() => navigate('/patient/appointments')}
            className="flex items-center gap-2 text-sm font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
          >
            <ArrowLeft size={16} /> Cancel & Return
          </button>
          <div className="flex items-center gap-2 text-slate-400 dark:text-slate-500 text-xs">
            <Lock size={14} className="text-emerald-500" /> Secure 256-bit SSL Gateway
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* LEFT COLUMN: Payment Forms */}
          <div className="lg:col-span-7 bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 shadow-premium border border-slate-100 dark:border-slate-800 space-y-6">
            <div>
              <h2 className="text-2xl font-extrabold text-slate-800 dark:text-white tracking-tight">Select Payment Method</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Choose a payment mechanism. Simulated credentials are fully accepted.
              </p>
            </div>

            {/* Selector Grid */}
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => setPaymentMethod('card')}
                className={`py-3 px-2 flex flex-col items-center justify-center gap-1.5 rounded-xl border text-xs font-bold transition-all ${
                  paymentMethod === 'card'
                    ? 'border-primary bg-primary/5 text-primary dark:border-primary dark:bg-primary/10'
                    : 'border-slate-200 dark:border-slate-800 text-slate-650 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-850'
                }`}
              >
                <CreditCard size={18} />
                <span>Card</span>
              </button>

              <button
                onClick={() => setPaymentMethod('upi')}
                className={`py-3 px-2 flex flex-col items-center justify-center gap-1.5 rounded-xl border text-xs font-bold transition-all ${
                  paymentMethod === 'upi'
                    ? 'border-primary bg-primary/5 text-primary dark:border-primary dark:bg-primary/10'
                    : 'border-slate-200 dark:border-slate-800 text-slate-650 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-850'
                }`}
              >
                <QrCode size={18} />
                <span>UPI / QR</span>
              </button>

              <button
                onClick={() => setPaymentMethod('netbanking')}
                className={`py-3 px-2 flex flex-col items-center justify-center gap-1.5 rounded-xl border text-xs font-bold transition-all ${
                  paymentMethod === 'netbanking'
                    ? 'border-primary bg-primary/5 text-primary dark:border-primary dark:bg-primary/10'
                    : 'border-slate-200 dark:border-slate-800 text-slate-650 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-850'
                }`}
              >
                <Building2 size={18} />
                <span>Net Banking</span>
              </button>
            </div>

            {/* Card Payment Form & Graphic Preview */}
            {paymentMethod === 'card' && (
              <form onSubmit={handlePaymentSubmit} className="space-y-6">
                {/* Visual Credit Card Preview */}
                <div className="w-full h-48 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-850 dark:from-slate-950 dark:to-slate-900 text-white p-6 flex flex-col justify-between shadow-lg relative overflow-hidden border border-slate-700/50">
                  <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-full blur-2xl pointer-events-none"></div>
                  
                  <div className="flex justify-between items-start">
                    <span className="text-xs uppercase tracking-widest font-extrabold text-slate-450">MediConnect Card</span>
                    {cardType === 'Visa' && (
                      <span className="italic font-extrabold text-lg text-white font-sans">VISA</span>
                    )}
                    {cardType === 'Mastercard' && (
                      <span className="italic font-extrabold text-lg text-white font-sans">MasterCard</span>
                    )}
                    {cardType === 'Amex' && (
                      <span className="italic font-extrabold text-lg text-white font-sans">AMEX</span>
                    )}
                    {cardType === 'Generic' && (
                      <span className="text-xs font-bold text-slate-500">SECURE CHIP</span>
                    )}
                  </div>

                  <div className="space-y-1">
                    <div className="w-10 h-7 bg-amber-400/25 rounded-md border border-amber-300/40"></div>
                    <div className="text-xl sm:text-2xl font-mono tracking-widest pt-2">
                      {cardNumber || '•••• •••• •••• ••••'}
                    </div>
                  </div>

                  <div className="flex justify-between items-end font-mono">
                    <div className="space-y-0.5">
                      <span className="text-[9px] uppercase text-slate-400 tracking-wider">Card Holder</span>
                      <div className="text-xs tracking-wider uppercase font-bold truncate max-w-[180px]">
                        {cardName || 'YOUR FULL NAME'}
                      </div>
                    </div>
                    <div className="flex gap-4 text-right">
                      <div className="space-y-0.5">
                        <span className="text-[9px] uppercase text-slate-400 tracking-wider">Expires</span>
                        <div className="text-xs font-bold">{cardExpiry || 'MM/YY'}</div>
                      </div>
                      <div className="space-y-0.5">
                        <span className="text-[9px] uppercase text-slate-400 tracking-wider">CVV</span>
                        <div className="text-xs font-bold">{cardCvv || '•••'}</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Form Fields */}
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-450 uppercase tracking-wider">Cardholder Name</label>
                    <input
                      type="text"
                      value={cardName}
                      onChange={(e) => setCardName(e.target.value)}
                      placeholder="e.g. John Doe"
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl outline-none text-sm focus:ring-2 focus:ring-primary transition-all dark:text-white"
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-450 uppercase tracking-wider">Card Number</label>
                    <input
                      type="text"
                      value={cardNumber}
                      onChange={handleCardNumberChange}
                      placeholder="4242 4242 4242 4242"
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl outline-none text-sm focus:ring-2 focus:ring-primary transition-all dark:text-white font-mono"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-slate-500 dark:text-slate-450 uppercase tracking-wider">Expiry Date</label>
                      <input
                        type="text"
                        value={cardExpiry}
                        onChange={handleExpiryChange}
                        placeholder="MM/YY"
                        className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-955 border border-slate-200 dark:border-slate-800 rounded-xl outline-none text-sm focus:ring-2 focus:ring-primary transition-all dark:text-white font-mono"
                        required
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-slate-500 dark:text-slate-450 uppercase tracking-wider">CVV Code</label>
                      <input
                        type="password"
                        value={cardCvv}
                        onChange={handleCvvChange}
                        placeholder="123"
                        className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-955 border border-slate-200 dark:border-slate-800 rounded-xl outline-none text-sm focus:ring-2 focus:ring-primary transition-all dark:text-white font-mono"
                        required
                      />
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-3.5 bg-primary hover:bg-primary-dark text-white rounded-2xl font-bold transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2"
                >
                  Pay ${totalAmount.toFixed(2)}
                </button>
              </form>
            )}

            {/* UPI QR Payment Simulation */}
            {paymentMethod === 'upi' && (
              <form onSubmit={handlePaymentSubmit} className="space-y-6 text-center">
                <div className="bg-slate-50 dark:bg-slate-950 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 inline-block mx-auto space-y-4">
                  <span className="text-xs uppercase text-slate-400 font-bold tracking-wider block">Scan QR to pay</span>
                  
                  {/* Styled Dynamic Mock QR code */}
                  <div className="w-44 h-44 bg-white p-2 rounded-xl border border-slate-200 dark:border-slate-700 mx-auto flex items-center justify-center shadow-inner relative">
                    <div className="absolute inset-0 bg-slate-900/5 dark:bg-transparent pointer-events-none rounded-xl"></div>
                    <div className="grid grid-cols-5 gap-1.5 w-full h-full opacity-80 p-1 font-mono text-[9px] text-slate-900 select-none overflow-hidden leading-tight">
                      <div>■■□■■</div><div>□■□■□</div><div>■□■□■</div><div>■■□■■</div><div>□■□■□</div>
                      <div>□□■□□</div><div>■■■■■</div><div>□□□□■</div><div>■□■■□</div><div>■■■■■</div>
                      <div>■■□■■</div><div>■□□■□</div><div>■■■■■</div><div>□■□■□</div><div>■□□■□</div>
                      <div>□■□■□</div><div>□□■□□</div><div>□□□■■</div><div>■■□■■</div><div>□□■□□</div>
                      <div>■■□■■</div><div>■■■■■</div><div>■□□■□</div><div>□■□■□</div><div>■■■■■</div>
                    </div>
                    {/* Centered medical logo badge inside QR code */}
                    <div className="absolute w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-white border-2 border-white shadow-md">
                      <span className="font-extrabold text-[15px]">+</span>
                    </div>
                  </div>

                  <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Grand Total: <span className="text-primary font-bold text-sm">${totalAmount.toFixed(2)}</span>
                  </p>
                </div>

                <div className="space-y-3 text-left">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-450 uppercase tracking-wider">Or enter UPI ID</label>
                    <input
                      type="text"
                      value={upiId}
                      onChange={(e) => setUpiId(e.target.value)}
                      placeholder="e.g. patient@upi"
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl outline-none text-sm focus:ring-2 focus:ring-primary transition-all dark:text-white"
                      required={paymentMethod === 'upi'}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-3.5 bg-primary hover:bg-primary-dark text-white rounded-2xl font-bold transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2"
                >
                  Confirm QR / UPI Payment
                </button>
              </form>
            )}

            {/* Net Banking Simulation */}
            {paymentMethod === 'netbanking' && (
              <form onSubmit={handlePaymentSubmit} className="space-y-6">
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-450 uppercase tracking-wider">Select Bank</label>
                  <p className="text-xs text-slate-400">Choose from top commercial banks:</p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {[
                    { id: 'sbi', name: 'State Bank of India', code: 'SBI' },
                    { id: 'hdfc', name: 'HDFC Bank', code: 'HDFC' },
                    { id: 'icici', name: 'ICICI Bank', code: 'ICICI' },
                    { id: 'axis', name: 'Axis Bank', code: 'AXIS' },
                  ].map((bank) => (
                    <button
                      key={bank.id}
                      type="button"
                      onClick={() => setSelectedBank(bank.id)}
                      className={`p-4 rounded-xl border text-left flex flex-col justify-between h-20 transition-all ${
                        selectedBank === bank.id
                          ? 'border-primary bg-primary/5 text-primary'
                          : 'border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-850'
                      }`}
                    >
                      <span className="font-extrabold text-[14px]">{bank.code}</span>
                      <span className="text-[11px] font-semibold text-slate-450 truncate">{bank.name}</span>
                    </button>
                  ))}
                </div>

                <button
                  type="submit"
                  className="w-full py-3.5 bg-primary hover:bg-primary-dark text-white rounded-2xl font-bold transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2"
                >
                  Pay via Net Banking
                </button>
              </form>
            )}

            {/* Security Seals */}
            <div className="pt-4 border-t border-slate-100 dark:border-slate-850 flex items-center justify-around gap-4 text-[10px] text-slate-400 font-bold uppercase tracking-wider">
              <span className="flex items-center gap-1"><ShieldCheck size={14} className="text-emerald-500" /> PCI-DSS Compliant</span>
              <span className="flex items-center gap-1"><ShieldCheck size={14} className="text-emerald-500" /> SSL Certified</span>
              <span className="flex items-center gap-1"><ShieldCheck size={14} className="text-emerald-500" /> Stripe Verified</span>
            </div>
          </div>

          {/* RIGHT COLUMN: Order Summary */}
          <div className="lg:col-span-5 space-y-6">
            {/* Booking Details Card */}
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 shadow-premium border border-slate-100 dark:border-slate-800 space-y-4">
              <h3 className="text-lg font-bold text-slate-800 dark:text-white">Consultation Summary</h3>
              
              {appointment && (
                <div className="flex gap-4 items-center bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-100 dark:border-slate-850">
                  <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center font-extrabold text-lg shadow-sm">
                    {appointment.doctorId?.name?.charAt(0) || 'D'}
                  </div>
                  <div className="space-y-0.5">
                    <h4 className="text-sm font-extrabold text-slate-800 dark:text-white">Dr. {appointment.doctorId?.name}</h4>
                    <p className="text-[11px] text-slate-450 font-semibold">{appointment.date} at {appointment.timeSlot}</p>
                  </div>
                </div>
              )}

              {/* Price Breakdown */}
              <div className="space-y-3 pt-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-450 font-semibold">Consultation Fee</span>
                  <span className="font-bold text-slate-700 dark:text-slate-300">${consultationFee.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-450 font-semibold">Platform Service Fee</span>
                  <span className="font-bold text-slate-700 dark:text-slate-300">${platformFee.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-455 font-semibold">Tax (GST 5%)</span>
                  <span className="font-bold text-slate-700 dark:text-slate-300">${taxes.toFixed(2)}</span>
                </div>
                <div className="border-t border-slate-100 dark:border-slate-850 pt-3 flex justify-between items-end">
                  <span className="text-slate-800 dark:text-white font-extrabold text-base">Grand Total</span>
                  <span className="text-primary dark:text-secondary font-black text-xl">${totalAmount.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Info Box */}
            <div className="bg-slate-50 dark:bg-slate-900/50 rounded-2xl p-5 border border-slate-100 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 space-y-2">
              <h4 className="font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide">Cancellation & Refund Policy</h4>
              <p className="leading-relaxed">
                You can cancel this appointment up to 2 hours before the scheduled time slot. Paid consultation fees will be automatically and immediately refunded to your original payment source upon cancellation.
              </p>
            </div>
          </div>

        </div>
      </div>

      {/* Fullscreen processing loader screen */}
      {isProcessing && (
        <div className="fixed inset-0 z-50 bg-slate-900/90 backdrop-blur-md flex flex-col items-center justify-center p-4 transition-all">
          <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-3xl p-8 text-center shadow-2xl border border-slate-100 dark:border-slate-850 space-y-6">
            {!paymentSuccess ? (
              <>
                <div className="relative w-20 h-20 mx-auto flex items-center justify-center">
                  <Loader2 className="animate-spin text-primary absolute inset-0 w-full h-full" size={80} />
                  <Lock className="text-primary/75" size={28} />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-extrabold text-slate-850 dark:text-white">Processing Transaction</h3>
                  <p className="text-xs text-slate-400 uppercase tracking-widest font-bold">Secure Stripe Portal</p>
                </div>
                <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-200 dark:border-slate-800 min-h-[50px] flex items-center justify-center">
                  <span className="text-sm font-semibold text-slate-600 dark:text-slate-300 animate-pulse">
                    {[
                      'Establishing 256-bit SSL encrypted connection...',
                      'Securing transaction tokens with merchant gateway...',
                      'Verifying payment credentials with your issuer...',
                      'Confirming ledger balance & clearing funds...',
                      'Payment verified successfully!'
                    ][processingStep]}
                  </span>
                </div>
              </>
            ) : (
              <div className="space-y-4 py-4 animate-in zoom-in-95 duration-200">
                <div className="w-16 h-16 bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle2 size={44} className="stroke-[2.5]" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-2xl font-black text-slate-850 dark:text-white tracking-tight">Payment Verified!</h3>
                  <p className="text-sm text-slate-400 font-semibold">Redirecting to MediConnect confirmation...</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
