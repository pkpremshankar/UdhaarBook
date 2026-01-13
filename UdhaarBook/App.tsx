
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';
import { auth } from './services/firebase';
import { Customer, Transaction, TransactionType, SummaryStats, ReminderConfig, ReminderFrequency } from './types';
import { storage } from './services/storage';
import CustomerCard from './components/CustomerCard';
import TransactionItem from './components/TransactionItem';
import Auth from './components/Auth';

interface PendingAction {
  type: 'ADD' | 'EDIT';
  data: any;
}

type SortOrder = 'asc' | 'desc';

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authChecking, setAuthChecking] = useState(true);

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [isAddingCustomer, setIsAddingCustomer] = useState(false);
  const [isAddingTransaction, setIsAddingTransaction] = useState<{ type: TransactionType } | null>(null);
  const [editingTransactionId, setEditingTransactionId] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const [isEditingReminder, setIsEditingReminder] = useState(false);
  const [txSortOrder, setTxSortOrder] = useState<SortOrder>('desc');
  
  const [newCustomer, setNewCustomer] = useState({ name: '', phone: '', avatar: '', loanAmount: '', interestRate: '' });
  const [newTx, setNewTx] = useState({ amount: '', description: '' });
  const [correction, setCorrection] = useState({ amount: '', reason: '' });
  const [reminderForm, setReminderForm] = useState<ReminderConfig>({
    frequency: 'DAILY',
    time: '09:00',
    enabled: false
  });
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setAuthChecking(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (currentUser) {
      setCustomers(storage.getCustomers());
    }
  }, [currentUser]);

  // Helper for date formatting
  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const stats = useMemo((): SummaryStats => {
    return customers.reduce((acc, c) => ({
      totalGiven: acc.totalGiven + (c.balance > 0 ? c.balance : 0),
      totalReceived: acc.totalReceived + (c.balance < 0 ? Math.abs(c.balance) : 0),
      netBalance: acc.netBalance + c.balance
    }), { totalGiven: 0, totalReceived: 0, netBalance: 0 });
  }, [customers]);

  const filteredCustomers = useMemo(() => {
    const query = searchTerm.toLowerCase().trim();
    const list = [...customers];
    if (!query) return list;
    return list.filter(c => 
      c.name.toLowerCase().includes(query) || 
      c.phone.toLowerCase().includes(query)
    );
  }, [customers, searchTerm]);

  const selectedCustomer = useMemo(() => 
    customers.find(c => c.id === selectedCustomerId), 
    [customers, selectedCustomerId]
  );

  const sortedTransactions = useMemo(() => {
    if (!selectedCustomer) return [];
    return [...selectedCustomer.transactions].sort((a, b) => {
      return txSortOrder === 'desc' 
        ? b.timestamp - a.timestamp 
        : a.timestamp - b.timestamp;
    });
  }, [selectedCustomer, txSortOrder]);

  // Fix: Added missing toggleSortOrder function to handle transaction list sorting
  const toggleSortOrder = () => {
    setTxSortOrder(prev => prev === 'desc' ? 'asc' : 'desc');
  };

  useEffect(() => {
    if (selectedCustomer?.reminderConfig) {
      setReminderForm(selectedCustomer.reminderConfig);
    } else {
      setReminderForm({ frequency: 'DAILY', time: '09:00', enabled: false });
    }
  }, [selectedCustomer]);

  const handleLogout = () => {
    signOut(auth);
    setSelectedCustomerId(null);
  };

  if (authChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!currentUser) {
    return <Auth />;
  }

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 1024 * 1024) {
        alert("Image is too large. Please pick a smaller image (under 1MB).");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewCustomer(prev => ({ ...prev, avatar: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustomer.name) return;
    
    const customer: Customer = {
      id: crypto.randomUUID(),
      name: newCustomer.name,
      phone: newCustomer.phone,
      avatar: newCustomer.avatar || undefined,
      loanAmount: newCustomer.loanAmount ? parseFloat(newCustomer.loanAmount) : 0,
      interestRate: newCustomer.interestRate ? parseFloat(newCustomer.interestRate) : 0,
      balance: newCustomer.loanAmount ? parseFloat(newCustomer.loanAmount) : 0,
      lastUpdated: Date.now(),
      transactions: newCustomer.loanAmount ? [{
        id: crypto.randomUUID(),
        amount: parseFloat(newCustomer.loanAmount),
        type: TransactionType.GIVEN,
        description: 'Initial Loan Amount',
        timestamp: Date.now(),
        isEdited: false,
        history: []
      }] : []
    };
    
    storage.saveCustomer(customer);
    setCustomers(storage.getCustomers());
    setIsAddingCustomer(false);
    setNewCustomer({ name: '', phone: '', avatar: '', loanAmount: '', interestRate: '' });
  };

  const handleSaveReminder = () => {
    if (!selectedCustomerId || !selectedCustomer) return;
    const updatedCustomer = {
      ...selectedCustomer,
      reminderConfig: reminderForm
    };
    storage.saveCustomer(updatedCustomer);
    setCustomers(storage.getCustomers());
    setIsEditingReminder(false);
  };

  const confirmAddTransaction = (sendWhatsApp: boolean = false) => {
    if (!selectedCustomerId || !pendingAction || !selectedCustomer) return;
    
    const amount = parseFloat(pendingAction.data.amount);
    const transaction: Transaction = {
      id: crypto.randomUUID(),
      amount: amount,
      type: pendingAction.data.type,
      description: pendingAction.data.description,
      timestamp: Date.now(),
      isEdited: false,
      history: []
    };

    storage.addTransaction(selectedCustomerId, transaction);
    const updatedCustomers = storage.getCustomers();
    setCustomers(updatedCustomers);
    
    if (sendWhatsApp && selectedCustomer.phone) {
      const cleanPhone = selectedCustomer.phone.replace(/\D/g, '');
      const newBalance = selectedCustomer.balance + (transaction.type === TransactionType.GIVEN ? amount : -amount);
      const msg = encodeURIComponent(`UdhaarBook Alert: I have added a ${transaction.type === TransactionType.GIVEN ? 'credit' : 'payment'} of ₹${amount.toLocaleString()} to your account. Your new total balance is ₹${Math.abs(newBalance).toLocaleString()}.`);
      window.open(`https://wa.me/${cleanPhone}?text=${msg}`, '_blank');
    }

    setPendingAction(null);
    setIsAddingTransaction(null);
    setNewTx({ amount: '', description: '' });
  };

  const confirmEditTransaction = () => {
    if (!selectedCustomerId || !pendingAction) return;
    
    storage.editTransaction(
      selectedCustomerId, 
      pendingAction.data.id, 
      parseFloat(pendingAction.data.amount), 
      pendingAction.data.reason
    );
    
    setCustomers(storage.getCustomers());
    setPendingAction(null);
    setEditingTransactionId(null);
    setCorrection({ amount: '', reason: '' });
  };

  const sendWhatsAppReminder = (customer: Customer) => {
    if (!customer.phone) {
      alert("Please add a phone number for this customer first.");
      return;
    }
    const cleanPhone = customer.phone.replace(/\D/g, '');
    const msg = encodeURIComponent(`Hello ${customer.name}, a friendly reminder from UdhaarBook that you have an outstanding balance of ₹${Math.abs(customer.balance).toLocaleString()}. Please settle at your convenience.`);
    window.open(`https://wa.me/${cleanPhone}?text=${msg}`, '_blank');
  };

  const handleSendPDFAndWhatsApp = async (customer: Customer) => {
    try {
      const { jsPDF } = await import('jspdf');
      const autoTable = (await import('jspdf-autotable')).default;

      const doc = new jsPDF();
      doc.setFontSize(22);
      doc.text('UdhaarBook Bill Summary', 20, 20);
      doc.setFontSize(12);
      doc.text(`Customer: ${customer.name}`, 20, 35);
      doc.text(`Phone: ${customer.phone || 'N/A'}`, 20, 42);
      doc.text(`Generated: ${formatDate(Date.now())}`, 20, 49);

      autoTable(doc, {
        startY: 75,
        head: [['Date', 'Description', 'Type', 'Amount']],
        body: customer.transactions.map(tx => [
          formatDate(tx.timestamp),
          tx.description,
          tx.type === TransactionType.GIVEN ? 'Debit' : 'Credit',
          `₹${tx.amount.toLocaleString()}`
        ]),
      });

      const finalY = (doc as any).lastAutoTable.finalY || 100;
      doc.setFontSize(16);
      doc.text(`TOTAL OUTSTANDING: ₹${Math.abs(customer.balance).toLocaleString()}`, 20, finalY + 20);

      const fileName = `Bill_${customer.name.replace(/\s+/g, '_')}.pdf`;
      doc.save(fileName);

      if (customer.phone) {
        const cleanPhone = customer.phone.replace(/\D/g, '');
        const message = encodeURIComponent(`Hi ${customer.name}, your total bill summary from UdhaarBook has been generated. Balance: ₹${Math.abs(customer.balance).toLocaleString()}. PDF attached.`);
        window.open(`https://wa.me/${cleanPhone}?text=${message}`, '_blank');
      }
    } catch (err) {
      console.error(err);
      alert("Error generating bill PDF.");
    }
  };

  return (
    <div className="min-h-screen max-w-lg mx-auto p-6 flex flex-col">
      <header className="mb-8 flex justify-between items-start">
        <div className="flex flex-col">
          <h1 className="text-3xl font-black text-indigo-600 tracking-tight">UdhaarBook</h1>
          <p className="text-[10px] uppercase font-bold text-slate-400 tracking-widest mt-1">Merchant: {currentUser.displayName || currentUser.email}</p>
        </div>
        <button onClick={handleLogout} className="neumorph-btn p-3 rounded-full text-slate-400 hover:text-rose-500 transition-colors">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
        </button>
      </header>

      {!selectedCustomerId ? (
        <>
          <div className="grid grid-cols-2 gap-6 mb-6">
            <div className="neumorph-card p-5 text-center">
              <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Receivables</p>
              <p className="text-xl font-black text-rose-500">₹{stats.totalGiven.toLocaleString()}</p>
            </div>
            <div className="neumorph-card p-5 text-center">
              <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Payables</p>
              <p className="text-xl font-black text-emerald-500">₹{stats.totalReceived.toLocaleString()}</p>
            </div>
          </div>

          <div className="mb-8 px-1">
            <div className="neumorph-inset flex items-center p-4 rounded-[30px] group transition-all focus-within:ring-2 focus-within:ring-indigo-200">
              <svg className="w-5 h-5 text-slate-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input 
                type="text" 
                placeholder="Search customers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-transparent border-none outline-none w-full text-slate-600 font-medium placeholder:text-slate-400"
              />
            </div>
          </div>

          <div className="space-y-4 flex-1">
            {filteredCustomers.length === 0 ? (
              <div className="neumorph-card p-10 text-center opacity-60">
                <p className="text-sm font-medium">No customers found.</p>
              </div>
            ) : (
              filteredCustomers.map(c => (
                <CustomerCard 
                  key={c.id} 
                  customer={c} 
                  onClick={() => setSelectedCustomerId(c.id)} 
                />
              ))
            )}
          </div>

          <button 
            onClick={() => setIsAddingCustomer(true)}
            className="neumorph-btn mt-8 p-5 rounded-full flex items-center justify-center space-x-2 w-full text-indigo-600 font-bold"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path></svg>
            <span>Add Customer</span>
          </button>
        </>
      ) : (
        <div className="flex-1 flex flex-col">
          <div className="flex items-center justify-between mb-8">
            <button onClick={() => setSelectedCustomerId(null)} className="neumorph-btn p-3 rounded-full text-slate-600">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path></svg>
            </button>
            <div className="flex flex-col items-center">
              <div className="neumorph-inset w-12 h-12 rounded-full mb-2 flex items-center justify-center overflow-hidden">
                {selectedCustomer?.avatar ? (
                  <img src={selectedCustomer.avatar} className="w-full h-full object-cover" alt="" />
                ) : (
                  <span className="text-xl font-bold text-indigo-500">{selectedCustomer?.name.charAt(0)}</span>
                )}
              </div>
              <h2 className="text-xl font-bold">{selectedCustomer?.name}</h2>
              <span className="text-xs text-slate-400">{selectedCustomer?.phone}</span>
            </div>
            <div className="flex space-x-2">
              <button onClick={() => sendWhatsAppReminder(selectedCustomer!)} className="neumorph-btn p-3 rounded-full text-emerald-600">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>
              </button>
              <button onClick={() => setIsEditingReminder(true)} className="neumorph-btn p-3 rounded-full text-indigo-600 relative">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                {selectedCustomer?.reminderConfig?.enabled && (
                  <span className="absolute top-2 right-2 w-2 h-2 bg-indigo-500 rounded-full animate-pulse border border-white"></span>
                )}
              </button>
            </div>
          </div>

          <div className="neumorph-card p-6 mb-6 text-center">
            <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Outstanding Balance</p>
            <p className={`text-3xl font-black ${selectedCustomer!.balance < 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
              ₹{Math.abs(selectedCustomer!.balance).toLocaleString()}
            </p>
            <div className="flex justify-center items-center mt-2 space-x-3">
              <button onClick={() => handleSendPDFAndWhatsApp(selectedCustomer!)} className="text-[9px] font-black text-indigo-400 uppercase tracking-widest border-b border-indigo-200">
                Download Slip
              </button>
            </div>
          </div>

          <div className="flex justify-between items-center mb-4 px-1">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Transactions</h3>
            <button 
              onClick={toggleSortOrder}
              className="neumorph-btn px-3 py-1.5 rounded-full flex items-center space-x-1"
            >
              <span className="text-[10px] font-bold text-slate-600 uppercase">
                {txSortOrder === 'desc' ? 'Newest' : 'Oldest'}
              </span>
            </button>
          </div>

          <div className="space-y-4 flex-1 overflow-y-auto mb-20 pr-1">
            {sortedTransactions.map(tx => (
              <TransactionItem 
                key={tx.id} 
                transaction={tx} 
                customer={selectedCustomer!} 
                onEdit={() => {
                  setEditingTransactionId(tx.id);
                  setCorrection({ amount: tx.amount.toString(), reason: '' });
                }} 
              />
            ))}
          </div>

          <div className="fixed bottom-8 left-6 right-6 grid grid-cols-2 gap-4">
            <button 
              onClick={() => setIsAddingTransaction({ type: TransactionType.GIVEN })}
              className="neumorph-btn p-4 rounded-3xl text-rose-500 font-bold flex flex-col items-center"
            >
              <span className="text-[10px] uppercase opacity-60">I Gave</span>
              <span className="text-lg">Credit</span>
            </button>
            <button 
              onClick={() => setIsAddingTransaction({ type: TransactionType.RECEIVED })}
              className="neumorph-btn p-4 rounded-3xl text-emerald-500 font-bold flex flex-col items-center"
            >
              <span className="text-[10px] uppercase opacity-60">I Got</span>
              <span className="text-lg">Payment</span>
            </button>
          </div>
        </div>
      )}

      {/* Reminder Config Modal */}
      {isEditingReminder && (
        <div className="fixed inset-0 bg-slate-200/90 backdrop-blur-md z-[100] flex items-center justify-center p-6">
          <div className="neumorph-card w-full p-8 max-w-sm">
            <h3 className="text-xl font-bold text-slate-700 mb-6 text-center">Payment Reminders</h3>
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-slate-500 uppercase tracking-tight">Status</span>
                <button 
                  onClick={() => setReminderForm(prev => ({ ...prev, enabled: !prev.enabled }))}
                  className={`w-12 h-6 rounded-full transition-all flex items-center px-1 ${reminderForm.enabled ? 'bg-indigo-500' : 'bg-slate-300'}`}
                >
                  <div className={`w-4 h-4 rounded-full bg-white shadow-md transform transition-transform ${reminderForm.enabled ? 'translate-x-6' : 'translate-x-0'}`}></div>
                </button>
              </div>
              <div className="flex space-x-4 pt-4">
                <button onClick={() => setIsEditingReminder(false)} className="neumorph-btn flex-1 p-4 rounded-2xl font-bold text-slate-500">Cancel</button>
                <button onClick={handleSaveReminder} className="neumorph-btn flex-1 p-4 rounded-2xl font-bold text-indigo-600">Save</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Dialog Overlay */}
      {pendingAction && (
        <div className="fixed inset-0 bg-slate-200/90 backdrop-blur-md z-[100] flex items-center justify-center p-6 animate-in fade-in duration-200">
          <div className="neumorph-card w-full p-8 max-sm text-center">
            <h3 className="text-xl font-black text-slate-700 mb-2">Review Entry</h3>
            <div className="neumorph-inset p-4 rounded-2xl mb-6">
              <p className="text-sm text-slate-500 mb-1 uppercase font-bold tracking-tight">
                {pendingAction.type === 'ADD' ? (
                  pendingAction.data.type === TransactionType.GIVEN ? 'Giving Credit' : 'Receiving Payment'
                ) : 'Correcting Entry'}
              </p>
              <p className={`text-2xl font-black ${
                pendingAction.type === 'ADD' 
                  ? (pendingAction.data.type === TransactionType.GIVEN ? 'text-rose-500' : 'text-emerald-500')
                  : 'text-amber-500'
              }`}>
                ₹{parseFloat(pendingAction.data.amount).toLocaleString()}
              </p>
            </div>
            <div className="space-y-3">
              <button 
                onClick={() => confirmAddTransaction(true)}
                className="neumorph-btn w-full p-4 rounded-2xl font-bold text-emerald-600 flex items-center justify-center space-x-2"
              >
                <span>Save & Alert WhatsApp</span>
              </button>
              <div className="flex space-x-3">
                <button onClick={() => setPendingAction(null)} className="neumorph-btn flex-1 p-4 rounded-2xl font-bold text-slate-500 text-xs">Edit</button>
                <button onClick={() => pendingAction.type === 'ADD' ? confirmAddTransaction(false) : confirmEditTransaction()} className="neumorph-btn flex-1 p-4 rounded-2xl font-bold text-indigo-600 text-xs">Just Save</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* New Customer Modal */}
      {isAddingCustomer && (
        <div className="fixed inset-0 bg-slate-200/80 backdrop-blur-md z-50 flex items-center justify-center p-6">
          <div className="neumorph-card w-full p-8 max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-bold mb-6">New Customer</h3>
            <form onSubmit={handleAddCustomer} className="space-y-4">
              <input required placeholder="Name" value={newCustomer.name} onChange={e => setNewCustomer({...newCustomer, name: e.target.value})} className="neumorph-inset w-full p-4 rounded-2xl outline-none" />
              <input placeholder="Phone" value={newCustomer.phone} onChange={e => setNewCustomer({...newCustomer, phone: e.target.value})} className="neumorph-inset w-full p-4 rounded-2xl outline-none" />
              <div className="grid grid-cols-2 gap-4">
                <input type="number" placeholder="Loan Amount" value={newCustomer.loanAmount} onChange={e => setNewCustomer({...newCustomer, loanAmount: e.target.value})} className="neumorph-inset w-full p-4 rounded-2xl outline-none" />
                <input type="number" placeholder="Interest %" value={newCustomer.interestRate} onChange={e => setNewCustomer({...newCustomer, interestRate: e.target.value})} className="neumorph-inset w-full p-4 rounded-2xl outline-none" />
              </div>
              <div className="flex space-x-4 mt-6">
                <button type="button" onClick={() => setIsAddingCustomer(false)} className="neumorph-btn flex-1 p-4 rounded-2xl font-bold text-slate-500">Cancel</button>
                <button type="submit" className="neumorph-btn flex-1 p-4 rounded-2xl font-bold text-indigo-600">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Transaction Modal */}
      {isAddingTransaction && (
        <div className="fixed inset-0 bg-slate-200/80 backdrop-blur-md z-50 flex items-center justify-center p-6">
          <div className="neumorph-card w-full p-8">
            <h3 className="text-xl font-bold mb-6">Entry Details</h3>
            <form onSubmit={(e) => { e.preventDefault(); setPendingAction({ type: 'ADD', data: { ...newTx, type: isAddingTransaction.type } }); }} className="space-y-4">
              <input required type="number" placeholder="Amount ₹" value={newTx.amount} onChange={e => setNewTx({...newTx, amount: e.target.value})} className="neumorph-inset w-full p-6 rounded-2xl outline-none text-2xl font-black text-center" />
              <input placeholder="Description" value={newTx.description} onChange={e => setNewTx({...newTx, description: e.target.value})} className="neumorph-inset w-full p-4 rounded-2xl outline-none" />
              <div className="flex space-x-4 mt-6">
                <button type="button" onClick={() => setIsAddingTransaction(null)} className="neumorph-btn flex-1 p-4 rounded-2xl font-bold text-slate-500">Cancel</button>
                <button type="submit" className="neumorph-btn flex-1 p-4 rounded-2xl font-bold text-indigo-600">Review</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
