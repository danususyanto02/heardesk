export const demoCompanyId = "heardesk-portfolio-demo";
export const demoSeed = "heardesk-portfolio-demo-v1";

export const demoAccounts = [
  {
    id: "heardesk-portfolio-platform-owner",
    label: "Platform Owner",
    email: "platform@heardesk.example.test",
    description: "Manage Companies and users across this demo installation.",
    platformRole: "PLATFORM_OWNER",
    companyRole: "VIEWER",
  },
  {
    id: "heardesk-portfolio-company-owner",
    label: "Company Owner",
    email: "owner@heardesk.example.test",
    description: "Manage Company settings, websites, team members, and feedback.",
    platformRole: "USER",
    companyRole: "OWNER",
  },
  {
    id: "heardesk-portfolio-company-admin",
    label: "Company Admin",
    email: "admin@heardesk.example.test",
    description: "Manage websites and team members, and work through the inbox.",
    platformRole: "USER",
    companyRole: "ADMIN",
  },
  {
    id: "heardesk-portfolio-agent",
    label: "Agent",
    email: "agent@heardesk.example.test",
    description: "Read feedback, update report status, and add internal notes.",
    platformRole: "USER",
    companyRole: "AGENT",
  },
  {
    id: "heardesk-portfolio-viewer",
    label: "Viewer",
    email: "viewer@heardesk.example.test",
    description: "Read feedback and website details without making changes.",
    platformRole: "USER",
    companyRole: "VIEWER",
  },
] as const;

export type DemoAccount = (typeof demoAccounts)[number];
export type PublicDemoAccess = Readonly<{
  password: string;
  accounts: readonly Pick<DemoAccount, "id" | "label" | "email" | "description">[];
}>;
