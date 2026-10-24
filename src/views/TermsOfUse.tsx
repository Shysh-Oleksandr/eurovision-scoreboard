import React from 'react';

import {
  A,
  CONTACT_EMAIL,
  H2,
  LegalPage,
  List,
  Strong,
  Summary,
} from './legal/LegalPage';

const TermsOfUse = () => (
  <LegalPage title="Terms of Use" updated="October 10, 2026">
    <p>
      These terms are an agreement between you and the developer of DouzePoints
      (&quot;we&quot;, &quot;us&quot;) about using the website at{' '}
      <A href="https://douzepoints.app">douzepoints.app</A> and the DouzePoints
      apps for iOS and Android (together, &quot;the Service&quot;). By using the
      Service or signing in, you agree to these terms and to the{' '}
      <A href="/privacy">Privacy Policy</A>. If you don&apos;t agree, please
      don&apos;t use the Service.
    </p>

    <Summary>
      <p>
        <Strong>
          There is no tolerance for objectionable content or abusive users.
        </Strong>{' '}
        Content that breaks these terms is removed, and the accounts of users
        who post it or abuse others are suspended or deleted. You can report any
        content or user and block any user (see section 5).
      </p>
    </Summary>

    <H2>1. The Service</H2>
    <p>
      DouzePoints is a free, fan-made scoreboard simulator for Eurovision-style
      song contests. It is not affiliated with, endorsed by or connected to the
      European Broadcasting Union (EBU) or the Eurovision Song Contest.
      &quot;Eurovision&quot; and related names, logos and marks belong to their
      respective owners. We may change, add or remove features at any time.
    </p>

    <H2>2. Your account</H2>
    <List>
      <li>
        You can use the simulator without an account. Saving to the cloud,
        publishing and the social features need you to sign in with Google,
        Apple or your email address, which creates your account.
      </li>
      <li>
        You must be at least 13 years old (or the minimum age required where you
        live) to create an account.
      </li>
      <li>
        You are responsible for what happens under your account. Don&apos;t
        share it, and don&apos;t create accounts to get around a suspension or a
        block.
      </li>
      <li>
        You can delete your account at any time: open your profile, choose{' '}
        <Strong>Edit profile</Strong>, then <Strong>Delete account</Strong>.
      </li>
    </List>

    <H2>3. Your content</H2>
    <List>
      <li>
        You keep ownership of the contests, themes, designs, fonts, images,
        sounds and other content you create or upload (&quot;your
        content&quot;).
      </li>
      <li>
        So that we can run the Service, you give us a worldwide, non-exclusive,
        royalty-free licence to host, store, copy, display and distribute your
        content within the Service. For content you make public, the licence
        also covers letting other users view, share, use and remix it within the
        Service (for example applying your theme, loading your contest, starting
        a design from yours or adding your font to their library). The licence
        ends when you delete the content or your account, except for copies
        other users have already made.
      </li>
      <li>
        You must have the rights to everything you upload. Fonts in particular
        must have a licence that allows you to share and embed them.
      </li>
    </List>

    <H2>4. What is not allowed</H2>
    <p>You must not post, upload or share content that:</p>
    <List>
      <li>
        is hateful, harassing, threatening, bullying or discriminatory against
        any person or group;
      </li>
      <li>
        is sexually explicit or pornographic, or sexualises minors in any way;
      </li>
      <li>
        is violent or graphic, encourages self-harm, or promotes illegal
        activity;
      </li>
      <li>
        infringes someone else&apos;s copyright, trademark, privacy or other
        rights;
      </li>
      <li>
        impersonates a person or organisation, is deliberately misleading, or is
        spam;
      </li>
      <li>
        contains someone else&apos;s personal information without their consent,
        malware, or links to harmful content.
      </li>
    </List>
    <p>You must also not:</p>
    <List>
      <li>harass, abuse, threaten or spam other users;</li>
      <li>
        access other people&apos;s accounts or data, or try to get around a
        block, a suspension or our security measures;
      </li>
      <li>
        disrupt or overload the Service, or collect data from it with automated
        tools beyond normal use.
      </li>
    </List>

    <H2>5. Reporting, blocking and moderation</H2>
    <List>
      <li>
        <Strong>Report</Strong> any theme, contest, design, font or user from
        the &quot;…&quot; menu on its card or profile. Reports are reviewed by
        the DouzePoints team.
      </li>
      <li>
        <Strong>Block</Strong> a user from the &quot;…&quot; menu on their
        profile, or when you report their content. You and the blocked user no
        longer see each other&apos;s content in community lists, search and
        profiles, and neither of you can follow the other. Manage blocked users
        in <Strong>Edit profile</Strong>.
      </li>
      <li>
        We review reports within 24 hours. When content breaks these terms we
        remove it, and we suspend or delete the accounts of users who post
        objectionable content or abuse others. We may also remove content or
        accounts without a report.
      </li>
      <li>
        For anything urgent, email{' '}
        <A href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</A>.
      </li>
    </List>

    <H2>6. Copyright complaints</H2>
    <p>
      If you believe content on DouzePoints infringes your copyright, email{' '}
      <A href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</A> with a link to the
      content, a description of the work you believe is infringed, your name and
      contact details, a statement that the use is not authorised, and a
      statement that you are the rights holder or authorised to act for them. We
      remove infringing content and may delete the accounts of repeat
      infringers.
    </p>

    <H2>7. Ending your use</H2>
    <p>
      You can stop using the Service and delete your account at any time. We may
      suspend or delete accounts and remove content that break these terms, or
      stop offering the Service, with or without notice.
    </p>

    <H2>8. Disclaimers</H2>
    <p>
      The Service is provided free of charge, &quot;as is&quot; and &quot;as
      available&quot;, without warranties of any kind. We don&apos;t guarantee
      that it will be uninterrupted or error-free, or that your content will
      never be lost, so keep copies of anything important. Simulated results are
      for entertainment and don&apos;t predict real contest outcomes.
    </p>

    <H2>9. Limitation of liability</H2>
    <p>
      To the fullest extent the law allows, we are not liable for any indirect,
      incidental, special or consequential damages, or for any loss of data,
      arising from your use of the Service. Nothing in these terms limits
      liability that cannot be limited by law, or the rights you have as a
      consumer where you live.
    </p>

    <H2>10. App stores</H2>
    <p>
      These terms are between you and us, not Apple or Google. Apple and Google
      are not responsible for the apps or their content and have no obligation
      to provide support for them. Your use of an app must also follow the terms
      of the store you downloaded it from. Apple and its subsidiaries are
      third-party beneficiaries of these terms and may enforce them against you.
    </p>

    <H2>11. Changes to these terms</H2>
    <p>
      We may update these terms. We will post changes on this page and update
      the date at the top, and tell you in the app if a change is significant.
      If you keep using the Service after a change, you accept the new terms.
    </p>

    <H2>12. Contact</H2>
    <p>
      Questions about these terms:{' '}
      <A href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</A>.
    </p>
  </LegalPage>
);

export default TermsOfUse;
