import { useState } from 'react';
import { PASSWORD_RULES } from '@nomnom/shared';

interface PasswordInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  autoComplete?: string;
}

export default function PasswordInput({ value, onChange, placeholder = 'Password', autoComplete = 'new-password' }: PasswordInputProps) {
  const [showRules, setShowRules] = useState(false);

  return (
    <div>
      <input
        type="password"
        placeholder={placeholder}
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          if (!showRules && e.target.value.length > 0) setShowRules(true);
        }}
        onFocus={() => { if (value.length > 0) setShowRules(true); }}
        className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-accent-400"
        autoComplete={autoComplete}
        required
      />
      {showRules && value.length > 0 && (
        <ul className="mt-1.5 ml-1 space-y-0.5">
          {PASSWORD_RULES.map((rule) => {
            const pass = rule.test(value);
            return (
              <li key={rule.label} className={`text-xs flex items-center gap-1.5 ${pass ? 'text-green-500' : 'text-gray-400'}`}>
                <span>{pass ? '\u2713' : '\u2717'}</span>
                <span>{rule.label}</span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
