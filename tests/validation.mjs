import assert from 'node:assert/strict';
import ts from 'typescript';
import fs from 'node:fs';
const draftingJs=ts.transpileModule(fs.readFileSync('lib/drafting.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.ES2022,target:ts.ScriptTarget.ES2022}}).outputText;
const draftingUrl='data:text/javascript;base64,'+Buffer.from(draftingJs).toString('base64');
const source=fs.readFileSync('lib/analysis.ts','utf8').replace("from './drafting'",`from '${draftingUrl}'`).replace("import modelDocument from './model-document.json';",`const modelDocument=${fs.readFileSync('lib/model-document.json','utf8')};`).replace("import reference from './reference.json';",`const reference=${fs.readFileSync('lib/reference.json','utf8')};`);
const js=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ES2022,target:ts.ScriptTarget.ES2022}}).outputText;
const {validateReport,reference}=await import('data:text/javascript;base64,'+Buffer.from(js).toString('base64'));
const base=()=>({items:reference.items.map(r=>({id:r.id,status:'not found',difference:'Not found after full review.',implication:'Review impact.',action:'Review.',evidence:[]})),additional:[]});
const pages=[{number:1,text:'Each Lender shall deliver tax forms.'}];
assert.equal(validateReport(base(),pages).items.length,29);
const missing=base();missing.items.pop();assert.throws(()=>validateReport(missing,pages),/29/);
const duplicate=base();duplicate.items[0]=duplicate.items[1];assert.throws(()=>validateReport(duplicate,pages),/29/);
const fabricated=base();fabricated.items[0].status='substantively equivalent';fabricated.items[0].evidence=[{page:1,quote:'Fabricated passage',section:'Taxes'}];assert.equal(validateReport(fabricated,pages).items[0].status,'uncertain');assert.equal(validateReport(fabricated,pages).items[0].evidence.length,0);
const valid=base();valid.items[0].status='partially covered';valid.items[0].evidence=[{page:1,quote:pages[0].text,section:'Documentation'}];assert.equal(validateReport(valid,pages).items[0].status,'partially covered');
const wrongPage=base();wrongPage.items[0].evidence=[{page:7,quote:pages[0].text,section:'Documentation'}];assert.equal(validateReport(wrongPage,pages).items[0].status,'uncertain');
console.log('Passed: complete inventory, missing/duplicate IDs, fabricated quotations, valid evidence, incorrect page references.');
const analysisUrl='data:text/javascript;base64,'+Buffer.from(js).toString('base64');
const sampleSource=fs.readFileSync('lib/sample.ts','utf8').replace("import modelDocument from './model-document.json';",`const modelDocument=${fs.readFileSync('lib/model-document.json','utf8')};`).replace("from './analysis'",`from '${analysisUrl}'`);
const sampleJs=ts.transpileModule(sampleSource,{compilerOptions:{module:ts.ModuleKind.ES2022,target:ts.ScriptTarget.ES2022}}).outputText;
const {generateSample,sampleReport}=await import('data:text/javascript;base64,'+Buffer.from(sampleJs).toString('base64'));
for(const variant of [0,1]){const sample=generateSample(variant);assert.equal(sample.changed.size,7);assert.ok(sample.changed.get('TAX-01').text.includes('1954'));assert.ok(!sample.pages[0].text.includes('*'+reference.items[0].model_text));const report=sampleReport(sample,'borrower');assert.equal(report.items.length,29);assert.equal(report.items.filter(r=>r.status==='not found').length,2);assert.equal(report.items.filter(r=>r.status==='materially modified').length,5);assert.equal(report.items.filter(r=>r.status==='uncertain').length,0);assert.equal(report.additional.length,1);assert.equal(sampleReport(sample,'lender').items[20].implication.includes('wait longer'),true);assert.equal(sample.pages[0].text.includes(`within ${variant===0?30:45} days`),true);}
console.log('Passed: sample generation variants, seven tax changes, two missing provisions, five modified provisions, 29 verified rows and side-specific findings.');

const codePages=[{number:1,text:'“Code” means the Internal Revenue Code of 1986.'}];
const codeRaw=base();codeRaw.form_assessment={relationship:'adapted LSTA',reason:'Multiple corresponding model clauses.'};codeRaw.items[0]={...codeRaw.items[0],status:'substantively equivalent',evidence:[{page:1,quote:codePages[0].text,section:'Definitions'}]};
const codeReport=validateReport(codeRaw,codePages);assert.equal(codeReport.items[0].status,'no change needed');assert.equal(codeReport.items[0].drafting_changes.length,0);assert.equal(codeReport.items[0].implication,'No change needed.');
codeRaw.form_assessment.relationship='different form';assert.equal(validateReport(codeRaw,codePages).items[0].drafting_changes.length,0);
const {verifiedDraftingChanges}=await import(draftingUrl);
const edit={kind:'model wording',before:codePages[0].text,after:'Edited definition.',reason:'Editorial correction.',model_quote:'Invented model text',page:1};assert.equal(verifiedDraftingChanges([edit],codeRaw.items[0].evidence,reference.items[0].model_text,codePages).length,0);
edit.model_quote=reference.items[0].model_text;assert.equal(verifiedDraftingChanges([edit],codeRaw.items[0].evidence,reference.items[0].model_text,codePages).length,1);edit.before='Invented source text';assert.equal(verifiedDraftingChanges([edit],codeRaw.items[0].evidence,reference.items[0].model_text,codePages).length,0);
console.log('Passed: exact wording needs no change, no automatic Code amendment, verified drafting quotations.');
const relatedRaw=base();relatedRaw.additional=[{id:'EXTRA',title:'Related provision',status:'partially covered',difference:'Explanation.',implication:'Impact.',action:'Recommendation.',evidence:[{page:1,quote:pages[0].text,section:'Documentation'}],related_model_ids:['TAX-24','NOT-REAL'],model_context:{section:'Model section',quote:'Fabricated model quotation',explanation:'Unverified'}}];
const relatedReport=validateReport(relatedRaw,pages);assert.deepEqual(relatedReport.additional[0].related_model_ids,['TAX-24']);assert.equal(relatedReport.additional[0].model_context,undefined);
relatedRaw.additional[0].model_context.quote=reference.items[0].model_text;assert.equal(validateReport(relatedRaw,pages).additional[0].model_context.quote,reference.items[0].model_text);
console.log('Passed: additional-provision model relationships and model-context quotation verification.');
const highlightSource=ts.transpileModule(fs.readFileSync('lib/highlights.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.ES2022,target:ts.ScriptTarget.ES2022}}).outputText;
const {highlightedSegments}=await import('data:text/javascript;base64,'+Buffer.from(highlightSource).toString('base64'));
const highlightPage={number:1,text:'ABC DEF GHI ABC'};
const highlightFindings=[{id:'TAX-01',evidence:[{page:1,quote:'ABC DEF'}]},{id:'TAX-02',evidence:[{page:1,quote:'DEF GHI'}]},{id:'TAX-03',evidence:[{page:1,quote:'ABC'}]},{id:'TAX-04',evidence:[{page:2,quote:'GHI'}]}];
const segments=highlightedSegments(highlightPage,highlightFindings);assert.equal(segments.map(s=>s.text).join(''),highlightPage.text);assert.ok(segments.some(s=>s.text==='DEF'&&s.ids.includes('TAX-01')&&s.ids.includes('TAX-02')));assert.equal(segments.at(-1).ids.includes('TAX-03'),true);assert.equal(segments.some(s=>s.ids.includes('TAX-04')),false);assert.deepEqual(highlightedSegments({number:1,text:'No matching passage.'},highlightFindings),[{text:'No matching passage.',ids:[]}]);
console.log('Passed: overlapping/repeated highlights, page boundaries, source-text preservation and missing passages.');

const punctuationRaw=base();const punctuationPages=[{number:1,text:'“Code” means the Internal Revenue Code of 1986'}];punctuationRaw.items[0]={...punctuationRaw.items[0],status:'substantively equivalent',evidence:[{page:1,section:'Definitions',quote:punctuationPages[0].text}]};assert.equal(validateReport(punctuationRaw,punctuationPages).items[0].status,'substantively equivalent');
console.log('Passed: punctuation differences are not treated as exact matches.');
const {highlightedAgreementHtml}=await import('data:text/javascript;base64,'+Buffer.from(highlightSource).toString('base64'));
const exported=highlightedAgreementHtml({pages:[{number:1,text:'<script>alert(1)</script> ABC'}],items:[{id:'TAX-01',evidence:[{page:1,quote:'ABC'}]}],name:'<img src=x>',side:'borrower',demo:true,references:[{id:'TAX-01',title:'Code'},{id:'TAX-02',title:'Missing'}]});assert.ok(exported.includes('&lt;script&gt;'));assert.ok(!exported.includes('<script>'));assert.ok(exported.includes('<mark'));assert.ok(exported.includes('No verified passage'));assert.ok(exported.includes('Sample Expected Findings'));assert.ok(exported.includes('Content-Security-Policy'));
console.log('Passed: highlighted HTML download, source escaping, reference labels, missing passages and sample labeling.');

// Annotation markers must not make identical contractual text merely equivalent.
for (const ref of reference.items) {
 const raw=base();
 const quote='*'+ref.model_text.trim();
 raw.items.find(r=>r.id===ref.id).status='substantively equivalent';
 raw.items.find(r=>r.id===ref.id).evidence=[{page:1,section:'Reference wording',quote}];
 const result=validateReport(raw,[{number:1,text:quote}]).items.find(r=>r.id===ref.id);
 assert.equal(result.status,'no change needed',ref.id);
 assert.equal(result.implication,'No change needed.');
 assert.equal(result.action,'');
}
console.log('Passed: annotated exact wording for all 29 provisions needs no change.');

const {default:docToText}=await import('../lib/doc-parser.js');
const docStories=docToText.sections(fs.readFileSync('public/annotated-lsta-model.doc'));
assert.ok(docStories.body.includes('Internal Revenue Code of 1986'));
assert.ok(docStories.body.includes('Excluded Taxes'));
assert.ok(docStories.body.includes('Status of Lenders'));
assert.ok(docStories.footnotes.length>100);
assert.equal(docToText.sections(new Uint8Array(512)),null);
console.log('Passed: original binary DOC body and footnotes, invalid DOC rejected.');
