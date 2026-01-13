
import React from 'react';
import { Customer } from '../types';

interface Props {
  customer: Customer;
  onClick: () => void;
}

const CustomerCard: React.FC<Props> = ({ customer, onClick }) => {
  const isNegative = customer.balance < 0;
  
  // Format date as DD/MM/YYYY
  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };
  
  return (
    <div 
      onClick={onClick}
      className="neumorph-btn p-5 rounded-[30px] flex items-center justify-between cursor-pointer transition-transform active:scale-95"
    >
      <div className="flex items-center space-x-4">
        <div className="neumorph-inset w-12 h-12 rounded-full flex items-center justify-center text-indigo-600 font-black text-lg">
          {customer.avatar ? (
            <img src={customer.avatar} className="w-full h-full rounded-full object-cover" />
          ) : (
            customer.name.charAt(0).toUpperCase()
          )}
        </div>
        <div>
          <h3 className="font-bold text-slate-700">{customer.name}</h3>
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">Updated: {formatDate(customer.lastUpdated)}</p>
        </div>
      </div>
      <div className="text-right">
        <p className={`font-black text-lg ${isNegative ? 'text-emerald-500' : 'text-rose-500'}`}>
          ₹{Math.abs(customer.balance).toLocaleString()}
        </p>
      </div>
    </div>
  );
};

export default CustomerCard;
