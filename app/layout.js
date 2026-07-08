import "./globals.css";

export const metadata = {
  title: "Portal Dashboard",
  description: "Password-walled read-only dashboard over Baserow.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
