(() => {
"use strict";
const $=id=>document.getElementById(id);
const file=$("file"),video=$("video"),photo=$("photo");
const pctx=photo.getContext("2d",{willReadFrequently:true});
const normL=$("normL"),normR=$("normR"),bar=$("bar");
const startCameraBtn=$("startCamera"),captureBtn=$("capture"),stopCameraBtn=$("stopCamera");
let stream=null;

const NAMES_L=["C","M","Y","K"],NAMES_R=["W","CL","LC","LM"];
const LH_TEMPLATE="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAPAAAABQCAAAAAACIqegAAAErElEQVR4AeXBC5LkuBEFwYj7H/qpgMz6kLsEaBqNWbXaXX4Z+WXkl5FfRn4Z+WXk5wuD3CI/XxjkFvnpwpPcID9ceJM9+SkCyFn4JFvyI4Qn+RCOZEt+gPBB3sKJ7Mg3CQ9yEj7JSziTHfkeochROJCnUIRQZEO+RyhyEE6khUmGMMiGfI9Q5CCcSAuTDGGQDfkeochBOJEWJhnCIBvyNUKTT6EIockUJpnCIGvyd4VBbghNPoVJHkKRIUxSwiBr8heFJ9kKT/IpTDKEIg9hkhIGWZP/mchZaLITXuQtFJlCkYcwSQmDrMkfC03OQpOd8CJvoUgJkzyESUoYZE3+WHiSk9BkLXyQt1CkhCIQJmlhkCX5c6HJSWiyFj7JSyhSQhEIk7QwyJLsBWQhNDkJTVbCkbyEIiUUgTBJC4MsyV5AFkKTk9BkJRzJSyhSQhEIk7QwyJKshCYLoclJaLIQTuQlFGlhEgiTtDDIkqyEJguhyUloshBO5CUUaWESCEVKGGRJVkKThdDkJDRZCCfyEoq0UIRQpIRBlmQlPMm10OQsFFkIkxAmeQlFWigCYZISBlmStVDkWniSk9DkWhgEwiQvoUgLRSBMUsIgS7IWiiyEJiehybXwIA9hkpdQpIUiECYpYZAlWQtFFkKTk9DkWgAZwiQvoUgLRSBMUsIgS7IWiiyEJiehybUgJRR5CkVaKAJhkhYeZEnWQpGF0OQkNLkjFHkKRVooAmGSFgZZkbVQZCE0OQlN7ghFnkKRFopAmKSFQVZkLTzJpdDkJDS5JUzyFiYpoQiEIiUMsiJr4UkuhSYnocktYZK3MEkJRSAUKWGQFdkITS6FJ5nCP8gdYZK3MEkLkzyESUoYZEU2QpNLYU/uCJO8hUlamOQhTFLCgyzJRmhyLWzJHWGStzBJC5M8hElKeJAl2QhNroUtuSNM8hYmaWGSh1BkCg+yJBuhybWwJXeEST6EQVqYZAqDDGGQJdkIT3IpbMkdoclLmKSESaYwyBAGWZKN8CSXwpbcEZq8hElKmGQKgwxhkCXZCU0uhS25JRR5CZOUMMkUJnkIgyzJTmhyKfwrITS5JRR5CZOUMEkJk4RJ1mQnNLkU3uQgFLklFHkLRR5CkRKOZE12QpNLoclZaHJHKPIWijyEIi0cyJrshCYLochJaHJHKPIWmhCKPIVPsiE7oclCKHISmtwRinwI/yAv4YNsyE5oshCKnIQmd4QiH8I/yFt4kR3ZCU9yLRQ5CU3uCE0+hBP5FIrsyU54kmuhyElockdo8ikcyUlA7pCd8CTXQpGT0OSO0ORTOJKTgNwhW6HJtVDkJDS5JRT5FA7kvyZbocm1UOQsFLklFDkKL/IHZCs0WQhNjkKTO0KRk1Dkj8hWaLIQmhyFJneEIn+HbIUmC6HJUWhyRyjyd8hWeJJroclRaHJHAPl7ZCs8ybXQ5Cg0+QayF5p8CE2G0OQoNPkGsheWZAhNTkKRbyB7YUmG0OQkFPkGsheWZApNjkKRbyB7YUmm0OQoPMiXkL2wJFNo8s1kLyzJFJp8M9kLS/KTyF64Ij+O3BAO5AeTG8KD/F+QX0Z+Gfll5JeRX0Z+mf8AzQdpYBKRD2YAAAAASUVORK5CYII=";
const PR_TEMPLATE="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAPAAAABQCAAAAAACIqegAAAFbElEQVR4AeXBC5JbORIEwYj7HzpHbBQK4OeBzR0b00rtLj+M/DDyw8gPIz+M/DDylwkbeSJ/mbCRJ/JXCQ/kgfwxQpEr4Ynckz9DuCOvhBfkjvx+YZAr4ZE8CRdkI79fGORKeCRPwgXZyG8V7skr4Zk8CFdkI79TeCKPwktyL1ySRX6b8JLcC1dkExaBsMgi/7PwgnxXuCK7cEU2oclNWKTJx8KRfEu4Jku4Ji00GUKTJh8LR/It4Zos4Zq00GQITZos4RW5E96R7wjXZAlNfgmLtFCkhUmalHBJNuE9eSucSAuTfAlNWijSwiRNSjiRKXyDvBMWuQmLTKHJEJqUMEkLTSYp4UhK+A55IzQZQpMpFJlCkxImaaHJJCUcSQnfIWdhkhaaDGGSFiYpYZIWmkxSwpGU8B1yFiZpockQJmlhkhImaaHJJC2cyBC+Q85CkSU0GcIkLUxSwiSbUGSSFk5kCE3uhI0chSJLaDKESVpoMoRJNqHIJC0cSQmDPAiLHIUiS2gyhElaaDKEIrtQZJIWBmlhkRIGeRSaHIUiS2gyhCJLaHITmiyhySQtDNLCIiUM8ig0OQpFltBkCEWW0OQmNFlCk0laGGQJTUoY5FFo8rnQZAhFltDkJjTZhSKTtDDILhQpYZBnocjnQpOb0GQJTW5Ck10oMkkLg9wJg5QwyLNQ5HNhki+hyRKa3IQmu1BkkhYGuROKDGGQZ6HIx0KTL6HJEprchCa7MEmRFga5E4oMYZBHocnHQpMvockSmtyEJrswSZEWBrkTigxhkEehycdCky+hyRKa3IQmuzBJkRYGuROKDGGQR6HJp8IiX0KTJTS5CU12YZIiLQxyJxQZwiCPwiQfC02G0GQXityEJrswSZEWBrkTigxhkHthkU+FRYbQZAlNbkKTXSgySQuD7EKREgZp4YF8KCxSQpMlNLkJTXahyCQtDLILRUp4Sz4TFmmhyRKaDKHILhSZpIVBdqFICW/JZ8IiLTRZQpMhFNmFIpO0MEgLi5TwjnwmbKSFJrtQZAhFdqHIJC0UCc+khDP5UNjIEprsQpEhFNmFIpO0cCJTOJIPhY1sQpNdKDKEIrtQZJIWTmQKJ/KpsJFNaLILRYZQZAlNJmnhRKZwIp8KG9mEJrtQZAhFltBkkhYOpIVr8qmwk11YZBOKDKHIEppM0sI1WcIV+VjYyYMwSQtNhjBJC5M0aeGK7EKRm7CTj4SNPAmTtNBkCJO0MEmTFi7InVCkhEU+EDbyLEzSwiQlTDKFJk2W8Io8CEWmsMi3hY28ECZpYZIpFJlCkyZLeEUehCJTWOTbwkZeCJO0MMkUikyhSZMlDHIUikxhkW8Li7wSJmlhkik0GcIkiyzhi5yFIi0s8j1hIy+FRYbQZApNvoQmiyzhi5yFIpuwyDeERa6EJkNo0kKTX0KTjSzhi5yFIpuwkffCIlfCIjehyRIuyUaWMMhRKLILi7wVFrkUFvklLLKEC3JHljDIUSiyC4u8FRa5FBb5JSyyhAtyR5YwyFEosgsbeSecyBQuyS68JPdkCYMchSJ3wiJvhCOZwiW5E16Re7KEQY5CkTthI2fhSFp4TZ6ER/JIljDIUShyLyxyFM5kCa/IC+GePJElDHIUitwLixyFM1nCK/JCuCdPZAmDHIUiD8IiJ+FMduGJvBYWeUGWMMhRKPIgLHISzuROeCAnkUuyhEGOQpEnYZFr4R3ZhY38C7KEQc7CIE/CIlfCO/Is3Mi/I0sY5CgUeRYWuRAuyX9MljDIUSjyLCxyIVyS/5gsYZCzMMgLocmlgPwWsoRBzsIgL4Qm/4dkCYOchS/yJ5JN5K8nP4z8MPLDyA8jP4z8MP8A/CayYHDbmTcAAAAASUVORK5CYII=";
let templateLH=null,templatePR=null;
let tesseractPromise=null;

function clamp(v,a,b){return Math.max(a,Math.min(b,v))}
function setProgress(v){bar.style.width=`${clamp(v,0,100)}%`}
function setStatus(t,k="info"){const e=$("status");e.textContent=t;e.className=`status ${k}`}
function sleep(ms=0){return new Promise(r=>setTimeout(r,ms))}

async function loadTemplate(src){
  return new Promise((resolve,reject)=>{
    const im=new Image();
    im.onload=()=>{
      const c=document.createElement("canvas");c.width=120;c.height=40;
      const x=c.getContext("2d",{willReadFrequently:true});
      x.fillStyle="#000";x.fillRect(0,0,120,40);
      x.drawImage(im,0,0,120,40);
      const d=x.getImageData(0,0,120,40).data;
      const a=new Float32Array(120*40);
      for(let i=0,p=0;i<d.length;i+=4,p++)a[p]=(d[i]+d[i+1]+d[i+2])/3>100?1:0;
      resolve(a);
    };
    im.onerror=reject;im.src=src;
  });
}
Promise.all([loadTemplate(LH_TEMPLATE),loadTemplate(PR_TEMPLATE)]).then(v=>{templateLH=v[0];templatePR=v[1]});
async function ensureTesseract(){
  if(window.Tesseract)return window.Tesseract;
  if(tesseractPromise)return tesseractPromise;
  tesseractPromise=new Promise(resolve=>{
    const sc=document.createElement("script");
    sc.src="https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js";
    sc.async=true;
    sc.onload=()=>resolve(window.Tesseract||null);
    sc.onerror=()=>resolve(null);
    document.head.appendChild(sc);
  });
  return tesseractPromise;
}

async function startCamera(){
  try{
    if(!navigator.mediaDevices?.getUserMedia)throw new Error("このブラウザではページ内カメラを使えません");
    if(stream)stream.getTracks().forEach(t=>t.stop());
    stream=await navigator.mediaDevices.getUserMedia({
      audio:false,
      video:{facingMode:{ideal:"environment"},width:{ideal:1920},height:{ideal:1440}}
    });
    video.srcObject=stream;await video.play();
    $("cameraPlaceholder").style.display="none";
    captureBtn.disabled=false;stopCameraBtn.disabled=false;
    setStatus("左右に別々のボトルを入れてください","info");
  }catch(e){console.error(e);setStatus("カメラを起動できません："+e.message,"warn")}
}
function stopCamera(){
  if(stream){stream.getTracks().forEach(t=>t.stop());stream=null}
  captureBtn.disabled=true;stopCameraBtn.disabled=true;
}
startCameraBtn.onclick=startCamera;stopCameraBtn.onclick=stopCamera;

function drawVisibleVideoToPhoto(){
  const wrap=$("cameraWrap").getBoundingClientRect(),targetAspect=wrap.width/wrap.height;
  const vw=video.videoWidth,vh=video.videoHeight;if(!vw||!vh)throw new Error("カメラ映像が未準備です");
  let sx=0,sy=0,sw=vw,sh=vh;const srcAspect=vw/vh;
  if(srcAspect>targetAspect){sw=vh*targetAspect;sx=(vw-sw)/2}
  else{sh=vw/targetAspect;sy=(vh-sh)/2}
  const outW=Math.min(1100,Math.round(sw)),outH=Math.round(outW/targetAspect);
  photo.width=outW;photo.height=outH;
  pctx.drawImage(video,sx,sy,sw,sh,0,0,outW,outH);
  photo.style.display="block";
}
captureBtn.onclick=async()=>{
  try{drawVisibleVideoToPhoto();$("message").textContent="撮影画像を解析します";await analyze()}
  catch(e){console.error(e);setStatus("撮影エラー："+e.message,"ng")}
};
file.addEventListener("change",e=>{
  const f=e.target.files&&e.target.files[0];if(!f)return;
  const img=new Image(),url=URL.createObjectURL(f);setStatus("画像を読み込み中…","info");
  img.onload=async()=>{
    const s=Math.min(1,1100/img.naturalWidth);
    photo.width=Math.round(img.naturalWidth*s);photo.height=Math.round(img.naturalHeight*s);
    pctx.drawImage(img,0,0,photo.width,photo.height);photo.style.display="block";URL.revokeObjectURL(url);
    $("message").textContent=`画像 ${img.naturalWidth}×${img.naturalHeight} を解析します`;
    await analyze();
  };
  img.onerror=()=>setStatus("画像を読み込めませんでした","ng");img.src=url;
});

function rgbToHSV(r,g,b){
  r/=255;g/=255;b/=255;
  const mx=Math.max(r,g,b),mn=Math.min(r,g,b),d=mx-mn;
  let h=0;
  if(d){
    if(mx===r)h=((g-b)/d)%6;
    else if(mx===g)h=(b-r)/d+2;
    else h=(r-g)/d+4;
    h*=60;if(h<0)h+=360;
  }
  return[h,mx?d/mx:0,mx];
}
function colorKind(r,g,b){
  const[h,s,v]=rgbToHSV(r,g,b);
  if(s<.27||v<.22)return"";
  if(h>=170&&h<=235&&s>.32)return"C";
  if(((h>=315&&h<=359)||(h>=0&&h<=12))&&s>.34)return"M";
  if(h>=38&&h<=72&&s>.38)return"Y";
  return"";
}
function yellowBandPixel(r,g,b){
  const[h,s,v]=rgbToHSV(r,g,b);
  return h>=25&&h<=58&&s>.25&&v>.35;
}

function makeColorMasks(imgData){
  const{width:W,height:H,data}=imgData,N=W*H;
  const C=new Uint8Array(N),M=new Uint8Array(N),Y=new Uint8Array(N);
  for(let y=Math.floor(H*.18);y<Math.floor(H*.90);y++){
    let p=y*W;
    for(let x=0;x<W;x++,p++){
      const i=p*4,k=colorKind(data[i],data[i+1],data[i+2]);
      if(k==="C")C[p]=1;else if(k==="M")M[p]=1;else if(k==="Y")Y[p]=1;
    }
  }
  return{C,M,Y,W,H};
}
function connectedComponents(mask,W,H){
  const comps=[],q=new Int32Array(mask.length);
  const minArea=W*H*.00002,maxArea=W*H*.012;
  for(let p=0;p<mask.length;p++){
    if(mask[p]!==1)continue;
    let head=0,tail=0,area=0,minx=W,maxx=0,miny=H,maxy=0,sx=0,sy=0;
    q[tail++]=p;mask[p]=2;
    while(head<tail){
      const cur=q[head++],y=(cur/W)|0,x=cur-y*W;
      area++;sx+=x;sy+=y;
      minx=Math.min(minx,x);maxx=Math.max(maxx,x);miny=Math.min(miny,y);maxy=Math.max(maxy,y);
      const xa=x?x-1:x,xb=x<W-1?x+1:x,ya=y?y-1:y,yb=y<H-1?y+1:y;
      for(let ny=ya;ny<=yb;ny++){
        let np=ny*W+xa;
        for(let nx=xa;nx<=xb;nx++,np++){
          if(mask[np]===1){mask[np]=2;q[tail++]=np}
        }
      }
    }
    const w=maxx-minx+1,h=maxy-miny+1,ar=w/h,fill=area/(w*h);
    if(area<minArea||area>maxArea||w<5||h<7||w>W*.13||h>H*.13||ar<.28||ar>1.8||fill<.28)continue;
    comps.push({x:minx,y:miny,w,h,area,fill,cx:sx/area,cy:sy/area});
  }
  return comps.sort((a,b)=>b.area-a.area).slice(0,90);
}
function overlap1D(a0,a1,b0,b1){return Math.max(0,Math.min(a1,b1)-Math.max(a0,b0))}
function bestTriplet(C,M,Y,x0,x1,H){
  const halfW=x1-x0;
  C=C.filter(c=>c.cx>=x0&&c.cx<x1&&c.cx<x0+halfW*.72);
  M=M.filter(c=>c.cx>=x0&&c.cx<x1&&c.cx<x0+halfW*.72);
  Y=Y.filter(c=>c.cx>=x0&&c.cx<x1&&c.cx<x0+halfW*.72);
  let best=null;
  for(const c of C)for(const m of M)for(const y of Y){
    if(!(c.cy<m.cy&&m.cy<y.cy))continue;
    const ax=m.cx-c.cx,ay=m.cy-c.cy,bx=y.cx-m.cx,by=y.cy-m.cy;
    const d1=Math.hypot(ax,ay),d2=Math.hypot(bx,by);
    const avgH=(c.h+m.h+y.h)/3,avgW=(c.w+m.w+y.w)/3;
    if(d1<.60*avgH||d1>1.6*avgH||d2<.60*avgH||d2>1.6*avgH)continue;
    const cos=(ax*bx+ay*by)/(d1*d2);if(cos<.96)continue;
    const xspread=Math.max(c.cx,m.cx,y.cx)-Math.min(c.cx,m.cx,y.cx);
    if(xspread>Math.max(avgW*.52,d1*.42))continue;
    const ov1=overlap1D(c.x,c.x+c.w,m.x,m.x+m.w),ov2=overlap1D(m.x,m.x+m.w,y.x,y.x+y.w);
    if(ov1<Math.min(c.w,m.w)*.45||ov2<Math.min(m.w,y.w)*.45)continue;
    const score=(c.area+m.area+y.area)*(c.fill+m.fill+y.fill)/3+cos*2400-Math.abs(d1-d2)*25-xspread*22;
    if(!best||score>best.score)best={score,c,m,y,mode:"strict"};
  }
  return best;
}
function syntheticComp(cx,cy,w,h,area,fill){return{cx,cy,w,h,area,fill,x:cx-w/2,y:cy-h/2}}
function bestPairFallback(C,M,Y,x0,x1,H){
  const halfW=x1-x0,idx={C:0,M:1,Y:2};
  const filter=a=>a.filter(c=>c.cx>=x0&&c.cx<x1&&c.cx<x0+halfW*.72&&c.cy>H*.34&&c.cy<H*.87);
  C=filter(C);M=filter(M);Y=filter(Y);let best=null;
  function ev(a,b,ka,kb){
    const step=idx[kb]-idx[ka];if(step<=0||b.cy<=a.cy)return;
    const dx=b.cx-a.cx,dy=b.cy-a.cy,dist=Math.hypot(dx,dy),avgH=(a.h+b.h)/2,avgW=(a.w+b.w)/2,per=dist/step;
    if(per<.55*avgH||per>1.7*avgH||Math.abs(dx)/step>avgW*.8)return;
    const fill=(a.fill+b.fill)/2,score=(a.area+b.area)*fill-Math.abs(dx)*18-Math.abs(per-avgH)*8;
    const vx=dx/step,vy=dy/step,comps={C:null,M:null,Y:null};comps[ka]=a;comps[kb]=b;
    for(const k of["C","M","Y"])if(!comps[k]){
      const di=idx[k]-idx[ka],cx=a.cx+vx*di,cy=a.cy+vy*di,area=avgW*avgH*fill;
      comps[k]=syntheticComp(cx,cy,avgW,avgH,area,fill);
    }
    const cand={score,c:comps.C,m:comps.M,y:comps.Y,mode:"pair"};
    if(!best||score>best.score)best=cand;
  }
  for(const c of C){for(const m of M)ev(c,m,"C","M");for(const y of Y)ev(c,y,"C","Y")}
  for(const m of M)for(const y of Y)ev(m,y,"M","Y");
  return best;
}
function detectTable(C,M,Y,x0,x1,H){return bestTriplet(C,M,Y,x0,x1,H)||bestPairFallback(C,M,Y,x0,x1,H)}

function normalizeTable(sourceCanvas,t,dstCanvas){
  const c=t.c,y=t.y,C={x:c.cx,y:c.cy},Y={x:y.cx,y:y.cy};
  const vx=(Y.x-C.x)/2,vy=(Y.y-C.y)/2,vl=Math.hypot(vx,vy);
  const ux=vx/vl,uy=vy/vl;let hx=uy,hy=-ux;if(hx<0){hx=-hx;hy=-hy}
  const scale=100,xmin=-.8,ymin=-.8;
  dstCanvas.width=600;dstCanvas.height=500;
  const ctx=dstCanvas.getContext("2d",{willReadFrequently:true});
  ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,600,500);
  const a=scale/vl*hx,cc=scale/vl*hy,b=scale/vl*ux,d=scale/vl*uy;
  const e=-(scale/vl)*(C.x*hx+C.y*hy)-xmin*scale,f=-(scale/vl)*(C.x*ux+C.y*uy)-ymin*scale;
  ctx.setTransform(a,b,cc,d,e,f);ctx.drawImage(sourceCanvas,0,0);ctx.setTransform(1,0,0,1,0,0);
}
function grayscale(canvas){
  const im=canvas.getContext("2d",{willReadFrequently:true}).getImageData(0,0,canvas.width,canvas.height);
  const g=new Uint8Array(im.width*im.height);
  for(let i=0,p=0;i<im.data.length;i+=4,p++)g[p]=Math.round(.299*im.data[i]+.587*im.data[i+1]+.114*im.data[i+2]);
  return{g,W:im.width,H:im.height};
}
function estimateShear(canvas){
  const{g,W,H}=grayscale(canvas);let bestK=0,bestScore=-1;
  for(let ki=-15;ki<=15;ki++){
    const k=ki*.03,bins=new Float32Array(760);
    for(let x=30;x<Math.min(W-20,470);x+=4)for(let y=12;y<H-12;y+=3){
      const gy=Math.abs(g[(y+1)*W+x]-g[(y-1)*W+x]),yp=Math.round(y-k*(x-80));
      if(yp>=0&&yp<bins.length)bins[yp]+=gy;
    }
    let score=0,work=Float32Array.from(bins);
    for(let n=0;n<5;n++){
      let bi=0,bv=-1;for(let i=5;i<work.length-5;i++){let v=0;for(let z=-2;z<=2;z++)v+=work[i+z];if(v>bv){bv=v;bi=i}}
      score+=bv;for(let z=Math.max(0,bi-28);z<Math.min(work.length,bi+29);z++)work[z]=0;
    }
    if(score>bestScore){bestScore=score;bestK=k}
  }
  return bestK;
}
function shearCanvas(src,k,dst){
  dst.width=src.width;dst.height=src.height;
  const ctx=dst.getContext("2d",{willReadFrequently:true});
  ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,dst.width,dst.height);
  ctx.setTransform(1,-k,0,1,0,k*80);ctx.drawImage(src,0,0);ctx.setTransform(1,0,0,1,0,0);
}

function maskPixelForLabel(kind,r,g,b){
  const[h,s,v]=rgbToHSV(r,g,b);
  if(kind==="C")return s>.28&&v>.22&&h>=170&&h<=235;
  if(kind==="M")return s>.30&&v>.22&&((h>=315&&h<=359)||(h>=0&&h<=12));
  if(kind==="Y")return s>.34&&v>.28&&h>=38&&h<=72;
  if(kind==="LCBG")return v>.40&&s>.055&&s<.62&&h>=170&&h<=235&&b>r+6;
  return false;
}
function percentileNumber(arr,p){if(!arr.length)return null;arr.sort((a,b)=>a-b);return arr[Math.max(0,Math.min(arr.length-1,Math.floor((arr.length-1)*p)))]}
function detectLabelGeometry(canvas){
  const ctx=canvas.getContext("2d",{willReadFrequently:true}),im=ctx.getImageData(0,0,canvas.width,canvas.height),W=im.width,H=im.height,d=im.data;
  const rows=[["C",30,130],["M",130,230],["Y",230,330]],leftRanges=[];
  for(const[k,y0,y1]of rows){
    const xs=[];for(let y=y0;y<Math.min(H,y1);y+=2)for(let x=0;x<Math.min(W,220);x++){
      const i=(y*W+x)*4;if(maskPixelForLabel(k,d[i],d[i+1],d[i+2]))xs.push(x);
    }
    if(xs.length>100)leftRanges.push([percentileNumber(xs.slice(),.05),percentileNumber(xs.slice(),.95)]);
  }
  if(leftRanges.length<2)return null;
  const starts=leftRanges.map(v=>v[0]).sort((a,b)=>a-b),ends=leftRanges.map(v=>v[1]).sort((a,b)=>a-b);
  const xL0=starts[(starts.length/2)|0],xL1=ends[(ends.length/2)|0];

  const points=[];
  for(let y=225;y<Math.min(H,345);y++)for(let x=Math.max(0,Math.floor(xL1+18));x<Math.min(W,Math.floor(xL1+360));x++){
    const i=(y*W+x)*4;if(maskPixelForLabel("LCBG",d[i],d[i+1],d[i+2]))points.push([x,y]);
  }
  if(points.length<250)return null;
  const hist=new Uint16Array(W);for(const[x]of points)hist[x]++;
  const sm=new Float32Array(W);for(let x=0;x<W;x++){let s=0,n=0;for(let j=Math.max(0,x-4);j<=Math.min(W-1,x+4);j++){s+=hist[j];n++}sm[x]=s/n}
  let peakX=0,peakV=0;for(let x=Math.floor(xL1+18);x<Math.min(W,Math.floor(xL1+360));x++)if(sm[x]>peakV){peakV=sm[x];peakX=x}
  if(peakV<3)return null;
  const cutoff=Math.max(2,peakV*.23);let xR0=peakX,xR1=peakX;
  while(xR0>0&&sm[xR0-1]>=cutoff)xR0--;while(xR1<W-1&&sm[xR1+1]>=cutoff)xR1++;
  if(xR1-xR0<45){xR0=Math.max(0,peakX-35);xR1=Math.min(W-1,peakX+45)}
  const checkWidth=xR0-xL1;if(checkWidth<28||checkWidth>180)return null;
  return{xL0,xL1,xR0,xR1,checkWidth};
}
function pointSegDist(px,py,x1,y1,x2,y2){
  const vx=x2-x1,vy=y2-y1,wx=px-x1,wy=py-y1;
  const c1=vx*wx+vy*wy;
  if(c1<=0)return Math.hypot(px-x1,py-y1);
  const c2=vx*vx+vy*vy;
  if(c2<=c1)return Math.hypot(px-x2,py-y2);
  const t=c1/c2,ix=x1+t*vx,iy=y1+t*vy;
  return Math.hypot(px-ix,py-iy);
}
function markShapeMetrics(points,minx,miny,bw,bh,area){
  if(!points.length||bw<4||bh<4)return{diag:0,axis:1,factor:.5};
  let diagHits=0,vertHits=0,horHits=0;
  for(const [x,y] of points){
    const nx=(x-minx)/Math.max(1,bw-1),ny=(y-miny)/Math.max(1,bh-1);
    const d1=pointSegDist(nx,ny,.08,.58,.36,.82);
    const d2=pointSegDist(nx,ny,.34,.82,.86,.18);
    if(d1<.14||d2<.13)diagHits++;
    if(nx<.24&&ny>.08&&ny<.94)vertHits++;
    if(ny>.72&&nx<.62)horHits++;
  }
  const diag=diagHits/area,axis=(vertHits+horHits)/(2*area);
  let factor=.72+Math.min(1.0,diag*1.55);
  if(diag<.22&&axis>.34)factor*=.48;
  if(diag>.34&&axis<.42)factor*=1.16;
  return{diag,axis,factor};
}
function scoreCell(g,W,H,x0,x1,y0,y1){
  const cw=x1-x0,rh=y1-y0,ax=Math.round(x0+cw*.18),bx=Math.round(x1-cw*.12),ay=Math.round(y0+rh*.18),by=Math.round(y1-rh*.18);
  const ww=bx-ax,hh=by-ay;if(ww<10||hh<10)return{score:0,areaR:0,diag:0,axis:1};
  let sum=0,n=0;for(let y=ay;y<by;y+=2)for(let x=ax;x<bx;x+=2){sum+=g[y*W+x];n++}
  const mean=sum/n,thr=Math.min(135,mean-45),mask=new Uint8Array(ww*hh);
  for(let yy=0;yy<hh;yy++)for(let xx=0;xx<ww;xx++)mask[yy*ww+xx]=g[(ay+yy)*W+(ax+xx)]<thr?1:0;
  const seen=new Uint8Array(ww*hh),q=new Int32Array(ww*hh);let best=0,bestAreaR=0,bestDiag=0,bestAxis=1;
  for(let p=0;p<mask.length;p++){
    if(!mask[p]||seen[p])continue;
    let head=0,tail=0,area=0,minx=ww,maxx=0,miny=hh,maxy=0;
    const pts=[]; q[tail++]=p;seen[p]=1;
    while(head<tail){
      const cur=q[head++],y=(cur/ww)|0,x=cur-y*ww;area++;pts.push([x,y]);
      minx=Math.min(minx,x);maxx=Math.max(maxx,x);miny=Math.min(miny,y);maxy=Math.max(maxy,y);
      const ns=[];if(x)ns.push(cur-1);if(x<ww-1)ns.push(cur+1);if(y)ns.push(cur-ww);if(y<hh-1)ns.push(cur+ww);
      for(const np of ns)if(mask[np]&&!seen[np]){seen[np]=1;q[tail++]=np}
    }
    const bw=maxx-minx+1,bh=maxy-miny+1;if(area<12||bw<5||bh<5||bw>ww*.95||bh>hh*.95)continue;
    const fill=area/(bw*bh),areaR=area/(ww*hh),span=(bw/ww)*(bh/hh);
    const shape=markShapeMetrics(pts,minx,miny,bw,bh,area);
    let s=areaR*(1+Math.min(1.3,span*2.5))*(.65+Math.min(.9,fill))*shape.factor;
    if(bw>bh*4||bh>bw*4)s*=.25;
    if(s>best){best=s;bestAreaR=areaR;bestDiag=shape.diag;bestAxis=shape.axis}
  }
  return{score:best,areaR:bestAreaR,diag:bestDiag,axis:bestAxis};
}
function verticalEdgeScore(g,W,H,x,y0,y1){
  let s=0;x=clamp(Math.round(x),1,W-2);
  for(let y=Math.max(1,Math.round(y0));y<Math.min(H-1,Math.round(y1));y++)s+=Math.abs(g[y*W+(x+1)]-g[y*W+(x-1)]);
  return s;
}
function refineLineX(g,W,H,base,y0,y1,xmin,xmax){
  let best=clamp(Math.round(base),1,W-2),bestS=-1;
  const lo=Math.max(1,Math.round(Math.max(xmin,base-26))),hi=Math.min(W-2,Math.round(Math.min(xmax,base+26)));
  for(let x=lo;x<=hi;x++){
    const score=verticalEdgeScore(g,W,H,x,y0,y1)-Math.abs(x-base)*2.2;
    if(score>bestS){bestS=score;best=x}
  }
  return best;
}
function buildRowGeometries(canvas,geo){
  const {g,W,H}=grayscale(canvas),ys=[30,130,230,330,430],rows=[];
  for(let r=0;r<4;r++){
    const y0=ys[r]+6,y1=ys[r+1]-6;
    const left1=refineLineX(g,W,H,geo.xR0,y0,y1,geo.xL1+18,geo.xR1-18);
    const left0=refineLineX(g,W,H,geo.xL1,y0,y1,geo.xL0+12,left1-18);
    const right0=refineLineX(g,W,H,geo.xR1,y0,y1,left1+16,geo.xR1+geo.checkWidth-18);
    const right1=refineLineX(g,W,H,geo.xR1+geo.checkWidth,y0,y1,right0+16,Math.min(W-4,geo.xR1+geo.checkWidth+30));
    rows.push({
      y0:ys[r],y1:ys[r+1],
      color0:geo.xL0,color1:geo.xL1,
      label0:geo.xR0,label1:geo.xR1,
      leftCheck0:Math.min(left0,left1-10),leftCheck1:left1,
      rightCheck0:right0,rightCheck1:Math.max(right1,right0+18)
    });
  }
  return rows;
}
function classifyNormalized(canvas){
  const ctx=canvas.getContext("2d",{willReadFrequently:true}),{g,W,H}=grayscale(canvas),geo=detectLabelGeometry(canvas);
  if(!geo)return{name:null,best:{name:"?",score:0,areaR:0},second:{name:"?",score:0,areaR:0},gap:0,vals:[],labelGeometry:null,rowGeometry:null};
  const rows=buildRowGeometries(canvas,geo),vals=[];
  for(let r=0;r<4;r++){
    const row=rows[r];
    vals.push({name:NAMES_L[r],row:r,side:"L",...scoreCell(g,W,H,row.leftCheck0,row.leftCheck1,row.y0,row.y1)});
    vals.push({name:NAMES_R[r],row:r,side:"R",...scoreCell(g,W,H,row.rightCheck0,row.rightCheck1,row.y0,row.y1)});
  }
  vals.sort((a,b)=>b.score-a.score);const best=vals[0],second=vals[1],gap=best.score-second.score;
  const shapeOk=(best.diag>.18)||(best.areaR>.02&&best.axis<.50);
  const accepted=best.areaR>.006&&best.score>.038&&(gap>.012||best.score>second.score*1.30)&&shapeOk;
  ctx.save();ctx.lineWidth=3;ctx.strokeStyle="#2563eb";
  for(const row of rows){
    ctx.strokeRect(row.color0+2,row.y0+2,row.color1-row.color0-4,row.y1-row.y0-4);
    ctx.strokeRect(row.label0+2,row.y0+2,row.label1-row.label0-4,row.y1-row.y0-4);
  }
  ctx.strokeStyle="#16a34a";
  for(const row of rows){
    ctx.strokeRect(row.leftCheck0+2,row.y0+2,row.leftCheck1-row.leftCheck0-4,row.y1-row.y0-4);
    ctx.strokeRect(row.rightCheck0+2,row.y0+2,row.rightCheck1-row.rightCheck0-4,row.y1-row.y0-4);
  }
  const brow=rows[best.row],bx0=best.side==="L"?brow.leftCheck0:brow.rightCheck0,bx1=best.side==="L"?brow.leftCheck1:brow.rightCheck1;
  ctx.lineWidth=7;ctx.strokeStyle=accepted?"#e00000":"#f59e0b";ctx.strokeRect(bx0+7,brow.y0+7,bx1-bx0-14,brow.y1-brow.y0-14);ctx.restore();
  return{name:accepted?best.name:null,best,second,gap,vals,labelGeometry:geo,rowGeometry:rows};
}
function confidenceText(r){
  if(!r||!r.best)return"";
  if(!r.name)return`候補 ${r.best.name} / 確信度不足`;
  const ratio=r.second.score>0?r.best.score/r.second.score:9;
  return`信頼度目安 ${Math.round(clamp(65+(r.best.score-.05)*120+Math.min(20,(ratio-1)*12),65,99))}%`;
}
function drawMessageCanvas(canvas,title,sub,bg="#fff7d6"){
  canvas.width=600;canvas.height=500;const ctx=canvas.getContext("2d");
  ctx.fillStyle=bg;ctx.fillRect(0,0,600,500);ctx.fillStyle="#111";ctx.textAlign="center";ctx.textBaseline="middle";
  ctx.font="bold 54px sans-serif";ctx.fillText(title,300,225);ctx.fillStyle="#666";ctx.font="22px sans-serif";ctx.fillText(sub,300,290);
}

function largestYellowBand(imgData,x0,x1){
  const W=imgData.width,H=imgData.height,d=imgData.data;
  const xa=Math.floor(x0+(x1-x0)*.04),xb=Math.floor(x0+(x1-x0)*.96);
  const ya=Math.floor(H*.18),yb=Math.floor(H*.62);
  const ww=xb-xa,hh=yb-ya,mask=new Uint8Array(ww*hh);

  for(let yy=0;yy<hh;yy++)for(let xx=0;xx<ww;xx++){
    const x=xa+xx,y=ya+yy,i=(y*W+x)*4;
    mask[yy*ww+xx]=yellowBandPixel(d[i],d[i+1],d[i+2])?1:0;
  }

  const seen=new Uint8Array(mask.length),q=new Int32Array(mask.length);
  let best=null;
  for(let p=0;p<mask.length;p++){
    if(!mask[p]||seen[p])continue;
    let head=0,tail=0,area=0,minx=ww,maxx=0,miny=hh,maxy=0;
    q[tail++]=p;seen[p]=1;
    while(head<tail){
      const cur=q[head++],y=(cur/ww)|0,x=cur-y*ww;area++;
      minx=Math.min(minx,x);maxx=Math.max(maxx,x);miny=Math.min(miny,y);maxy=Math.max(maxy,y);
      const ns=[];if(x)ns.push(cur-1);if(x<ww-1)ns.push(cur+1);if(y)ns.push(cur-ww);if(y<hh-1)ns.push(cur+ww);
      for(const np of ns)if(mask[np]&&!seen[np]){seen[np]=1;q[tail++]=np}
    }
    const bw=maxx-minx+1,bh=maxy-miny+1;
    if(area<ww*hh*.015||bw<ww*.22||bh<hh*.08)continue;
    const cand={x:xa+minx,y:ya+miny,w:bw,h:bh,area};
    if(!best||area>best.area)best=cand;
  }
  return best;
}
function cropBandTextBinary(imgData,band){
  if(!band)return null;
  const W=imgData.width,H=imgData.height,d=imgData.data;
  const x0=Math.round(band.x+band.w*.08),x1=Math.round(band.x+band.w*.72),y0=Math.round(band.y+band.h*.12),y1=Math.round(band.y+band.h*.88);
  const sw=Math.max(1,x1-x0),sh=Math.max(1,y1-y0);
  let minx=sw,maxx=0,miny=sh,maxy=0,count=0;
  const gray=new Uint8Array(sw*sh); let sum=0,n=0;
  for(let yy=0;yy<sh;yy++)for(let xx=0;xx<sw;xx++){
    const i=((y0+yy)*W+(x0+xx))*4, g=.299*d[i]+.587*d[i+1]+.114*d[i+2];
    gray[yy*sw+xx]=g;sum+=g;n++;
  }
  const mean=sum/n,thr=Math.min(125,mean-55);
  for(let yy=0;yy<sh;yy++)for(let xx=0;xx<sw;xx++)if(gray[yy*sw+xx]<thr){minx=Math.min(minx,xx);maxx=Math.max(maxx,xx);miny=Math.min(miny,yy);maxy=Math.max(maxy,yy);count++;}
  if(count<40||maxx<=minx||maxy<=miny)return null;
  const bw=maxx-minx+1,bh=maxy-miny+1,out=new Float32Array(120*40);
  for(let oy=0;oy<40;oy++)for(let ox=0;ox<120;ox++){
    const sx=minx+Math.floor(ox/119*(bw-1));
    const sy=miny+Math.floor(oy/39*(bh-1));
    out[oy*120+ox]=gray[sy*sw+sx]<thr?1:0;
  }
  return out;
}
function binarySimilarity(a,b){
  if(!a||!b)return 0;
  let inter=0,union=0,agree=0;
  for(let i=0;i<a.length;i++){
    if(a[i]||b[i])union++;
    if(a[i]&&b[i])inter++;
    if(a[i]===b[i])agree++;
  }
  const iou=union?inter/union:0;
  return iou*.75+(agree/a.length)*.25;
}
function classifyBandText(imgData,x0,x1){
  const band=largestYellowBand(imgData,x0,x1);
  if(!band)return{type:null,reason:"帯未検出",lh:0,pr:0,band:null};
  const bin=cropBandTextBinary(imgData,band);
  if(!bin||!templateLH||!templatePR)return{type:null,reason:"帯文字を抽出できない",lh:0,pr:0,band};
  const lh=binarySimilarity(bin,templateLH),pr=binarySimilarity(bin,templatePR);
  const diff=Math.abs(lh-pr);
  let type=null;
  if(Math.max(lh,pr)>.55&&diff>.075)type=pr>lh?"PR":"LH";
  return{type,lh,pr,band,reason:type?`${type}形状一致`:"文字形状が曖昧"};
}
function halfImageQuality(imgData,x0,x1){
  const W=imgData.width,H=imgData.height,d=imgData.data;
  const xa=Math.floor(x0+(x1-x0)*.07),xb=Math.floor(x0+(x1-x0)*.93),ya=Math.floor(H*.18),yb=Math.floor(H*.84);
  let sum=0,n=0,bright=0,dark=0,edges=0;
  for(let y=ya;y<yb;y+=3){
    for(let x=xa;x<xb;x+=3){
      const i=(y*W+x)*4, lum=.299*d[i]+.587*d[i+1]+.114*d[i+2];
      sum+=lum;n++; if(lum>=155)bright++; if(lum<55)dark++;
      if(x+3<xb){
        const j=(y*W+(x+3))*4, lum2=.299*d[j]+.587*d[j+1]+.114*d[j+2];
        if(Math.abs(lum-lum2)>32)edges++;
      }
    }
  }
  return {mean:sum/Math.max(1,n),brightRatio:bright/Math.max(1,n),darkRatio:dark/Math.max(1,n),edgeRatio:edges/Math.max(1,n)};
}
function halfTableColorCount(C,M,Y,x0,x1,H){
  const ya=H*.42,yb=H*.86;
  return [...C,...M,...Y].filter(c => c.cx>=x0 && c.cx<x1 && c.cy>=ya && c.cy<=yb).length;
}
function safePrimerFallback(imgData,bandResult,C,M,Y,x0,x1){
  const q=halfImageQuality(imgData,x0,x1), colorCount=halfTableColorCount(C,M,Y,x0,x1,imgData.height), bandFound=!!bandResult.band;
  const goodImage=q.mean>=138 && q.brightRatio>=.30 && q.darkRatio<=.38 && q.edgeRatio>=.025;
  const isPrimer=bandFound && goodImage && colorCount===0;
  return {isPrimer,q,colorCount,bandFound};
}
function otsuThreshold(gray){
  const hist=new Uint32Array(256); for(const v of gray)hist[v]++;
  const total=gray.length; let sum=0; for(let i=0;i<256;i++)sum+=i*hist[i];
  let sumB=0,wB=0,varMax=0,thr=128;
  for(let i=0;i<256;i++){
    wB+=hist[i]; if(!wB)continue;
    const wF=total-wB; if(!wF)break;
    sumB+=i*hist[i]; const mB=sumB/wB, mF=(sum-sumB)/wF;
    const variance=wB*wF*(mB-mF)*(mB-mF);
    if(variance>varMax){varMax=variance;thr=i}
  }
  return thr;
}
function prepareBandOCRCanvas(imgData,band){
  if(!band)return null;
  const sx=Math.max(0,Math.floor(band.x+band.w*.03)), sy=Math.max(0,Math.floor(band.y-band.h*.05));
  const sw=Math.min(imgData.width-sx,Math.ceil(band.w*.84)), sh=Math.min(imgData.height-sy,Math.ceil(band.h*1.12));
  if(sw<20||sh<10)return null;
  const c=document.createElement("canvas"); c.width=760; c.height=220;
  const ctx=c.getContext("2d",{willReadFrequently:true});
  ctx.fillStyle="#fff"; ctx.fillRect(0,0,c.width,c.height);
  ctx.drawImage(photo,sx,sy,sw,sh,0,0,c.width,c.height);
  const im=ctx.getImageData(0,0,c.width,c.height), d=im.data, gray=new Uint8Array(c.width*c.height);
  for(let i=0,p=0;i<d.length;i+=4,p++)gray[p]=Math.round(.299*d[i]+.587*d[i+1]+.114*d[i+2]);
  const thr=Math.max(65,Math.min(190,otsuThreshold(gray)));
  for(let i=0,p=0;i<d.length;i+=4,p++){
    const v=gray[p]<thr?0:255; d[i]=d[i+1]=d[i+2]=v; d[i+3]=255;
  }
  ctx.putImageData(im,0,0);
  return c;
}
function parseBandTextType(text){
  const raw=(text||"").toUpperCase();
  const norm=raw.replace(/[^A-Z0-9-]/g,"").replace(/O/g,"0");
  if(/PR-?200/.test(norm))return"PR";
  if(/LH-?100/.test(norm))return"LH";
  return null;
}
async function ocrBandType(imgData,band){
  if(!band)return{type:null,text:"",confidence:0,reason:"帯なし"};
  const TT=await ensureTesseract();
  if(!TT)return{type:null,text:"",confidence:0,reason:"OCRライブラリ読込不可"};
  const c=prepareBandOCRCanvas(imgData,band);
  if(!c)return{type:null,text:"",confidence:0,reason:"OCR画像作成不可"};
  try{
    const res=await TT.recognize(c,"eng",{logger:()=>{}});
    const text=res?.data?.text||"", type=parseBandTextType(text), confidence=Math.round(res?.data?.confidence||0);
    return {type,text:text.trim(),confidence,reason:type?`OCR ${type} ${confidence}%`:`OCR曖昧 ${confidence}%`};
  }catch(e){
    return {type:null,text:"",confidence:0,reason:"OCR失敗"};
  }
}

async function analyze(){
  $("left").textContent="-";$("right").textContent="-";$("leftScore").textContent="";$("rightScore").textContent="";
  setProgress(5);setStatus("2本を確認しています…","info");await sleep(20);

  const img=pctx.getImageData(0,0,photo.width,photo.height),masks=makeColorMasks(img);
  const compsC=connectedComponents(masks.C,masks.W,masks.H),compsM=connectedComponents(masks.M,masks.W,masks.H),compsY=connectedComponents(masks.Y,masks.W,masks.H);
  const mid=photo.width/2;

  const tL=detectTable(compsC,compsM,compsY,0,mid,photo.height), tR=detectTable(compsC,compsM,compsY,mid,photo.width,photo.height);
  const bandL=classifyBandText(img,0,mid), bandR=classifyBandText(img,mid,photo.width);
  const primerFallbackL=safePrimerFallback(img,bandL,compsC,compsM,compsY,0,mid), primerFallbackR=safePrimerFallback(img,bandR,compsC,compsM,compsY,mid,photo.width);

  const centers=[];
  if(tL)centers.push((tL.c.cx+tL.m.cx+tL.y.cx)/3); else if(bandL.band)centers.push(bandL.band.x+bandL.band.w/2);
  if(tR)centers.push((tR.c.cx+tR.m.cx+tR.y.cx)/3); else if(bandR.band)centers.push(bandR.band.x+bandR.band.w/2);
  if(centers.length===2 && Math.abs(centers[1]-centers[0])<photo.width*.24){setStatus("要確認：2本を左右に離して写してください","warn");setProgress(100);return;}

  setProgress(35);setStatus("色・PRIMERを判定中…","info");await sleep(20);

  async function one(t,band,fallback,canvas){
    if(t){
      const raw=document.createElement("canvas"); normalizeTable(photo,t,raw);
      const k=estimateShear(raw); shearCanvas(raw,k,canvas);
      const r=classifyNormalized(canvas); r.shear=k; r.mode=t.mode; r.band=band; r.ocr=null;
      return r;
    }

    const ocr=await ocrBandType(img,band.band);
    if(ocr.type==="PR"){
      drawMessageCanvas(canvas,"PRIMER",`OCR: ${ocr.text||"PR-200"}`,"#eef7ff");
      return {name:"PRIMER",primer:true,reason:ocr.reason,ocr};
    }
    if(ocr.type==="LH"){
      drawMessageCanvas(canvas,"要確認","OCRはLH-100 / 表未検出");
      return {name:null,uncertain:true,reason:`${ocr.reason} / 表未検出`,ocr};
    }
    if(band.type==="PR"){
      drawMessageCanvas(canvas,"PRIMER",`帯形状 PR優勢  LH=${band.lh.toFixed(2)} PR=${band.pr.toFixed(2)}`,"#eef7ff");
      return {name:"PRIMER",primer:true,reason:`帯形状 PR優勢 ${band.pr.toFixed(2)}`,ocr};
    }
    if(band.type==="LH"){
      drawMessageCanvas(canvas,"要確認","LH-100形状だが表を検出できない");
      return {name:null,uncertain:true,reason:"LH-100候補 / 表未検出",ocr};
    }
    if(fallback.isPrimer){
      drawMessageCanvas(canvas,"PRIMER",`表なし / 帯あり / 色マスなし  明るさ=${fallback.q.mean.toFixed(0)}`,"#eef7ff");
      return {name:"PRIMER",primer:true,reason:`表なし+帯あり+色マスなし / 明るさ ${fallback.q.mean.toFixed(0)}`,ocr};
    }
    drawMessageCanvas(canvas,"要確認","表もPR-200も確定できません");
    return {name:null,uncertain:true,reason:`帯文字曖昧 LH=${band.lh.toFixed(2)} PR=${band.pr.toFixed(2)} / 色マス=${fallback.colorCount} / 明るさ=${fallback.q.mean.toFixed(0)}`,ocr};
  }

  const rL=await one(tL,bandL,primerFallbackL,normL);
  const rR=await one(tR,bandR,primerFallbackR,normR);

  $("left").textContent=rL.name||"?"; $("right").textContent=rR.name||"?";
  $("leftScore").textContent=rL.primer?rL.reason:rL.uncertain?rL.reason:confidenceText(rL);
  $("rightScore").textContent=rR.primer?rR.reason:rR.uncertain?rR.reason:confidenceText(rR);

  const desc=r=>r.primer||r.uncertain
    ?`${r.name||"要確認"} / ${r.reason}${r.ocr?` / OCR=${(r.ocr.text||"-").replace(/\s+/g," ")}`:""}`
    :`${r.best.name} score=${r.best.score.toFixed(3)} / 2位=${r.second.name} ${r.second.score.toFixed(3)} / diag=${(r.best.diag||0).toFixed(2)} / band LH=${r.band?.lh?.toFixed?.(2)||"-"} PR=${r.band?.pr?.toFixed?.(2)||"-"}`;
  $("debugText").textContent=`左: ${desc(rL)}　右: ${desc(rR)}`;

  setProgress(100);
  if(!rL.name||!rR.name)setStatus("要確認","warn");
  else if(rL.name===rR.name)setStatus("OK","ok");
  else setStatus("ERROR","ng");
}

$("debugBtn").onclick=()=>$("debug").classList.toggle("on");
})();
