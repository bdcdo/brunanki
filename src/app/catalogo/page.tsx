import type { Metadata } from "next";
import { CatalogClient } from "@/components/CatalogClient";

export const metadata: Metadata = {
  title: "Bandeiras"
};

export default function CatalogPage() {
  return <CatalogClient />;
}
