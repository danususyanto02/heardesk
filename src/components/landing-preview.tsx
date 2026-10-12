"use client";

import { useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import {
  BugIcon,
  ChatCircleIcon,
  GlobeIcon,
  TrayIcon,
  LightbulbIcon,
  LockSimpleIcon,
} from "@phosphor-icons/react";
import styles from "./landing.module.css";

gsap.registerPlugin(useGSAP, ScrollTrigger);

const reports = [
  {
    title: "Checkout button does not respond on mobile",
    website: "Online store",
    page: "store.example.test/checkout",
    type: "Bug report",
    status: "Reviewing",
    message: "I selected my delivery address, but I cannot continue to payment on my phone.",
    note: "Check the checkout flow on mobile before the next release.",
    icon: BugIcon,
  },
  {
    title: "Add a dark mode option",
    website: "Web app",
    page: "app.example.test/settings",
    type: "Suggestion",
    status: "New",
    message: "I often use the app in the evening. A dark mode option would make it easier to read.",
    note: "Include this request in the next design review.",
    icon: LightbulbIcon,
  },
  {
    title: "The new help page is easy to follow",
    website: "Help center",
    page: "help.example.test/getting-started",
    type: "Compliment",
    status: "Closed",
    message: "The instructions helped me connect my website without asking for help. Thank you!",
    note: "Share this feedback with the documentation team.",
    icon: ChatCircleIcon,
  },
];

export function LandingPreview() {
  const root = useRef<HTMLElement>(null);
  const detail = useRef<HTMLElement>(null);
  const entrance = useRef<gsap.core.Timeline | null>(null);
  const interacted = useRef(false);
  const entranceStarted = useRef(false);
  const [selected, setSelected] = useState(0);
  const report = reports[selected];
  const ReportIcon = report.icon;

  useGSAP(
    () => {
      const media = gsap.matchMedia();
      media.add(
        { animate: "(prefers-reduced-motion: no-preference)", mobile: "(max-width: 700px)" },
        (context) => {
          if (!context.conditions?.animate || interacted.current || entranceStarted.current) {
            return;
          }
          entrance.current = gsap.timeline({
            onStart: () => {
              entranceStarted.current = true;
            },
            defaults: { duration: 0.45, ease: "power3.out", clearProps: "transform,opacity" },
            scrollTrigger: { trigger: root.current, start: "top 85%", once: true },
          });
          entrance.current
            .fromTo(
              "[data-report-motion]",
              { x: context.conditions.mobile ? -6 : -12, opacity: 0.55 },
              { x: 0, opacity: 1, stagger: 0.08 },
            )
            .fromTo(
              "[data-detail-motion]",
              { y: 10, opacity: 0.55 },
              { y: 0, opacity: 1, stagger: 0.1 },
              "-=0.25",
            );
          return () => {
            entrance.current = null;
          };
        },
      );
      return () => media.revert();
    },
    { scope: root },
  );

  useGSAP(
    () => {
      if (!interacted.current) {
        return;
      }
      const media = gsap.matchMedia();
      media.add("(prefers-reduced-motion: no-preference)", () => {
        gsap.fromTo(
          detail.current,
          { y: 8, opacity: 0.6 },
          {
            y: 0,
            opacity: 1,
            duration: 0.22,
            ease: "power2.out",
            clearProps: "transform,opacity",
          },
        );
      });
      return () => media.revert();
    },
    { scope: root, dependencies: [selected], revertOnUpdate: true },
  );

  function selectReport(index: number) {
    interacted.current = true;
    entrance.current?.progress(1);
    entrance.current?.scrollTrigger?.kill();
    setSelected(index);
  }

  return (
    <figure ref={root} className={styles.preview}>
      <div className={styles.previewBar}>
        <strong>HearDesk</strong>
        <span>Demo workspace</span>
      </div>
      <div className={styles.previewLayout}>
        <div className={styles.previewSidebar}>
          <span className={styles.companyLabel}>Your Company</span>
          <div className={styles.sidebarCurrent}>
            <TrayIcon size={18} aria-hidden /> Inbox
          </div>
          <div className={styles.sidebarLabel}>
            <GlobeIcon size={18} aria-hidden /> Websites
          </div>
          <div className={styles.sidebarWebsites}>
            <span>Online store</span>
            <span>Web app</span>
            <span>Help center</span>
          </div>
          <p className={styles.sidebarFoot}>Feedback stays within your Company.</p>
        </div>
        <div className={styles.reportList}>
          <div className={styles.reportListHeader}>
            <h2>Feedback inbox</h2>
            <span>Choose a report</span>
          </div>
          <ul>
            {reports.map((item, index) => {
              const Icon = item.icon;
              return (
                <li key={item.page} data-report-motion>
                  <button
                    type="button"
                    className={styles.reportButton}
                    aria-pressed={selected === index}
                    aria-controls="demo-report-detail"
                    onClick={() => selectReport(index)}
                  >
                    <span className={styles.reportMeta}>
                      <span>
                        <Icon size={16} aria-hidden /> {item.type}
                      </span>
                      <span>{item.status}</span>
                    </span>
                    <strong>{item.title}</strong>
                    <span className={styles.reportWebsite}>{item.website}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
        <section
          ref={detail}
          id="demo-report-detail"
          className={styles.reportDetail}
          aria-label="Demo report detail"
          aria-live="polite"
          aria-atomic="true"
        >
          <div className={styles.detailMeta}>
            <span>
              <ReportIcon size={17} aria-hidden /> {report.type}
            </span>
            <span className={styles.previewStatus}>{report.status}</span>
          </div>
          <h3 data-detail-motion>{report.title}</h3>
          <p className={styles.visitorMessage} data-detail-motion>
            {report.message}
          </p>
          <dl className={styles.pageContext} data-detail-motion>
            <dt>Sent from</dt>
            <dd>
              <GlobeIcon size={16} aria-hidden /> {report.page}
            </dd>
          </dl>
          <div className={styles.internalNote} data-detail-motion>
            <h4>
              <LockSimpleIcon size={16} aria-hidden /> Internal note
            </h4>
            <p>{report.note}</p>
            <span>Only your team can see internal notes.</span>
          </div>
        </section>
      </div>
      <figcaption>
        Illustrative reports. Select one to see its message, page context, and team note.
      </figcaption>
    </figure>
  );
}
