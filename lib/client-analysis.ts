import {analysisPrompt} from './analysis-prompt';
import {validateReport,type Page} from './analysis';
export type BrowserAIConfig={apiKey:string;model:string};
export async function loadBrowserAIConfig():Promise<BrowserAIConfig|null>{
 try{const response=await fetch(new URL('openrouter-config.json',document.baseURI),{cache:'no-store'});if(!response.ok)return null;const data=await response.json() as BrowserAIConfig;return typeof data.apiKey==='string'&&data.apiKey.startsWith('sk-or-')&&typeof data.model==='string'?data:null;}catch{return null;}
}
export async function analyzeInBrowser(pages:Page[],side:string,config:BrowserAIConfig){
 if(!['borrower','lender'].includes(side)||!pages.length||pages.length>400||pages.some(p=>p.text.trim().length<40)||pages.reduce((n,p)=>n+p.text.length,0)>300000)throw Error('The document is incomplete or exceeds the prototype limits.');
 const response=await fetch('https://openrouter.ai/api/v1/chat/completions',{method:'POST',headers:{Authorization:`Bearer ${config.apiKey}`,'Content-Type':'application/json','X-Title':'LSTA Tax Comparison'},body:JSON.stringify({model:config.model,temperature:0,max_tokens:20000,response_format:{type:'json_object'},provider:{data_collection:'deny'},messages:[{role:'system',content:analysisPrompt(side)},{role:'user',content:JSON.stringify({agreement_pages:pages})}]}),signal:AbortSignal.timeout(240000)});
 if(!response.ok){if(response.status===401)throw Error('The OpenRouter key was not accepted. Check that it is active.');if(response.status===402)throw Error('The OpenRouter key has insufficient available credit.');throw Error(`OpenRouter could not complete the request (${response.status}). Check the model, budget and document size.`);}
 const data=await response.json() as any;if(data.choices?.[0]?.finish_reason==='length')throw Error('The AI response was truncated. No complete report was produced.');
 const content=data.choices?.[0]?.message?.content;if(typeof content!=='string')throw Error('OpenRouter returned no comparison. Please retry.');
 let raw:any;try{raw=JSON.parse(content);}catch{throw Error('The AI did not return a valid comparison. Please retry.');}
 return validateReport(raw,pages);
}
