'use client';
import {useEffect,useRef} from 'react';
export default function AboutTool({onClose}:{onClose:()=>void}){
 const dialog=useRef<HTMLDialogElement>(null);
 useEffect(()=>{dialog.current?.showModal();},[]);
 return <dialog ref={dialog} className="about-tool" onClose={onClose} onClick={event=>{if(event.target===event.currentTarget)dialog.current?.close();}} aria-labelledby="about-tool-title">
  <article><button className="about-close" aria-label="Close What This Tool Does" onClick={()=>dialog.current?.close()} autoFocus>×</button>
  <h2 id="about-tool-title">What This Tool Does</h2>
  <p>LSTA Tax Comparison compares the tax language in your credit or loan agreement against 29 marked provisions in the supplied LSTA model agreement.</p>
  <p>Choose whether you represent the borrower or lender, then upload your agreement. The tool creates a comparison chart with three columns:</p>
  <dl className="about-columns">
   <div><dt>LSTA Provision</dt><dd>The model language and a concise summary of what the provision does.</dd></div>
   <div><dt>Your Agreement</dt><dd>The corresponding language from your agreement, a summary of its treatment, and any differences. If a provision is missing, the chart says so.</dd></div>
   <div><dt>Assessment for Borrower or Lender</dt><dd>Recommendations tailored to the party you represent, with proposed wording where appropriate. The default drafting approach is to conform to the supplied LSTA model, including minor grammar and punctuation differences.</dd></div>
  </dl>
  <p>The comparison looks at substance, even when headings, numbering, or wording differ. It also identifies additional tax provisions elsewhere in your agreement.</p>
  <p>An annotated agreement highlights the source passages used in the comparison, so you can review the supporting language and download an annotated copy. Scanned PDFs can be made searchable with built-in OCR.</p>
  <button className="primary" onClick={()=>dialog.current?.close()}>Back to Agreement Review</button></article>
 </dialog>;
}
