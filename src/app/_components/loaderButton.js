'use client';
import React from 'react';

// Simple Tailwind-based spinner SVG
const Spinner = ({ className }) => (
  <svg
    className={`animate-spin h-5 w-5 ${className}`}
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    role="status"
    aria-label="Loading"
  >
    <circle
      className="opacity-25"
      cx="12"
      cy="12"
      r="30"
      stroke="currentColor"
      strokeWidth="4"
    ></circle>
    <path
      className="opacity-75"
      fill="currentColor"
      d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
    ></path>
  </svg>
);

export default function LoaderButton({
  loading = false,
  text = 'Submit',
  className = '',
  ...props
}) {
  return (
    <button
      disabled={loading}
      {...props}
    >
      {loading ? <Spinner className="text-white" /> : text}
    </button>
  );
}
