
import React from 'react';
import { Transaction, TransactionType, Customer } from '../types';

interface Props {
  transaction: Transaction;
  customer: Customer;
  onEdit: () => void;
}

const TransactionItem: React.FC<Props> = ({ transaction, customer, onEdit }) => {
  const isGiven = transaction.type === TransactionType.GIVEN;

  // Format date as DD/MM/YYYY
  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  return (
    <div className="neumorph-inset p-5 rounded-3xl mb-4 border border-white/5">
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <div className="flex items-center space-x-2">
            <span className="text-[10px] text-slate-400 font-bold uppercase">
              {formatDate(transaction.timestamp)} • {new Date(transaction.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
            {transaction.isEdited && (
              <span className="px-1.5 py-0.5 bg-amber-50 text-amber-600 text-[8px] font-black rounded uppercase border border-amber-200">
                Corrected
              </span>
            )}
          </div>
          <p className="text-slate-600 mt-1 font-medium text-sm">{transaction.description || 'General Entry'}</p>
        </div>
        
        <div className="flex flex-col items-end">
          <p className={`font-black text-md ${isGiven ? 'text-rose-500' : 'text-emerald-500'}`}>
            ₹{transaction.amount.toLocaleString()}
          </p>
          <button 
            onClick={onEdit}
            className="text-[9px] text-indigo-400 font-bold uppercase mt-2 hover:text-indigo-600"
          >
            Fix
          </button>
        </div>
      </div>

      {transaction.history.length > 0 && (
        <div className="mt-3 pt-3 border-t border-slate-300/30">
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Audit Log</p>
          {transaction.history.map((h, i) => (
            <p key={i} className="text-[9px] text-slate-500 italic">
              {formatDate(h.timestamp)}: Was ₹{h.previousValue.toLocaleString()} — "{h.reason}"
            </p>
          ))}
        </div>
      )}
    </div>
  );
};

export default TransactionItem;
