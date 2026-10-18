import {verifiedDraftingChanges,type DraftingChange,type FormAssessment} from './drafting';
import modelDocument from './model-document.json';
import reference from './reference.json';
export type Page = {number:number;text:string};
export type Evidence = {page:number;quote:string;section:string};
export type Finding = {id:string;status:string;difference:string;implication:string;action:string;evidence:Evidence[];title?:string;related_model_ids?:string[];model_context?:{section:string;quote:string;explanation:string};drafting_changes?:DraftingChange[]};
export const statuses=['no change needed','substantively equivalent','materially modified','partially covered','not found','uncertain','not applicable'];
export function validateReport(raw:any,pages:Page[]) {
 if(!Array.isArray(raw?.items)||!Array.isArray(raw?.additional))throw new Error('The model returned an incomplete report. Please retry.');
 const validate=(r:any):Finding=>{
  if(!r||typeof r.id!=='string'||!statuses.includes(r.status)||!['difference','implication','action'].every(k=>typeof r[k]==='string')||!Array.isArray(r.evidence))throw new Error('Invalid analysis format. Please retry.');
  const evidence=r.evidence.filter((e:any)=>e&&typeof e.quote==='string'&&e.quote.trim().length>0&&typeof e.section==='string'&&pages.some(p=>p.number===e.page&&p.text.includes(e.quote)));
  const invalid=evidence.length!==r.evidence.length;
  const unsupported=!evidence.length&&!['not found','uncertain','not applicable'].includes(r.status);
  const model=reference.items.find(x=>x.id===r.id);
  const exact=!!model&&!invalid&&!unsupported&&['substantively equivalent','no change needed'].includes(r.status)&&evidence.some((e:Evidence)=>e.quote.trim().replace(/\s+/g,' ')===model.model_text.trim().replace(/\s+/g,' '));
  const drafting_changes=invalid||unsupported||exact?[]:verifiedDraftingChanges(r.drafting_changes,evidence,model?.model_text||'',pages);
  const related_model_ids=Array.isArray(r.related_model_ids)?[...new Set<string>(r.related_model_ids.filter((id:any)=>typeof id==='string'&&reference.items.some(x=>x.id===id)))]:[];
  const context=r.model_context;
  const model_context=context&&['section','quote','explanation'].every(k=>typeof context[k]==='string'&&context[k].trim().length>0)&&modelDocument.text.includes(context.quote)?context:undefined;
  return {...r,evidence,drafting_changes,related_model_ids,model_context,status:invalid||unsupported?'uncertain':exact?'no change needed':r.status==='no change needed'?'substantively equivalent':r.status,difference:exact?'Matches the LSTA wording exactly.':invalid||unsupported?'Source verification failed. Review this finding before relying on it.':r.difference,implication:exact?'No change needed.':invalid||unsupported?'Unverified model assessment withheld.':r.implication,action:exact?'':invalid||unsupported?'Review the source document manually.':r.action};
 };
 if(raw.items.length!==reference.items.length||new Set(raw.items.map((r:any)=>r.id)).size!==reference.items.length||!reference.items.every(r=>raw.items.some((x:any)=>x.id===r.id)))throw new Error('The model did not cover all 29 reference provisions. Please retry.');
 const relation=raw.form_assessment;
 const form_assessment:FormAssessment=relation&&['closely follows LSTA','adapted LSTA','different form','uncertain'].includes(relation.relationship)&&typeof relation.reason==='string'?relation:{relationship:'uncertain',reason:'Form relationship has not been assessed.'};
 const items=reference.items.map(r=>validate(raw.items.find((x:any)=>x.id===r.id)));
 return {form_assessment,items,additional:raw.additional.map(validate)};

}
export const guideContext=`Historical user-provided guide: Treatment of Taxes in Credit Agreements, October 8, 2012. Do not state its market survey or FATCA implementation dates as current. Guide context: distinguish taxes on payments from Increased Costs taxes. Analyze Excluded Taxes together with Indemnified Taxes, Connection Income Taxes and Increased Costs; broadening exclusions may have different effects depending on the Increased Costs carve-outs. Day-one withholding scope matters for foreign borrowers. Borrowers benefit from lender documentation obligations; lenders have a cost/prejudice exception with mandatory-form carve-outs. Generic legally prescribed forms may be substantively sufficient. Refund sharing benefits indemnifiers; expense deductions, repayment and net-after-tax protection protect indemnified parties. Tax-credit sharing differs from refund sharing. This is contextual paraphrase, not a current legal opinion. Guide does not cover every starred provision; label independent inferences. The supplied model Terms Generally clause also provides that a reference to a law or regulation, unless otherwise specified, refers to it as amended, modified or supplemented from time to time. Assess equivalent interpretation clauses in the uploaded agreement before describing a Code-definition amendment as substantively necessary. Model cross-reference issue: U.S. Tax Compliance Certificate points to (f), but Status of Lenders is (g).`;
export {reference};
