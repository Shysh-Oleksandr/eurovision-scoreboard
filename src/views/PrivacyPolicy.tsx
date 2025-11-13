import React from 'react';

import Link from 'next/link';

import { ArrowIcon } from '@/assets/icons/ArrowIcon';

const PrivacyPolicy = () => {
  return (
    <div className="bg-gradient-to-br text-white from-primary-950 via-primary-900 to-primary-800 h-full overflow-y-auto">
      <div className="mx-auto px-4 py-8 max-w-4xl">
        <div className="bg-primary-800/50 backdrop-blur-sm rounded-2xl border border-primary-700/50 shadow-2xl overflow-hidden">
          <header className="bg-gradient-to-br from-primary-700/40 to-primary-800/60 px-8 py-6 border-b border-primary-700/30">
            <Link
              href="/"
              className="text-primary-200 hover:text-white text-base mb-4 inline-flex items-center gap-2 bg-primary-900/40 hover:bg-primary-900/60 rounded-lg px-3 py-2 transition-all duration-200 border border-primary-700/30"
            >
              <ArrowIcon className="w-5 h-5 rotate-180" />
              Back
            </Link>
            <h1 className="text-4xl font-bold text-white mt-4 mb-3">
              Privacy Policy
            </h1>
            <p className="text-primary-300 text-base">
              Last updated: October 05, 2025
            </p>
          </header>

          <div className="px-8 py-8">
            <div className="prose prose-invert prose-lg max-w-none">
              <p className="text-primary-200 leading-relaxed mb-6">
                This Privacy Policy describes Our policies and procedures on the
                collection, use and disclosure of Your information when You use
                the Service and tells You about Your privacy rights and how the
                law protects You.
              </p>
              <p className="text-primary-200 leading-relaxed mb-6">
                We use Your Personal data to provide and improve the Service. By
                using the Service, You agree to the collection and use of
                information in accordance with this Privacy Policy.
              </p>
            </div>
            <section className="mb-8">
              <h2 className="text-2xl font-bold text-white mb-6 border-b border-primary-700/40 pb-3">
                Interpretation and Definitions
              </h2>

              <h3 className="text-xl font-semibold text-white mb-3 mt-6">
                Interpretation
              </h3>
              <p className="text-primary-200 leading-relaxed mb-4">
                The words whose initial letters are capitalized have meanings
                defined under the following conditions. The following
                definitions shall have the same meaning regardless of whether
                they appear in singular or in plural.
              </p>

              <h3 className="text-xl font-semibold text-white mb-3 mt-6">
                Definitions
              </h3>
              <p className="text-primary-200 leading-relaxed mb-4">
                For the purposes of this Privacy Policy:
              </p>
              <ul className="space-y-3">
                <li className="bg-primary-900/40 rounded-lg p-4 border border-primary-700/30">
                  <p className="text-primary-200 leading-relaxed">
                    <strong className="text-white font-semibold">
                      Account
                    </strong>{' '}
                    means a unique account created for You to access our Service
                    or parts of our Service.
                  </p>
                </li>
                <li className="bg-primary-900/40 rounded-lg p-4 border border-primary-700/30">
                  <p className="text-primary-200 leading-relaxed">
                    <strong className="text-white font-semibold">
                      Affiliate
                    </strong>{' '}
                    means an entity that controls, is controlled by, or is under
                    common control with a party, where &quot;control&quot; means
                    ownership of 50% or more of the shares, equity interest or
                    other securities entitled to vote for election of directors
                    or other managing authority.
                  </p>
                </li>
                <li className="bg-primary-900/40 rounded-lg p-4 border border-primary-700/30">
                  <p className="text-primary-200 leading-relaxed">
                    <strong className="text-white font-semibold">
                      Company
                    </strong>{' '}
                    (referred to as either &quot;the Company&quot;,
                    &quot;We&quot;, &quot;Us&quot; or &quot;Our&quot; in this
                    Agreement) refers to DouzePoints.app.
                  </p>
                </li>
                <li className="bg-primary-900/40 rounded-lg p-4 border border-primary-700/30">
                  <p className="text-primary-200 leading-relaxed">
                    <strong className="text-white font-semibold">
                      Cookies
                    </strong>{' '}
                    are small files that are placed on Your computer, mobile
                    device or any other device by a website, containing the
                    details of Your browsing history on that website among its
                    many uses.
                  </p>
                </li>
                <li className="bg-primary-900/40 rounded-lg p-4 border border-primary-700/30">
                  <p className="text-primary-200 leading-relaxed">
                    <strong className="text-white font-semibold">
                      Country
                    </strong>{' '}
                    refers to: Ukraine
                  </p>
                </li>
                <li className="bg-primary-900/40 rounded-lg p-4 border border-primary-700/30">
                  <p className="text-primary-200 leading-relaxed">
                    <strong className="text-white font-semibold">Device</strong>{' '}
                    means any device that can access the Service such as a
                    computer, a cell phone or a digital tablet.
                  </p>
                </li>
                <li className="bg-primary-900/40 rounded-lg p-4 border border-primary-700/30">
                  <p className="text-primary-200 leading-relaxed">
                    <strong className="text-white font-semibold">
                      Personal Data
                    </strong>{' '}
                    is any information that relates to an identified or
                    identifiable individual.
                  </p>
                </li>
                <li className="bg-primary-900/40 rounded-lg p-4 border border-primary-700/30">
                  <p className="text-primary-200 leading-relaxed">
                    <strong className="text-white font-semibold">
                      Service
                    </strong>{' '}
                    refers to the Website.
                  </p>
                </li>
                <li className="bg-primary-900/40 rounded-lg p-4 border border-primary-700/30">
                  <p className="text-primary-200 leading-relaxed">
                    <strong className="text-white font-semibold">
                      Service Provider
                    </strong>{' '}
                    means any natural or legal person who processes the data on
                    behalf of the Company. It refers to third-party companies or
                    individuals employed by the Company to facilitate the
                    Service, to provide the Service on behalf of the Company, to
                    perform services related to the Service or to assist the
                    Company in analyzing how the Service is used.
                  </p>
                </li>
                <li className="bg-primary-900/40 rounded-lg p-4 border border-primary-700/30">
                  <p className="text-primary-200 leading-relaxed">
                    <strong className="text-white font-semibold">
                      Usage Data
                    </strong>{' '}
                    refers to data collected automatically, either generated by
                    the use of the Service or from the Service infrastructure
                    itself (for example, the duration of a page visit).
                  </p>
                </li>
                <li className="bg-primary-900/40 rounded-lg p-4 border border-primary-700/30">
                  <p className="text-primary-200 leading-relaxed">
                    <strong className="text-white font-semibold">
                      Website
                    </strong>{' '}
                    refers to DouzePoints.app, accessible from{' '}
                    <a
                      href="https://douzepoints.app"
                      rel="external nofollow noopener noreferrer"
                      target="_blank"
                      className="text-primary-300 hover:text-white underline transition-colors"
                    >
                      https://douzepoints.app
                    </a>
                  </p>
                </li>
                <li className="bg-primary-900/40 rounded-lg p-4 border border-primary-700/30">
                  <p className="text-primary-200 leading-relaxed">
                    <strong className="text-white font-semibold">You</strong>{' '}
                    means the individual accessing or using the Service, or the
                    company, or other legal entity on behalf of which such
                    individual is accessing or using the Service, as applicable.
                  </p>
                </li>
              </ul>
            </section>
            <section className="mb-8">
              <h2 className="text-2xl font-bold text-white mb-6 border-b border-primary-700/40 pb-3">
                Collecting and Using Your Personal Data
              </h2>

              <h3 className="text-xl font-semibold text-white mb-3 mt-6">
                Types of Data Collected
              </h3>

              <h4 className="text-lg font-semibold text-white mb-2 mt-4">
                Personal Data
              </h4>
              <p className="text-primary-200 leading-relaxed mb-4">
                While using Our Service, We may ask You to provide Us with
                certain personally identifiable information that can be used to
                contact or identify You. Personally identifiable information may
                include, but is not limited to:
              </p>
              <ul className="list-disc list-inside space-y-2 mb-6 text-primary-200">
                <li>Email address</li>
                <li>First name and last name</li>
                <li>Usage Data</li>
              </ul>

              <h4 className="text-lg font-semibold text-white mb-2 mt-4">
                Usage Data
              </h4>
              <p className="text-primary-200 leading-relaxed mb-4">
                Usage Data is collected automatically when using the Service.
              </p>
              <p className="text-primary-200 leading-relaxed mb-4">
                Usage Data may include information such as Your Device's
                Internet Protocol address (e.g. IP address), browser type,
                browser version, the pages of our Service that You visit, the
                time and date of Your visit, the time spent on those pages,
                unique device identifiers and other diagnostic data.
              </p>
              <p className="text-primary-200 leading-relaxed mb-4">
                When You access the Service by or through a mobile device, We
                may collect certain information automatically, including, but
                not limited to, the type of mobile device You use, Your mobile
                device's unique ID, the IP address of Your mobile device, Your
                mobile operating system, the type of mobile Internet browser You
                use, unique device identifiers and other diagnostic data.
              </p>
              <p className="text-primary-200 leading-relaxed mb-6">
                We may also collect information that Your browser sends whenever
                You visit Our Service or when You access the Service by or
                through a mobile device.
              </p>
            </section>
            <section className="mb-8">
              <h4 className="text-lg font-semibold text-white mb-2 mt-4">
                Tracking Technologies and Cookies
              </h4>
              <p className="text-primary-200 leading-relaxed mb-4">
                We use Cookies and similar tracking technologies to track the
                activity on Our Service and store certain information. Tracking
                technologies We use include beacons, tags, and scripts to
                collect and track information and to improve and analyze Our
                Service. The technologies We use may include:
              </p>
              <ul className="space-y-3 mb-6">
                <li className="bg-primary-900/40 rounded-lg p-4 border border-primary-700/30">
                  <p className="text-primary-200 leading-relaxed">
                    <strong className="text-white font-semibold">
                      Cookies or Browser Cookies.
                    </strong>{' '}
                    A cookie is a small file placed on Your Device. You can
                    instruct Your browser to refuse all Cookies or to indicate
                    when a Cookie is being sent. However, if You do not accept
                    Cookies, You may not be able to use some parts of our
                    Service. Unless you have adjusted Your browser setting so
                    that it will refuse Cookies, our Service may use Cookies.
                  </p>
                </li>
                <li className="bg-primary-900/40 rounded-lg p-4 border border-primary-700/30">
                  <p className="text-primary-200 leading-relaxed">
                    <strong className="text-white font-semibold">
                      Web Beacons.
                    </strong>{' '}
                    Certain sections of our Service and our emails may contain
                    small electronic files known as web beacons (also referred
                    to as clear gifs, pixel tags, and single-pixel gifs) that
                    permit the Company, for example, to count users who have
                    visited those pages or opened an email and for other related
                    website statistics (for example, recording the popularity of
                    a certain section and verifying system and server
                    integrity).
                  </p>
                </li>
              </ul>
              <p className="text-primary-200 leading-relaxed mb-4">
                Cookies can be &quot;Persistent&quot; or &quot;Session&quot;
                Cookies. Persistent Cookies remain on Your personal computer or
                mobile device when You go offline, while Session Cookies are
                deleted as soon as You close Your web browser. You can learn
                more about cookies on{' '}
                <a
                  href="https://www.termsfeed.com/blog/cookies/#What_Are_Cookies"
                  target="_blank"
                  rel="noreferrer"
                  className="text-primary-300 hover:text-white underline transition-colors"
                >
                  TermsFeed website
                </a>{' '}
                article.
              </p>
              <p className="text-primary-200 leading-relaxed mb-4">
                We use both Session and Persistent Cookies for the purposes set
                out below:
              </p>
              <ul className="space-y-4 mb-6">
                <li className="bg-primary-900/40 rounded-lg p-4 border border-primary-700/30">
                  <p className="text-white font-semibold mb-2">
                    Necessary / Essential Cookies
                  </p>
                  <p className="text-primary-300 text-sm mt-2">
                    Type: Session Cookies
                  </p>
                  <p className="text-primary-300 text-sm">
                    Administered by: Us
                  </p>
                  <p className="text-primary-200 mt-2">
                    Purpose: These Cookies are essential to provide You with
                    services available through the Website and to enable You to
                    use some of its features. They help to authenticate users
                    and prevent fraudulent use of user accounts. Without these
                    Cookies, the services that You have asked for cannot be
                    provided, and We only use these Cookies to provide You with
                    those services.
                  </p>
                </li>
                <li className="bg-primary-900/40 rounded-lg p-4 border border-primary-700/30">
                  <p className="text-white font-semibold mb-2">
                    Cookies Policy / Notice Acceptance Cookies
                  </p>
                  <p className="text-primary-300 text-sm mt-2">
                    Type: Persistent Cookies
                  </p>
                  <p className="text-primary-300 text-sm">
                    Administered by: Us
                  </p>
                  <p className="text-primary-200 mt-2">
                    Purpose: These Cookies identify if users have accepted the
                    use of cookies on the Website.
                  </p>
                </li>
                <li className="bg-primary-900/40 rounded-lg p-4 border border-primary-700/30">
                  <p className="text-white font-semibold mb-2">
                    Functionality Cookies
                  </p>
                  <p className="text-primary-300 text-sm mt-2">
                    Type: Persistent Cookies
                  </p>
                  <p className="text-primary-300 text-sm">
                    Administered by: Us
                  </p>
                  <p className="text-primary-200 mt-2">
                    Purpose: These Cookies allow us to remember choices You make
                    when You use the Website, such as remembering your login
                    details or language preference. The purpose of these Cookies
                    is to provide You with a more personal experience and to
                    avoid You having to re-enter your preferences every time You
                    use the Website.
                  </p>
                </li>
              </ul>
              <p className="text-primary-200 leading-relaxed mb-6">
                For more information about the cookies we use and your choices
                regarding cookies, please visit our Cookies Policy or the
                Cookies section of our Privacy Policy.
              </p>
            </section>
            <section className="mb-8">
              <h3 className="text-xl font-semibold text-white mb-3 mt-6">
                Use of Your Personal Data
              </h3>
              <p className="text-primary-200 leading-relaxed mb-4">
                The Company may use Personal Data for the following purposes:
              </p>
              <ul className="space-y-3 mb-6">
                <li className="bg-primary-900/40 rounded-lg p-4 border border-primary-700/30">
                  <p className="text-primary-200 leading-relaxed">
                    <strong className="text-white font-semibold">
                      To provide and maintain our Service
                    </strong>
                    , including to monitor the usage of our Service.
                  </p>
                </li>
                <li className="bg-primary-900/40 rounded-lg p-4 border border-primary-700/30">
                  <p className="text-primary-200 leading-relaxed">
                    <strong className="text-white font-semibold">
                      To manage Your Account:
                    </strong>{' '}
                    to manage Your registration as a user of the Service. The
                    Personal Data You provide can give You access to different
                    functionalities of the Service that are available to You as
                    a registered user.
                  </p>
                </li>
                <li className="bg-primary-900/40 rounded-lg p-4 border border-primary-700/30">
                  <p className="text-primary-200 leading-relaxed">
                    <strong className="text-white font-semibold">
                      For the performance of a contract:
                    </strong>{' '}
                    the development, compliance and undertaking of the purchase
                    contract for the products, items or services You have
                    purchased or of any other contract with Us through the
                    Service.
                  </p>
                </li>
                <li className="bg-primary-900/40 rounded-lg p-4 border border-primary-700/30">
                  <p className="text-primary-200 leading-relaxed">
                    <strong className="text-white font-semibold">
                      To contact You:
                    </strong>{' '}
                    To contact You by email, telephone calls, SMS, or other
                    equivalent forms of electronic communication, such as a
                    mobile application's push notifications regarding updates or
                    informative communications related to the functionalities,
                    products or contracted services, including the security
                    updates, when necessary or reasonable for their
                    implementation.
                  </p>
                </li>
                <li className="bg-primary-900/40 rounded-lg p-4 border border-primary-700/30">
                  <p className="text-primary-200 leading-relaxed">
                    <strong className="text-white font-semibold">
                      To provide You
                    </strong>{' '}
                    with news, special offers, and general information about
                    other goods, services and events which We offer that are
                    similar to those that you have already purchased or inquired
                    about unless You have opted not to receive such information.
                  </p>
                </li>
                <li className="bg-primary-900/40 rounded-lg p-4 border border-primary-700/30">
                  <p className="text-primary-200 leading-relaxed">
                    <strong className="text-white font-semibold">
                      To manage Your requests:
                    </strong>{' '}
                    To attend and manage Your requests to Us.
                  </p>
                </li>
                <li className="bg-primary-900/40 rounded-lg p-4 border border-primary-700/30">
                  <p className="text-primary-200 leading-relaxed">
                    <strong className="text-white font-semibold">
                      For business transfers:
                    </strong>{' '}
                    We may use Your information to evaluate or conduct a merger,
                    divestiture, restructuring, reorganization, dissolution, or
                    other sale or transfer of some or all of Our assets, whether
                    as a going concern or as part of bankruptcy, liquidation, or
                    similar proceeding, in which Personal Data held by Us about
                    our Service users is among the assets transferred.
                  </p>
                </li>
                <li className="bg-primary-900/40 rounded-lg p-4 border border-primary-700/30">
                  <p className="text-primary-200 leading-relaxed">
                    <strong className="text-white font-semibold">
                      For other purposes
                    </strong>
                    : We may use Your information for other purposes, such as
                    data analysis, identifying usage trends, determining the
                    effectiveness of our promotional campaigns and to evaluate
                    and improve our Service, products, services, marketing and
                    your experience.
                  </p>
                </li>
              </ul>
            </section>
            <p className="text-primary-200 leading-relaxed mb-4">
              We may share Your personal information in the following
              situations:
            </p>
            <ul className="space-y-3 mb-6">
              <li className="bg-primary-900/40 rounded-lg p-4 border border-primary-700/30">
                <p className="text-primary-200 leading-relaxed">
                  <strong className="text-white font-semibold">
                    With Service Providers:
                  </strong>{' '}
                  We may share Your personal information with Service Providers
                  to monitor and analyze the use of our Service, to contact You.
                </p>
              </li>
              <li className="bg-primary-900/40 rounded-lg p-4 border border-primary-700/30">
                <p className="text-primary-200 leading-relaxed">
                  <strong className="text-white font-semibold">
                    For business transfers:
                  </strong>{' '}
                  We may share or transfer Your personal information in
                  connection with, or during negotiations of, any merger, sale
                  of Company assets, financing, or acquisition of all or a
                  portion of Our business to another company.
                </p>
              </li>
              <li className="bg-primary-900/40 rounded-lg p-4 border border-primary-700/30">
                <p className="text-primary-200 leading-relaxed">
                  <strong className="text-white font-semibold">
                    With Affiliates:
                  </strong>{' '}
                  We may share Your information with Our affiliates, in which
                  case we will require those affiliates to honor this Privacy
                  Policy. Affiliates include Our parent company and any other
                  subsidiaries, joint venture partners or other companies that
                  We control or that are under common control with Us.
                </p>
              </li>
              <li className="bg-primary-900/40 rounded-lg p-4 border border-primary-700/30">
                <p className="text-primary-200 leading-relaxed">
                  <strong className="text-white font-semibold">
                    With business partners:
                  </strong>{' '}
                  We may share Your information with Our business partners to
                  offer You certain products, services or promotions.
                </p>
              </li>
              <li className="bg-primary-900/40 rounded-lg p-4 border border-primary-700/30">
                <p className="text-primary-200 leading-relaxed">
                  <strong className="text-white font-semibold">
                    With other users:
                  </strong>{' '}
                  when You share personal information or otherwise interact in
                  the public areas with other users, such information may be
                  viewed by all users and may be publicly distributed outside.
                </p>
              </li>
              <li className="bg-primary-900/40 rounded-lg p-4 border border-primary-700/30">
                <p className="text-primary-200 leading-relaxed">
                  <strong className="text-white font-semibold">
                    With Your consent
                  </strong>
                  : We may disclose Your personal information for any other
                  purpose with Your consent.
                </p>
              </li>
            </ul>
            <section className="mb-8">
              <h3 className="text-xl font-semibold text-white mb-3 mt-6">
                Retention of Your Personal Data
              </h3>
              <p className="text-primary-200 leading-relaxed mb-4">
                The Company will retain Your Personal Data only for as long as
                is necessary for the purposes set out in this Privacy Policy. We
                will retain and use Your Personal Data to the extent necessary
                to comply with our legal obligations (for example, if we are
                required to retain your data to comply with applicable laws),
                resolve disputes, and enforce our legal agreements and policies.
              </p>
              <p className="text-primary-200 leading-relaxed mb-6">
                The Company will also retain Usage Data for internal analysis
                purposes. Usage Data is generally retained for a shorter period
                of time, except when this data is used to strengthen the
                security or to improve the functionality of Our Service, or We
                are legally obligated to retain this data for longer periods.
              </p>
            </section>

            <section className="mb-8">
              <h3 className="text-xl font-semibold text-white mb-3 mt-6">
                Transfer of Your Personal Data
              </h3>
              <p className="text-primary-200 leading-relaxed mb-4">
                Your information, including Personal Data, is processed at the
                Company's operating offices and in any other places where the
                parties involved in the processing are located. It means that
                this information may be transferred to — and maintained on —
                computers located outside of Your state, province, country or
                other governmental jurisdiction where the data protection laws
                may differ from those from Your jurisdiction.
              </p>
              <p className="text-primary-200 leading-relaxed mb-4">
                Your consent to this Privacy Policy followed by Your submission
                of such information represents Your agreement to that transfer.
              </p>
              <p className="text-primary-200 leading-relaxed mb-6">
                The Company will take all steps reasonably necessary to ensure
                that Your data is treated securely and in accordance with this
                Privacy Policy and no transfer of Your Personal Data will take
                place to an organization or a country unless there are adequate
                controls in place including the security of Your data and other
                personal information.
              </p>
            </section>

            <section className="mb-8">
              <h3 className="text-xl font-semibold text-white mb-3 mt-6">
                Delete Your Personal Data
              </h3>
              <p className="text-primary-200 leading-relaxed mb-4">
                You have the right to delete or request that We assist in
                deleting the Personal Data that We have collected about You.
              </p>
              <p className="text-primary-200 leading-relaxed mb-4">
                Our Service may give You the ability to delete certain
                information about You from within the Service.
              </p>
              <p className="text-primary-200 leading-relaxed mb-4">
                You may update, amend, or delete Your information at any time by
                signing in to Your Account, if you have one, and visiting the
                account settings section that allows you to manage Your personal
                information. You may also contact Us to request access to,
                correct, or delete any personal information that You have
                provided to Us.
              </p>
              <p className="text-primary-200 leading-relaxed mb-6">
                Please note, however, that We may need to retain certain
                information when we have a legal obligation or lawful basis to
                do so.
              </p>
            </section>
            <section className="mb-8">
              <h3 className="text-xl font-semibold text-white mb-3 mt-6">
                Disclosure of Your Personal Data
              </h3>

              <h4 className="text-lg font-semibold text-white mb-2 mt-4">
                Business Transactions
              </h4>
              <p className="text-primary-200 leading-relaxed mb-4">
                If the Company is involved in a merger, acquisition or asset
                sale, Your Personal Data may be transferred. We will provide
                notice before Your Personal Data is transferred and becomes
                subject to a different Privacy Policy.
              </p>

              <h4 className="text-lg font-semibold text-white mb-2 mt-4">
                Law enforcement
              </h4>
              <p className="text-primary-200 leading-relaxed mb-4">
                Under certain circumstances, the Company may be required to
                disclose Your Personal Data if required to do so by law or in
                response to valid requests by public authorities (e.g. a court
                or a government agency).
              </p>

              <h4 className="text-lg font-semibold text-white mb-2 mt-4">
                Other legal requirements
              </h4>
              <p className="text-primary-200 leading-relaxed mb-4">
                The Company may disclose Your Personal Data in the good faith
                belief that such action is necessary to:
              </p>
              <ul className="list-disc list-inside space-y-2 mb-6">
                <li className="text-primary-200">
                  Comply with a legal obligation
                </li>
                <li className="text-primary-200">
                  Protect and defend the rights or property of the Company
                </li>
                <li className="text-primary-200">
                  Prevent or investigate possible wrongdoing in connection with
                  the Service
                </li>
                <li className="text-primary-200">
                  Protect the personal safety of Users of the Service or the
                  public
                </li>
                <li className="text-primary-200">
                  Protect against legal liability
                </li>
              </ul>
            </section>

            <section className="mb-8">
              <h3 className="text-xl font-semibold text-white mb-3 mt-6">
                Security of Your Personal Data
              </h3>
              <p className="text-primary-200 leading-relaxed mb-6">
                The security of Your Personal Data is important to Us, but
                remember that no method of transmission over the Internet, or
                method of electronic storage is 100% secure. While We strive to
                use commercially reasonable means to protect Your Personal Data,
                We cannot guarantee its absolute security.
              </p>
            </section>
            <section className="mb-8">
              <h2 className="text-2xl font-bold text-white mb-6 border-b border-primary-700/40 pb-3">
                Children's Privacy
              </h2>
              <p className="text-primary-200 leading-relaxed mb-4">
                Our Service does not address anyone under the age of 13. We do
                not knowingly collect personally identifiable information from
                anyone under the age of 13. If You are a parent or guardian and
                You are aware that Your child has provided Us with Personal
                Data, please contact Us. If We become aware that We have
                collected Personal Data from anyone under the age of 13 without
                verification of parental consent, We take steps to remove that
                information from Our servers.
              </p>
              <p className="text-primary-200 leading-relaxed mb-6">
                If We need to rely on consent as a legal basis for processing
                Your information and Your country requires consent from a
                parent, We may require Your parent's consent before We collect
                and use that information.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-2xl font-bold text-white mb-6 border-b border-primary-700/40 pb-3">
                Contact Us
              </h2>
              <p className="text-primary-200 leading-relaxed mb-4">
                If you have any questions about this Privacy Policy, You can
                contact us:
              </p>
              <div className="bg-primary-900/40 rounded-lg p-4 border border-primary-700/30">
                <ul className="space-y-2">
                  <li className="text-primary-200">
                    By email:{' '}
                    <a
                      href="mailto:sasha.shysh23@gmail.com"
                      className="text-primary-300 hover:text-white underline transition-colors"
                    >
                      sasha.shysh23@gmail.com
                    </a>
                  </li>
                </ul>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
