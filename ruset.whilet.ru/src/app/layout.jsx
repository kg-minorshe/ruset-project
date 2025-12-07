import "@/styles/globals.scss";
export const metadata = {
  title: "RuSet - Российская социальная сеть, сплетенная единством людей",
  description: "RuSet - Российская социальная сеть, сплетенная единством людей",
};
export default function RootLayout({ children }) {
  return (
    <html lang="ru">
      <meta
        name="viewport"
        content="width=device-width, initial-scale=1.0, height=device-height, viewport-fit=cover, user-scalable=no"
      />
      <body>{children}</body>
    </html>
  );
}
