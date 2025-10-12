import React from 'react';

import { ArrowIcon } from '@/assets/icons/ArrowIcon';

const About = () => {
  return (
    <div className="bg-gradient-to-br from-primary-950 text-white via-primary-900 to-primary-800 h-full overflow-y-auto">
      <div className="mx-auto px-4 py-8 max-w-4xl">
        <div className="bg-primary-800/50 backdrop-blur-sm rounded-2xl border border-primary-700/50 shadow-2xl overflow-hidden">
          <header className="bg-gradient-to-br from-primary-700/40 to-primary-800/60 px-8 py-6 border-b border-primary-700/30">
            <a
              href="/"
              className="text-primary-200 hover:text-white text-base mb-4 inline-flex items-center gap-2 bg-primary-900/40 hover:bg-primary-900/60 rounded-lg px-3 py-2 transition-all duration-200 border border-primary-700/30"
            >
              <ArrowIcon className="w-5 h-5 rotate-180" />
              Back
            </a>
            <h1 className="text-4xl font-bold text-white mt-4">About</h1>
          </header>

          <div className="px-8 py-8">
            <div className="prose prose-invert prose-lg max-w-none">
              <section className="mb-8">
                <h2 className="text-2xl font-bold text-white mb-6 border-b border-primary-700/40 pb-3">
                  Google OAuth2 Homepage
                </h2>

                <h3 className="text-xl font-semibold text-white mb-3 mt-6">
                  Accurately represents your app's identity
                </h3>
                <p className="text-primary-200 leading-relaxed mb-6">
                  DouzePoints – Eurovision Scoreboard Simulator is an app where
                  you can simulate Eurovision voting, assign points, and view
                  results — just like the real contest. DouzePoints is a web
                  application that brings the excitement of Eurovision to your
                  browser.
                </p>

                <h3 className="text-xl font-semibold text-white mb-3 mt-6">
                  What will this app do with user data?
                </h3>
                <p className="text-primary-200 leading-relaxed mb-4">
                  The only user data received is: name, email and profile
                  picture. These will be saved and re-displayed to the user. The
                  email will be used to identify the user. The name and profile
                  picture will be used as the name and profile picture of your
                  account on DouzePoints.
                </p>

                <h3 className="text-xl font-semibold text-white mb-3 mt-6">
                  How does this app enhance user functionality?
                </h3>
                <p className="text-primary-200 leading-relaxed mb-6">
                  This app allows you to create and manage Eurovision scoreboard
                  simulations. You can save your voting results, track your
                  favorite countries' performance, and share your simulations
                  with friends. The app provides an authentic Eurovision voting
                  experience with real-time scoreboard updates.
                </p>

                <h3 className="text-xl font-semibold text-white mb-3 mt-6">
                  Link to Privacy Policy
                </h3>
                <p className="text-primary-200 leading-relaxed mb-6">
                  <a
                    href="/privacy"
                    className="text-primary-300 hover:text-white underline transition-colors"
                  >
                    Click here.
                  </a>
                </p>

                <h3 className="text-xl font-semibold text-white mb-3 mt-6">
                  Describe the content, context, or connection to the app
                </h3>
                <p className="text-primary-200 leading-relaxed mb-6">
                  DouzePoints is a web application that simulates the Eurovision
                  Song Contest voting system. The intention is to provide
                  entertainment and education about Eurovision voting mechanics
                  while allowing users to create their own scoreboard
                  simulations.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-bold text-white mb-6 border-b border-primary-700/40 pb-3">
                  Google OAuth2 Limited Use Disclosure
                </h2>
                <p className="text-primary-200 leading-relaxed mb-6">
                  This app doesn't request restricted scopes, but if it did,
                  DouzePoints's use of information received from Google APIs
                  will adhere to the Google API Services User Data Policy,
                  including the Limited Use requirements.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-bold text-white mb-6 border-b border-primary-700/40 pb-3">
                  Copyright
                </h2>
                <p className="text-primary-200 leading-relaxed mb-6">
                  If you have a copyright complaint, please contact us and
                  include the DouzePoints page that contains the alleged
                  content, identification of the work claimed to have been
                  infringed including the name and reply email address of the
                  copyright holder/representative, an assertion that the use of
                  the material is not authorized and an assertion that you are
                  the copyright holder/representative.
                </p>
              </section>

              <section className="mb-8">
                <h2 className="text-2xl font-bold text-white mb-6 border-b border-primary-700/40 pb-3">
                  Let's Connect
                </h2>
                <p className="text-primary-200 leading-relaxed mb-6">
                  Have questions or feedback about DouzePoints? We'd love to
                  hear from you! Contact us at{' '}
                  <a
                    href="mailto:sasha.shysh23@gmail.com"
                    className="text-primary-300 hover:text-white underline transition-colors"
                  >
                    sasha.shysh23@gmail.com
                  </a>
                </p>
              </section>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default About;
