import { Routes, Route, Navigate } from 'react-router-dom';
import Login from './routes/Login.jsx';
import PatientSearch from './routes/PatientSearch.jsx';
import AllergyHistory from './routes/AllergyHistory.jsx';
import EventReportView from './routes/EventReportView.jsx';
import NewEventForm from './routes/NewEventForm.jsx';
import SmartCallback from './routes/SmartCallback.jsx';
import SmartLaunch from './routes/SmartLaunch.jsx';
import { useAppContext } from './context/AppContext.jsx';

export default function App() {
  const { isAuthenticated } = useAppContext();

  return (
    <Routes>
      <Route path="/" element={<Login />} />
      <Route
        path="/patients"
        element={isAuthenticated ? <PatientSearch /> : <Navigate to="/" replace />}
      />
      <Route
        path="/patients/:patientId/allergies"
        element={isAuthenticated ? <AllergyHistory /> : <Navigate to="/" replace />}
      />
      <Route
        path="/patients/:patientId/new-event"
        element={isAuthenticated ? <NewEventForm /> : <Navigate to="/" replace />}
      />
      <Route
        path="/events/:eventId"
        element={isAuthenticated ? <EventReportView /> : <Navigate to="/" replace />}
      />
      <Route path="/smart-launch" element={<SmartLaunch />} />
      <Route path="/smart-callback" element={<SmartCallback />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
