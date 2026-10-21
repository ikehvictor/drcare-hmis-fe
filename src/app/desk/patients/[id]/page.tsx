import { Suspense } from "react";
import { PatientRecord } from "@/components/pages/patient-record";

// Patient ids are created in the browser, so the record renders client-side.
export default function PatientRecordPage() {
  return (
    <Suspense>
      <PatientRecord />
    </Suspense>
  );
}
