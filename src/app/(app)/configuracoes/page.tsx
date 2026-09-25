import type { Metadata } from "next";
import { SettingsClient } from "@/components/SettingsClient";

export const metadata: Metadata = {
  title: "Ajustes"
};

export default function SettingsPage() {
  return <SettingsClient />;
}
