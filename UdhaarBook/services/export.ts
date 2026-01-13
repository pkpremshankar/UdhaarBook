
import { Customer } from '../types';

export const exportToCSV = (customers: Customer[]) => {
  if (customers.length === 0) return;

  const headers = [
    'Customer Name',
    'Phone',
    'Total Balance',
    'Transaction Date',
    'Type',
    'Amount',
    'Description',
    'Is Edited',
    'Edit Count'
  ];

  const rows: string[][] = [];

  customers.forEach(customer => {
    // If no transactions, still export the customer info
    if (customer.transactions.length === 0) {
      rows.push([
        `"${customer.name}"`,
        `"${customer.phone}"`,
        customer.balance.toString(),
        'N/A',
        'N/A',
        '0',
        'No transactions',
        'No',
        '0'
      ]);
      return;
    }

    customer.transactions.forEach(tx => {
      rows.push([
        `"${customer.name}"`,
        `"${customer.phone}"`,
        customer.balance.toString(),
        `"${new Date(tx.timestamp).toLocaleString()}"`,
        tx.type,
        tx.amount.toString(),
        `"${tx.description.replace(/"/g, '""')}"`,
        tx.isEdited ? 'Yes' : 'No',
        tx.history.length.toString()
      ]);
    });
  });

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.join(','))
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const date = new Date().toISOString().split('T')[0];
  
  link.setAttribute('href', url);
  link.setAttribute('download', `UdhaarBook_Backup_${date}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
