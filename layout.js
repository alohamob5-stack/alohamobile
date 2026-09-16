import "./globals.css";
import CookieBaner from "./components/CookieBaner";
import { CartProvider } from "./components/CartContext";
import ConditionalFooter from "./components/ConditionalFooter";
export const metadata = {
  title: "Aloha Mob — Oprema, servis i prodaja telefona | Zrenjanin",
  description: "GSM oprema i servis telefona u Zrenjaninu. Držači, futrole, zaštitna stakla, punjači, kablovi, slušalice — po najboljim cenama, uz servis za popravke istog dana. Plaćanje pouzećem.",
  keywords: [
    "držač za telefon", "drzac za telefon", "drzač za telefon", "držac za telefon",
    "auto držač", "auto drzac", "držač za auto", "nosač telefona", "nosac telefona",
    "držač za vetrobransko staklo", "vakuum držač", "magnetni držač", "gravity držač",
    "air vent držač", "ventilacijski držač", "foneng držač", "foneng drzac",
    "futrola za telefon", "maska za telefon", "case za telefon", "cover za telefon",
    "samsung futrola", "iphone futrola", "xiaomi futrola", "torbica za telefon",
    "zaštitno staklo", "zasstitno staklo", "tempered glass", "kaljeno staklo",
    "5D staklo", "9D staklo", "privacy staklo", "screen protector",
    "punjač za telefon", "punjac za telefon", "brzi punjač", "fast charge",
    "bežični punjač", "bezicni punjac", "wireless punjač", "auto punjač",
    "zidni punjač", "USB punjač", "type-c punjač",
    "kabl za telefon", "usb kabl", "type-c kabl", "lightning kabl",
    "micro usb kabl", "audio kabl", "charging kabl", "data kabl",
    "slušalice za telefon", "bežične slušalice", "tws slušalice",
    "bluetooth slušalice", "earphones", "airpods", "earbud",
    "neckband slušalice", "over ear slušalice",
    "foneng", "baseus", "remax", "hoco", "joyroom", "ugreen",
    "gsm oprema", "gsm pribor", "mobilna oprema", "oprema za mobilni",
    "telefon oprema", "mobilni telefon oprema", "aloha mob", "alohamob",
    "online prodavnica gsm", "gsm shop srbija", "gsm prodavnica",
    "dostava srbija", "plaćanje pouzećem", "pouzeće",
    "servis telefona", "servis mobilnih", "popravka telefona", "zamena stakla",
    "zamena baterije", "servis zrenjanin", "gsm zrenjanin"
  ].join(", "),
  openGraph: {
    title: "Aloha Mob — Oprema, servis i prodaja telefona",
    description: "GSM oprema po najboljim cenama i servis telefona istog dana. Držači, futrole, stakla, punjači, kablovi. Zrenjanin i okolina.",
    url: "https://alohamobile.rs",
    siteName: "Aloha Mob",
    locale: "sr_RS",
    type: "website",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
  icons: {
    icon: '/android-chrome-192x192.png',
  },
};
export default function RootLayout({ children }) {
  return (
    <html lang="sr">
      <body>
        <CookieBaner />
        <CartProvider>
          {children}
          <ConditionalFooter />
        </CartProvider>
      </body>
    </html>
  );
}
