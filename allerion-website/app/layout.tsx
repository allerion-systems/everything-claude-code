import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Allerion LLC — Plan Your Trip",
  description:
    "Allerion LLC designs and coordinates seamless travel. Tell us where you want to go and we connect every detail of the trip.",
  openGraph: {
    title: "Allerion LLC — Plan Your Trip",
    description:
      "Bespoke travel planning and coordination from Allerion LLC. Connect into your next trip.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
