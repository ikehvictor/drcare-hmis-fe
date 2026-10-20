import { Suspense } from "react";
import { FormBuilderPage } from "@/components/pages/form-builder";

// Form ids can be created in the browser, so the builder renders client-side.
export default function FormPage() {
  return (
    <Suspense>
      <FormBuilderPage />
    </Suspense>
  );
}
