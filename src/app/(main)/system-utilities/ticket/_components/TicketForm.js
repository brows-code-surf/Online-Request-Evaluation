'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../../../../../utils/authContext';

const STATUS_OPTIONS = [
  { value: 'Open', label: 'Open', color: 'bg-blue-100 text-blue-800' },
  { value: 'In Progress', label: 'In Progress', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'Pending', label: 'Pending', color: 'bg-orange-100 text-orange-800' },
  { value: 'Resolved', label: 'Resolved', color: 'bg-green-100 text-green-800' },
  { value: 'Closed', label: 'Closed', color: 'bg-gray-100 text-gray-800' }
];

const CATEGORY_OPTIONS = [
  'Technical Support',
  'Bug Report',
  'Feature Request',
  'Account Issue',
  'Billing',
  'General Inquiry',
  'Other'
];

export default function TicketForm({
  ticket = null,
  onSubmit,
  onCancel,
  loading = false,
  isEdit = false
}) {
  const { isAdmin, darkMode } = useAuth();
  const [formData, setFormData] = useState({
    subject: '',
    description: '',
    category: '',
    status: 'Open'
  });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (ticket && isEdit) {
      setFormData({
        subject: ticket.subject || '',
        description: ticket.description || '',
        category: ticket.category || '',
        status: ticket.status || 'Open'
      });
    }
  }, [ticket, isEdit]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.subject.trim()) {
      newErrors.subject = 'Subject is required';
    }
    if (!formData.category.trim()) {
      newErrors.category = 'Category is required';
    }
    if (!formData.status.trim()) {
      newErrors.status = 'Status is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    await onSubmit(formData);
  };

  return (
    <div className={`${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} rounded-2xl shadow-lg border overflow-hidden`}>
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-blue-700 px-8 py-6">
        <h2 className="text-2xl font-bold text-white">
          {isEdit ? 'Edit Ticket' : 'Create New Ticket'}
        </h2>
        <p className="text-blue-100 mt-2">
          {isEdit ? 'Update ticket information' : 'Fill in the details to create a new ticket'}
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className={`${darkMode ? 'bg-gray-800' : 'bg-white'} px-8 py-8 space-y-6`}>
        {/* Subject */}
        <div>
          <label htmlFor="subject" className={`block text-sm font-semibold ${darkMode ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
            Subject <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="subject"
            value={formData.subject}
            onChange={(e) => handleInputChange('subject', e.target.value)}
            className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
              errors.subject ? 'border-red-300 bg-red-50' : (darkMode ? 'border-gray-600 bg-gray-700 text-white' : 'border-gray-300')
            }`}
            placeholder="Enter ticket subject"
            disabled={loading}
          />
          {errors.subject && (
            <p className="mt-1 text-sm text-red-600">{errors.subject}</p>
          )}
        </div>

        {/* Category */}
        <div>
          <label htmlFor="category" className={`block text-sm font-semibold ${darkMode ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
            Category <span className="text-red-500">*</span>
          </label>
          <select
            id="category"
            value={formData.category}
            onChange={(e) => handleInputChange('category', e.target.value)}
            className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
              errors.category ? 'border-red-300 bg-red-50' : (darkMode ? 'border-gray-600 bg-gray-700 text-white' : 'border-gray-300')
            }`}
            disabled={loading}
          >
            <option value="">Select a category</option>
            {CATEGORY_OPTIONS.map(category => (
              <option key={category} value={category} className={darkMode ? 'bg-gray-700' : ''}>{category}</option>
            ))}
          </select>
          {errors.category && (
            <p className="mt-1 text-sm text-red-600">{errors.category}</p>
          )}
        </div>

        {/* Description */}
        <div>
          <label htmlFor="description" className={`block text-sm font-semibold ${darkMode ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
            Description (max 500 characters)
          </label>
          <textarea
            id="description"
            value={formData.description}
            onChange={(e) => {
              if (e.target.value.length <= 500) {
                handleInputChange('description', e.target.value);
              }
            }}
            className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
              darkMode ? 'border-gray-600 bg-gray-700 text-white' : 'border-gray-300'
            }`}
            rows={4}
            placeholder="Enter detailed description of the issue..."
            disabled={loading}
            maxLength={500}
          />
          <div className={`text-right text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'} mt-1`}>
            {formData.description.length}/500 characters
          </div>
        </div>

        {/* Status */}
        <div>
          <label htmlFor="status" className={`block text-sm font-semibold ${darkMode ? 'text-gray-300' : 'text-gray-700'} mb-2`}>
            Status <span className="text-red-500">*</span>
            {!isAdmin() && (
              <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'} ml-2`}>(Admin only)</span>
            )}
          </label>
          <select
            id="status"
            value={formData.status}
            onChange={(e) => handleInputChange('status', e.target.value)}
            className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
              errors.status ? 'border-red-300 bg-red-50' : (darkMode ? 'border-gray-600 bg-gray-700 text-white' : 'border-gray-300')
            } ${!isAdmin() ? (darkMode ? 'bg-gray-700 cursor-not-allowed' : 'bg-gray-100 cursor-not-allowed') : ''}`}
            disabled={loading || !isAdmin()}
          >
            {STATUS_OPTIONS.map(status => (
              <option key={status.value} value={status.value} className={darkMode ? 'bg-gray-700' : ''}>
                {status.label}
              </option>
            ))}
          </select>
          {errors.status && (
            <p className="mt-1 text-sm text-red-600">{errors.status}</p>
          )}
          {!isAdmin() && (
            <p className={`mt-1 text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Only administrators can change ticket status.</p>
          )}
        </div>

        {/* Status Preview */}
        {formData.status && (
          <div className={`${darkMode ? 'bg-gray-700' : 'bg-gray-50'} rounded-xl p-4`}>
            <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'} mb-2`}>Status Preview:</p>
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
              STATUS_OPTIONS.find(s => s.value === formData.status)?.color || (darkMode ? 'bg-gray-600 text-white' : 'bg-gray-100 text-gray-800')
            }`}>
              {formData.status}
            </span>
          </div>
        )}

        {/* Buttons */}
        <div className="flex gap-4 pt-4">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className={`flex-1 ${darkMode ? 'bg-gray-600 hover:bg-gray-500 text-white' : 'bg-gray-200 hover:bg-gray-300 text-gray-800'} font-semibold py-3 px-6 rounded-xl transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold py-3 px-6 rounded-xl transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                {isEdit ? 'Updating...' : 'Creating...'}
              </div>
            ) : (
              isEdit ? 'Update Ticket' : 'Create Ticket'
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
