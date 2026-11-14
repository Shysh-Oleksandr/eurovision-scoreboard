import HomeStructuredData from '@/components/home/HomeStructuredData';
import { IS_NATIVE_APP } from '@/native/platform';

/** The home page's structured data (website only; the page is a client one). */
export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {!IS_NATIVE_APP && <HomeStructuredData />}
      {children}
    </>
  );
}
