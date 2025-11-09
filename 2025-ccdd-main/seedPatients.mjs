// Seed COMP3820 demo Patients into a FHIR server (HAPI by default).
// Usage: node seedPatients.mjs
// Optional: FHIR_BASE_URL=https://r4.smarthealthit.org node seedPatients.mjs

const BASE_URL = process.env.FHIR_BASE_URL || 'https://hapi.fhir.org/baseR4';
const FHIR_SYSTEMS = {
  URN: 'urn:oid:1.2.36.146.595.217.0.1',
  MEDICARE: 'http://ns.ehealth.gov.au/id/medicare-number'
};

function normalizeIdValue(raw = '') {
  return String(raw)
    .replace(/[\u2010-\u2015\u2212\uFE58\uFE63\uFF0D]/g, '-')
    .replace(/\s+/g, '')
    .trim();
}

async function getFetch() {
  if (typeof fetch === 'function') return fetch; // Node 18+ has global fetch
  const mod = await import('node-fetch');
  return mod.default;
}

function randInt(min, maxInclusive) {
  return Math.floor(Math.random() * (maxInclusive - min + 1)) + min;
}

function mkPatient(i) {
  const givenName = `COMP3820 DemoPatient (${i + 1})`;
  const family = 'Demo';
  const gender = i % 2 === 0 ? 'male' : 'female';
  const year = 1980 + randInt(0, 25);
  const month = String(randInt(1, 12)).padStart(2, '0');
  const day = String(randInt(1, 28)).padStart(2, '0');
  const urnDisplay = `COMP3820-U-${2025 + i}`;
  const urnValue = normalizeIdValue(urnDisplay);
  const medicareRaw = `${randInt(2000, 9999)}${randInt(10000, 99999)}${randInt(1, 9)}`;
  const medicareDisplay = `${medicareRaw.slice(0, 4)} ${medicareRaw.slice(4, 9)} ${medicareRaw.slice(9)}`;
  const medicareValue = normalizeIdValue(medicareRaw);

  return {
    resourceType: 'Patient',
    identifier: [
      { system: FHIR_SYSTEMS.URN, value: urnValue },
      { system: 'URN', value: urnValue },
      { system: FHIR_SYSTEMS.MEDICARE, value: medicareValue },
      { system: 'AUS-MEDICARE', value: medicareValue }
    ],
    name: [{ use: 'official', family, given: [givenName] }],
    gender,
    birthDate: `${year}-${month}-${day}`
  };
}

async function createPatient(fetchImpl, patient, attempt = 1) {
  const res = await fetchImpl(`${BASE_URL}/Patient`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/fhir+json' },
    body: JSON.stringify(patient)
  });

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    if ((res.status === 429 || res.status >= 500) && attempt < 4) {
      const waitMs = 500 * attempt;
      console.warn(`Retry ${attempt} after ${waitMs}ms: ${res.status}`);
      await new Promise(r => setTimeout(r, waitMs));
      return createPatient(fetchImpl, patient, attempt + 1);
    }
    throw new Error(`Create failed (${res.status}): ${body.slice(0,200)}`);
  }

  const json = await res.json();
  return json.id || '(no-id)';
}

(async () => {
  const fetchImpl = await getFetch();
  const total = 10; // how many to create
  console.log(`\nSeeding ${total} COMP3820 DemoPatients to ${BASE_URL} ...\n`);

  let ok = 0, fail = 0;
  for (let i = 0; i < total; i++) {
    const p = mkPatient(i);
    try {
      const id = await createPatient(fetchImpl, p);
      console.log(
        `✅  ${p.name[0].given[0]} | URN=${p.identifier.find(i => i.system === 'URN')?.value} | Medicare=${p.identifier.find(i => i.system === 'AUS-MEDICARE')?.value} | id=${id}`
      );
      ok++;
    } catch (e) {
      console.error(`❌  Failed: ${p.name[0].given[0]} — ${e.message}`);
      fail++;
    }
  }

  console.log(`\nDone. Success=${ok}, Failed=${fail}.`);
  console.log(`Example query: ${BASE_URL}/Patient?identifier=${FHIR_SYSTEMS.URN}|COMP3820-U-2025\n`);
})().catch(err => {
  console.error(err);
  process.exit(1);
});
