import {analysisPrompt} from './analysis-prompt';
import {validateReport,reference,type Page} from './analysis';
export type BrowserAIConfig={apiKey:string;model:string};
export async function loadBrowserAIConfig():Promise<BrowserAIConfig|null>{
 try{const response=await fetch(new URL('openrouter-config.json',document.baseURI),{cache:'no-store'});if(!response.ok)return null;const data=await response.json() as BrowserAIConfig;return typeof data.apiKey==='string'&&data.apiKey.startsWith('sk-or-')&&typeof data.model==='string'?data:null;}catch{return null;}
}
const string={type:'string'};
const object=(properties:Record<string,unknown>)=>({type:'object',properties,required:Object.keys(properties),additionalProperties:false});
const evidence={type:'array',items:object({page:{type:'integer'},section:string,quote:string})};
const draft={type:'array',items:object({kind:string,before:string,after:string,reason:string,model_quote:string,page:{type:'integer'}})};
const finding={id:string,status:{type:'string',enum:['no change needed','substantively equivalent','materially modified','partially covered','not found','uncertain','not applicable']},difference:string,implication:string,action:string,evidence};
const reportSchema=object({
 form_assessment:object({relationship:{type:'string',enum:['closely follows LSTA','adapted LSTA','different form','uncertain']},reason:string}),
 items:object(Object.fromEntries(reference.items.map(r=>[r.id,object({...finding,id:{type:'string',enum:[r.id]},drafting_changes:draft})]))),
 additional:{type:'array',items:object({...finding,title:string,related_model_ids:{type:'array',items:string},model_context:{anyOf:[object({section:string,quote:string,explanation:string}),{type:'null'}]}})}
});
export async function analyzeInBrowser(pages:Page[],side:string,config:BrowserAIConfig,onFallback?:()=>void){
 const selectedModel=['openrouter/free','openai/gpt-6-luna','openai/gpt-6.1-sol','openai/gpt-6-astra','anthropic/claude-haiku-5.5','anthropic/claude-sonnet-5.5','anthropic/claude-opus-5.5','deepseek/deepseek-v4.1-flash','deepseek/deepseek-v4-pro-0813','qwen/qwen3.8-flash','qwen/qwen3.8-max-0902','google/gemini-3.5-flash-lite','google/gemini-3.8-flash','deepseek/deepseek-v4-flash-0731','qwen/qwen3.8-27b','google/gemini-4-argon'].includes(config.model)?config.model:'openrouter/free';
 let usedFreeFallback=false;
 const request=(model:string)=>fetch('https://openrouter.ai/api/v1/chat/completions',{method:'POST',headers:{Authorization:`Bearer ${config.apiKey}`,'Content-Type':'application/json','X-Title':'LSTA Tax Comparison'},body:JSON.stringify({model,temperature:0,max_tokens:20000,response_format:{type:'json_schema',json_schema:{name:'tax_comparison',strict:true,schema:reportSchema}},provider:{data_collection:'deny',require_parameters:true},messages:[{role:'system',content:analysisPrompt(side)+'\nOUTPUT OVERRIDE: items must be an object keyed by each exact reference ID, rather than an array. Include all 29 keys required by the response schema. Keep each nested id equal to its key.'},{role:'user',content:JSON.stringify({agreement_pages:pages})}]}),signal:AbortSignal.timeout(240000)});
 if(!['borrower','lender'].includes(side)||!pages.length||pages.length>400||pages.some(p=>p.text.trim().length<40)||pages.reduce((n,p)=>n+p.text.length,0)>300000)throw Error('The document is incomplete or exceeds the prototype limits.');
 let response=await request(selectedModel);
 if([402,429].includes(response.status)&&selectedModel!=='openrouter/free'){usedFreeFallback=true;onFallback?.();response=await request('openrouter/free');}
 if(!response.ok){if(response.status===401)throw Error('The OpenRouter key was not accepted. Check that it is active.');if(response.status===402)throw Error('OpenRouter rejected the free request because of an account balance or key limit. Free access cannot bypass account restrictions.');if(response.status===429)throw Error('The free model request limit has been reached. Please try again later.');throw Error(`OpenRouter could not complete the request (${response.status}). The selected model may be unavailable or unable to handle this document. No paid fallback was requested.`);}

 const data=await response.json() as any;if(data.choices?.[0]?.finish_reason==='length')throw Error('The AI response was truncated. No complete report was produced.');
 const content=data.choices?.[0]?.message?.content;if(typeof content!=='string')throw Error('OpenRouter returned no comparison. Please retry.');
 let raw:any;try{raw=JSON.parse(content);}catch{throw Error('The AI did not return a valid comparison. Please retry.');}
 if(raw.items&&typeof raw.items==='object'&&!Array.isArray(raw.items))raw.items=Object.values(raw.items);
 return {...validateReport(raw,pages),modelUsed:typeof data.model==='string'?data.model:(usedFreeFallback?'openrouter/free':selectedModel),usedFreeFallback};
}
