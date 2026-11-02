import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "QARJY CONTROL · Value Gate",
  description: "Сатып алу қажеттілігін дәлелмен тексеру",
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="kk">
      <body>{children}</body>
    </html>
  );
}
