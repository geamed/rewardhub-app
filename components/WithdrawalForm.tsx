
import React, { useState } from 'react';
import { MIN_WITHDRAWAL_POINTS, POINTS_PER_DOLLAR } from '../constants';
import ArrowRightOnRectangleIcon from './icons/ArrowRightOnRectangleIcon';

interface WithdrawalFormProps {
  currentPoints: number;
  onWithdraw: (paypalEmail: string, pointsToWithdraw: number) => void;
  isLoading: boolean;
}

const WithdrawalForm: React.FC<WithdrawalFormProps> = ({ currentPoints, onWithdraw, isLoading }) => {
  const [paypalEmail, setPaypalEmail] = useState('');
  const [pointsToWithdraw, setPointsToWithdraw] = useState<string>(MIN_WITHDRAWAL_POINTS.toString());
  const [emailError, setEmailError] = useState<string | null>(null);
  const [pointsError, setPointsError] = useState<string | null>(null);

  const validateEmail = (email: string): boolean => {
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setEmailError(null);
    setPointsError(null);
    let isValid = true;

    if (!validateEmail(paypalEmail)) {
      setEmailError('Please enter a valid PayPal email address.');
      isValid = false;
    }

    const pointsNum = parseInt(pointsToWithdraw, 10);
    if (isNaN(pointsNum) || pointsNum <= 0) {
      setPointsError('Please enter a valid number of points.');
      isValid = false;
    } else if (pointsNum < MIN_WITHDRAWAL_POINTS) {
      setPointsError(`Minimum withdrawal is ${MIN_WITHDRAWAL_POINTS.toLocaleString()} points ($${(MIN_WITHDRAWAL_POINTS / POINTS_PER_DOLLAR).toFixed(2)}).`);
      isValid = false;
    } else if (pointsNum > currentPoints) {
      setPointsError('You do not have enough points for this withdrawal.');
      isValid = false;
    }

    if (isValid && !isNaN(pointsNum)) {
      onWithdraw(paypalEmail, pointsNum);
      setPaypalEmail(''); // Reset form for user experience, pointsToWithdraw could also be reset or kept
    }
  };
  
  const pointsNum = parseInt(pointsToWithdraw, 10);
  const withdrawalAmountUSD = isNaN(pointsNum) || pointsNum < 0 ? 0 : (pointsNum / POINTS_PER_DOLLAR);


  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label htmlFor="paypalEmail" className="block text-sm font-medium text-slate-700 mb-1">
          PayPal Email Address
        </label>
        <input
          type="email"
          id="paypalEmail"
          value={paypalEmail}
          onChange={(e) => { setPaypalEmail(e.target.value); setEmailError(null); }}
          required
          className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:ring-primary focus:border-primary sm:text-sm"
          placeholder="your.paypal@example.com"
        />
        {emailError && <p className="mt-1 text-xs text-red-500">{emailError}</p>}
      </div>

      <div>
        <label htmlFor="pointsToWithdraw" className="block text-sm font-medium text-slate-700 mb-1">
          Points to Withdraw
        </label>
        <input
          type="number"
          id="pointsToWithdraw"
          value={pointsToWithdraw}
          onChange={(e) => { setPointsToWithdraw(e.target.value); setPointsError(null); }}
          required
          min={MIN_WITHDRAWAL_POINTS}
          max={currentPoints}
          step="1"
          className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:ring-primary focus:border-primary sm:text-sm"
        />
        {pointsError && <p className="mt-1 text-xs text-red-500">{pointsError}</p>}
        <p className="mt-1 text-xs text-slate-500">
          Minimum: {MIN_WITHDRAWAL_POINTS.toLocaleString()} points. Max: {currentPoints.toLocaleString()} points.
        </p>
        {withdrawalAmountUSD > 0 && (
            <p className="mt-1 text-sm text-slate-600 font-medium">
                Withdrawal Amount: ${withdrawalAmountUSD.toFixed(2)} USD
            </p>
        )}
      </div>

      <button
        type="submit"
        disabled={isLoading || currentPoints < MIN_WITHDRAWAL_POINTS}
        className="w-full bg-primary hover:bg-primary-dark text-white font-semibold py-3 px-4 rounded-lg shadow-md transition-colors duration-300 flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoading ? (
          <>
            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span>Processing...</span>
          </>
        ) : (
          <>
            <ArrowRightOnRectangleIcon className="h-5 w-5" />
            <span>Request Withdrawal</span>
          </>
        )}
      </button>
      {currentPoints < MIN_WITHDRAWAL_POINTS && (
        <p className="text-sm text-red-600 text-center mt-2">
          You need at least {MIN_WITHDRAWAL_POINTS.toLocaleString()} points to make a withdrawal. Current balance: {currentPoints.toLocaleString()} points.
        </p>
      )}
    </form>
  );
};

export default WithdrawalForm;
