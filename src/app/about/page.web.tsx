import { pageMetadata } from '@/config/seo';
import About from '@/views/About';

export const dynamic = 'force-static';

export const metadata = pageMetadata({
  path: '/about',
  title: 'About DouzePoints',
  description:
    'DouzePoints is a free, fan-made Eurovision scoreboard simulator for the web, iPhone, iPad and Android. What it does with your data, credits and how to get in touch.',
});

export default About;
