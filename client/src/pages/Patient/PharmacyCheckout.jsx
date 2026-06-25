import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { CreditCard, QrCode, Building2, ShieldCheck, ArrowLeft, Loader2, Lock, CheckCircle2, MapPin, Phone, User, Package } from 'lucide-react';
import API from '../../services/api.js';
import toast from 'react-hot-toast';

export default function PharmacyCheckout() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [paymentMethod, setPaymentMethod] = useState('card'); // 'card' | 'upi' | 'netbanking'
  
  // Shipping details form
  const [shippingName, setShippingName] = useState('');
  const [shippingAddress, setShippingAddress] = useState('123 Health Ave, Medical District');
  const [shippingPhone, setShippingPhone] = useState('');

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
    const fetchOrderDetails = async () => {
      try {
        const res = await API.get(`/patient/orders/${orderId}`);
        if (res.data.success) {
          const fetchedOrder = res.data.data;
          setOrder(fetchedOrder);
          setShippingAddress(fetchedOrder.shippingAddress || '123 Health Ave, Medical District');
        } else {
          toast.error('Order details not found');
          navigate('/patient/appointments');
        }
      } catch (err) {
        toast.error('Failed to load pharmacy order');
        navigate('/patient/appointments');
      } finally {
        setLoading(false);
      }
    };
    fetchOrderDetails();
  }, [orderId, navigate]);

  // Card formatting
  const handleCardNumberChange = (e) => {
    let value = e.target.value.replace(/\D/g, ''); // numbers only
    value = value.substring(0, 16); // max 16 digits
    const formatted = value.replace(/(\d{4})(?=\d)/g, '$1 '); // add spaces every 4 digits
    setCardNumber(formatted);
  };

  const handleExpiryChange = (e) => {
    let value = e.target.value.replace(/\D/g, '');
    value = value.substring(0, 4); // MMYY
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

  const handlePaymentSubmit = (e) => {
    e.preventDefault();

    // Validation
    if (!shippingName.trim()) {
      toast.error('Please enter the recipient name for delivery');
      return;
    }
    if (!shippingAddress.trim()) {
      toast.error('Please enter a delivery address');
      return;
    }
    if (!shippingPhone.trim()) {
      toast.error('Please enter a contact phone number');
      return;
    }

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

  // Animate the payment processor steps and call verification
  useEffect(() => {
    if (!isProcessing) return;

    const steps = [
      'Establishing 256-bit SSL encrypted connection...',
      'Securing transaction tokens with merchant gateway...',
      'Verifying payment credentials with your issuer...',
      'Confirming pharmacy inventory reservation...',
      'Completing transaction and updating prescription log...',
      'Payment verified successfully!'
    ];

    const timer = setInterval(async () => {
      if (processingStep < steps.length - 1) {
        setProcessingStep(prev => prev + 1);
      } else {
        clearInterval(timer);
        try {
          // Call verify backend
          const res = await API.post('/patient/orders/verify', {
            orderId,
            isMock: true,
          });

          if (res.data.success) {
            setPaymentSuccess(true);
            setTimeout(() => {
              navigate(`/payment-success?order_id=${orderId}&mock=true`);
            }, 1200);
          } else {
            toast.error('Payment verification failed on the server');
            setIsProcessing(false);
          }
        } catch (err) {
          toast.error('Payment verification request failed');
          setIsProcessing(false);
        }
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [isProcessing, processingStep, orderId, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center">
        <Loader2 className="animate-spin text-primary mb-4" size={40} />
        <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">Loading secure checkout environment...</p>
      </div>
    );
  }

  const itemsCost = order ? order.totalAmount : 0;
  const shippingCost = 4.99;
  const totalCost = Number((itemsCost + shippingCost).toFixed(2));

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 py-12 px-4 sm:px-6 lg:px-8 transition-colors text-left">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={() => navigate('/patient/appointments')}
            className="flex items-center gap-2 text-sm font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
          >
            <ArrowLeft size={16} /> Cancel & Return
          </button>
          <div className="flex items-center gap-1.5 text-xs text-slate-450 uppercase font-bold tracking-wider">
            <Lock size={12} className="text-emerald-500" /> 256-bit Encryption
          </div>
        </div>

        {isProcessing ? (
          <div className="glass-panel max-w-md mx-auto rounded-3xl p-8 shadow-premium text-center border border-slate-200/50 dark:border-slate-800/50 space-y-6">
            {paymentSuccess ? (
              <div className="w-16 h-16 bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center mx-auto animate-bounce">
                <CheckCircle2 size={36} />
              </div>
            ) : (
              <Loader2 className="animate-spin text-primary mx-auto text-center" size={44} />
            )}
            <div className="space-y-2">
              <h3 className="text-lg font-bold text-slate-850 dark:text-white">
                {paymentSuccess ? 'Order Placed!' : 'Processing Payment'}
              </h3>
              <p className="text-xs text-slate-400 max-w-xs mx-auto">
                {
                  [
                    'Establishing 256-bit SSL encrypted connection...',
                    'Securing transaction tokens with merchant gateway...',
                    'Verifying payment credentials with your issuer...',
                    'Confirming pharmacy inventory reservation...',
                    'Completing transaction and updating prescription log...',
                    'Payment verified successfully!'
                  ][processingStep]
                }
              </p>
            </div>
            <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-primary h-full transition-all duration-700"
                style={{ width: `${((processingStep + 1) / 6) * 100}%` }}
              />
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            {/* Left/Middle Column - Checkout Forms */}
            <div className="lg:col-span-2 space-y-6">
              {/* Shipping Address Form */}
              <div className="glass-panel rounded-3xl p-6 border border-slate-200/50 dark:border-slate-800/50 space-y-4">
                <h3 className="text-base font-bold text-slate-800 dark:text-white flex items-center gap-2">
                  <MapPin size={18} className="text-primary" /> Delivery Information
                </h3>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-455 uppercase tracking-wider">Recipient Name</label>
                    <div className="relative">
                      <User className="absolute left-3 top-3 text-slate-400" size={16} />
                      <input
                        required
                        type="text"
                        placeholder="John Doe"
                        value={shippingName}
                        onChange={(e) => setShippingName(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm outline-none focus:border-primary transition-colors"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-455 uppercase tracking-wider">Contact Phone</label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-3 text-slate-400" size={16} />
                      <input
                        required
                        type="tel"
                        placeholder="+1 (555) 123-4567"
                        value={shippingPhone}
                        onChange={(e) => setShippingPhone(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm outline-none focus:border-primary transition-colors"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-455 uppercase tracking-wider">Shipping Address</label>
                  <textarea
                    required
                    rows="2"
                    placeholder="Street, City, State, ZIP Code"
                    value={shippingAddress}
                    onChange={(e) => setShippingAddress(e.target.value)}
                    className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm outline-none focus:border-primary transition-colors resize-none"
                  />
                </div>
              </div>

              {/* Payment Methods Section */}
              <div className="glass-panel rounded-3xl p-6 border border-slate-200/50 dark:border-slate-800/50 space-y-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-base font-bold text-slate-800 dark:text-white flex items-center gap-2">
                    <CreditCard size={18} className="text-primary" /> Select Payment Method
                  </h3>
                </div>

                {/* Tabs */}
                <div className="grid grid-cols-3 gap-2 p-1 bg-slate-100 dark:bg-slate-900 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('card')}
                    className={`py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                      paymentMethod === 'card'
                        ? 'bg-white dark:bg-slate-800 text-slate-800 dark:text-white shadow-sm'
                        : 'text-slate-400 hover:text-slate-650 dark:hover:text-slate-250'
                    }`}
                  >
                    <CreditCard size={14} /> Card
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('upi')}
                    className={`py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                      paymentMethod === 'upi'
                        ? 'bg-white dark:bg-slate-800 text-slate-800 dark:text-white shadow-sm'
                        : 'text-slate-400 hover:text-slate-650 dark:hover:text-slate-250'
                    }`}
                  >
                    <QrCode size={14} /> UPI
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('netbanking')}
                    className={`py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                      paymentMethod === 'netbanking'
                        ? 'bg-white dark:bg-slate-800 text-slate-800 dark:text-white shadow-sm'
                        : 'text-slate-400 hover:text-slate-650 dark:hover:text-slate-250'
                    }`}
                  >
                    <Building2 size={14} /> Net Banking
                  </button>
                </div>

                <form onSubmit={handlePaymentSubmit} className="space-y-4">
                  {paymentMethod === 'card' && (
                    <div className="space-y-3">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-450 uppercase tracking-wider">Card Number</label>
                        <input
                          type="text"
                          placeholder="4111 2222 3333 4444"
                          value={cardNumber}
                          onChange={handleCardNumberChange}
                          className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm outline-none focus:border-primary transition-colors font-mono"
                        />
                      </div>
                      
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-slate-450 uppercase tracking-wider">Cardholder Name</label>
                        <input
                          type="text"
                          placeholder="Jane Doe"
                          value={cardName}
                          onChange={(e) => setCardName(e.target.value)}
                          className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm outline-none focus:border-primary transition-colors"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-455 uppercase tracking-wider">Expiry Date</label>
                          <input
                            type="text"
                            placeholder="MM/YY"
                            value={cardExpiry}
                            onChange={handleExpiryChange}
                            className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm outline-none focus:border-primary transition-colors text-center"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-455 uppercase tracking-wider">CVV Code</label>
                          <input
                            type="password"
                            placeholder="•••"
                            value={cardCvv}
                            onChange={handleCvvChange}
                            className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm outline-none focus:border-primary transition-colors text-center font-mono"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {paymentMethod === 'upi' && (
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-450 uppercase tracking-wider">Virtual Payment Address (VPA) / UPI ID</label>
                      <input
                        type="text"
                        placeholder="username@bankhandle"
                        value={upiId}
                        onChange={(e) => setUpiId(e.target.value)}
                        className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm outline-none focus:border-primary transition-colors font-mono"
                      />
                    </div>
                  )}

                  {paymentMethod === 'netbanking' && (
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-450 uppercase tracking-wider">Select Bank Account</label>
                      <select
                        value={selectedBank}
                        onChange={(e) => setSelectedBank(e.target.value)}
                        className="w-full px-4 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-sm outline-none focus:border-primary transition-colors"
                      >
                        <option value="">-- Choose your Bank --</option>
                        <option value="chase">Chase Bank</option>
                        <option value="bofa">Bank of America</option>
                        <option value="wells">Wells Fargo</option>
                        <option value="citi">Citigroup</option>
                        <option value="hsb">HSBC</option>
                      </select>
                    </div>
                  )}

                  <button
                    type="submit"
                    className="w-full mt-4 py-3.5 bg-primary hover:bg-primary-dark text-white rounded-xl font-bold text-sm shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all hover:scale-[1.01] active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <ShieldCheck size={18} /> Authorize Order Payment (${totalCost.toFixed(2)})
                  </button>
                </form>
              </div>
            </div>

            {/* Right Column - Order Summary Panel */}
            <div className="space-y-6">
              <div className="glass-panel rounded-3xl p-6 border border-slate-200/50 dark:border-slate-800/50 space-y-4">
                <h3 className="text-base font-bold text-slate-800 dark:text-white flex items-center gap-2">
                  <Package size={18} className="text-primary" /> Order Summary
                </h3>

                {order?.medicines?.length > 0 ? (
                  <div className="divide-y divide-slate-105 dark:divide-slate-800 max-h-60 overflow-y-auto pr-1">
                    {order.medicines.map((med, index) => (
                      <div key={index} className="py-2.5 flex justify-between items-center text-xs">
                        <div>
                          <p className="font-bold text-slate-800 dark:text-white">{med.name} ({med.dosage})</p>
                          <p className="text-[10px] text-slate-400">{med.frequency} | {med.duration}</p>
                        </div>
                        <span className="font-semibold text-slate-700 dark:text-slate-350">${med.price.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400">No medicines in order.</p>
                )}

                <div className="border-t border-slate-200 dark:border-slate-800 pt-4 space-y-2 text-xs">
                  <div className="flex justify-between text-slate-500">
                    <span>Subtotal (Medications)</span>
                    <span className="font-medium text-slate-750 dark:text-slate-300">${itemsCost.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-slate-500">
                    <span>Shipping Fee</span>
                    <span className="font-medium text-slate-750 dark:text-slate-300">${shippingCost.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-slate-500">
                    <span>Estimated Tax</span>
                    <span className="font-medium text-slate-750 dark:text-slate-300">$0.00</span>
                  </div>
                  
                  <div className="border-t border-slate-100 dark:border-slate-800 pt-3 flex justify-between items-center">
                    <span className="text-sm font-bold text-slate-800 dark:text-white">Total Amount</span>
                    <span className="text-lg font-extrabold text-primary dark:text-secondary">${totalCost.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              <div className="bg-emerald-50 dark:bg-emerald-950/20 rounded-2xl p-4 border border-emerald-100 dark:border-emerald-900/35 flex gap-3 text-left">
                <div className="p-1 bg-emerald-500/10 text-emerald-500 dark:text-emerald-450 rounded-lg h-fit">
                  <ShieldCheck size={16} />
                </div>
                <div className="space-y-1">
                  <h4 className="text-xs font-bold text-emerald-800 dark:text-emerald-400 uppercase tracking-wide">Pharmacy Safe Guarantee</h4>
                  <p className="text-[10px] text-emerald-600 dark:text-emerald-500/90 leading-normal">Medications are sourced from licensed partner pharmacies. Prescriptions are checked and signed by your certified physician before dispatch.</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
