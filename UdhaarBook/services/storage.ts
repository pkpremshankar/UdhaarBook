
import { Customer, Transaction, TransactionType } from '../types';

const STORAGE_KEY = 'trustledger_customers';

export const storage = {
  getCustomers: (): Customer[] => {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  },

  saveCustomer: (customer: Customer): void => {
    const customers = storage.getCustomers();
    const index = customers.findIndex(c => c.id === customer.id);
    if (index >= 0) {
      customers[index] = customer;
    } else {
      // Add new customers to the top of the list
      customers.unshift(customer);
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(customers));
  },

  addTransaction: (customerId: string, transaction: Transaction): void => {
    const customers = storage.getCustomers();
    const customer = customers.find(c => c.id === customerId);
    if (customer) {
      // Add new transactions to the top of the list
      customer.transactions.unshift(transaction);
      customer.balance += (transaction.type === TransactionType.GIVEN ? transaction.amount : -transaction.amount);
      customer.lastUpdated = Date.now();
      
      // Also move the customer to the top of the main list because they were "recently active"
      const customerIndex = customers.findIndex(c => c.id === customerId);
      customers.splice(customerIndex, 1);
      customers.unshift(customer);
      
      localStorage.setItem(STORAGE_KEY, JSON.stringify(customers));
    }
  },

  editTransaction: (customerId: string, transactionId: string, newAmount: number, reason: string): void => {
    const customers = storage.getCustomers();
    const customer = customers.find(c => c.id === customerId);
    if (customer) {
      const tx = customer.transactions.find(t => t.id === transactionId);
      if (tx) {
        const oldAmount = tx.amount;
        tx.history.push({
          timestamp: Date.now(),
          previousValue: oldAmount,
          reason: reason
        });
        tx.amount = newAmount;
        tx.isEdited = true;
        
        // Re-calculate balance from scratch to ensure integrity
        customer.balance = customer.transactions.reduce((acc, curr) => {
          return acc + (curr.type === TransactionType.GIVEN ? curr.amount : -curr.amount);
        }, 0);
        
        customer.lastUpdated = Date.now();
        storage.saveCustomer(customer);
      }
    }
  }
};
