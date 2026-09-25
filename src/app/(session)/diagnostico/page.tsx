import type { Metadata } from "next";
import { DiagnosticSession } from "@/components/DiagnosticSession";

export const metadata: Metadata = {
  title: "Diagnóstico"
};

export default function DiagnosticPage() {
  return <DiagnosticSession />;
}
