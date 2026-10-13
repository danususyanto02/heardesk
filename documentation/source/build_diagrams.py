"""Generate self-contained editorial diagrams from the as-built HearDesk model."""
from html import escape
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "diagrams" / "source"
OUT.mkdir(parents=True, exist_ok=True)
BLUE = "#1463D6"
INK = "#17243B"
MUTED = "#46566D"


def text(x, y, value, size=18, fill=INK, anchor="start", weight=400):
    return f'<text x="{x}" y="{y}" font-size="{size}" fill="{fill}" text-anchor="{anchor}" font-weight="{weight}">{escape(value)}</text>'


def box(x, y, title, lines=(), w=240, h=100, focal=False):
    result = f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="8" fill="{"#EEF4FF" if focal else "#FFFFFF"}" stroke="{BLUE if focal else MUTED}" stroke-width="1.5"/>'
    result += text(x + 16, y + 32, title, 20, BLUE if focal else INK, weight=600)
    for i, line in enumerate(lines):
        result += text(x + 16, y + 60 + i * 24, line, 16, MUTED)
    return result


def line(x1, y1, x2, y2, dash=False, arrow=True):
    return f'<line x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}" stroke="{MUTED}" stroke-width="1.5" {"stroke-dasharray=\"6 5\"" if dash else ""} {"marker-end=\"url(#arrow)\"" if arrow else ""}/>'


def elbow(x1, y1, x2, y2, mid):
    sign = 1 if y2 > y1 else -1
    return f'<path d="M{x1},{y1} H{mid-8} Q{mid},{y1} {mid},{y1+8*sign} V{y2-8*sign} Q{mid},{y2} {mid+8},{y2} H{x2}" fill="none" stroke="{MUTED}" stroke-width="1.5" marker-end="url(#arrow)"/>'


def diagram(slug, title, summary, body, note, height=720):
    svg = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1120 {height}" role="img" aria-labelledby="{slug}-title {slug}-desc">
<title id="{slug}-title">{escape(title)}</title><desc id="{slug}-desc">{escape(summary)}</desc>
<defs><marker id="arrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L8 4L0 8Z" fill="{MUTED}"/></marker></defs>
<style>text{{font-family:'Source Sans 3',Arial,sans-serif}} </style>
<rect width="1120" height="{height}" fill="#FFFFFF"/>
{text(40,64,title,32,weight=600)}{text(40,100,summary,18,MUTED)}
{body}<line x1="40" y1="{height-72}" x2="1080" y2="{height-72}" stroke="#CAD3DF"/>
{text(40,height-40,note,16,MUTED)}</svg>'''
    html = f'''<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>{escape(title)}</title><style>@font-face{{font-family:'Source Sans 3';src:url('../../../node_modules/@fontsource/source-sans-3/files/source-sans-3-latin-400-normal.woff2')}}@font-face{{font-family:'Source Sans 3';font-weight:600;src:url('../../../node_modules/@fontsource/source-sans-3/files/source-sans-3-latin-600-normal.woff2')}}body{{margin:0;background:#fff}}.diagram-container{{width:100%;overflow-x:auto}}svg{{display:block;width:100%;min-width:1120px}}@media print{{svg{{min-width:0}}.diagram-container{{overflow:visible}}}}</style><div class="diagram-container">{svg}</div></html>'''
    (OUT / f"{slug}.html").write_text(html, encoding="utf-8")


body = line(280,256,440,256) + line(680,256,840,256) + line(560,308,560,408)
body += box(40,204,"Website visitor",["Feedback form on website", "No visitor login"],h=104)
body += box(440,204,"HearDesk",["Team inbox and tracking", "Separate Company access"],h=104,focal=True)
body += box(840,204,"Website team",["Review and respond", "OWNER / ADMIN / AGENT"],h=104)
body += box(440,408,"Platform Owner",["Manage service and limits", "Separate management view"],h=104)
diagram("system-context","Who uses HearDesk","Visitors send reports. Website teams review and respond.",body,"Platform Owners read Company inboxes through membership and permission in each Company.")

body = line(280,236,440,236)+line(680,236,840,236)+line(960,288,960,396)
body += elbow(680,260,840,580,760)
body += box(40,184,"Browser screens",["Form / inbox / tracking"],h=104)
body += box(440,184,"Next.js request layer",["Check requests and login", "Check website origin"],h=104,focal=True)
body += box(840,184,"Business operations",["Company permission checks", "Usage limits and retries"],h=104)
body += box(840,396,"PostgreSQL",["Database access via Prisma", "Reports and usage counts"],h=104)
body += box(840,532,"Private file storage",["Processed screenshots", "Permission-checked access"],h=100)
diagram("application-architecture","How HearDesk handles a request","One application organized into feature modules, with database and file storage.",body,"The request layer connects business operations to storage through server and database adapters.",height=760)

body = line(280,224,440,224,arrow=False)+line(680,224,840,224,arrow=False)
body += line(960,296,960,384,arrow=False)
body += box(40,156,"User",["id (PK)","name / email", "platformRole"],h=140)
body += box(440,156,"Member",["organizationId (FK)","userId (FK)","role"],h=140)
body += box(840,156,"Organization",["id (PK) / name", "Company workspace", "slug (unique)"],h=140,focal=True)
body += box(840,384,"CompanyProfile",["organizationId (PK/FK)","ACTIVE / SUSPENDED"],h=112)
body += text(304,212,"1 : N",16,MUTED)+text(708,212,"N : 1",16,MUTED)+text(976,352,"1 : 0..1",16,MUTED)
diagram("identity-company-model","Users and Company membership","The Member record gives a user a role in one Company.",body,"PK identifies a record. FK links records. 1:N means one to many. 0..1 means zero or one.")

body = line(280,224,440,224,arrow=False)+line(680,224,840,224,arrow=False)
body += line(960,300,960,400,arrow=False)
body += box(40,156,"Organization",["id (PK)","Company workspace"],h=144)
body += box(440,156,"Site",["id (PK)","companyId (FK)","origin / publicKey"],h=144)
body += box(840,156,"Feedback",["siteId (FK)","submissionId / fingerprint", "trackingHash (nullable)"],h=144,focal=True)
body += box(840,400,"PublicReply",["feedbackId / authorId (FK)","requestId / body"],h=112)
body += box(440,400,"Private report data",["Attachment: 0..1 per report", "InternalNote: many per report"],h=112)
body += text(312,212,"1 : N",16,MUTED)+text(708,212,"1 : N",16,MUTED)+text(976,360,"1 : N",16,MUTED)
# Private-data relation routes below the top row, away from other nodes.
body += f'<path d="M840,276 H776 Q768,276 768,284 V364 Q768,372 760,372 H616 Q608,372 608,380 V400" fill="none" stroke="{MUTED}" stroke-width="1.5"/>'
diagram("feedback-data-model","Reports, replies and private data","PublicReply stores a team reply visible through the report's private tracking link.",body,"Private data belongs to Feedback. authorId links to User. 1:N means one report can have many replies.")


def sequence(slug,title,summary,actors,messages,note):
    centers=[160+i*264 for i in range(len(actors))]
    body=""
    for cx in centers: body+=line(cx,244,cx,612,dash=True,arrow=False)
    for i,(a,b,label,returned) in enumerate(messages):
        y=284+i*48
        body+=line(centers[a],y,centers[b],y,dash=returned)
        body+=text((centers[a]+centers[b])/2,y-12,label,16,MUTED,"middle")
    for cx,actor in zip(centers,actors): body+=box(cx-112,156,actor,w=224,h=88)
    diagram(slug,title,summary,body,note)


sequence("submit-sequence","Sending a report without login","The widget keeps the same request ID and tracking code when retrying unchanged content.",
 ["Visitor widget","Feedback API","Submit operation","Database"],[
 (0,1,"Send form and code",False),(1,2,"Checked data and hash",False),
 (2,3,"Reserve space and save",False),(3,2,"New or existing report",True),
 (2,1,"Report accepted",True),(1,0,"Saved tracking code",True)],
 "Matching request IDs and content prevent duplicates. Changed content with the same ID is rejected.")
sequence("tracking-sequence","Checking status and team replies","The private code opens one report. Staff need Company permission to write replies.",
 ["Visitor","Tracking API","PostgreSQL","Website team"],[
 (3,2,"Save permitted reply",False),(0,1,"Send code, no cookies",False),
 (1,2,"Code + active Company",False),(2,1,"Visitor response fields",True),
 (1,0,"Status and team replies",True)],
 "Staff replies pass through Company access checks. The visitor response excludes private team data.")

body=line(240,292,328,292)+line(520,292,608,292)+line(800,292,888,292)
for x,name,sub in [(48,"NEW","Received"),(328,"REVIEWING","Under review"),(608,"DONE","Completed"),(888,"ARCHIVED","Archived")]:
    body+=box(x,240,name,[sub],w=192,h=104,focal=name=="DONE")
body+=text(48,420,"A typical review order, not a required sequence.",22,INK)
body+=text(48,460,"Staff with permission may choose any status, including reopening a report.",18,MUTED)
diagram("feedback-status","What report statuses mean","HearDesk shows the current status, not a timeline of every status change.",body,"The arrows show a suggested workflow. The application does not force one-way status changes.")

body=""
for i,(name,sub) in enumerate([( "Recorded code version","Identified by Git commit"),("Automated tests","Code, database and browser"),("SonarQube analysis","Code findings and coverage")]):
    x=40+i*400
    if i<2: body+=line(x+240,252,x+400,252)
    body+=box(x,200,name,[sub],h=104,focal=i==2)
body+=text(40,420,"Passing tests and passing the Quality Gate are separate checks.",22,INK)
body+=text(40,460,"The Quality Gate applies configured rules to the analysis results.",18,MUTED)
diagram("quality-workflow","How quality evidence is collected","Record the code version, run tests and review SonarQube results separately.",body,"This is an overview of the evidence flow, not a diagram of the exact Jenkins job stages.")
print(f"Generated {len(list(OUT.glob('*.html')))} diagram sources")
