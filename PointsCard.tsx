
import React from 'react';
import { POINTS_PER_DOLLAR } from './constants';
import CurrencyDollarIcon from './CurrencyDollarIcon';

interface PointsCardProps {
  points: number;
}

const PointsCard: React.FC<PointsCardProps> = ({ points }) => {
  const usdEquivalent = (points / POINTS_PER_DOLLAR).toFixed(2);

  return (
    <div className="bg-white shadow-lg rounded-xl p-6 transform hover:scale-105 transition-transform duration-300">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-slate-700">Your Balance</h2>
        <CurrencyDollarIcon className="h-8 w-8 text-primary" />
      </div>
      <div className="text-center">
        <p className="text-5xl font-bold text-primary-dark">{points.toLocaleString()}</p>
        <p className="text-slate-500">Points</p>
      </div>
      <div className="mt-4 text-center">
        <p className="text-lg text-slate-600">
          Equivalent to: <span className="font-semibold text-accent">${usdEquivalent} USD</span>
        </p>
      </div>
    </div>
  );
};

export default PointsCard;
