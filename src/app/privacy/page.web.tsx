import { pageMetadata } from '@/config/seo';
import PrivacyPolicy from '@/views/PrivacyPolicy';

export const dynamic = 'force-static';

export const metadata = pageMetadata({
  path: '/privacy',
  title: 'Privacy Policy - DouzePoints',
  description:
    'What DouzePoints collects on the website and in the iOS and Android apps, how it is used and shared, how long it is kept and how to delete your account.',
});

export default PrivacyPolicy;
