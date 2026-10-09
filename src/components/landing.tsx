"use client";
import Link from "next/link";
import { useRef, useState } from "react";
import { DemoForm } from "./demo-form";

function resolveNavigation(
  authenticated: boolean,
  installed: boolean,
  signupEnabled: boolean,
): { destination: string; action: string; accountHref: string; accountLabel: string } {
  if (authenticated) {
    return {
      destination: "/dashboard",
      action: "Open dashboard",
      accountHref: "/dashboard",
      accountLabel: "Open dashboard",
    };
  }
  if (installed) {
    return {
      destination: signupEnabled ? "/signup" : "/login",
      action: signupEnabled ? "Create account" : "Sign in",
      accountHref: "/login",
      accountLabel: "Sign in",
    };
  }
  return {
    destination: "/setup",
    action: "Set up HearDesk",
    accountHref: "/setup",
    accountLabel: "Set up HearDesk",
  };
}

export function Landing({
  installed,
  signupEnabled = false,
  authenticated = false,
}: Readonly<{
  installed: boolean;
  signupEnabled?: boolean;
  authenticated?: boolean;
}>) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [session, setSession] = useState(0);
  const { destination, action, accountHref, accountLabel } = resolveNavigation(
    authenticated,
    installed,
    signupEnabled,
  );
  return (
    <div className="heardesk-landing">
      <a className="skip-link" href="#landing-content">
        Skip to content
      </a>
      <header className="hd-header">
        <Link className="brand" href="/">
          HearDesk
        </Link>
        <nav aria-label="Public navigation">
          <a href="#how-it-works">How it works</a>
          <Link href="/docs">Installation guide</Link>
        </nav>
        <Link className="btn" prefetch={false} href={accountHref}>
          {accountLabel}
        </Link>
      </header>
      <main id="landing-content">
        <section className="hd-hero">
          <div className="hd-copy">
            <h1>
              Website feedback,
              <br />
              in one place.
            </h1>
            <p>
              Collect bug reports and suggestions from your websites. Review them with your team in
              a shared inbox.
            </p>
            <div className="hero-actions">
              <button
                className="btn primary"
                onClick={() => {
                  setSession((current) => current + 1);
                  dialog.current?.showModal();
                }}
              >
                Try the widget
              </button>
              <Link className="btn" href={destination}>
                {action}
              </Link>
            </div>
            <p className="helper">
              Visitors do not need an account. This demo does not save reports.
            </p>
          </div>
          <div className="hd-example" aria-label="Illustrative feedback preview">
            <header>
              <strong>Your feedback inbox</strong>
              <span className="helper">Illustrative example</span>
            </header>
            <div>
              <span className="hd-type">Bug report</span>
              <h2>Checkout button does not respond on mobile</h2>
              <p>“I selected my delivery address, but I cannot continue to payment.”</p>
              <dl>
                <div>
                  <dt>Website</dt>
                  <dd>store.example.test</dd>
                </div>
                <div>
                  <dt>Status</dt>
                  <dd>Reviewing</dd>
                </div>
              </dl>
            </div>
            <footer>Message, page context, and optional screenshot together.</footer>
          </div>
        </section>
        <section id="how-it-works" className="hd-workflow">
          <div>
            <h2>
              From your website
              <br />
              to your team.
            </h2>
            <p>Keep feedback organized across websites without making visitors leave the page.</p>
          </div>
          <ol>
            <li>
              <h3>Connect your website</h3>
              <p>Add a website to your Company and copy its installation code.</p>
            </li>
            <li>
              <h3>Let visitors share feedback</h3>
              <p>They open the widget and send a bug report, suggestion, or compliment.</p>
            </li>
            <li>
              <h3>Review and follow up</h3>
              <p>Find reports in your inbox, update their status, and add internal notes.</p>
            </li>
          </ol>
        </section>
        <section className="hd-details">
          <div>
            <h2>One Company. Multiple websites.</h2>
            <p>
              Your Company keeps its websites and feedback together. Every website has its own
              widget code, and access stays within your Company.
            </p>
          </div>
          <div>
            <h2>Enough context to act.</h2>
            <p>
              See the visitor's message and page URL. Optional email and screenshots help your team
              understand what happened.
            </p>
          </div>
        </section>
      </main>
      <footer className="hd-footer">
        <Link className="brand" href="/">
          HearDesk
        </Link>
        <span>Website feedback for product teams.</span>
        <Link href="/docs">Installation guide</Link>
        <Link prefetch={false} href={accountHref}>
          {accountLabel}
        </Link>
      </footer>
      <dialog
        ref={dialog}
        className="landing-demo"
        aria-label="Widget demo"
        onClick={(event) => {
          if (event.target === dialog.current) {
            const rect = event.currentTarget.getBoundingClientRect();
            if (
              event.clientX < rect.left ||
              event.clientX > rect.right ||
              event.clientY < rect.top ||
              event.clientY > rect.bottom
            ) {
              dialog.current?.close();
            }
          }
        }}
      >
        <DemoForm key={session} close={() => dialog.current?.close()} />
      </dialog>
    </div>
  );
}
