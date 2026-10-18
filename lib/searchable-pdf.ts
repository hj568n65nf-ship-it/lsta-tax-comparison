import type {Page} from './analysis';

const scripts=new Map<string,Promise<void>>();
function loadScript(src:string){
 let pending=scripts.get(src);
 if(!pending){pending=new Promise<void>((resolve,reject)=>{
  const script=document.createElement('script');script.src=src;script.async=true;
  script.onload=()=>resolve();script.onerror=()=>{script.remove();scripts.delete(src);reject(Error('The PDF conversion tools could not load. Check your connection and retry.'));};
  document.head.appendChild(script);
 });scripts.set(src,pending);}
 return pending;
}
function checkCancelled(signal:AbortSignal){if(signal.aborted)throw Error('PDF conversion cancelled.');}
export async function extractSearchablePdf(file:File,onProgress:(message:string)=>void,signal:AbortSignal){
 const pdfjs=await import('pdfjs-dist');
 pdfjs.GlobalWorkerOptions.workerSrc=new URL('pdf.worker.min.mjs',document.baseURI).href;
 const bytes=await file.arrayBuffer();
 checkCancelled(signal);
 const pdf=await pdfjs.getDocument({data:bytes.slice(0)}).promise;
 let worker:any=null;
 const stopWorker=()=>{void worker?.terminate();};
 signal.addEventListener('abort',stopWorker,{once:true});
 try{
  if(pdf.numPages>400)throw Error('This review supports up to 400 PDF pages.');
  const pages:Page[]=[];const needsOcr:number[]=[];
  for(let n=1;n<=pdf.numPages;n++){
   checkCancelled(signal);onProgress('Reading PDF page '+n+' of '+pdf.numPages+'…');
   const page=await pdf.getPage(n);const content=await page.getTextContent();
   const text=content.items.map((item:any)=>item.str+(item.hasEOL?'\n':' ')).join('');
   pages.push({number:n,text});
   // Sparse text may be a page number or header over a scanned page.
   if(text.replace(/\s/g,'').length<40)needsOcr.push(n);
   page.cleanup();
  }
  if(!needsOcr.length)return {pages,blob:new Blob([bytes],{type:'application/pdf'}),ocrPages:0,blankPages:[] as number[]};
  onProgress('Loading OCR tools…');
  await Promise.all([
   loadScript('https://cdn.jsdelivr.net/npm/tesseract.js@6.0.1/dist/tesseract.min.js'),
   loadScript('https://cdn.jsdelivr.net/npm/pdf-lib@1.17.1/dist/pdf-lib.min.js')
  ]);
  checkCancelled(signal);
  const {Tesseract,PDFLib}=window as unknown as {Tesseract:any;PDFLib:any};
  let currentPage=0;
  worker=await Tesseract.createWorker('eng',1,{logger:(event:any)=>{
   if(event.status==='recognizing text')onProgress('Making PDF searchable: page '+currentPage+' of '+pdf.numPages+' ('+Math.round(event.progress*100)+'%)…');
  }});
  checkCancelled(signal);
  const original=await PDFLib.PDFDocument.load(bytes);
  const output=await PDFLib.PDFDocument.create();
  const blankPages:number[]=[];
  for(let n=1;n<=pdf.numPages;n++){
   checkCancelled(signal);
   if(!needsOcr.includes(n)){const [copy]=await output.copyPages(original,[n-1]);output.addPage(copy);continue;}
   currentPage=n;onProgress('Making PDF searchable: page '+n+' of '+pdf.numPages+'…');
   const page=await pdf.getPage(n);
   const natural=page.getViewport({scale:1});
   const scale=Math.min(2.5,3500/Math.max(natural.width,natural.height));
   const viewport=page.getViewport({scale});
   const canvas=document.createElement('canvas');canvas.width=Math.ceil(viewport.width);canvas.height=Math.ceil(viewport.height);
   const context=canvas.getContext('2d');if(!context)throw Error('This browser could not render the PDF for OCR.');
   try{
    await page.render({canvas,canvasContext:context,viewport}).promise;
    checkCancelled(signal);
    const result=await worker.recognize(canvas,{pdfTitle:file.name},{text:true,pdf:true});
    checkCancelled(signal);
    if(!result.data.pdf)throw Error('OCR did not produce a searchable PDF for page '+n+'. Please retry.');
    const text=result.data.text.trim();
    if(text){pages[n-1].text=text;}else blankPages.push(n);
    const recognized=await PDFLib.PDFDocument.load(new Uint8Array(result.data.pdf));
    const [copy]=await output.copyPages(recognized,[0]);
    copy.scale(natural.width/copy.getWidth(),natural.height/copy.getHeight());
    output.addPage(copy);
   }finally{canvas.width=0;canvas.height=0;page.cleanup();}
  }
  checkCancelled(signal);onProgress('Preparing searchable PDF…');
  output.setTitle(file.name.replace(/\.pdf$/i,'')+' — Searchable Copy');
  const saved=await output.save();
  return {pages,blob:new Blob([new Uint8Array(saved)],{type:'application/pdf'}),ocrPages:needsOcr.length,blankPages};
 }catch(error){checkCancelled(signal);throw error;}
 finally{signal.removeEventListener('abort',stopWorker);if(worker&&!signal.aborted)await worker.terminate();await pdf.destroy();}
}
