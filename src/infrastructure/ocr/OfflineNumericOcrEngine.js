import { OcrEngine } from '../../application/ports/OcrEngine.js';
// Conservative offline numeric OCR. Intended for tightly cropped, high-contrast device digits.
// Template scores are similarity scores, not clinical or statistical confidence.
export function extractGlyphs(data,width,height) {
 const gray=Array.from({length:width*height},(_,i)=>(data[i*4]+data[i*4+1]+data[i*4+2])/3);
 const border=[];for(let x=0;x<width;x++){border.push(gray[x],gray[(height-1)*width+x])}for(let y=0;y<height;y++)border.push(gray[y*width],gray[y*width+width-1]);
 border.sort((a,b)=>a-b);const light=border[Math.floor(border.length/2)]>128;
 const mask=gray.map(v=>light?v<128:v>128);
 const groups=(counts,min)=>{const out=[];let start=-1;for(let i=0;i<=counts.length;i++){if(counts[i]>=min){if(start<0)start=i}else if(start>=0){out.push([start,i-1]);start=-1}}return out};
 const rows=groups(Array.from({length:height},(_,y)=>mask.slice(y*width,(y+1)*width).filter(Boolean).length),2).filter(([a,b])=>b-a>=8);
 const glyphs=[];
 for(const [top,bottom] of rows){const columns=groups(Array.from({length:width},(_,x)=>{let n=0;for(let y=top;y<=bottom;y++)n+=mask[y*width+x]?1:0;return n}),1);
 for(const [left,right] of columns){if(right-left<1)continue;const pixels=[];for(let y=0;y<32;y++)for(let x=0;x<20;x++)pixels.push(mask[(top+Math.min(bottom-top,Math.floor(y*(bottom-top+1)/32)))*width+left+Math.min(right-left,Math.floor(x*(right-left+1)/20))]?1:0);glyphs.push({pixels,left,top,width:right-left+1,height:bottom-top+1});}}
 return glyphs;
}
export class OfflineNumericOcrEngine extends OcrEngine {
 async recognize(file){
  const bitmap=await createImageBitmap(file);try{
   const canvas=document.createElement('canvas');const scale=Math.min(1,1200/bitmap.width);canvas.width=Math.round(bitmap.width*scale);canvas.height=Math.round(bitmap.height*scale);
   const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.fillStyle='white';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.drawImage(bitmap,0,0,canvas.width,canvas.height);
   const glyphs=extractGlyphs(ctx.getImageData(0,0,canvas.width,canvas.height).data,canvas.width,canvas.height);
   const templates=[];const t=document.createElement('canvas');t.width=90;t.height=100;const c=t.getContext('2d',{willReadFrequently:true});
   for(const font of ['Arial','Consolas','monospace','Segoe UI'])for(const weight of ['normal','bold'])for(const digit of '0123456789'){
    c.fillStyle='white';c.fillRect(0,0,90,100);c.fillStyle='black';c.font=`${weight} 70px ${font}`;c.fillText(digit,8,78);
    const g=extractGlyphs(c.getImageData(0,0,90,100).data,90,100)[0];if(g)templates.push({...g,digit});
   }
   let scores=[],text='',lastTop=-1;
   for(const g of glyphs){let best={score:0,digit:'?'};for(const t of templates){let intersection=0,union=0;for(let i=0;i<g.pixels.length;i++){intersection+=g.pixels[i]&&t.pixels[i]?1:0;union+=g.pixels[i]||t.pixels[i]?1:0;}let score=intersection/(union||1);const ratio=Math.abs(g.width/g.height-t.width/t.height);score*=Math.max(.5,1-ratio*.3);if(score>best.score)best={score,digit:t.digit};}if(g.top!==lastTop&&text)text+='\n';lastTop=g.top;text+=best.score>=.65?best.digit:'?';scores.push(best.score)}
   if(!text||!/[0-9]/.test(text))throw new Error('No clear digits detected. Crop tightly around the number, or use manual entry.');
   return {rawText:text,confidence:100*scores.reduce((a,b)=>a+b,0)/scores.length};
  }finally{bitmap.close()}
 }
}
