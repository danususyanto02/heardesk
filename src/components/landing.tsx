"use client";
import Link from "next/link";
import { useRef, useState } from "react";
import gsap from "gsap";
import { useGSAP } from "@gsap/react";
import {
  BugIcon,
  ChatCircleIcon,
  CheckCircleIcon,
  GlobeIcon,
  LightbulbIcon,
  PaperclipIcon,
} from "@phosphor-icons/react";
import { DemoForm } from "./demo-form";
import { LandingPreview } from "./landing-preview";
import styles from "./landing.module.css";

gsap.registerPlugin(useGSAP);

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
  const root = useRef<HTMLDivElement>(null);
  const heroStarted = useRef(false);
  const dialogTween = useRef<gsap.core.Tween | null>(null);
  const [session, setSession] = useState(0);
  const { destination, action, accountHref, accountLabel } = resolveNavigation(
    authenticated,
    installed,
    signupEnabled,
  );
  const { contextSafe } = useGSAP(
    () => {
      const media = gsap.matchMedia();
      media.add(
        { animate: "(prefers-reduced-motion: no-preference)", mobile: "(max-width: 700px)" },
        (context) => {
          if (!context.conditions?.animate || heroStarted.current) {
            return;
          }
          heroStarted.current = true;
          gsap.fromTo(
            "[data-hero-motion]",
            { y: context.conditions.mobile ? 8 : 18, opacity: 0.55 },
            {
              y: 0,
              opacity: 1,
              duration: 0.6,
              stagger: 0.08,
              ease: "power3.out",
              clearProps: "transform,opacity",
            },
          );
        },
      );
      media.add("(prefers-reduced-motion: reduce)", () => {
        dialogTween.current?.revert();
        dialogTween.current = null;
      });
      return () => {
        media.revert();
        dialogTween.current?.revert();
        dialogTween.current = null;
      };
    },
    { scope: root },
  );
  const clearDialogMotion = contextSafe(() => {
    dialogTween.current?.revert();
    dialogTween.current = null;
  });
  const openDemo = contextSafe(() => {
    clearDialogMotion();
    setSession((current) => current + 1);
    dialog.current?.showModal();
    if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      dialogTween.current = gsap.fromTo(
        dialog.current,
        { y: 12, scale: 0.98, opacity: 0.6 },
        {
          y: 0,
          scale: 1,
          opacity: 1,
          duration: 0.2,
          ease: "power2.out",
          clearProps: "transform,opacity",
        },
      );
    }
  });

  return (
    <div ref={root} className={styles.landing}>
      <a className="skip-link" href="#landing-content">
        Skip to content
      </a>
      <header className={styles.header}>
        <Link className="brand" href="/">
          HearDesk
        </Link>
        <nav aria-label="Public navigation">
          <a href="#how-it-works">How it works</a>
          <Link href="/track">Track feedback</Link>
          <Link href="/docs">Widget integration guide</Link>
        </nav>
        <Link className="btn" prefetch={false} href={accountHref}>
          {accountLabel}
        </Link>
      </header>
      <main id="landing-content">
        <section className={styles.hero}>
          <div className={styles.heroCopy}>
            <h1>
              <span className={styles.headlineLine} data-hero-motion>
                Website feedback.
              </span>
              <br />
              <span className={styles.headlineLine} data-hero-motion>
                Ready for your team.
              </span>
            </h1>
            <p data-hero-motion>
              Collect bug reports and suggestions with page context. Review them together, track
              their status, and keep internal notes.
            </p>
            <div className={styles.actions} data-hero-motion>
              <button type="button" className="btn primary" onClick={openDemo}>
                <ChatCircleIcon size={20} aria-hidden />
                Try the widget
              </button>
              <Link className="btn" prefetch={false} href={destination}>
                {action}
              </Link>
            </div>
            <p className={styles.demoHelper}>Try it here. Your demo report is never saved.</p>
          </div>
          <div className={styles.showcase}>
            <LandingPreview />
          </div>
          <div className={styles.productSummary}>
            <span>
              <ChatCircleIcon size={19} aria-hidden /> Visitors report it on your website.
            </span>
            <span>
              <CheckCircleIcon size={19} aria-hidden /> Your team reviews it in HearDesk.
            </span>
          </div>
        </section>
        <section id="how-it-works" className={styles.widgetSection}>
          <div className={styles.sectionCopy}>
            <h2>
              Let visitors report it
              <br />
              where it happens.
            </h2>
            <p>
              A bug, an idea, or a quick thank-you. Give visitors a place to share it while they are
              still on your website.
            </p>
            <ul className={styles.benefits}>
              <li>
                <CheckCircleIcon size={20} aria-hidden /> Visitors do not need an account.
              </li>
              <li>
                <CheckCircleIcon size={20} aria-hidden /> The page URL comes with the report.
              </li>
              <li>
                <CheckCircleIcon size={20} aria-hidden /> Email and screenshots are optional.
              </li>
            </ul>
            <button type="button" className="btn" onClick={openDemo}>
              Open widget demo
            </button>
          </div>
          <figure className={styles.widgetExample}>
            <div className={styles.widgetExampleHeader}>
              <ChatCircleIcon size={25} aria-hidden />
              <div>
                <strong>Share your feedback</strong>
                <span>Example visitor widget</span>
              </div>
            </div>
            <div className={styles.widgetExampleBody}>
              <span className={styles.exampleLabel}>What would you like to share?</span>
              <div className={styles.exampleTypes}>
                <span className={styles.exampleSelected}>
                  <BugIcon size={17} aria-hidden /> Bug
                </span>
                <span>
                  <LightbulbIcon size={17} aria-hidden /> Idea
                </span>
                <span>
                  <ChatCircleIcon size={17} aria-hidden /> Praise
                </span>
              </div>
              <span className={styles.exampleLabel}>Your message</span>
              <p className={styles.exampleMessage}>
                I cannot continue to payment on my phone after selecting my delivery address.
              </p>
              <div className={styles.exampleAttachment}>
                <PaperclipIcon size={17} aria-hidden /> Screenshot and email are optional
              </div>
              <div className={styles.examplePage}>
                <GlobeIcon size={17} aria-hidden /> store.example.test/checkout
              </div>
            </div>
            <figcaption>Widget illustration. Use the demo to try the real form.</figcaption>
          </figure>
        </section>
        <section className={styles.organizeSection}>
          <div className={styles.websiteExample}>
            <div className={styles.websiteExampleHeader}>
              <GlobeIcon size={22} aria-hidden />
              <strong>Websites in your Company</strong>
            </div>
            <ul>
              <li>
                <div>
                  <strong>Online store</strong>
                  <span>store.example.test</span>
                </div>
                <span>Bug reports</span>
              </li>
              <li>
                <div>
                  <strong>Web app</strong>
                  <span>app.example.test</span>
                </div>
                <span>Suggestions</span>
              </li>
              <li>
                <div>
                  <strong>Help center</strong>
                  <span>help.example.test</span>
                </div>
                <span>Compliments</span>
              </li>
            </ul>
            <p>Illustrative websites. Each has its own widget code.</p>
          </div>
          <div className={styles.sectionCopy}>
            <h2>
              Different websites.
              <br />
              One shared inbox.
            </h2>
            <p>
              Keep your store, app, and help center together in one Company. Filter feedback by
              website, update its status, and leave notes for your team.
            </p>
            <div className={styles.teamFeatures}>
              <div>
                <h3>Keep the context</h3>
                <p>Read the visitor’s message alongside the page it came from.</p>
              </div>
              <div>
                <h3>Keep the team in sync</h3>
                <p>Track new, reviewing, and closed reports. Internal notes stay with your team.</p>
              </div>
            </div>
            <Link className={styles.textLink} href="/docs">
              See how to connect your website
            </Link>
          </div>
        </section>
        <section className={styles.closing}>
          <div>
            <h2>See it from your visitor’s side.</h2>
            <p>
              Open the widget, write a report, and try sending it. Everything stays in this demo.
            </p>
          </div>
          <button type="button" className="btn primary" onClick={openDemo}>
            Try a demo report
          </button>
        </section>
      </main>
      <footer className={styles.footer}>
        <Link className="brand" href="/">
          HearDesk
        </Link>
        <span>Website feedback for product teams.</span>
        <Link href="/docs">Widget integration guide</Link>
        <Link prefetch={false} href={accountHref}>
          {accountLabel}
        </Link>
      </footer>
      <dialog
        ref={dialog}
        className="landing-demo"
        aria-label="Widget demo"
        closedby="any"
        onClose={clearDialogMotion}
      >
        <DemoForm key={session} close={() => dialog.current?.close()} />
      </dialog>
    </div>
  );
}
