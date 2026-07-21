import "./globals.css";

export const metadata = {
  title: "Momentum — Passenger Operations Reporting",
  description: "Password-walled read-only operations reporting over Baserow.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
