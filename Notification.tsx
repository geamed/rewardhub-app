
import React from 'react';
import { NotificationMessage, NotificationType } from './types';
import XCircleIcon from './components/icons/XCircleIcon'; // Import the dedicated icon

interface NotificationProps {
  notification: NotificationMessage | null;
  onDismiss: (id: string) => void;
}

const CheckCircleIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className || "w-6 h-6"}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
  </svg>
);

const InformationCircleIcon: React.FC<{ className?: string }> = ({ className }) => (
 <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className || "w-6 h-6"}>
  <path strokeLinecap="round" strokeLinejoin="round" d="m11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z" />
</svg>
);


const Notification: React.FC<NotificationProps> = ({ notification, onDismiss }) => {
  if (!notification) return null;

  const baseClasses = "p-4 rounded-lg shadow-xl text-white flex items-center space-x-3 w-full";
  let typeClasses = "";
  let IconComponent;
  let ariaRole: 'alert' | 'status' = 'status';

  switch (notification.type) {
    case NotificationType.SUCCESS:
      typeClasses = "bg-emerald-500";
      IconComponent = CheckCircleIcon;
      ariaRole = 'status';
      break;
    case NotificationType.ERROR:
      typeClasses = "bg-red-500";
      IconComponent = XCircleIcon;
      ariaRole = 'alert';
      break;
    case NotificationType.INFO:
    default:
      typeClasses = "bg-sky-500";
      IconComponent = InformationCircleIcon;
      ariaRole = 'status';
      break;
  }

  return (
    <div className={`${baseClasses} ${typeClasses}`} role={ariaRole}>
      {IconComponent && <IconComponent className="h-6 w-6 flex-shrink-0" />}
      <span className="flex-grow">{notification.message}</span>
      <button
        onClick={() => onDismiss(notification.id)}
        className="ml-auto -mx-1.5 -my-1.5 bg-transparent text-white hover:text-opacity-75 rounded-lg p-1.5 inline-flex h-8 w-8 items-center justify-center focus:ring-2 focus:ring-white"
        aria-label="Dismiss"
      >
        <span className="sr-only">Dismiss</span>
        <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
          <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd"></path>
        </svg>
      </button>
    </div>
  );
};

export default Notification;
