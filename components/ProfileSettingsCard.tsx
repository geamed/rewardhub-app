
import React, { useState, useEffect } from 'react';
import { UserProfile, NotificationType } from '../types';
import UserCircleIcon from './icons/UserCircleIcon';

interface ProfileSettingsCardProps {
  profile: UserProfile;
  onSave: (countryCode: string, postalCode: string) => Promise<boolean>;
  addNotification: (message: string, type: NotificationType) => void;
}

// A representative list of countries. In a real-world app, this would be much more comprehensive.
const COUNTRIES = [
  { code: "", name: "Select a Country..." },
  { code: "US", name: "United States" },
  { code: "CA", name: "Canada" },
  { code: "GB", name: "United Kingdom" },
  { code: "AU", name: "Australia" },
  { code: "DE", name: "Germany" },
  { code: "FR", name: "France" },
  { code: "JP", name: "Japan" },
  { code: "BR", name: "Brazil" },
  { code: "IN", name: "India" },
  { code: "ZA", name: "South Africa" },
];

const ProfileSettingsCard: React.FC<ProfileSettingsCardProps> = ({ profile, onSave, addNotification }) => {
  const [countryCode, setCountryCode] = useState(profile.country_code || '');
  const [postalCode, setPostalCode] = useState(profile.postal_code || '');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setCountryCode(profile.country_code || '');
    setPostalCode(profile.postal_code || '');
  }, [profile]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!countryCode) {
      setError("Please select your country.");
      return;
    }
    if (!postalCode.trim()) {
      setError("Please enter your postal code.");
      return;
    }

    setIsLoading(true);
    const success = await onSave(countryCode, postalCode.trim());
    setIsLoading(false);

    if (success) {
      addNotification("Profile settings saved successfully!", NotificationType.SUCCESS);
    } else {
      addNotification("Failed to save profile settings. Please try again.", NotificationType.ERROR);
      setError("Could not save settings. Please try again later.");
    }
  };

  const isChanged = countryCode !== (profile.country_code || '') || postalCode !== (profile.postal_code || '');

  return (
    <div className="bg-white shadow-lg rounded-xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-slate-700">Profile Settings</h2>
        <UserCircleIcon className="h-8 w-8 text-secondary" />
      </div>
      <p className="text-slate-600 mb-6">
        Providing your location helps us find more relevant surveys for you.
      </p>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="country" className="block text-sm font-medium text-slate-700">
            Country
          </label>
          <select
            id="country"
            value={countryCode}
            onChange={(e) => setCountryCode(e.target.value)}
            required
            className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-slate-300 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm rounded-md"
          >
            {COUNTRIES.map(c => <option key={c.code} value={c.code}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="postalCode" className="block text-sm font-medium text-slate-700">
            Postal Code / ZIP Code
          </label>
          <input
            type="text"
            id="postalCode"
            value={postalCode}
            onChange={(e) => setPostalCode(e.target.value)}
            required
            className="mt-1 w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:ring-primary focus:border-primary sm:text-sm"
            placeholder="e.g., 90210 or A1A 1A1"
          />
        </div>
        {error && <p className="text-xs text-red-500">{error}</p>}
        <button
          type="submit"
          disabled={isLoading || !isChanged}
          className="w-full bg-accent hover:bg-emerald-600 text-white font-semibold py-3 px-4 rounded-lg shadow-md transition-colors duration-300 flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <>
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>Saving...</span>
            </>
          ) : (
            <>
              <UserCircleIcon className="h-5 w-5" />
              <span>Save Profile</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
};

export default ProfileSettingsCard;
