import FHIR from 'fhirclient';

/**
 * Launch the SMART on FHIR authorization flow (public client + PKCE).
 * The SMART Sandbox accepts any string clientId and does not require a secret.
 */
// 用 Launcher 畀你呢條 sim FHIR base（你貼嗰條）：
export const SMART_ISS =
  "https://launch.smarthealthit.org/v/r4/sim/WzIsIiIsIiIsIkFVVE8iLDAsMCwwLCJsYXVuY2ggb3BlbmlkIGZoaXJVc2VyIHVzZXIvKi4qIiwiIiwiY29tcDM4MjAtYWxsZXJneS1kZW1vIiwiIiwiIiwiIiwiIiwwLDIsIiJd/fhir";

export function launchSmart() {
  return FHIR.oauth2.authorize({
    clientId: "comp3820-allergy-demo",                 // 要同 Launcher 上面一致
    scope: "openid fhirUser user/*.*",                  // 不要含 launch/patient
    redirectUri: `${window.location.origin}/smart-callback`,
    iss: SMART_ISS                                      // 用上面個 sim FHIR base
    // （亦可用 serverUrl: SMART_ISS，二揀一）
  });
}

/**
 * Resolve the SMART client after the OAuth redirect completes.
 * Returns a fhirclient client instance containing serverUrl and token info.
 */
export async function smartReady() {
  return FHIR.oauth2.ready();
}

/** Get the launched patient id (if launch/patient scope present). */
export async function getSmartPatientId() {
  const client = await smartReady();
  return client.getPatientId();
}

/** Fetch the current Practitioner profile referenced by fhirUser, if any. */
export async function getPractitionerProfile() {
  const client = await smartReady();
  const fhirUser = client.getIdToken()?.profile?.fhirUser;
  if (!fhirUser || !fhirUser.startsWith('Practitioner/')) {
    return null;
  }
  return client.request(fhirUser);
}
