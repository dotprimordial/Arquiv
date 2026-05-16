"use client";

import React from "react";

interface ToastNotificationProps {
  type?: 'success' | 'error' | 'info';
  title: string;
  message: string;
  onClose?: () => void;
}

export default function ToastNotification({
  type = 'success',
  title,
  message,
  onClose
}: ToastNotificationProps) {
  const colors = {
    success: {
      icon: '#22C55E',
      title: 'text-gray-700',
      message: 'text-gray-500'
    },
    error: {
      icon: '#EF4444',
      title: 'text-gray-700',
      message: 'text-gray-500'
    },
    info: {
      icon: '#3B82F6',
      title: 'text-gray-700',
      message: 'text-gray-500'
    }
  };

  const color = colors[type];

  return (
    <div className="bg-white inline-flex space-x-3 p-3 text-sm rounded border border-gray-300/60">
      {type === 'success' && (
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M16.5 8.31V9a7.5 7.5 0 1 1-4.447-6.855M16.5 3 9 10.508l-2.25-2.25" stroke={color.icon} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      )}
      {type === 'error' && (
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M9 15a7.5 7.5 0 1 0 0-15 7.5 7.5 0 0 0 0 15Z" stroke={color.icon} strokeWidth="1.5"/>
          <path d="M9 9v.01M9 12.01v.01" stroke={color.icon} strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
      )}
      {type === 'info' && (
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M9 15a7.5 7.5 0 1 0 0-15 7.5 7.5 0 0 0 0 15Z" stroke={color.icon} strokeWidth="1.5"/>
          <path d="M9 9v.01M9 12.01v.01" stroke={color.icon} strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
      )}
      <div>
        <h3 className={color.title + " font-medium"}>{title}</h3>
        <p className={color.message}>{message}</p>
      </div>
      {onClose && (
        <button type="button" aria-label="close" onClick={onClose} className="inline-flex active:scale-95 transition">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect y="12.532" width="17.498" height="2.1" rx="1.05" transform="rotate(-45.74 0 12.532)" fill="#7d838b" fillOpacity=".7"/>
            <rect x="12.531" y="13.914" width="17.498" height="2.1" rx="1.05" transform="rotate(-135.74 12.531 13.914)" fill="#7d838b" fillOpacity=".7"/>
          </svg>
        </button>
      )}
    </div>
  );
}
