import React from 'react';

interface TheoremReachCardProps {
  onEarnPoints: () => void;
  isLoading: boolean; // Will be true if TheoremReach SDK is not yet initialized
}

const SurveyIcon: React.FC<{className?: string}> = ({className}) => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className || "w-6 h-6"}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L1.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09l2.846.813-.813 2.846a4.5 4.5 0 0 0-3.09 3.09ZM18.25 12h.008v.008h-.008V12Zm0 0h.008v.008h-.008V12Zm0 0h.008v.008h-.008V12Zm0-3.75h.008v.008h-.008v-.008Zm0 7.5h.008v.008h-.008v-.008ZM12.75 18.25h.008v.008h-.008v-.008Z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v18m6-12H6" />
  </svg>
);


const TheoremReachCard: React.FC<TheoremReachCardProps> = ({ onEarnPoints, isLoading }) => {
  return (
    <div className="bg-white shadow-lg rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-slate-700">Earn Points</h2>
        <SurveyIcon className="h-8 w-8 text-secondary" />
      </div>
      <p className="text-slate-600 mb-6">
        Complete surveys and offers through our partner <span className="font-semibold text-primary">TheoremReach</span> to earn points.
      </p>
      <button
        onClick={onEarnPoints}
        disabled={isLoading}
        className="w-full bg-secondary hover:bg-amber-600 text-white font-semibold py-3 px-4 rounded-lg shadow-md transition-colors duration-300 flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
        aria-live="polite" // Announce changes if button text/state changes
      >
        {isLoading ? (
          <>
            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span>Initializing Surveys...</span>
          </>
        ) : (
          <>
            <SurveyIcon className="h-5 w-5" />
            <span>Access TheoremReach Surveys</span>
          </>
        )}
      </button>
      {/* Removed simulation note */}
    </div>
  );
};

export default TheoremReachCard;