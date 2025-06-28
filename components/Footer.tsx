
import React from 'react';
import { APP_NAME } from '../constants';

const Footer: React.FC = () => {
  return (
    <footer className="bg-slate-200 text-slate-600 py-6 text-center mt-12">
      <div className="container mx-auto px-4">
        <p>&copy; {new Date().getFullYear()} {APP_NAME}. All rights reserved.</p>
        <p className="text-sm mt-1">Points for PayPal - Simple & Rewarding</p>
      </div>
    </footer>
  );
};

export default Footer;
