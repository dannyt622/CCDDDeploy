## Usability Test Protocol — Allergy & Adverse Reaction Record (FHIR R4)

1. Purpose & Research Questions
- Goal: Evaluate efficiency, ease of use, and error patterns when medical students perform the flow: find patient → view allergy history → enter new event → verify information; collect improvement suggestions.
- Key questions:
  - Can first-time users complete key tasks (success rate, time, errors)?
  - Are information architecture and terms (clinical status, severity, verification status, reaction onset) correctly understood?
  - What are post-task SUS scores and subjective satisfaction? What pain points and learning costs exist?

2. Participants
- Profile: Medical students
- Sample size: 3–5 (sufficient to uncover ~80% of frequent issues)
- Inclusion:
  - Familiar with basic medical terms (allergy, adverse reaction, medication, symptoms)
  - No prior FHIR knowledge required

3. Setting & Equipment
- Environment: Zoom session; 1 participant + 1 moderator + 1 observer
- Devices: Laptop; stable internet; latest Chrome/Edge
- Test build: Frontend (front_end/) local or test domain; backend uses public HAPI FHIR
- Recording: Screen recording + optional audio; paper/electronic log (see appendix)

4. Metrics
- Quantitative:
  - Task success (complete/partial/fail)
  - Task time (seconds)
  - Error count (navigation, term misunderstanding, form input, backtracks)
  - SUS
- Qualitative:
  - Think-aloud: points of confusion
  - Expected features / missing information

5. Flow & Timeline (20–25 min per participant)
1) Welcome & consent (2 min): purpose, process, recording, voluntary exit; consent form
2) Background survey (3 min): year level, weekly system use time, self-rated tech proficiency (1–5), familiarity with allergy workflows (1–5)
3) Core tasks (5–10 min)
4) SUS scale (3 min)
5) Semi-structured interview (5–7 min)
6) Thanks (1 min)

6. Tasks

Task 1 — Create new patient and new allergy event (form) (≈ 12–15 min)
- Moderator script:
  “Please imagine you’re a clinic intake officer who needs to register a new patient and record their allergy information.
  You will do two things:
  1) Create a new patient record in the system;
  2) Add a new allergy event for that patient.
  Patient details:
  Name: Jane Smith
  URN: COMP3820-U-1001
  Date of Birth: 12 March 1998
  Medicare Number: 4489 17123 1
  This morning at 10:00 a.m. she took amoxicillin and developed a skin rash about 30 minutes later. Clinic treatment was to stop the medication.
  Please enter this information and include anything you think is relevant. As you work, speak your thoughts out loud.”

- Success criteria:
  - A new patient record is created and an allergy event is added for that patient
  - Key fields are complete and correctly formatted (e.g., onset time, manifestations, severity, substance/category)
  - Required-field validation passes; submission succeeds; the new event appears in the list with accurate key details
- Logging notes:
  - Clarity of validation, confusing fields, unit/format errors, number of backtracks

Task 2 — Search by Medicare/Name and interpret allergy summary (≈ 7 min)
- Moderator script:
  “Please imagine you’re an intern doctor. A nurse hands you a patient card:
  Name: Demo Patient (1)
  Medicare Number: 4489 17123 1
  Find this patient’s record in the system. Once found, review the allergy summary and report: the substances they’re allergic to, the verification status (confirmed or not), the severity, and the date of the most recent event.”

- Success criteria:
  - Patient details are located within three steps
  - From the overview, at least two key facts are reported (substances, verification status, severity, most recent date)
- Logging notes:
  - Search/filter/sort path; understanding of terms (URN/Medicare/Name; clinical/verification/severity); noticed grouping by substance and event counts

7. Post-session Interview (5–7 min)
- Which step required the most effort? Why?
- Which terms/groupings were uncertain?
- Which form fields are most error-prone/forgotten? How to reduce?
- For teaching in outpatient settings, what explanations or quick guides are needed?
- Top improvements you want (from most to least important)

8. Data Collection & Analysis
- Raw data: Screen recordings, task logs (time/success/errors), SUS forms, interview excerpts
- Quantitative:
  - Success rate and median time
  - Error hotspots (top 3 modules/fields)
  - SUS total + per-item radar (optional)

9. Roles
- Moderator: Run the script, stay neutral, manage time
- Observer/Timer: Record click paths, time, errors, key remarks; do not intervene
- Tech support: Troubleshoot on site; minimize testing impact
