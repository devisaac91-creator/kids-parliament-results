import { Link, useNavigate } from '@tanstack/react-router';
import { useQueryClient } from '@tanstack/react-query';
import { useState, Suspense, type ReactNode } from 'react';
import { ArrowRight, GraduationCap, ShieldCheck, UserRound, BookOpen, LockKeyhole, ArrowLeft } from 'lucide-react';
import { api, errorMessage, isMockApi } from '@/api';
import { REQUIRE_SIGNUP_CODE } from '@/constants';
import { useAction, useParentSlip, useSettings } from '@/hooks/use-api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Field, PrintActions } from '@/components/screen-tools';
import { Picker, periodOptions } from '@/components/pickers';
import { EmptyState, ErrorState, LoadingState } from '@/components/states';
import { SlipView } from '@/components/slip-view';
import type { ParentStudentView } from '@/types';

function PublicFrame({ children }: { children: ReactNode }) {
  const { data: settings } = useSettings();
  return <div className="min-h-screen bg-background">
    <header className="border-b print:hidden"><div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-5 py-4"><Link to="/signin" className="flex min-w-0 items-center gap-3"><img src={settings.logoUrl} alt="Kids Parliament school crest" className="h-11 w-11 object-contain"/><div><p className="text-sm font-bold text-primary">Kids Parliament Results</p><p className="hidden text-xs text-muted-foreground sm:block">Educational Centre · Ghana</p></div></Link><Link to="/parent" className="flex items-center gap-2 text-sm font-medium text-primary"><UserRound className="h-4 w-4"/>Parent portal</Link></div></header>
    {children}
    <footer className="mx-auto max-w-6xl border-t px-5 py-5 text-center text-xs text-muted-foreground print:hidden">{settings.schoolName} · {settings.motto}</footer>
  </div>;
}

export function SignInPage() {
  const navigate = useNavigate(); const qc = useQueryClient();
  const [email, setEmail] = useState(''); const [password, setPassword] = useState('');
  const action = useAction(({ email, password }: { email: string; password: string }) => api.auth.signIn(email, password), { silent: true });
  async function signIn(emailValue: string, passwordValue: string) {
    try { const session = await action.mutateAsync({ email: emailValue, password: passwordValue }); qc.setQueryData(['me'], session.user); await navigate({ to: session.user.role === 'admin' ? '/admin' : '/teacher' }); } catch { /* inline feedback */ }
  }
  return <PublicFrame><main className="mx-auto grid max-w-6xl gap-10 px-5 py-10 md:grid-cols-2 md:gap-16 md:py-20">
    <section className="flex flex-col justify-center"><div className="mb-5 flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground"><span className="h-1 w-8 bg-primary"/>Examination Committee</div><h1 className="text-4xl font-extrabold leading-tight text-primary sm:text-5xl">Kids Parliament<br/>Results</h1><p className="mt-5 max-w-sm text-lg text-muted-foreground">Knowledge Is Power.</p><div className="mt-9 flex gap-4 border-t pt-6"><div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-row-alt text-primary"><GraduationCap/></div><div><p className="font-semibold">Kids Parliament Educational Centre</p><p className="mt-1 text-sm text-muted-foreground">End-of-month examinations · Basic 7–9</p></div></div></section>
    <section className="max-w-md md:justify-self-end md:w-full"><div className="mb-6"><h2 className="text-2xl font-bold">Staff sign in</h2><p className="mt-1 text-sm text-muted-foreground">Welcome back to your school.</p></div><form className="space-y-4" onSubmit={(e) => { e.preventDefault(); void signIn(email, password); }}><Field label="Email address"><Input type="email" autoComplete="username" placeholder="you@kidsparliament.edu.gh" required value={email} onChange={(e) => setEmail(e.target.value)}/></Field><Field label="Password"><Input type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)}/></Field>{action.error && <ErrorState error={action.error}/>}<Button className="h-11 w-full" disabled={action.isPending} type="submit">{action.isPending ? 'Signing in…' : 'Sign in'}<ArrowRight className="ml-auto"/></Button></form><p className="mt-5 text-center text-sm text-muted-foreground">New teacher? <Link to="/signup" className="font-semibold text-primary">Create an account</Link></p>
    {isMockApi && <div className="mt-8 border-t pt-5"><div className="mb-3 flex items-center justify-between"><p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Demo access</p><span className="rounded bg-warning/15 px-2 py-1 text-[10px] font-semibold text-warning-foreground">Demo data only</span></div><div className="grid grid-cols-2 gap-2"><Button variant="outline" disabled={action.isPending} onClick={() => void signIn('admin@kidsparliament.edu.gh', 'admin123')}><ShieldCheck/>Admin</Button><Button variant="outline" disabled={action.isPending} onClick={() => void signIn('teacher@kidsparliament.edu.gh', 'teacher123')}><BookOpen/>Teacher</Button></div><Button asChild variant="ghost" className="mt-2 w-full"><Link to="/parent">Sample parent code: KP-DEMO08<ArrowRight/></Link></Button></div>}
    </section></main></PublicFrame>;
}

export function SignUpPage() {
  const navigate = useNavigate(); const qc = useQueryClient();
  const [fullName, setName] = useState(''); const [email, setEmail] = useState(''); const [password, setPassword] = useState(''); const [signupCode, setCode] = useState('');
  const action = useAction(api.auth.signUp, { silent: true });
  return <PublicFrame><main className="mx-auto max-w-md px-5 py-10"><Link to="/signin" className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground"><ArrowLeft className="h-4 w-4"/>Staff sign in</Link><h1 className="text-2xl font-bold text-primary">Teacher registration</h1><p className="mb-6 mt-2 text-sm text-muted-foreground">Your account will be reviewed by the school Admin.</p><form className="space-y-4" onSubmit={async (e) => { e.preventDefault(); try { const session = await action.mutateAsync({ fullName, email, password, ...(REQUIRE_SIGNUP_CODE ? { signupCode } : {}) }); qc.setQueryData(['me'], session.user); await navigate({ to: '/teacher' }); } catch { /* inline */ } }}><Field label="Full name"><Input required value={fullName} onChange={(e) => setName(e.target.value)}/></Field><Field label="Email address"><Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}/></Field><Field label="Password"><Input type="password" minLength={6} required autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)}/></Field>{REQUIRE_SIGNUP_CODE && <Field label="School sign-up code"><Input required value={signupCode} onChange={(e) => setCode(e.target.value)}/></Field>}{action.error && <ErrorState error={action.error}/>}<Button type="submit" className="w-full" disabled={action.isPending}>{action.isPending ? 'Creating account…' : 'Create teacher account'}<ArrowRight/></Button></form></main></PublicFrame>;
}

export function ParentPage() {
  const [code, setCode] = useState(''); const [activeCode, setActiveCode] = useState(''); const [student, setStudent] = useState<ParentStudentView | null>(null); const [periodId, setPeriod] = useState('');
  const lookup = useAction(api.parentAccess.lookup, { silent: true });
  function leave() { setStudent(null); setCode(''); setActiveCode(''); lookup.reset(); }
  return <PublicFrame><main className={`mx-auto px-4 py-8 print:p-0 ${student ? 'max-w-4xl' : 'max-w-md'}`}>
    {!student ? <><div className="mb-5 flex h-12 w-12 items-center justify-center rounded-lg bg-row-alt text-primary"><LockKeyhole/></div><h1 className="text-2xl font-bold text-primary">Parent results portal</h1><p className="mb-7 mt-2 text-sm text-muted-foreground">Enter the student code provided by the school.</p><form className="space-y-4" onSubmit={async (e) => { e.preventDefault(); try { const s = await lookup.mutateAsync(code); setStudent(s); setActiveCode(code.trim()); setPeriod(s.publishedPeriods[0]?.id ?? ''); } catch { /* inline */ } }}><Field label="Student code"><Input required autoComplete="off" placeholder="KP-XXXXXX" value={code} onChange={(e) => setCode(e.target.value)} className="h-12 text-lg uppercase"/></Field>{lookup.error && <ErrorState error={lookup.error}/>}<Button type="submit" className="h-11 w-full" disabled={lookup.isPending}>{lookup.isPending ? 'Finding results…' : 'View results'}<ArrowRight/></Button></form><div className="mt-7 flex items-center gap-2 border-t pt-5 text-xs text-muted-foreground"><ShieldCheck className="h-4 w-4"/>Only results published by the school are available.</div></> : <><div className="mb-5 flex flex-wrap items-end justify-between gap-4 print:hidden"><div><Button variant="ghost" className="mb-2 -ml-3" onClick={leave}><ArrowLeft/>Different student</Button><h1 className="text-xl font-bold">{student.fullName}</h1><p className="text-sm text-muted-foreground">{student.className}</p></div>{periodId && <div className="flex flex-wrap gap-2"><PrintActions title={`${student.fullName} result slip`}/></div>}</div>{student.publishedPeriods.length ? <><div className="mb-5 print:hidden"><Picker label="Exam month" value={periodId} onChange={setPeriod} options={periodOptions(student.publishedPeriods)}/></div><Suspense fallback={<LoadingState label="Loading results…"/>}><ParentSlip code={activeCode} periodId={periodId}/></Suspense></> : <EmptyState title="No published results yet"/>}</>}
  </main></PublicFrame>;
}
function ParentSlip({ code, periodId }: { code: string; periodId: string }) { const { data } = useParentSlip(code, periodId); return <SlipView slip={data}/>; }
