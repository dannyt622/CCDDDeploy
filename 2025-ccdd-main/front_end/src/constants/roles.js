export const ROLE_OPTIONS = [
  { id: 'gp', label: 'Allergist' },
  { id: 'general-practitioner', label: 'General Practitioner' },
  { id: 'emergency-physician', label: 'Emergency Physician' },
  { id: 'allergy-specialist', label: 'Specialist' }
];

export const DEFAULT_ROLE = ROLE_OPTIONS[0].id;

export function getRoleLabel(roleId) {
  const match = ROLE_OPTIONS.find((role) => role.id === roleId);
  return match ? match.label : roleId;
}
