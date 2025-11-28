import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from '../utils/authContext';
import TitleUpdater from './_components/titleUpdater';

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  weight: "400",
  fallback: [
    '-apple-system',
    'BlinkMacSystemFont',
    'Segoe UI',
    'Roboto',
    'Oxygen',
    'Ubuntu',
    'Cantarell',
    'Fira Sans',
    'Droid Sans',
    'Helvetica Neue',
    'sans-serif'
  ]
});

export const metadata = {
  icons:{
    icon: [
    { url: "/SFC.ico" },
    ],
  }
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AuthProvider>
          <TitleUpdater />
          {children}
          <TitleUpdater />
        </AuthProvider>
      </body>
    </html>
  );
}
