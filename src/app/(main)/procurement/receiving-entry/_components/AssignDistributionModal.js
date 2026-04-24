'use client';

import { useState, useRef, useEffect } from 'react';
import { toast } from 'react-toastify';
import { getDistributionAccounts, saveDistributions, getDistributionsByReferenceNo } from '../_actions';
import ConfirmModal from '@/app/(main)/_components/confirmModal';

function AssignDistributionModal({ isOpen, onClose, darkMode = false, receivingEntry, user }) {
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [distributions, setDistributions] = useState([]);
  const [accountNo, setAccountNo] = useState('');
  const [accountName, setAccountName] = useState('');
  const [accountType, setAccountType] = useState('');
  const [debit, setDebit] = useState('');
  const [credit, setCredit] = useState('');
  const [ewt, setEwt] = useState('');
  const [accounts, setAccounts] = useState([]);
  const [editingDistribution, setEditingDistribution] = useState(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const modalRef = useRef(null);
  const dragRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setDragOffset({ x: 0, y: 0 });
      setDistributions([]);
      setAccountNo('');
      setAccountName('');
      setAccountType('');
      setDebit('');
      setCredit('');
      setEwt('');
      setEditingDistribution(null);

      // Fetch accounts and distributions
      const fetchData = async () => {
        try {
          const [accountsResult, distributionsResult] = await Promise.all([
            getDistributionAccounts(),
            receivingEntry?.header?.referenceNo ? getDistributionsByReferenceNo(receivingEntry.header.referenceNo) : Promise.resolve({ success: true, distributions: [] })
          ]);

          if (accountsResult.success) {
            setAccounts(accountsResult.accounts);
          } else {
            toast.error('Failed to load accounts');
          }

          if (distributionsResult.success) {
            const mappedDistributions = distributionsResult.distributions.map((d, index) => {
              const account = accountsResult.accounts?.find(acc => acc.acctNo === d.acctNo);
              return {
                ...d,
                id: d.id || Date.now() + index,
                accountNo: d.acctNo,
                accountName: account?.acctName || d.acctNo,
                accountType: d.accountType,
                debit: parseFloat(d.debitAmount) || 0,
                credit: parseFloat(d.creditAmount) || 0
              };
            });
            setDistributions(mappedDistributions);
          }
        } catch (error) {
          console.error('Error fetching data:', error);
          toast.error('Failed to load data');
        }
      };

      fetchData();
    }
  }, [isOpen, receivingEntry?.header?.referenceNo]);

  // Responsive positioning
  useEffect(() => {
    const updatePosition = () => {
      if (modalRef.current) {
        const isMobile = window.innerWidth < 1024; // lg breakpoint
        if (isMobile) {
          modalRef.current.style.left = '5%';
          modalRef.current.style.right = '5%';
          modalRef.current.style.top = '55%'; // Below the receiving details
          modalRef.current.style.transform = 'translateY(-50%)';
          modalRef.current.style.maxWidth = '90%';
        } else {
          modalRef.current.style.left = 'auto';
          modalRef.current.style.right = '5%';
          modalRef.current.style.top = '50%';
          modalRef.current.style.transform = 'translateY(-50%)';
          modalRef.current.style.maxWidth = '710px'; // 4xl
        }
      }
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    return () => window.removeEventListener('resize', updatePosition);
  }, [isOpen]);

  const handleMouseDown = (e) => {
    if (!dragRef.current?.contains(e.target)) return;

    setIsDragging(true);
    const rect = modalRef.current.getBoundingClientRect();
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });
  };

  const handleMouseMove = (e) => {
    if (!isDragging || !modalRef.current) return;

    const newX = e.clientX - dragOffset.x;
    const newY = e.clientY - dragOffset.y;

    modalRef.current.style.left = `${newX}px`;
    modalRef.current.style.top = `${newY}px`;
    modalRef.current.style.transform = 'none';
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    } else {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragOffset]);

  const handleAccountNameChange = (e) => {
    const selectedAcctNo = e.target.value;
    setAccountName(selectedAcctNo);

    // Find the account and auto-fill account no
    const selectedAccount = accounts.find(acc => acc.acctNo === selectedAcctNo);
    setAccountNo(selectedAccount ? selectedAccount.acctNo : '');
  };

  const handleAddDistribution = () => {
    if (!accountName || (!debit && !credit)) {
      toast.error('Please fill in account name and either debit or credit amount');
      return;
    }

    const selectedAccount = accounts.find(acc => acc.acctNo === accountName);

    const newDistribution = {
      id: Date.now(),
      accountNo,
      accountName: selectedAccount?.acctName || accountName,
      accountType,
      debit: parseFloat(debit) || 0,
      credit: parseFloat(credit) || 0
    };

    setDistributions(prev => [...prev, newDistribution]);

    // Reset form
    setAccountNo('');
    setAccountName('');
    setAccountType('');
    setDebit('');
    setCredit('');
  };

  const handleEditDistribution = (id) => {
    const distribution = distributions.find(d => d.id === id);
    if (distribution) {
      setEditingDistribution(id);
      setAccountName(distribution.accountNo); // Set to acctNo for the dropdown
      setAccountNo(distribution.accountNo);
      setAccountType(distribution.accountType);
      setDebit(distribution.debit.toString());
      setCredit(distribution.credit.toString());
    }
  };

  const handleUpdateDistribution = () => {
    if (!editingDistribution || !accountName || (!debit && !credit)) {
      toast.error('Please fill in account name and either debit or credit amount');
      return;
    }

    const selectedAccount = accounts.find(acc => acc.acctNo === accountName);

    setDistributions(prev => prev.map(d =>
      d.id === editingDistribution ? {
        ...d,
        accountNo,
        accountName: selectedAccount?.acctName || accountName,
        accountType,
        debit: parseFloat(debit) || 0,
        credit: parseFloat(credit) || 0
      } : d
    ));

    // Reset form
    setEditingDistribution(null);
    setAccountNo('');
    setAccountName('');
    setAccountType('');
    setDebit('');
    setCredit('');
    toast.success('Distribution updated successfully');
  };

  const handleCancelEdit = () => {
    setEditingDistribution(null);
    setAccountNo('');
    setAccountName('');
    setAccountType('');
    setDebit('');
    setCredit('');
  };

  const handleRemoveDistribution = (id) => {
    setDistributions(prev => prev.filter(d => d.id !== id));
  };

  const totalDebit = distributions.reduce((sum, d) => sum + d.debit, 0);
  const totalCredit = distributions.reduce((sum, d) => sum + d.credit, 0);
  const totalExtdAmount = receivingEntry?.details?.reduce((sum, item) => sum + ((item.extdCost || 0) || (item.unitCost || 0) * (item.quantity || 0)), 0) || 0;

  const handleSubmit = () => {
    if (distributions.length === 0) {
      toast.error('Please add at least one distribution');
      return;
    }

    setShowConfirmModal(true);
  };

  const handleConfirmSubmit = async () => {
    try {
      const result = await saveDistributions(
        receivingEntry?.header?.referenceNo,
        distributions,
        ewt,
        user?.empName
      );

      if (result.success) {
        toast.success('Distribution assigned successfully');
        setShowConfirmModal(false);
        onClose();
      } else {
        toast.error(result.message || 'Failed to save distributions');
      }
    } catch (error) {
      console.error('Error saving distributions:', error);
      toast.error('Failed to save distributions');
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/50" />
      <div
        ref={modalRef}
        className={`fixed w-full max-w-4xl overflow-hidden rounded-lg shadow-xl z-50 ${darkMode ? 'bg-gray-800' : 'bg-white'
          }`}
        style={{
          position: 'fixed',
          maxHeight: '90vh'
        }}
      >
        {/* Header */}
        <div
          ref={dragRef}
          className={`flex items-center justify-between p-4 border-b cursor-move ${darkMode ? 'border-gray-600 bg-gray-700' : 'border-gray-200 bg-gray-50'
            }`}
          onMouseDown={handleMouseDown}
        >
          <h2 className={`text-lg font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            Assign Distribution of Account - {receivingEntry?.header?.referenceNo}
          </h2>
          <button
            onClick={onClose}
            className={`p-1 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          <div className="space-y-6">
            {/* Receiving Entry Summary */}
            <div className={`${darkMode ? 'bg-gray-700' : 'bg-gray-50'} p-4 rounded-lg`}>
              <h3 className={`text-sm font-semibold mb-3 ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>
                Receiving Entry Summary
              </h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className={`${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Reference No:</span>
                  <span className={`ml-2 font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    {receivingEntry?.header?.referenceNo}
                  </span>
                </div>
                <div>
                  <span className={`${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Vendor:</span>
                  <span className={`ml-2 font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    {receivingEntry?.header?.vendName}
                  </span>
                </div>
              </div>
            </div>

            {/* Distribution Assignment Form */}
            <div className={`${darkMode ? 'bg-gray-700' : 'bg-gray-50'} p-4 rounded-lg`}>
              <h3 className={`text-sm font-semibold mb-3 ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>
                Add Distribution
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div>
                  <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>
                    Account Name
                  </label>
                  <select
                    value={accountName}
                    onChange={handleAccountNameChange}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${darkMode
                      ? 'bg-gray-600 border-gray-500 text-white'
                      : 'bg-white border-gray-300 text-gray-900'
                      }`}
                  >
                    <option value="">Select Account Name</option>
                    {accounts.map(account => (
                      <option key={account.id} value={account.acctNo}>
                        {account.acctName}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>
                    Account No.
                  </label>
                  <input
                    type="text"
                    value={accountNo}
                    readOnly
                    className={`w-full px-3 py-2 border rounded-md ${darkMode
                      ? 'bg-gray-600 border-gray-500 text-gray-300'
                      : 'bg-gray-100 border-gray-300 text-gray-500'
                      }`}
                    placeholder="Auto-filled"
                  />
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>
                    Account Type
                  </label>
                  <select
                    value={accountType}
                    onChange={(e) => setAccountType(e.target.value)}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${darkMode
                      ? 'bg-gray-600 border-gray-500 text-white'
                      : 'bg-white border-gray-300 text-gray-900'
                      }`}
                  >
                    <option value="">Select Account Type</option>
                    <option value="Purch">Purch</option>
                    <option value="Trade">Trade</option>
                    <option value="Freight">Freight</option>
                    <option value="Misc">Misc</option>
                    <option value="Tax">Tax</option>
                    <option value="Avail">Avail</option>
                    <option value="Pay">Pay</option>
                    <option value="Other">Other</option>
                    <option value="Accrued">Accrued</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>
                    Debit
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={debit}
                    onChange={(e) => setDebit(e.target.value)}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${darkMode
                      ? 'bg-gray-600 border-gray-500 text-white'
                      : 'bg-white border-gray-300 text-gray-900'
                      }`}
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>
                    Credit
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={credit}
                    onChange={(e) => setCredit(e.target.value)}
                    className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${darkMode
                      ? 'bg-gray-600 border-gray-500 text-white'
                      : 'bg-white border-gray-300 text-gray-900'
                      }`}
                    placeholder="0.00"
                  />
                </div>
              </div>

              {editingDistribution ? (
                <div className="flex gap-2">
                  <button
                    onClick={handleUpdateDistribution}
                    className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  >
                    Update Distribution
                  </button>
                  <button
                    onClick={handleCancelEdit}
                    className="flex-1 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-gray-500"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  onClick={handleAddDistribution}
                  className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  Add Distribution
                </button>
              )}
            </div>

            {/* Assigned Distributions */}
            <div className={`${darkMode ? 'bg-gray-700' : 'bg-gray-50'} p-4 rounded-lg`}>
              <h3 className={`text-sm font-semibold mb-3 ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>
                Assigned Distributions
              </h3>
              {distributions.length === 0 ? (
                <div className={`text-center py-8 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  <svg className="w-12 h-12 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <p>No distributions assigned yet</p>
                  <p className="text-xs mt-1">Add distributions above to see them here</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className={`w-full text-sm ${darkMode ? 'text-gray-300' : 'text-gray-900'}`}>
                    <thead className={`${darkMode ? 'bg-gray-600' : 'bg-gray-200'} text-xs uppercase`}>
                      <tr>
                        <th className="px-3 py-2 text-left">Account No.</th>
                        <th className="px-3 py-2 text-left">Account Name</th>
                        <th className="px-3 py-2 text-left">Type</th>
                        <th className="px-3 py-2 text-right">Debit</th>
                        <th className="px-3 py-2 text-right">Credit</th>
                        <th className="px-3 py-2 text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody className={`divide-y ${darkMode ? 'divide-gray-600' : 'divide-gray-200'}`}>
                      {distributions.map((dist) => (
                        <tr key={dist.id} className={`${darkMode ? 'hover:bg-gray-600' : 'hover:bg-gray-100'}`}>
                          <td className="px-3 py-2">{dist.accountNo}</td>
                          <td className="px-3 py-2">{dist.accountName}</td>
                          <td className="px-3 py-2">{dist.accountType}</td>
                          <td className="px-3 py-2 text-right">{dist.debit.toLocaleString('en-US', { style: 'currency', currency: 'PHP' })}</td>
                          <td className="px-3 py-2 text-right">{dist.credit.toLocaleString('en-US', { style: 'currency', currency: 'PHP' })}</td>
                          <td className="px-3 py-2 text-center flex gap-2 justify-center">
                            <button
                              onClick={() => handleEditDistribution(dist.id)}
                              className="text-blue-500 hover:text-blue-700"
                              title="Edit"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                            <button
                              onClick={() => handleRemoveDistribution(dist.id)}
                              className="text-red-500 hover:text-red-700"
                              title="Delete"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Totals and EWT */}
            <div className={`${darkMode ? 'bg-gray-700' : 'bg-gray-50'} p-4 rounded-lg`}>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
                <div>
                  <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>
                    Total Debit
                  </label>
                  <input
                    type="text"
                    value={totalDebit.toLocaleString('en-US', { style: 'currency', currency: 'PHP' })}
                    readOnly
                    className={`w-full px-3 py-2 border rounded-md ${darkMode
                      ? 'bg-gray-600 border-gray-500 text-gray-300'
                      : 'bg-gray-100 border-gray-300 text-gray-500'
                      }`}
                  />
                </div>

                <div>
                  <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>
                    Total Credit
                  </label>
                  <input
                    type="text"
                    value={totalCredit.toLocaleString('en-US', { style: 'currency', currency: 'PHP' })}
                    readOnly
                    className={`w-full px-3 py-2 border rounded-md ${darkMode
                      ? 'bg-gray-600 border-gray-500 text-gray-300'
                      : 'bg-gray-100 border-gray-300 text-gray-500'
                      }`}
                  />
                </div>
              </div>
            </div>

            <div>
              <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>
                Total Extnd Amount
              </label>
              <input
                type="text"
                value={receivingEntry?.details?.reduce((sum, item) => sum + ((item.extdCost || 0) || (item.unitCost || 0) * (item.quantity || 0)), 0).toLocaleString('en-US', { style: 'currency', currency: 'PHP' }) || '₱0.00'}
                readOnly
                className={`w-full px-3 py-2 border rounded-md ${darkMode
                  ? 'bg-gray-600 border-gray-500 text-gray-300'
                  : 'bg-gray-100 border-gray-300 text-gray-500'
                  }`}
              />
            </div>

            <div>
              <label className={`block text-sm font-medium mb-1 ${darkMode ? 'text-gray-200' : 'text-gray-700'}`}>
                EWT
              </label>
              <select
                value={ewt}
                onChange={(e) => setEwt(e.target.value)}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${darkMode
                  ? 'bg-gray-600 border-gray-500 text-white'
                  : 'bg-white border-gray-300 text-gray-900'
                  }`}
              >
                <option value="">Select EWT Option</option>
                <option value="Without EWT">Without EWT</option>
                <option value="With 1% EWT at Gross">With 1% EWT at Gross</option>
                <option value="With 2% EWT at Gross">With 2% EWT at Gross</option>
                <option value="With 1% EWT & 1.12 Vat">With 1% EWT & 1.12 Vat</option>
                <option value="With 2% EWT & 1.12 Vat">With 2% EWT & 1.12 Vat</option>
              </select>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className={`flex items-center justify-end gap-3 p-4 border-t ${darkMode ? 'border-gray-600 bg-gray-700' : 'border-gray-200 bg-gray-50'
          }`}>
          <button
            onClick={onClose}
            className={`px-4 py-2 text-sm font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-gray-500 ${darkMode
              ? 'text-gray-300 hover:bg-gray-600'
              : 'text-gray-700 hover:bg-gray-200'
              }`}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Assign Distribution
          </button>
        </div>
      </div >

      <ConfirmModal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        onConfirm={handleConfirmSubmit}
        title="Assign Distribution"
        message={`Are you sure you want to assign ${distributions.length} distribution(s) for receiving entry ${receivingEntry?.header?.referenceNo}? This will save the distributions to the database.`}
        confirmText="Assign"
        confirmVariant="blue"
      />
    </>
  );
}

export default AssignDistributionModal;