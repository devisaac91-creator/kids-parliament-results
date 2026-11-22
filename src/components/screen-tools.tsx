import type { ReactNode } from 'react';
import { Download, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { printPage } from '@/lib/export';
export function Field({ label, children }: { label: string; children: ReactNode }) { return <label className="flex min-w-0 flex-col gap-1.5 text-sm font-medium">{label}{children}</label>; }
export function Modal({ title, open, onClose, children }: { title: string; open: boolean; onClose: () => void; children: ReactNode }) {
  return <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}><DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-xl"><DialogHeader><DialogTitle>{title}</DialogTitle><DialogDescription className="sr-only">{title}</DialogDescription></DialogHeader>{children}</DialogContent></Dialog>;
}
export function Confirm({ title, message, open, pending, onClose, onConfirm }: { title: string; message: string; open: boolean; pending: boolean; onClose: () => void; onConfirm: () => void }) {
  return <Modal title={title} open={open} onClose={onClose}><p className="text-sm text-muted-foreground">{message}</p><div className="flex justify-end gap-2"><Button variant="outline" onClick={onClose}>Cancel</Button><Button disabled={pending} onClick={onConfirm}>{pending ? 'Saving…' : 'Confirm'}</Button></div></Modal>;
}
export function PrintActions({ title }: { title: string }) { return <><Button variant="outline" onClick={() => printPage(title)}><Printer />Print</Button><Button onClick={() => printPage(title)}><Download />Download PDF</Button></>; }
export function TextField({ label, value, onChange, type = 'text', required = false }: { label: string; value: string; onChange: (v: string) => void; type?: string; required?: boolean }) {
  return <div className="space-y-1.5"><Label>{label}<Input className="mt-1.5" type={type} value={value} onChange={(e) => onChange(e.target.value)} required={required} /></Label></div>;
}
