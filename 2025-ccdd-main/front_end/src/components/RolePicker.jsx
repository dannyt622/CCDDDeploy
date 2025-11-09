import { ROLE_OPTIONS } from '../constants/roles.js';

export default function RolePicker({ value, onChange }) {
  return (
    <div className="mt-2">
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 w-full border border-slate-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue bg-white shadow-sm"
      >
        {ROLE_OPTIONS.map((role) => (
          <option key={role.id} value={role.id}>
            {role.label}
          </option>
        ))}
      </select>
    </div>
  );
}
