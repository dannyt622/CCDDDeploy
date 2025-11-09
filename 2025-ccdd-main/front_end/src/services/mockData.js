export const patients = [
  { id: 'p1', urn: '123456', name: 'John Smith', medicareId: '1234 52386 4', gender: 'Male', dob: '1990-01-01' },
  { id: 'p2', urn: '252963', name: 'Jane Doe', medicareId: '6152 52386 4', gender: 'Female', dob: '1990-01-01' },
  { id: 'p3', urn: '345678', name: 'Janet Lee', medicareId: '3456 52386 4', gender: 'Female', dob: '1992-05-20' }
];

export const substancesByPatient = {
  p2: [
    {
      id: 's-milk',
      name: 'Milk (dairy)',
      eventsCount: 5,
      verificationStatus: 'Unconfirmed',
      criticality: 'Low risk',
      lastReportDate: '2025-07-15'
    },
    {
      id: 's-amox',
      name: 'Amoxicillin',
      eventsCount: 4,
      verificationStatus: 'Confirmed',
      criticality: 'High risk',
      lastReportDate: '2025-07-15'
    },
    {
      id: 's-ceph',
      name: 'Cephalexin',
      eventsCount: 2,
      verificationStatus: 'Delabeled',
      criticality: 'Delabeled',
      lastReportDate: '2024-01-15'
    }
  ]
};

export const eventsBySubstance = {
  's-amox': [
    {
      id: 'e4',
      patientId: 'p2',
      seq: 4,
      substanceId: 's-amox',
      substanceName: 'Amoxicillin',
      date: '2025-07-15',
      notes: 'Urticaria, wheeze, cough. Avoid aminopenicillins and aminocaphalosporins.',
      treatingDoctor: 'Dr Janet Hays',
      doctorRole: 'Allergist',
      reactionStartTime: '2025-07-15T10:20:00',
      reactionOnsetDescription: '2h',
      clinicalManagement: 'Administered adrenaline, monitored overnight.',
      manifestations: ['Urticaria', 'Wheeze', 'Cough'],
      verificationStatus: 'Confirmed',
      criticality: 'High risk',
      firstOnset: '2015-07-15T22:20:00',
      lastOnset: '2025-07-15T10:20:00',
      autoInjectorPrescribed: true,
      testResults: 'Skin test: positive to amoxicillin. Serum tryptase elevated.',
      patientMustAvoid: 'Avoid aminopenicillins and aminocaphalosporins.'
    },
    {
      id: 'e3',
      patientId: 'p2',
      seq: 3,
      substanceId: 's-amox',
      substanceName: 'Amoxicillin',
      date: '2025-07-15',
      notes: 'Urticaria, wheeze, cough. Avoid aminopenicillins and aminocaphalosporins.',
      treatingDoctor: 'Dr Sharon Wu',
      doctorRole: 'Emergency Physician',
      reactionStartTime: '2025-05-15T08:45:00',
      reactionOnsetDescription: '1h 35m',
      clinicalManagement: 'Administered antihistamines and steroids. Discharged same day.',
      manifestations: ['Urticaria', 'Cough'],
      verificationStatus: 'Confirmed',
      criticality: 'High risk',
      firstOnset: '2015-07-15T22:20:00',
      lastOnset: '2025-05-15T08:45:00',
      autoInjectorPrescribed: true,
      testResults: 'Skin test: positive to amoxicillin.',
      patientMustAvoid: 'Avoid aminopenicillins and aminocaphalosporins.'
    },
    {
      id: 'e2',
      patientId: 'p2',
      seq: 2,
      substanceId: 's-amox',
      substanceName: 'Amoxicillin',
      date: '2025-05-15',
      notes: 'Urticaria. Avoid all penicillins.',
      treatingDoctor: 'Dr Mark Moawy',
      doctorRole: 'General Practitioner',
      reactionStartTime: '2025-05-15T07:15:00',
      reactionOnsetDescription: '45 min',
      clinicalManagement: 'Prescribed oral antihistamines. Referred to allergist.',
      manifestations: ['Urticaria'],
      verificationStatus: 'Confirmed',
      criticality: 'High risk',
      firstOnset: '2015-07-15T22:20:00',
      lastOnset: '2025-05-15T07:15:00',
      autoInjectorPrescribed: false,
      testResults: 'Not performed at this visit.',
      patientMustAvoid: 'Avoid aminopenicillins and aminocaphalosporins.'
    },
    {
      id: 'e1',
      patientId: 'p2',
      seq: 1,
      substanceId: 's-amox',
      substanceName: 'Amoxicillin',
      date: '2015-07-15',
      notes: 'Urticaria. Avoid all penicillins.',
      treatingDoctor: 'Dr Max Trubiani',
      doctorRole: 'General Practitioner',
      reactionStartTime: '2015-07-15T22:20:00',
      reactionOnsetDescription: '≤1 min',
      clinicalManagement: 'Managed with oral antihistamines. Documented allergy.',
      manifestations: ['Urticaria'],
      verificationStatus: 'Confirmed',
      criticality: 'High risk',
      firstOnset: '2015-07-15T22:20:00',
      lastOnset: '2015-07-15T22:20:00',
      autoInjectorPrescribed: false,
      testResults: 'Not performed.',
      patientMustAvoid: 'Avoid aminopenicillins and aminocaphalosporins.'
    }
  ]
};

export const eventsById = new Map(
  Object.values(eventsBySubstance)
    .flat()
    .map((event) => [event.id, event])
);

export const mhr = {
  p2: {
    treatingDoctor: 'Dr Janet Hays',
    treatingDoctorRole: 'Allergist',
    patientMustAvoid: 'Avoid aminopenicillins and aminocaphalosporins.',
    substances: {
      Amoxicillin: {
        verificationStatus: 'Confirmed',
        criticality: 'High risk',
        firstOnset: '2015-07-15T22:20:00'
      },
      'Milk (dairy)': {
        verificationStatus: 'Unconfirmed',
        criticality: 'Low risk',
        firstOnset: '2024-03-10T10:00:00'
      }
    }
  }
};

export function appendEvent(substanceId, event) {
  if (!eventsBySubstance[substanceId]) {
    eventsBySubstance[substanceId] = [];
  }
  eventsBySubstance[substanceId].unshift(event);
  eventsById.set(event.id, event);
}
