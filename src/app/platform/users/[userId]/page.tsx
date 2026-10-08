import Link from "next/link";
import {requireActor} from "@/server/auth";
import {db} from "@/server/db";
import {createPlatformUsers} from "@/server/composition/platform-users";
import {PlatformUserEditor} from "@/components/platform-user";
import {notFound} from "next/navigation";
export default async function UserDetail({params}:{params:Promise<{userId:string}>}){let user;try{user=await createPlatformUsers(db,{current:()=>requireActor()}).detail((await params).userId);}catch(error){if(error instanceof Error&&"code" in error&&error.code==="PLATFORM_NOT_FOUND")notFound();throw error;}return <><Link className="btn quiet" href="/platform/users">Back to Users</Link><div className="page-heading"><div><h1>{user.name}</h1><p className="muted">{user.email} · {user.emailVerified?"Verified":"Unverified"} · {user.platformRole==="PLATFORM_OWNER"?"Platform Owner":"Client"}</p></div></div><div className="platform-edit-grid"><PlatformUserEditor initial={user}/><section className="platform-panel platform-edit"><h2>Company memberships</h2>{user.companies.length?<ul>{user.companies.map(company=><li key={company.id}><Link href={`/platform/companies/${company.id}`}>{company.name}</Link> · {company.role}</li>)}</ul>:<p>No Company memberships.</p>}<p className="helper">Company roles are managed separately by the Company team.</p></section></div></>;}
