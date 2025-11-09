# 🧬 COMP3820 — Allergy & Adverse Reaction Record (FHIR-compliant Web App)

This web app manages allergy and adverse reaction records against a FHIR server (R4).  
It reads and writes `Patient` and `AllergyIntolerance` resources.  
By default, it connects to the **public HAPI FHIR** instance.

---

## 0) Requirements

| Tool | Version |
|------|---------|
| Node.js | 18+ (20 recommended) |
| npm | 9+ |

---

## 1) Install

```bash
git clone https://github.com/comp3820/2025-ccdd.git
cd 2025-ccdd/front_end
npm install
```

---

## 2) FHIR Base URL

The app connects to the public HAPI server defined in `front_end/src/services/fhirClient.js`:

```js
export const BASE_URL = 'https://hapi.fhir.org/baseR4';
```

No additional setup is required.

> **Note:** The public HAPI server occasionally delays indexing — new records may take a few seconds to appear in the search results.

---

## 3) Seeding Demo Data (with `seedPatients.mjs`)

Use the provided Node script to create demo Patients and AllergyIntolerance entries with reactions.

**File:** `front_end/scripts/seedPatients.mjs`

### Run
```bash
cd front_end
node scripts/seedPatients.mjs
```

You should see created resource IDs, e.g. `Patient/xxxxx`, `AllergyIntolerance/yyyyy`.

Verify in browser:  
🔗 https://hapi.fhir.org/baseR4  
Search: `Patient?name=Demo`

---

## 4) Start the Frontend

```bash
cd 2025-ccdd/front_end
npm run dev
```

Then open the URL shown in the terminal (usually http://localhost:5173).

---

## 5) Quick Verification Flow

1. **Search patient** → find seeded “Demo Patient”.
2. **View allergies** → grouped by substance name; `#Event` shows total reactions.
3. **Expand reactions** → see `#1`, `#2`, …
4. **Open Event Details** → shows Clinical Management, Test Results, Must Avoid, Auto-Injector, Treating Doctor (role), and Initial Exposure.
5. **Add New Report** → appends a new `reaction[]` to the same `AllergyIntolerance` (no duplicate row).

---

## 6) Troubleshooting

- **Event not found:** Historic links using `#1` fragments are now supported — the app reads `window.location.hash` and converts to `~1` automatically. Refresh if needed.  
- **Invalid date/time:** The app emits `YYYY-MM-DDTHH:mm:SS±HH:MM` with local offset. If modified, ensure both seconds and offset are included.  
- **New data not visible:** Public HAPI search indexing can lag a few seconds; direct `GET /Resource/{id}` returns immediately.  
- **Duplicate allergy rows:** The system groups by substance name and merges counts; ensure consistent `code.text`.

---

## 7) Notes for Assessors

- ✅ FHIR R4-compliant reads/writes for `Patient` and `AllergyIntolerance`  
- ✅ Local timezone offsets preserved in all DateTime fields  
- ✅ Public HAPI server fully supported  
- ✅ Grouped allergy list with reaction roll-ups and detailed event view  
- ✅ Seamless data creation when non-existent URN is searched — automatically creates new Patient and AllergyIntolerance resources  

---

## 8) Deployed Links:

- Our website was deployed using Vercel
- Here are the link to directly using our Applications
- 🔗 https://ccdd-jn4z52lq9-comp3820ccdd.vercel.app/#
---

## 👥 Team Contributions

| Member | Contribution Summary |
|---------|----------------------|
| **Ho Yin Tong** | Communicated with mentor, scheduled and led meetings, gathered requirements, and restructured the backend logic to better comply with FHIR standards (including `Patient` and `AllergyIntolerance` resource profiles). Implemented the main data flow between frontend and HAPI server, and handled bug fixes related to FHIR compatibility. |
| **Yuteng Niu** | Designed the full set of UI wireframes and Figma prototypes, including patient search, allergy list, and reaction detail layouts. Ensured that the interface met clinical workflow expectations and supported responsive, accessible design. |
| **Liwen Ai** | Implemented the React + Vite frontend based on the Figma designs. Developed core components (Search Bar, Data Tables, Detail Views) and integrated styling using Tailwind. Assisted in connecting the frontend with the FHIR service layer. |
| **Xiaoyu Ma** | Originally developed an integration to retrieve patient data from **Meld**, later migrated to Ho Yin’s FHIR-based implementation. Built the evaluation portal for usability testing and deployed the final web app to **Vercel** for demonstration and testing purposes. |
