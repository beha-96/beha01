import React, { useEffect, useState } from 'react';
import { Notification } from '../types';
import { Bell, CheckCircle, Info, AlertTriangle, X } from 'lucide-react';

interface NotificationToastProps {
  notification: Notification;
  onClose: () => void;
}

export const NotificationToast: React.FC<NotificationToastProps> = ({ notification, onClose }) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Slight delay for animation entry
    const timer = setTimeout(() => setVisible(true), 10);
    // Auto close after 5 seconds
    const autoClose = setTimeout(() => {
        setVisible(false);
        setTimeout(onClose, 300); // Wait for exit animation
    }, 5000);

    return () => {
      clearTimeout(timer);
      clearTimeout(autoClose);
    };
  }, [onClose]);

  const getIcon = () => {
    switch (notification.type) {
      case 'ORDER': return <Bell className="text-blue-500" />;
      case 'STATUS': return <CheckCircle className="text-green-500" />;
      case 'ALERT': return <AlertTriangle className="text-red-500" />;
      default: return <Info className="text-gray-500" />;
    }
  };

  const getBgColor = () => {
      switch (notification.type) {
        case 'ORDER': return 'bg-blue-50 border-blue-200';
        case 'STATUS': return 'bg-green-50 border-green-200';
        case 'ALERT': return 'bg-red-50 border-red-200';
        default: return 'bg-white border-gray-200';
      }
  };

  return (
    <div 
      className={`
        fixed top-4 right-4 z-[100] w-80 md:w-96 p-4 rounded-xl shadow-2xl border flex gap-3 items-start transition-all duration-500 transform
        ${visible ? 'translate-y-0 opacity-100' : '-translate-y-4 opacity-0'}
        ${getBgColor()}
      `}
    >
      <div className="flex-shrink-0 mt-0.5 bg-white p-2 rounded-full shadow-sm">
        {getIcon()}
      </div>
      <div className="flex-grow">
        <h4 className="font-bold text-gray-900 text-sm">{notification.title}</h4>
        <p className="text-xs text-gray-600 mt-1 leading-snug">{notification.message}</p>
        <div className="text-[10px] text-gray-400 mt-2">{new Date(notification.createdAt).toLocaleTimeString()}</div>
      </div>
      <button onClick={() => { setVisible(false); setTimeout(onClose, 300); }} className="text-gray-400 hover:text-gray-600">
        <X size={16} />
      </button>
    </div>
  );
};