import './globals.css';
import Header from '../components/Header';
import { Karla } from 'next/font/google';

const karla = Karla({ 
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-karla'
});

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${karla.variable} font-karla`}>
        <Header />
        <main>{children}</main>
      </body>
    </html>
  );
}
