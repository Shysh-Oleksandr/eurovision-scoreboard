import Script from 'next/script';

export const UmamiAnalytics = () => {
  const websiteId = process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID;

  const isDev = process.env.NODE_ENV === 'development';

  if (!websiteId || isDev) {
    return <></>;
  }

  return (
    <Script
      async
      src="https://cloud.umami.is/script.js"
      data-website-id={websiteId}
    />
  );
};
