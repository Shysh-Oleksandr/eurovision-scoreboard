import 'react';

/**
 * `<Activity>` ships in the React canary that Next.js bundles for the App
 * Router, but @types/react 19.1 doesn't declare it yet. Delete this file once
 * @types/react is 19.2 or later. (Vitest runs the plain react package, which
 * has no Activity: keep it out of components that tests render.)
 */
declare module 'react' {
  interface ActivityProps {
    mode?: 'hidden' | 'visible';
    name?: string;
    children?: ReactNode;
  }

  export const Activity: ExoticComponent<ActivityProps>;
}
