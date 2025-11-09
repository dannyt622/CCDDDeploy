# ABC Medical Company – Allergy History UI

This project is a Tailwind + Vite + React single-page application that recreates the allergy workflow UI shown in the design mocks. It ships with a mock API layer and deterministic client-side interactions so it can be swapped to real services later.

## Getting Started

```bash
npm install
npm run dev
```

Available scripts:

- `npm run dev` – Start the Vite dev server (defaults to port 5173).
- `npm run build` – Production build.
- `npm run preview` – Preview the production build.

## Project Structure

```
src/
  App.jsx                # Router configuration
  main.jsx               # React entry point
  components/            # Layout, data tables, icons, reusable UI
  routes/                # Page-level routes for login/search/history/event/form
  services/              # Mock data and API shim
  utils/                 # Formatting, sorting, filtering helpers
  styles/tailwind.css    # Tailwind entrypoint + shared utilities
```

### Styling & Tokens

Tailwind is configured in `tailwind.config.js` with brand colors and role badges. Update the `role` color tokens to tweak the badges shown in the header and login role picker. Shared input styles live in `src/styles/tailwind.css` under the `.input` utility class.

## Data & Service Layer

The mock data lives in `src/services/mockData.js`. The `src/services/api.js` file exposes asynchronous functions that currently read/write those in-memory objects:

- `fetchPatients({ urn, name, medicareId, gender, sort })`
- `fetchPatientById(id)`
- `fetchSubstances(patientId, { filters, sort })`
- `fetchEvents(substanceId, { filters, sort })`
- `fetchEventById(eventId)`
- `fetchMhrSnapshot(patientId)`
- `createEvent(patientId, payload)`

Each function uses a short artificial delay to simulate network calls and includes comments showing how to replace the bodies with real `fetch('/api/...')` requests. To integrate with a backend, move the mock mutations to your server and return the same JSON shapes.

### Data Models

- **Patient**: `{ id, urn, name, medicareId, gender, dob }`
- **Substance**: `{ id, name, eventsCount, verificationStatus, criticality, lastReportDate }`
- **Event**: `{ id, patientId, seq, substanceId, substanceName, date, treatingDoctor, doctorRole, reactionStartTime, reactionOnsetDescription, clinicalManagement, manifestations[], verificationStatus, criticality, firstOnset, lastOnset, autoInjectorPrescribed, testResults, patientMustAvoid, notes }`
- **MHR Snapshot**: `{ treatingDoctor, treatingDoctorRole, patientMustAvoid, substances: { [name]: { verificationStatus, criticality, firstOnset } } }`

## Known Limitations

- Authentication is mocked; any email/password logs in.
- Sidebar is static and non-interactive (visual only).
- Tables do not include pagination.
- Filter dropdowns close only when selecting a value.
- Mock data is stored in-memory; refreshing the browser resets changes.

## Swapping to Real APIs

Every service helper can be replaced with a fetch call. Example:

```js
export async function fetchPatients(params) {
  const query = new URLSearchParams(params).toString();
  const res = await fetch(`/api/patients?${query}`);
  if (!res.ok) throw new Error('Failed to load patients');
  return res.json();
}
```

Ensure the backend returns the data models listed above so UI bindings continue to work.
