# Portfolio demo accounts

The login page can publish credentials for Company Owner, Company Admin, Agent, Viewer, and an optional Platform Owner. Every account is a dedicated demo identity. The installation administrator's email and password are never used for this list.

Demo credentials are public access, not secrets. Visitors share these accounts and can use the permissions of their selected role. Keep private data out of the demo Company. Company Owner and Company Admin can change the demo team's access, so shared accounts may become unavailable after a visitor changes them.

## Enable Company demo accounts

1. Back up the target database. Confirm that `DATABASE_URL` points to the intended `ureport` database and `APP_URL` matches the application origin.
2. Set these server environment values. Choose a password with 15 to 128 characters that is not used anywhere else.

```dotenv
HEARDESK_DEMO_ACCOUNTS="true"
HEARDESK_DEMO_PASSWORD="REPLACE_WITH_A_PUBLIC_DEMO_ONLY_PASSWORD"
HEARDESK_DEMO_PLATFORM_OWNER="false"
HEARDESK_DEMO_ONLY="false"
```

3. In the operator environment, set `HEARDESK_DEMO_PROVISION_APPROVED=true`, then run:

```sh
npm run db:demo:accounts
```

For a public application origin, also set `HEARDESK_DEMO_PUBLIC_APPROVED=true`. Public origins require HTTPS. These approval flags authorize the provisioning command, not a deployment.

4. Remove the approval flags after provisioning and restart the application with the demo settings. Open `/login` while signed out.

Provisioning creates the separate **HearDesk Portfolio (Demo)** Company, one illustrative website, three example reports, and the four Company accounts. It does not reset the application or change existing users, passwords, Company memberships, or reports. Re-running with the same managed accounts preserves their data. Unexpected identity, role, membership, or password differences stop the transaction instead of overwriting them.

| Role          | Email                        |
| ------------- | ---------------------------- |
| Company Owner | owner@heardesk.example.test  |
| Company Admin | admin@heardesk.example.test  |
| Agent         | agent@heardesk.example.test  |
| Viewer        | viewer@heardesk.example.test |

These `.test` addresses are login identifiers and do not receive email. Demo identities are provisioned as verified accounts. Normal sign-in, session, rate-limit, and Company permission checks still apply.

The login page lists only active managed identities with the expected membership and a matching credential password. It hides unprovisioned, suspended, mismatched, or otherwise unavailable accounts. Selecting **Use account** fills the form without submitting it. The visitor selects **Sign in** to authenticate.

## Optional Platform Owner demo

**Do not publish Platform Owner credentials on an installation containing private data or real users.** This role can see platform-wide Company and user information and can suspend accounts or revoke sessions. A separate demo Company does not isolate platform permissions.

Use a separate installation that is intended entirely for public demonstration. The operator must explicitly declare:

```dotenv
HEARDESK_DEMO_PLATFORM_OWNER="true"
HEARDESK_DEMO_ONLY="true"
```

Then run the same provisioning command with the approval flags after reviewing the target and taking a backup. This adds `platform@heardesk.example.test` as a separate Platform Owner demo account. It has Viewer membership in the demo Company, not unrestricted inbox access to other Companies. Company membership is still required to read a Company's reports.

`HEARDESK_DEMO_ONLY=true` is an operator declaration, not a sandbox or an automatic guarantee that the database contains no private data. Do not enable it simply to make the fifth account appear. Setup and the private installation administrator stay separate.

## Disable or rotate access

Set `HEARDESK_DEMO_ACCOUNTS=false` to hide the public credentials list. **Hiding credentials does not disable an account or revoke existing sessions.** To end access for the four Company accounts, suspend those demo users through your private Platform Owner account and revoke their sessions.

The optional demo Platform Owner is protected from suspension through the UI and Company management APIs, just like other Platform Owners. Revoking its sessions alone does not prevent signing in again with the public password. Removing its publication flag also does not revoke that password.

To disable this specific account, use an explicitly approved operator transaction after a backup:

1. Select and lock user `heardesk-portfolio-platform-owner`. Confirm its email is `platform@heardesk.example.test`, its platform role is `PLATFORM_OWNER`, and its ID is not the administrator ID in `Installation`. Abort if any check differs.
2. Set only this user's `accountStatus` to `SUSPENDED` and delete only sessions belonging to this user in the same transaction, then commit. Do not change the private installation administrator or remove normal Platform Owner protections.
3. Keep `HEARDESK_DEMO_PLATFORM_OWNER=false`. The provisioning command will refuse to reactivate the suspended identity.

Alternatively, rotate only account `heardesk-portfolio-platform-owner-credential` to a fresh non-public password hash using `hashPassword` from `better-auth/crypto`, and revoke that user's sessions in the same approved transaction. Do not reuse the shared demo password. `npm run admin:reset` is not appropriate here because it targets the private installation administrator.

To rotate the shared password, update the managed demo credential hashes through an explicitly approved operator operation and revoke their sessions, then update `HEARDESK_DEMO_PASSWORD` and restart. The provisioning command intentionally refuses to reset existing passwords.

There is no automatic data reset or scheduled cleanup. The website origin `https://portfolio-demo.example.test` and the seeded reports are labelled illustrative data, not a real customer website or private visitor activity.
