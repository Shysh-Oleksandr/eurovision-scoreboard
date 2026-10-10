import React from 'react';

import {
  A,
  CONTACT_EMAIL,
  H2,
  H3,
  LegalPage,
  List,
  Strong,
  Summary,
} from './legal/LegalPage';

const PrivacyPolicy = () => (
  <LegalPage title="Privacy Policy" updated="October 10, 2026">
    <p>
      This policy explains what information DouzePoints collects when you use
      the website at <A href="https://douzepoints.app">douzepoints.app</A> and
      the DouzePoints apps for iOS and Android (together,
      &quot;DouzePoints&quot; or &quot;the Service&quot;), how we use and share
      it, and the choices you have. DouzePoints is made and run by an
      independent developer based in Ukraine (&quot;we&quot;, &quot;us&quot;).
      You can reach us at{' '}
      <A href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</A>.
    </p>

    <Summary>
      <p className="mb-3">
        <Strong>The short version</Strong>
      </p>
      <List>
        <li>
          You can use the simulator without an account. Without one, your
          contests, settings and drafts stay on your device.
        </li>
        <li>
          If you sign in with Google or Apple, we store the basic profile
          details they share with us and the content you save to your account.
        </li>
        <li>
          What you publish (your profile, public contests, themes, designs and
          fonts) is visible to everyone.
        </li>
        <li>
          We don&apos;t sell your data and there are no ads. The iOS and Android
          apps contain no analytics.
        </li>
        <li>
          You can delete your account and its data at any time from{' '}
          <Strong>Edit profile → Delete account</Strong> (see{' '}
          <A href="#delete-account">section 6</A>).
        </li>
      </List>
    </Summary>

    <H2>1. Information we collect</H2>

    <H3>Data that stays on your device</H3>
    <p>
      The simulator works without an account. Your settings, the current
      simulation, voting presets, graphics drafts and similar data are kept in
      your browser&apos;s storage (on the website) or in the app&apos;s storage
      (in the apps). We don&apos;t receive this data unless you sign in and save
      something to your account, or share it.
    </p>

    <H3>Account information</H3>
    <p>
      An account is created when you sign in with Google or Apple. We receive
      and store:
    </p>
    <List>
      <li>
        <Strong>Google:</Strong> your Google account ID, name, email address and
        profile picture.
      </li>
      <li>
        <Strong>Apple:</Strong> your Apple user ID, your email address (which
        may be a private relay address if you choose Hide My Email) and, on the
        first sign-in, your name if you choose to share it. We also keep a token
        from Apple whose only use is to revoke DouzePoints&apos; access to your
        Apple ID when you delete your account.
      </li>
      <li>
        A username we generate for you, and the display name, country and
        profile picture you can change at any time.
      </li>
    </List>

    <H3>Content you create</H3>
    <p>
      When you save or publish content, we store it with your account: contests
      (their setup, results, name, description and logo), custom themes
      (including the images, sounds and fonts you upload), graphics designs
      (including uploaded images), fonts in your font library, custom entries
      and their flags, folders, quick-select pins and the preferences you choose
      to sync to your account.
    </p>

    <H3>Activity</H3>
    <p>
      We store the users you follow, the items you like and save, which item a
      remix or added font came from, the reports you send (the reason and any
      note you add) and the users you block.
    </p>

    <H3>Technical data</H3>
    <List>
      <li>
        <Strong>Sessions.</Strong> To keep you signed in we store a session
        record with a hashed token, its expiry date, and the user agent and IP
        address of the device that signed in.
      </li>
      <li>
        <Strong>Server logs.</Strong> Our servers and hosting providers process
        IP addresses and request data to deliver the Service and protect it from
        abuse.
      </li>
      <li>
        <Strong>Error reports.</Strong> When the app hits an error or a sign-in
        fails, it sends a report with the error, technical details about the
        device and browser (platform, user agent, language and screen size) and
        the state of the app at the time. Error reports are not linked to your
        account.
      </li>
      <li>
        <Strong>Website analytics.</Strong> The website uses Umami Cloud, a
        privacy-focused analytics service that uses no cookies and collects no
        personal data, to count visits and measure page performance. The apps
        contain no analytics or tracking.
      </li>
    </List>

    <H2>2. How we use information</H2>
    <List>
      <li>
        To provide the Service: your account, saving and syncing your content,
        publishing, following, leaderboards built from public contests, and
        sharing links.
      </li>
      <li>To show your profile and public content to other users.</li>
      <li>
        To keep the community safe: reviewing reports, removing content that
        breaks the <A href="/terms">Terms of Use</A>, applying blocks and
        preventing abuse.
      </li>
      <li>To fix errors and improve the Service.</li>
      <li>To answer you when you contact us.</li>
    </List>
    <p>
      We don&apos;t use your information for advertising, we don&apos;t sell or
      rent it, and we don&apos;t make automated decisions about you that have
      legal or similarly significant effects.
    </p>
    <p>
      If you are in the European Economic Area or the United Kingdom, we process
      your information to provide the Service you asked for (performance of a
      contract), for our legitimate interests in keeping the Service secure,
      working and free of abuse, and where the law requires it.
    </p>

    <H2>3. What other people can see</H2>
    <List>
      <li>
        <Strong>Your profile</Strong> (username, display name, country, profile
        picture, the date you joined and your follower count) is public.
      </li>
      <li>
        <Strong>Content you make public</Strong> (public contests, themes,
        designs and fonts, including the files you uploaded for them) can be
        seen, used and remixed by anyone, including people without an account,
        and shared with links. Completed public contests also count towards the
        global leaderboard.
      </li>
      <li>
        <Strong>Uploaded files</Strong> (images, sounds and fonts) are served
        from a public content delivery network, so anyone who has a file&apos;s
        link can open it, even if the item it belongs to is private.
      </li>
      <li>
        <Strong>Your email address is never shown.</Strong> Someone who already
        knows your exact email address can find your profile by searching for
        it.
      </li>
    </List>

    <H2>4. Who we share information with</H2>
    <p>
      We share information only with service providers that process it on our
      behalf to run the Service:
    </p>
    <List>
      <li>
        <Strong>Cloudflare</Strong> hosts the website and stores and delivers
        uploaded files and app content updates.
      </li>
      <li>
        <Strong>MongoDB Atlas</Strong> hosts our database.
      </li>
      <li>
        <Strong>Our cloud hosting provider</Strong> runs the API server.
      </li>
      <li>
        <Strong>Google and Apple</Strong> provide sign-in. They handle your
        sign-in under their own privacy policies.
      </li>
      <li>
        <Strong>Umami</Strong> provides anonymous website analytics.
      </li>
    </List>
    <p>
      We may also disclose information if the law requires it, to protect the
      rights and safety of our users or the public, or as part of a transfer of
      the Service to a new owner, who would remain bound by this policy.
    </p>
    <p>
      These providers may process data in the United States, the European Union
      and other countries. Where the law requires it, transfers rely on
      safeguards such as the European Commission&apos;s standard contractual
      clauses.
    </p>

    <H2>5. How long we keep information</H2>
    <List>
      <li>Account data and content: for as long as your account exists.</li>
      <li>
        Session records: deleted automatically when they expire, 30 days after
        they were issued or last renewed.
      </li>
      <li>Error reports: for as long as we need them to fix the problem.</li>
      <li>
        When you delete your account, we delete your profile, your content, your
        uploaded files (unless another user&apos;s copy still uses them), your
        likes, saves, follows, blocks and reports, and your sessions, and revoke
        our access to your Apple ID. Copies may remain in backups for a limited
        time before they are overwritten. Copies other users made of your public
        content (for example a remixed theme) belong to them and are not
        deleted.
      </li>
    </List>

    <H2 id="delete-account">6. Deleting your account</H2>
    <p>
      You can delete your DouzePoints account and its data at any time, in the
      iOS or Android app or on the website:
    </p>
    <ol className="list-decimal pl-6 space-y-2 marker:text-primary-400">
      <li>Sign in and open your profile from the main screen.</li>
      <li>
        Choose <Strong>Edit profile</Strong>.
      </li>
      <li>
        Under <Strong>Account</Strong>, choose <Strong>Delete account</Strong>{' '}
        and confirm.
      </li>
    </ol>
    <p>
      Deletion is immediate and removes the data listed in section 5. If you can
      no longer sign in, email{' '}
      <A href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</A> with your username
      and we will delete the account within 30 days once we have confirmed it is
      yours.
    </p>

    <H2>7. Your choices and rights</H2>
    <List>
      <li>
        Edit your profile, make your items private or delete them at any time.
      </li>
      <li>
        Depending on where you live, you may have the right to access, correct,
        export or delete your personal data, to object to or restrict how we use
        it, and to complain to your data protection authority. Email us to use
        these rights; we answer within 30 days.
      </li>
    </List>

    <H2>8. Cookies and storage</H2>
    <List>
      <li>
        <Strong>Website:</Strong> a secure, HTTP-only cookie on
        api.douzepoints.app keeps you signed in, and a short-lived cookie
        protects Sign in with Apple. There are no advertising or tracking
        cookies. Your browser&apos;s local storage and IndexedDB hold your
        settings, the current simulation and your drafts.
      </li>
      <li>
        <Strong>Apps:</Strong> your sign-in token is kept in the iOS Keychain or
        in storage protected by the Android Keystore; everything else is in the
        app&apos;s own storage. The apps download content updates from our
        servers, which see your IP address and the app version.
      </li>
    </List>

    <H2>9. Security</H2>
    <p>
      Connections are encrypted with HTTPS, session tokens are stored hashed,
      and access to our systems is restricted. No system is perfectly secure, so
      please let us know if you find a problem.
    </p>

    <H2>10. Children</H2>
    <p>
      DouzePoints is not directed at children under 13, and they must not create
      an account (or the higher minimum age where you live). If we learn that a
      child has created an account, we delete it.
    </p>

    <H2>11. Changes to this policy</H2>
    <p>
      We will post any changes on this page and update the date at the top. If a
      change is significant, we will also tell you in the app.
    </p>

    <H2>12. Contact</H2>
    <p>
      Questions or requests about your privacy:{' '}
      <A href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</A>.
    </p>
  </LegalPage>
);

export default PrivacyPolicy;
