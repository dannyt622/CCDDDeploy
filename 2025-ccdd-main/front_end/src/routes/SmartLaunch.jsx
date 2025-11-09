// src/routes/SmartLaunch.jsx
import { useEffect } from "react";
import { launchSmart } from "../services/fhirClientSmart.js";

export default function SmartLaunch() {
  useEffect(() => {
    launchSmart().catch((e) => {
      console.error("SMART authorize error:", e);
      alert(`SMART authorize error: ${e?.message || e}`);
    });
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h2 className="text-lg font-semibold text-slate-700">Launching SMART Session…</h2>
        <p className="text-sm text-slate-500 mt-2">Redirecting to SMART authorization.</p>
      </div>
    </div>
  );
}