import { pageMetadata } from '@/config/seo';
import TermsOfUse from '@/views/TermsOfUse';

export const dynamic = 'force-static';

export const metadata = pageMetadata({
  path: '/terms',
  title: 'Terms of Use - DouzePoints',
  description:
    'The terms for using the DouzePoints website and apps: your account, the content you share, what is not allowed, and how reporting and moderation work.',
});

export default TermsOfUse;
