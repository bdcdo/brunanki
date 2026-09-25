import type { Metadata } from "next";
import { StudySession } from "@/components/StudySession";

export const metadata: Metadata = {
  title: "Estudar"
};

export default function StudyPage() {
  return <StudySession />;
}
