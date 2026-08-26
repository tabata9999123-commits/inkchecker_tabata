(() => {
"use strict";
const $=id=>document.getElementById(id);
const file=$("file"),video=$("video"),photo=$("photo");
const pctx=photo.getContext("2d",{willReadFrequently:true});
const normL=$("normL"),normR=$("normR"),bar=$("bar");
const startCameraBtn=$("startCamera"),captureBtn=$("capture");
let stream=null;

function detectDeviceProfile(){
  const ua=navigator.userAgent||"";
  const uaL=ua.toLowerCase();
  const isiPhone=/iphone/.test(uaL);
  const isiPad=/ipad/.test(uaL) || (/macintosh/.test(uaL) && (navigator.maxTouchPoints||0)>1);
  const isAndroid=/android/.test(uaL);
  const shortCss=Math.min(screen.width||0, screen.height||0);
  const dpr=window.devicePixelRatio||1;
  const shortPx=Math.round(shortCss*dpr);
  const isTablet=(isAndroid && shortCss>=600) || isiPad;
  let kind='other';
  if(isiPhone) kind='iphone';
  else if(isiPad) kind='ipad';
  else if(isAndroid && isTablet) kind='android_tablet';
  else if(isAndroid) kind='android_phone';
  const tiltEnabled=(kind==='android_tablet');
  return {
    ua, kind, isAndroid, isiPhone, isiPad, isTablet, shortCss, shortPx, dpr,
    tiltEnabled, leftTilt: tiltEnabled?10:0, rightTilt: tiltEnabled?-10:0
  };
}
let DEVICE_PROFILE=detectDeviceProfile();
let DIAG={source:'-', videoW:0, videoH:0, trackW:0, trackH:0, cropW:0, cropH:0, analysisW:0, analysisH:0, fileW:0, fileH:0};
function updateDiag(){
  const el=$("diag"); if(!el) return;
  DEVICE_PROFILE=detectDeviceProfile();
  el.textContent=[
    `device=${DEVICE_PROFILE.kind}`,
    `tiltEnabled=${DEVICE_PROFILE.tiltEnabled?'yes':'no'}  leftTilt=${DEVICE_PROFILE.leftTilt}  rightTilt=${DEVICE_PROFILE.rightTilt}`,
    `screen=${DEVICE_PROFILE.shortCss}px short-side  dpr=${DEVICE_PROFILE.dpr}  shortPx=${DEVICE_PROFILE.shortPx}`,
    `source=${DIAG.source}`,
    `live=${DIAG.videoW||'-'}x${DIAG.videoH||'-'}  track=${DIAG.trackW||'-'}x${DIAG.trackH||'-'}`,
    `crop=${DIAG.cropW||'-'}x${DIAG.cropH||'-'}  analysis=${DIAG.analysisW||'-'}x${DIAG.analysisH||'-'}`,
    `file=${DIAG.fileW||'-'}x${DIAG.fileH||'-'}`,
    `ua=${DEVICE_PROFILE.ua}`
  ].join('\n');
}

const NAMES_L=["C","M","Y","K"],NAMES_R=["W","CL","LC","LM"];
const LH_TEMPLATE="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAPAAAABQCAAAAAACIqegAAAErElEQVR4AeXBC5LkuBEFwYj7H/qpgMz6kLsEaBqNWbXaXX4Z+WXkl5FfRn4Z+WXk5wuD3CI/XxjkFvnpwpPcID9ceJM9+SkCyFn4JFvyI4Qn+RCOZEt+gPBB3sKJ7Mg3CQ9yEj7JSziTHfkeochROJCnUIRQZEO+RyhyEE6khUmGMMiGfI9Q5CCcSAuTDGGQDfkeochBOJEWJhnCIBvyNUKTT6EIockUJpnCIGvyd4VBbghNPoVJHkKRIUxSwiBr8heFJ9kKT/IpTDKEIg9hkhIGWZP/mchZaLITXuQtFJlCkYcwSQmDrMkfC03OQpOd8CJvoUgJkzyESUoYZE3+WHiSk9BkLXyQt1CkhCIQJmlhkCX5c6HJSWiyFj7JSyhSQhEIk7QwyJLsBWQhNDkJTVbCkbyEIiUUgTBJC4MsyV5AFkKTk9BkJRzJSyhSQhEIk7QwyJKshCYLoclJaLIQTuQlFGlhEgiTtDDIkqyEJguhyUloshBO5CUUaWESCEVKGGRJVkKThdDkJDRZCCfyEoq0UIRQpIRBlmQlPMm10OQsFFkIkxAmeQlFWigCYZISBlmStVDkWniSk9DkWhgEwiQvoUgLRSBMUsIgS7IWiiyEJiehybXwIA9hkpdQpIUiECYpYZAlWQtFFkKTk9DkWgAZwiQvoUgLRSBMUsIgS7IWiiyEJiehybUgJRR5CkVaKAJhkhYeZEnWQpGF0OQkNLkjFHkKRVooAmGSFgZZkbVQZCE0OQlN7ghFnkKRFopAmKSFQVZkLTzJpdDkJDS5JUzyFiYpoQiEIiUMsiJr4UkuhSYnocktYZK3MEkJRSAUKWGQFdkITS6FJ5nCP8gdYZK3MEkLkzyESUoYZEU2QpNLYU/uCJO8hUlamOQhTFLCgyzJRmhyLWzJHWGStzBJC5M8hElKeJAl2QhNroUtuSNM8hYmaWGSh1BkCg+yJBuhybWwJXeEST6EQVqYZAqDDGGQJdkIT3IpbMkdoclLmKSESaYwyBAGWZKN8CSXwpbcEZq8hElKmGQKgwxhkCXZCU0uhS25JRR5CZOUMMkUJnkIgyzJTmhyKfwrITS5JRR5CZOUMEkJk4RJ1mQnNLkU3uQgFLklFHkLRR5CkRKOZE12QpNLoclZaHJHKPIWijyEIi0cyJrshCYLochJaHJHKPIWmhCKPIVPsiE7oclCKHISmtwRinwI/yAv4YNsyE5oshCKnIQmd4QiH8I/yFt4kR3ZCU9yLRQ5CU3uCE0+hBP5FIrsyU54kmuhyElockdo8ikcyUlA7pCd8CTXQpGT0OSO0ORTOJKTgNwhW6HJtVDkJDS5JRT5FA7kvyZbocm1UOQsFLklFDkKL/IHZCs0WQhNjkKTO0KRk1Dkj8hWaLIQmhyFJneEIn+HbIUmC6HJUWhyRyjyd8hWeJJroclRaHJHAPl7ZCs8ybXQ5Cg0+QayF5p8CE2G0OQoNPkGsheWZAhNTkKRbyB7YUmG0OQkFPkGsheWZApNjkKRbyB7YUmm0OQoPMiXkL2wJFNo8s1kLyzJFJp8M9kLS/KTyF64Ij+O3BAO5AeTG8KD/F+QX0Z+Gfll5JeRX0Z+mf8AzQdpYBKRD2YAAAAASUVORK5CYII=";
const PR_TEMPLATE="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAPAAAABQCAAAAAACIqegAAAFbElEQVR4AeXBC5JbORIEwYj7HzpHbBQK4OeBzR0b00rtLj+M/DDyw8gPIz+M/DDylwkbeSJ/mbCRJ/JXCQ/kgfwxQpEr4Ynckz9DuCOvhBfkjvx+YZAr4ZE8CRdkI79fGORKeCRPwgXZyG8V7skr4Zk8CFdkI79TeCKPwktyL1ySRX6b8JLcC1dkExaBsMgi/7PwgnxXuCK7cEU2oclNWKTJx8KRfEu4Jku4Ji00GUKTJh8LR/It4Zos4Zq00GQITZos4RW5E96R7wjXZAlNfgmLtFCkhUmalHBJNuE9eSucSAuTfAlNWijSwiRNSjiRKXyDvBMWuQmLTKHJEJqUMEkLTSYp4UhK+A55IzQZQpMpFJlCkxImaaHJJCUcSQnfIWdhkhaaDGGSFiYpYZIWmkxSwpGU8B1yFiZpockQJmlhkhImaaHJJC2cyBC+Q85CkSU0GcIkLUxSwiSbUGSSFk5kCE3uhI0chSJLaDKESVpoMoRJNqHIJC0cSQmDPAiLHIUiS2gyhElaaDKEIrtQZJIWBmlhkRIGeRSaHIUiS2gyhCJLaHITmiyhySQtDNLCIiUM8ig0OQpFltBkCEWW0OQmNFlCk0laGGQJTUoY5FFo8rnQZAhFltDkJjTZhSKTtDDILhQpYZBnocjnQpOb0GQJTW5Ck10oMkkLg9wJg5QwyLNQ5HNhki+hyRKa3IQmu1BkkhYGuROKDGGQZ6HIx0KTL6HJEprchCa7MEmRFga5E4oMYZBHocnHQpMvockSmtyEJrswSZEWBrkTigxhkEehycdCky+hyRKa3IQmuzBJkRYGuROKDGGQR6HJp8IiX0KTJTS5CU12YZIiLQxyJxQZwiCPwiQfC02G0GQXityEJrswSZEWBrkTigxhkHthkU+FRYbQZAlNbkKTXSgySQuD7EKREgZp4YF8KCxSQpMlNLkJTXahyCQtDLILRUp4Sz4TFmmhyRKaDKHILhSZpIVBdqFICW/JZ8IiLTRZQpMhFNmFIpO0MEgLi5TwjnwmbKSFJrtQZAhFdqHIJC0UCc+khDP5UNjIEprsQpEhFNmFIpO0cCJTOJIPhY1sQpNdKDKEIrtQZJIWTmQKJ/KpsJFNaLILRYZQZAlNJmnhRKZwIp8KG9mEJrtQZAhFltBkkhYOpIVr8qmwk11YZBOKDKHIEppM0sI1WcIV+VjYyYMwSQtNhjBJC5M0aeGK7EKRm7CTj4SNPAmTtNBkCJO0MEmTFi7InVCkhEU+EDbyLEzSwiQlTDKFJk2W8Io8CEWmsMi3hY28ECZpYZIpFJlCkyZLeEUehCJTWOTbwkZeCJO0MMkUikyhSZMlDHIUikxhkW8Li7wSJmlhkik0GcIkiyzhi5yFIi0s8j1hIy+FRYbQZApNvoQmiyzhi5yFIpuwyDeERa6EJkNo0kKTX0KTjSzhi5yFIpuwkffCIlfCIjehyRIuyUaWMMhRKLILi7wVFrkUFvklLLKEC3JHljDIUSiyC4u8FRa5FBb5JSyyhAtyR5YwyFEosgsbeSecyBQuyS68JPdkCYMchSJ3wiJvhCOZwiW5E16Re7KEQY5CkTthI2fhSFp4TZ6ER/JIljDIUShyLyxyFM5kCa/IC+GePJElDHIUitwLixyFM1nCK/JCuCdPZAmDHIUiD8IiJ+FMduGJvBYWeUGWMMhRKPIgLHISzuROeCAnkUuyhEGOQpEnYZFr4R3ZhY38C7KEQc7CIE/CIlfCO/Is3Mi/I0sY5CgUeRYWuRAuyX9MljDIUSjyLCxyIVyS/5gsYZCzMMgLocmlgPwWsoRBzsIgL4Qm/4dkCYOchS/yJ5JN5K8nP4z8MPLDyA8jP4z8MP8A/CayYHDbmTcAAAAASUVORK5CYII=";
let templateLH=null,templatePR=null;
let tesseractPromise=null;
let ocrWorkerPromise=null;
const CANON_W=900, CANON_H=1200, CANON_ASPECT=CANON_W/CANON_H;
const SIDE_SCALE=1.55;
const APPS_SCRIPT_URL="https://script.google.com/macros/s/AKfycbx99T2sldzAqQk4QCOIyZQRGXVZ8ySzNz0l7MmMY6C5dZJNtHVAOIA8OEwNquTjNh0o6A/exec";
const CORRECT_VALUES=new Set(["C","M","Y","K","W","CL","LC","LM","PRIMER"]);
let LAST_ANALYSIS=null;

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
async function getOCRWorker(){
  if(ocrWorkerPromise)return ocrWorkerPromise;
  ocrWorkerPromise=(async()=>{
    const T=await ensureTesseract();
    if(!T)return null;
    try{
      const worker=await T.createWorker("eng");
      await worker.setParameters({
        tessedit_char_whitelist:"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789- ",
        preserve_interword_spaces:"1"
      });
      return worker;
    }catch(e){
      console.warn("OCR worker init failed",e);
      return null;
    }
  })();
  return ocrWorkerPromise;
}

async function startCamera(){
  try{
    if(!navigator.mediaDevices?.getUserMedia)throw new Error("このブラウザではページ内カメラを使えません");
    if(stream)stream.getTracks().forEach(t=>t.stop());
    stream=await navigator.mediaDevices.getUserMedia({
      audio:false,
      video:{facingMode:{ideal:"environment"},width:{ideal:1600},height:{ideal:1200},aspectRatio:{ideal:CANON_ASPECT}}
    });
    video.srcObject=stream;await video.play();
    const tr=stream.getVideoTracks()[0]; const st=tr&&tr.getSettings?tr.getSettings():{};
    DIAG.source="camera"; DIAG.videoW=video.videoWidth; DIAG.videoH=video.videoHeight;
    DIAG.trackW=st.width||0; DIAG.trackH=st.height||0; DIAG.fileW=0; DIAG.fileH=0;
    updateDiag();
    $("cameraPlaceholder").style.display="none";
    $("captureState").classList.remove("on");
    $("retake").classList.remove("show");
    captureBtn.textContent="この状態で撮影・判定";
    captureBtn.disabled=false;
    setStatus("左右に1本ずつ。枠は目安なので大体でOK","info");
  }catch(e){console.error(e);setStatus("カメラを起動できません："+e.message,"warn")}
}
function stopCamera(){
  if(stream){stream.getTracks().forEach(t=>t.stop());stream=null}
  captureBtn.disabled=true;
  $("retake").classList.remove("show");
}
startCameraBtn.onclick=startCamera;


function drawVisibleVideoToPhoto(){
  const wrap=$("cameraWrap").getBoundingClientRect(),targetAspect=CANON_ASPECT;
  const vw=video.videoWidth,vh=video.videoHeight;if(!vw||!vh)throw new Error("カメラ映像が未準備です");
  let sx=0,sy=0,sw=vw,sh=vh;const srcAspect=vw/vh;
  if(srcAspect>targetAspect){sw=vh*targetAspect;sx=(vw-sw)/2}
  else{sh=vw/targetAspect;sy=(vh-sh)/2}
  photo.width=CANON_W;photo.height=CANON_H;
  pctx.clearRect(0,0,CANON_W,CANON_H);
  pctx.drawImage(video,sx,sy,sw,sh,0,0,CANON_W,CANON_H);
  photo.style.display="block";
  const tr=stream?.getVideoTracks?.()[0]; const st=tr&&tr.getSettings?tr.getSettings():{};
  DIAG.source="camera"; DIAG.videoW=vw; DIAG.videoH=vh; DIAG.trackW=st.width||0; DIAG.trackH=st.height||0;
  DIAG.cropW=Math.round(sw); DIAG.cropH=Math.round(sh); DIAG.analysisW=CANON_W; DIAG.analysisH=CANON_H;
  updateDiag();
}
function drawAnyImageToCanonical(img){
  const iw=img.naturalWidth||img.videoWidth||img.width, ih=img.naturalHeight||img.videoHeight||img.height;
  let sx=0,sy=0,sw=iw,sh=ih; const srcAspect=iw/ih;
  if(srcAspect>CANON_ASPECT){sw=ih*CANON_ASPECT; sx=(iw-sw)/2;}
  else{sh=iw/CANON_ASPECT; sy=(ih-sh)/2;}
  photo.width=CANON_W; photo.height=CANON_H;
  pctx.clearRect(0,0,CANON_W,CANON_H);
  pctx.drawImage(img,sx,sy,sw,sh,0,0,CANON_W,CANON_H);
  photo.style.display="block";
  DIAG.source="file"; DIAG.fileW=iw; DIAG.fileH=ih; DIAG.analysisW=CANON_W; DIAG.analysisH=CANON_H;
  DIAG.videoW=0; DIAG.videoH=0; DIAG.trackW=0; DIAG.trackH=0; DIAG.cropW=Math.round(sw); DIAG.cropH=Math.round(sh);
  updateDiag();
}

function showCaptureFlash(){
  const f=$("captureFlash");f.classList.add("on");
  if(navigator.vibrate)try{navigator.vibrate(35)}catch(_){}
  setTimeout(()=>f.classList.remove("on"),180);
}
async function freezeAfterCapture(){
  try{video.pause()}catch(_){}
  showCaptureFlash();
  $("captureState").textContent="撮影しました・判定中…";
  $("captureState").classList.add("on");
  $("retake").classList.add("show");
  captureBtn.textContent="撮影済み";
  captureBtn.disabled=true;
}
async function resumeForRetake(){
  $("captureState").classList.remove("on");
  $("retake").classList.remove("show");
  photo.style.display="none";
  captureBtn.textContent="この状態で撮影・判定";
  if(stream){
    try{await video.play()}catch(_){}
    captureBtn.disabled=false;
    setStatus("左右に1本ずつ。枠は目安なので大体でOK","info");
  }
}
$("retake").onclick=resumeForRetake;

captureBtn.onclick=async()=>{
  try{
    drawVisibleVideoToPhoto();
    await freezeAfterCapture();
    $("message").textContent="撮影済みの画像を解析しています";
    await analyze();
    $("captureState").textContent="撮影済み";
  }catch(e){
    console.error(e);setStatus("撮影エラー："+e.message,"ng");
    $("captureState").textContent="撮影済み・エラー";
  }
};
file.addEventListener("change",e=>{
  const f=e.target.files&&e.target.files[0];if(!f)return;
  const img=new Image(),url=URL.createObjectURL(f);setStatus("画像を読み込み中…","info");
  img.onload=async()=>{
    drawAnyImageToCanonical(img);URL.revokeObjectURL(url);
    $("message").textContent=`画像 ${img.naturalWidth}×${img.naturalHeight} を 900×1200 に正規化して解析します`;
    await analyze();
  };
  img.onerror=()=>setStatus("画像を読み込めませんでした","ng");img.src=url;
});


function makeSideSearchCanvas(side){
  const half=photo.width/2;
  const sx=side==="L"?0:half;
  const sw=half, sh=photo.height;

  const c=document.createElement("canvas");
  c.width=Math.round(sw*SIDE_SCALE);
  c.height=Math.round(sh*SIDE_SCALE);

  const ctx=c.getContext("2d",{willReadFrequently:true});
  ctx.imageSmoothingEnabled=true;
  ctx.imageSmoothingQuality="high";
  ctx.drawImage(photo,sx,0,sw,sh,0,0,c.width,c.height);
  return c;
}
function detectTableOnSide(sideCanvas){
  const ctx=sideCanvas.getContext("2d",{willReadFrequently:true});
  const img=ctx.getImageData(0,0,sideCanvas.width,sideCanvas.height);
  const masks=makeColorMasks(img);
  const C=connectedComponents(masks.C,masks.W,masks.H);
  const M=connectedComponents(masks.M,masks.W,masks.H);
  const Y=connectedComponents(masks.Y,masks.W,masks.H);
  const t=detectTable(C,M,Y,0,sideCanvas.width,sideCanvas.height);
  return {t,C,M,Y,img};
}

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
  if(kind==="LMBG")return v>.42&&s>.045&&s<.58&&((h>=325&&h<=359)||(h>=0&&h<=18))&&r>g+7;
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

function scoreNormalizedPatch(g,SW,SH){
  const x0=Math.round(SW*.13),x1=Math.round(SW*.87);
  const y0=Math.round(SH*.13),y1=Math.round(SH*.87);
  const ww=x1-x0,hh=y1-y0;
  let sum=0,n=0;
  for(let y=y0;y<y1;y+=2)for(let x=x0;x<x1;x+=2){sum+=g[y*SW+x];n++}
  const mean=sum/Math.max(1,n),thr=Math.min(145,mean-42),mask=new Uint8Array(ww*hh);
  for(let yy=0;yy<hh;yy++)for(let xx=0;xx<ww;xx++)mask[yy*ww+xx]=g[(y0+yy)*SW+(x0+xx)]<thr?1:0;

  const seen=new Uint8Array(ww*hh),q=new Int32Array(ww*hh);
  let best=0,bestAreaR=0,bestDiag=0,bestAxis=1;

  for(let p=0;p<mask.length;p++){
    if(!mask[p]||seen[p])continue;
    let head=0,tail=0,area=0,minx=ww,maxx=0,miny=hh,maxy=0;
    const pts=[];
    q[tail++]=p;seen[p]=1;

    while(head<tail){
      const cur=q[head++],y=(cur/ww)|0,x=cur-y*ww;
      area++;pts.push([x,y]);
      minx=Math.min(minx,x);maxx=Math.max(maxx,x);miny=Math.min(miny,y);maxy=Math.max(maxy,y);
      const ns=[];if(x)ns.push(cur-1);if(x<ww-1)ns.push(cur+1);if(y)ns.push(cur-ww);if(y<hh-1)ns.push(cur+ww);
      for(const np of ns)if(mask[np]&&!seen[np]){seen[np]=1;q[tail++]=np}
    }

    const bw=maxx-minx+1,bh=maxy-miny+1;
    if(area<10||bw<5||bh<5||bw>ww*.96||bh>hh*.96)continue;

    const fill=area/(bw*bh),areaR=area/(ww*hh),span=(bw/ww)*(bh/hh);
    const shape=markShapeMetrics(pts,minx,miny,bw,bh,area);
    let s=areaR*(1+Math.min(1.35,span*2.7))*(.64+Math.min(.95,fill))*shape.factor;
    if(bw>bh*4.4||bh>bw*4.4)s*=.22;

    if(s>best){best=s;bestAreaR=areaR;bestDiag=shape.diag;bestAxis=shape.axis}
  }
  return {score:best,areaR:bestAreaR,diag:bestDiag,axis:bestAxis};
}
function bilerpQuad(q,u,v){
  const topX=q[0].x+(q[1].x-q[0].x)*u;
  const topY=q[0].y+(q[1].y-q[0].y)*u;
  const botX=q[3].x+(q[2].x-q[3].x)*u;
  const botY=q[3].y+(q[2].y-q[3].y)*u;
  return {x:topX+(botX-topX)*v,y:topY+(botY-topY)*v};
}
function scoreQuad(g,W,H,q){
  const SW=84,SH=84,out=new Uint8Array(SW*SH);
  for(let yy=0;yy<SH;yy++){
    const v=yy/(SH-1);
    for(let xx=0;xx<SW;xx++){
      const u=xx/(SW-1),p=bilerpQuad(q,u,v);
      const x=clamp(Math.round(p.x),0,W-1),y=clamp(Math.round(p.y),0,H-1);
      out[yy*SW+xx]=g[y*W+x];
    }
  }
  return scoreNormalizedPatch(out,SW,SH);
}
function horizontalEdgeScore(g,W,H,y,x0,x1){
  y=clamp(Math.round(y),1,H-2);
  let s=0;
  const xa=Math.max(1,Math.round(x0)),xb=Math.min(W-2,Math.round(x1));
  for(let x=xa;x<xb;x++)s+=Math.abs(g[(y+1)*W+x]-g[(y-1)*W+x]);
  return s;
}
function refineBoundaryY(g,W,H,base,x0,x1){
  let best=clamp(Math.round(base),2,H-3),bestS=-1;
  const lo=Math.max(2,Math.round(base-24)),hi=Math.min(H-3,Math.round(base+24));
  for(let y=lo;y<=hi;y++){
    const s=horizontalEdgeScore(g,W,H,y,x0,x1)-Math.abs(y-base)*7.5;
    if(s>bestS){bestS=s;best=y}
  }
  return best;
}
function makeCellQuad(g,W,H,x0,x1,topBase,bottomBase){
  const w=x1-x0,margin=Math.max(5,w*.10),mid=(x0+x1)/2;
  const topL=refineBoundaryY(g,W,H,topBase,x0+margin,mid-margin*.2);
  const topR=refineBoundaryY(g,W,H,topBase,mid+margin*.2,x1-margin);
  const botL=refineBoundaryY(g,W,H,bottomBase,x0+margin,mid-margin*.2);
  const botR=refineBoundaryY(g,W,H,bottomBase,mid+margin*.2,x1-margin);

  // Keep the quadrilateral sane even if one faint grid line is missed.
  const maxTilt=22;
  const tR=clamp(topR,topL-maxTilt,topL+maxTilt);
  const bR=clamp(botR,botL-maxTilt,botL+maxTilt);

  return [
    {x:x0,y:topL},
    {x:x1,y:tR},
    {x:x1,y:bR},
    {x:x0,y:botL}
  ];
}
function drawQuad(ctx,q,inset=0){
  let qq=q;
  if(inset){
    const cx=q.reduce((s,p)=>s+p.x,0)/4,cy=q.reduce((s,p)=>s+p.y,0)/4;
    qq=q.map(p=>({x:p.x+(cx-p.x)*inset,y:p.y+(cy-p.y)*inset}));
  }
  ctx.beginPath();
  ctx.moveTo(qq[0].x,qq[0].y);
  for(let i=1;i<4;i++)ctx.lineTo(qq[i].x,qq[i].y);
  ctx.closePath();
  ctx.stroke();
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


function rowColorRange(canvas,kind,y0,y1,xMax=230){
  const ctx=canvas.getContext("2d",{willReadFrequently:true});
  const im=ctx.getImageData(0,0,canvas.width,canvas.height),W=im.width,H=im.height,d=im.data;
  const xs=[];
  for(let y=Math.max(0,y0);y<Math.min(H,y1);y+=2){
    for(let x=0;x<Math.min(W,xMax);x++){
      const i=(y*W+x)*4;
      if(maskPixelForLabel(kind,d[i],d[i+1],d[i+2]))xs.push(x);
    }
  }
  if(xs.length<80)return null;
  return [percentileNumber(xs.slice(),.06),percentileNumber(xs.slice(),.94)];
}
function rowRightLabelRange(canvas,kind,y0,y1,xMin,xMax){
  const ctx=canvas.getContext("2d",{willReadFrequently:true});
  const im=ctx.getImageData(0,0,canvas.width,canvas.height),W=im.width,H=im.height,d=im.data;
  const xs=[];
  for(let y=Math.max(0,y0);y<Math.min(H,y1);y++){
    for(let x=Math.max(0,Math.floor(xMin));x<Math.min(W,Math.floor(xMax));x++){
      const i=(y*W+x)*4;
      if(maskPixelForLabel(kind,d[i],d[i+1],d[i+2]))xs.push(x);
    }
  }
  if(xs.length<120)return null;
  return [percentileNumber(xs.slice(),.07),percentileNumber(xs.slice(),.93)];
}
function linearFitAt(vals,row){
  const pts=[];
  for(let i=0;i<vals.length;i++)if(vals[i]!=null)pts.push([i,vals[i]]);
  if(!pts.length)return null;
  if(pts.length===1)return pts[0][1];
  let sx=0,sy=0,sxx=0,sxy=0;
  for(const [x,y] of pts){sx+=x;sy+=y;sxx+=x*x;sxy+=x*y}
  const n=pts.length,den=n*sxx-sx*sx;
  if(Math.abs(den)<1e-6)return sy/n;
  const a=(n*sxy-sx*sy)/den,b=(sy-a*sx)/n;
  return a*row+b;
}
function deriveCylinderAnchors(canvas){
  const W=canvas.width,H=canvas.height;
  const rows=[["C",30,130],["M",130,230],["Y",230,330]];
  const left0=[null,null,null,null],left1=[null,null,null,null];

  for(let r=0;r<3;r++){
    const rr=rowColorRange(canvas,rows[r][0],rows[r][1][0]||rows[r][1],rows[r][2]||0);
  }

  // C/M/Y are strong anchors. K is extrapolated from them because black itself
  // is less distinctive than the three colored cells.
  for(let r=0;r<3;r++){
    const [kind,y0,y1]=rows[r];
    const rg=rowColorRange(canvas,kind,y0,y1,235);
    if(rg){left0[r]=rg[0];left1[r]=rg[1]}
  }
  if([left0[0],left0[1],left0[2]].filter(v=>v!=null).length<2)return null;

  left0[3]=linearFitAt(left0,3);
  left1[3]=linearFitAt(left1,3);

  // The LC and LM colored backgrounds are used only as horizontal/cylindrical
  // anchors. W/CL are then extrapolated from the LC/LM trend.
  const baseL1=linearFitAt(left1,2) || 100;
  const lc=rowRightLabelRange(canvas,"LCBG",230,330,baseL1+18,Math.min(W,baseL1+390));
  const lm=rowRightLabelRange(canvas,"LMBG",330,430,baseL1+18,Math.min(W,baseL1+390));

  const r0=[null,null,null,null],r1=[null,null,null,null];
  if(lc){r0[2]=lc[0];r1[2]=lc[1]}
  if(lm){r0[3]=lm[0];r1[3]=lm[1]}

  // If LM is not clean enough, use the old LC geometry as a stable fallback.
  if(!lc || !lm){
    const geo=detectLabelGeometry(canvas);
    if(geo){
      if(!lc){r0[2]=geo.xR0;r1[2]=geo.xR1}
      if(!lm){r0[3]=geo.xR0;r1[3]=geo.xR1}
    }
  }
  if(r0.filter(v=>v!=null).length<1)return null;

  for(let r=0;r<4;r++){
    if(r0[r]==null)r0[r]=linearFitAt(r0,r);
    if(r1[r]==null)r1[r]=linearFitAt(r1,r);
  }

  const bounds=[];
  for(let r=0;r<4;r++){
    let a0=linearFitAt(left0,r),a1=linearFitAt(left1,r);
    let b0=r0[r],b1=r1[r];
    if([a0,a1,b0,b1].some(v=>v==null))return null;

    // Sane width constraints; prevent a colored reflection from becoming an anchor.
    const colorW=a1-a0,labelW=b1-b0,leftCheck=b0-a1;
    if(colorW<18||colorW>130||labelW<28||labelW>180||leftCheck<22||leftCheck>190)return null;

    // Right check column is physically close to the left check column width.
    // This avoids relying on the faint outer grid line.
    const rightCheck=Math.max(28,Math.min(175,leftCheck));
    const b4=Math.min(W-5,b1+rightCheck);
    if(b4<=b1+12)return null;

    bounds.push([a0,a1,b0,b1,b4]);
  }
  return {bounds};
}
function interpRowBoundary(bounds,y,k){
  const centers=[80,180,280,380];
  if(y<=centers[0]){
    const slope=(bounds[1][k]-bounds[0][k])/(centers[1]-centers[0]);
    return bounds[0][k]+slope*(y-centers[0]);
  }
  if(y>=centers[3]){
    const slope=(bounds[3][k]-bounds[2][k])/(centers[3]-centers[2]);
    return bounds[3][k]+slope*(y-centers[3]);
  }
  for(let r=0;r<3;r++){
    if(y>=centers[r]&&y<=centers[r+1]){
      const t=(y-centers[r])/(centers[r+1]-centers[r]);
      return bounds[r][k]+(bounds[r+1][k]-bounds[r][k])*t;
    }
  }
  return bounds[0][k];
}
function mapTargetXToSource(x,targetB,sourceB){
  if(x<=targetB[0])return sourceB[0];
  if(x>=targetB[4])return sourceB[4];
  for(let k=0;k<4;k++){
    if(x>=targetB[k]&&x<=targetB[k+1]){
      const den=targetB[k+1]-targetB[k];
      const t=den?((x-targetB[k])/den):0;
      return sourceB[k]+(sourceB[k+1]-sourceB[k])*t;
    }
  }
  return sourceB[4];
}
function cylindricalRectify(src,dst){
  const anchors=deriveCylinderAnchors(src);
  if(!anchors)return null;

  const sctx=src.getContext("2d",{willReadFrequently:true});
  const sim=sctx.getImageData(0,0,src.width,src.height);
  const sd=sim.data,SW=sim.width,SH=sim.height;

  dst.width=600;dst.height=500;
  const dctx=dst.getContext("2d",{willReadFrequently:true});
  dctx.fillStyle="#fff";dctx.fillRect(0,0,600,500);
  const dim=dctx.getImageData(0,0,600,500),dd=dim.data;

  // Standardized front-facing table geometry.
  const targetB=[45,130,260,390,520];

  for(let y=20;y<455;y++){
    const sourceB=[
      interpRowBoundary(anchors.bounds,y,0),
      interpRowBoundary(anchors.bounds,y,1),
      interpRowBoundary(anchors.bounds,y,2),
      interpRowBoundary(anchors.bounds,y,3),
      interpRowBoundary(anchors.bounds,y,4)
    ];

    for(let x=targetB[0];x<=targetB[4];x++){
      const sx=mapTargetXToSource(x,targetB,sourceB);
      const sy=y;
      const ix=clamp(Math.round(sx),0,SW-1),iy=clamp(Math.round(sy),0,SH-1);
      const si=(iy*SW+ix)*4,di=(y*600+x)*4;
      dd[di]=sd[si];dd[di+1]=sd[si+1];dd[di+2]=sd[si+2];dd[di+3]=255;
    }
  }
  dctx.putImageData(dim,0,0);
  return {targetB,anchors};
}
function classifyRectified(canvas,rectInfo){
  const ctx=canvas.getContext("2d",{willReadFrequently:true}),{g,W,H}=grayscale(canvas);
  const ys=[30,130,230,330,430],b=rectInfo.targetB,vals=[];

  for(let r=0;r<4;r++){
    const qL=[
      {x:b[1],y:ys[r]},{x:b[2],y:ys[r]},
      {x:b[2],y:ys[r+1]},{x:b[1],y:ys[r+1]}
    ];
    const qR=[
      {x:b[3],y:ys[r]},{x:b[4],y:ys[r]},
      {x:b[4],y:ys[r+1]},{x:b[3],y:ys[r+1]}
    ];
    vals.push({name:NAMES_L[r],row:r,side:"L",quad:qL,...scoreQuad(g,W,H,qL)});
    vals.push({name:NAMES_R[r],row:r,side:"R",quad:qR,...scoreQuad(g,W,H,qR)});
  }

  vals.sort((a,b)=>b.score-a.score);
  const best=vals[0],second=vals[1],gap=best.score-second.score;
  const shapeOk=(best.diag>.14)||(best.areaR>.017&&best.axis<.54);
  const accepted=best.areaR>.005&&best.score>.031&&(gap>.009||best.score>second.score*1.24)&&shapeOk;

  ctx.save();
  ctx.lineWidth=3;ctx.strokeStyle="#2563eb";
  for(let r=0;r<4;r++){
    ctx.strokeRect(b[0]+2,ys[r]+2,b[1]-b[0]-4,ys[r+1]-ys[r]-4);
    ctx.strokeRect(b[2]+2,ys[r]+2,b[3]-b[2]-4,ys[r+1]-ys[r]-4);
  }
  ctx.strokeStyle="#16a34a";
  for(let r=0;r<4;r++){
    ctx.strokeRect(b[1]+2,ys[r]+2,b[2]-b[1]-4,ys[r+1]-ys[r]-4);
    ctx.strokeRect(b[3]+2,ys[r]+2,b[4]-b[3]-4,ys[r+1]-ys[r]-4);
  }
  const bx0=best.side==="L"?b[1]:b[3],bx1=best.side==="L"?b[2]:b[4];
  ctx.lineWidth=7;ctx.strokeStyle=accepted?"#e00000":"#f59e0b";
  ctx.strokeRect(bx0+8,ys[best.row]+8,bx1-bx0-16,ys[best.row+1]-ys[best.row]-16);
  ctx.restore();

  return {
    name:accepted?best.name:null,
    best,second,gap,vals,
    cylinderRectified:true,
    anchorBounds:rectInfo.anchors.bounds
  };
}


function medianNumber(vals){
  const a=vals.filter(v=>Number.isFinite(v)).sort((x,y)=>x-y);
  if(!a.length)return null;
  return a[(a.length/2)|0];
}
function rectangleQuad(x0,x1,y0,y1){
  return [
    {x:x0,y:y0},{x:x1,y:y0},
    {x:x1,y:y1},{x:x0,y:y1}
  ];
}
function tiltedQuad(x0,x1,y0,y1,tiltPx){
  const maxTilt=Math.min(16, Math.max(-16, tiltPx));
  return [
    {x:x0,y:y0-maxTilt/2},
    {x:x1,y:y0+maxTilt/2},
    {x:x1,y:y1+maxTilt/2},
    {x:x0,y:y1-maxTilt/2}
  ];
}
function classifyByColorRows(canvas,bottleSide="L",deviceProfile=DEVICE_PROFILE){
  const ctx=canvas.getContext("2d",{willReadFrequently:true});
  const {g,W,H}=grayscale(canvas);

  // Only C/M/Y are used as strong anchors. K row is extrapolated one pitch lower.
  const cRg=rowColorRange(canvas,"C",30,130,235);
  const mRg=rowColorRange(canvas,"M",130,230,235);
  const yRg=rowColorRange(canvas,"Y",230,330,235);
  const good=[cRg,mRg,yRg].filter(Boolean);
  if(good.length<2)return null;

  const colorLeft=medianNumber(good.map(r=>r[0]));
  const colorRight=medianNumber(good.map(r=>r[1]));
  if(colorLeft==null||colorRight==null||colorRight-colorLeft<20)return null;

  // After normalizeTable, row pitch is approximately 100 px.
  // We deliberately do NOT use faint grid lines for these row zones.
  const rowCenters=[80,180,280,380];
  const rowHalf=47;

  // Left check column is directly to the right of C/M/Y/K.
  // Wide enough to tolerate perspective/compression, but stops before W/CL/LC/LM text.
  const leftX0=colorRight+3;
  const leftX1=Math.min(W-5,colorRight+112);

  // LC / LM background is optional. If found, use its right edge only to locate
  // the right check strip. Failure here does NOT abort recognition.
  const lcRg=rowRightLabelRange(canvas,"LCBG",230,330,colorRight+60,Math.min(W,colorRight+310));
  const lmRg=rowRightLabelRange(canvas,"LMBG",330,430,colorRight+60,Math.min(W,colorRight+310));
  const labelRight=medianNumber([lcRg?.[1],lmRg?.[1]]);

  let rightX0,rightX1;
  if(labelRight!=null){
    rightX0=labelRight+3;
    rightX1=Math.min(W-5,labelRight+122);
  }else{
    // Physical table proportions observed from the real labels:
    // color cell -> left check -> W/CL/LC/LM -> right check.
    rightX0=colorRight+178;
    rightX1=Math.min(W-5,colorRight+315);
  }

  if(leftX1-leftX0<35||rightX1-rightX0<35)return null;

  const sideTilt=bottleSide==="L" ? deviceProfile.leftTilt : deviceProfile.rightTilt;
  const vals=[];
  for(let r=0;r<4;r++){
    const y0=Math.max(10,rowCenters[r]-rowHalf);
    const y1=Math.min(H-10,rowCenters[r]+rowHalf);

    // Fixed weak tilt per bottle side:
    // left bottle = slightly down to the right, right bottle = slightly up to the right.
    const qL=tiltedQuad(leftX0,leftX1,y0,y1,sideTilt*0.8);
    const qR=tiltedQuad(rightX0,rightX1,y0,y1,sideTilt);

    vals.push({name:NAMES_L[r],row:r,side:"L",quad:qL,...scoreQuad(g,W,H,qL)});
    vals.push({name:NAMES_R[r],row:r,side:"R",quad:qR,...scoreQuad(g,W,H,qR)});
  }

  vals.sort((a,b)=>b.score-a.score);
  const best=vals[0],second=vals[1],gap=best.score-second.score;

  // This path is intentionally based on mark position + diagonal shape,
  // not on exact box boundaries.
  const shapeOk=(best.diag>.12)||(best.areaR>.014&&best.axis<.58);
  const accepted=
    best.areaR>.0045 &&
    best.score>.026 &&
    (gap>.0065 || best.score>second.score*1.18) &&
    shapeOk;

  ctx.save();

  // Blue: color anchors / optional LC-LM label column.
  ctx.lineWidth=3;
  ctx.strokeStyle="#2563eb";
  ctx.strokeRect(colorLeft,32,colorRight-colorLeft,396);
  if(lcRg)ctx.strokeRect(lcRg[0],232,lcRg[1]-lcRg[0],96);
  if(lmRg)ctx.strokeRect(lmRg[0],332,lmRg[1]-lmRg[0],96);

  // Green: broad search strips. These are NOT grid boxes.
  ctx.strokeStyle="#16a34a";
  for(const v of vals)drawQuad(ctx,v.quad,.03);

  // Red/orange: selected row + side.
  ctx.lineWidth=7;
  ctx.strokeStyle=accepted?"#e00000":"#f59e0b";
  drawQuad(ctx,best.quad,.10);
  ctx.restore();

  return {
    name:accepted?best.name:null,
    best,second,gap,vals,
    rowBased:true,
    colorLeft,colorRight,
    leftZone:[leftX0,leftX1],
    rightZone:[rightX0,rightX1],
    labelRight,
    bottleSide,
    sideTilt
  };
}

function classifyNormalized(canvas){
  const ctx=canvas.getContext("2d",{willReadFrequently:true}),{g,W,H}=grayscale(canvas),geo=detectLabelGeometry(canvas);
  if(!geo)return{name:null,best:{name:"?",score:0,areaR:0},second:{name:"?",score:0,areaR:0},gap:0,vals:[],labelGeometry:null,rowGeometry:null};

  const rows=buildRowGeometries(canvas,geo),vals=[];
  for(let r=0;r<4;r++){
    const row=rows[r];

    const qL=makeCellQuad(g,W,H,row.leftCheck0,row.leftCheck1,row.y0,row.y1);
    const qR=makeCellQuad(g,W,H,row.rightCheck0,row.rightCheck1,row.y0,row.y1);

    vals.push({name:NAMES_L[r],row:r,side:"L",quad:qL,...scoreQuad(g,W,H,qL)});
    vals.push({name:NAMES_R[r],row:r,side:"R",quad:qR,...scoreQuad(g,W,H,qR)});
  }

  vals.sort((a,b)=>b.score-a.score);
  const best=vals[0],second=vals[1],gap=best.score-second.score;

  const shapeOk=(best.diag>.16)||(best.areaR>.018&&best.axis<.52);
  const accepted=best.areaR>.0055&&best.score>.034&&(gap>.010||best.score>second.score*1.26)&&shapeOk;

  ctx.save();
  ctx.lineWidth=3;
  ctx.strokeStyle="#2563eb";
  for(const row of rows){
    ctx.strokeRect(row.color0+2,row.y0+2,row.color1-row.color0-4,row.y1-row.y0-4);
    ctx.strokeRect(row.label0+2,row.y0+2,row.label1-row.label0-4,row.y1-row.y0-4);
  }

  // Actual check areas are now drawn as angle-following quadrilaterals.
  ctx.strokeStyle="#16a34a";
  for(const v of vals)drawQuad(ctx,v.quad,.03);

  ctx.lineWidth=7;
  ctx.strokeStyle=accepted?"#e00000":"#f59e0b";
  drawQuad(ctx,best.quad,.10);
  ctx.restore();

  return{name:accepted?best.name:null,best,second,gap,vals,labelGeometry:geo,rowGeometry:rows};
}
function confidenceText(r){ return ""; }
function drawMessageCanvas(canvas,title,sub,bg="#fff7d6"){
  canvas.width=600;canvas.height=500;const ctx=canvas.getContext("2d");
  ctx.fillStyle=bg;ctx.fillRect(0,0,600,500);ctx.fillStyle="#111";ctx.textAlign="center";ctx.textBaseline="middle";
  ctx.font="bold 54px sans-serif";ctx.fillText(title,300,225);ctx.fillStyle="#666";ctx.font="22px sans-serif";ctx.fillText(sub,300,290);
}

function largestYellowBand(imgData,x0,x1){
  const W=imgData.width,H=imgData.height,d=imgData.data;
  const xa=Math.floor(x0+(x1-x0)*.015),xb=Math.floor(x0+(x1-x0)*.985);
  const ya=Math.floor(H*.12),yb=Math.floor(H*.72);
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
    if(area<ww*hh*.006||bw<ww*.14||bh<hh*.035)continue;
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
  const goodImage=q.mean>=128 && q.brightRatio>=.24 && q.darkRatio<=.45 && q.edgeRatio>=.018;
  const prLean=bandResult.pr>=.24 && bandResult.pr>=bandResult.lh+.015;
  const isPrimer=bandFound && goodImage && colorCount<=2 && prLean;
  return {isPrimer,q,colorCount,bandFound,prLean};
}
function otsuThreshold(gray){
  const hist=new Uint32Array(256);for(const v of gray)hist[v]++;
  const total=gray.length;let sum=0;for(let i=0;i<256;i++)sum+=i*hist[i];
  let sumB=0,wB=0,varMax=0,thr=128;
  for(let i=0;i<256;i++){
    wB+=hist[i];if(!wB)continue;
    const wF=total-wB;if(!wF)break;
    sumB+=i*hist[i];const mB=sumB/wB,mF=(sum-sumB)/wF;
    const variance=wB*wF*(mB-mF)*(mB-mF);
    if(variance>varMax){varMax=variance;thr=i}
  }
  return thr;
}
function drawOCRPanel(sheet,sx,sy,sw,sh,dy,mode){
  const ctx=sheet.getContext("2d",{willReadFrequently:true}),pw=900,ph=190;
  ctx.fillStyle="#fff";ctx.fillRect(0,dy,pw,ph);
  ctx.drawImage(photo,sx,sy,sw,sh,15,dy+10,pw-30,ph-20);
  if(mode==="original")return;
  const im=ctx.getImageData(0,dy,pw,ph),d=im.data,gray=new Uint8Array(pw*ph);
  for(let i=0,p=0;i<d.length;i+=4,p++)gray[p]=Math.round(.299*d[i]+.587*d[i+1]+.114*d[i+2]);
  if(mode==="gray"){
    let mn=255,mx=0;for(const v of gray){mn=Math.min(mn,v);mx=Math.max(mx,v)}
    const span=Math.max(40,mx-mn);
    for(let i=0,p=0;i<d.length;i+=4,p++){
      const v=clamp(Math.round((gray[p]-mn)*255/span),0,255);d[i]=d[i+1]=d[i+2]=v;d[i+3]=255;
    }
  }else{
    const thr=Math.max(70,Math.min(190,otsuThreshold(gray)));
    for(let i=0,p=0;i<d.length;i+=4,p++){
      const v=gray[p]<thr?0:255;d[i]=d[i+1]=d[i+2]=v;d[i+3]=255;
    }
  }
  ctx.putImageData(im,0,dy);
}
function primerOCRRegions(imgData,band,x0,x1){
  const W=imgData.width,H=imgData.height,half=x1-x0;
  if(band){
    const bx=Math.max(x0,Math.floor(band.x-band.w*.18));
    const by=Math.max(0,Math.floor(band.y-band.h*.45));
    const bw=Math.min(x1-bx,Math.ceil(band.w*1.30));
    const bh=Math.min(H-by,Math.ceil(band.h*1.95));
    const lx=Math.max(x0,Math.floor(band.x-band.w*.25));
    const ly=Math.max(0,Math.floor(band.y-band.h*.35));
    const lw=Math.min(x1-lx,Math.ceil(band.w*1.42));
    const lh=Math.min(H-ly,Math.ceil(band.h*5.2));
    return {band:{x:bx,y:by,w:bw,h:bh},label:{x:lx,y:ly,w:lw,h:lh}};
  }
  return {
    band:{x:Math.floor(x0+half*.12),y:Math.floor(H*.16),w:Math.floor(half*.80),h:Math.floor(H*.17)},
    label:{x:Math.floor(x0+half*.08),y:Math.floor(H*.15),w:Math.floor(half*.84),h:Math.floor(H*.43)}
  };
}
function preparePrimerOCRSheet(imgData,band,x0,x1){
  const r=primerOCRRegions(imgData,band,x0,x1),sheet=document.createElement("canvas");
  sheet.width=900;sheet.height=780;
  const ctx=sheet.getContext("2d");ctx.fillStyle="#fff";ctx.fillRect(0,0,sheet.width,sheet.height);
  drawOCRPanel(sheet,r.band.x,r.band.y,r.band.w,r.band.h,0,"original");
  drawOCRPanel(sheet,r.band.x,r.band.y,r.band.w,r.band.h,195,"binary");
  drawOCRPanel(sheet,r.label.x,r.label.y,r.label.w,r.label.h,390,"gray");
  drawOCRPanel(sheet,r.label.x,r.label.y,r.label.w,r.label.h,585,"binary");
  return sheet;
}
function editDistance(a,b){
  const m=a.length,n=b.length,dp=new Array(n+1);for(let j=0;j<=n;j++)dp[j]=j;
  for(let i=1;i<=m;i++){
    let prev=dp[0];dp[0]=i;
    for(let j=1;j<=n;j++){
      const tmp=dp[j],cost=a[i-1]===b[j-1]?0:1;
      dp[j]=Math.min(dp[j]+1,dp[j-1]+1,prev+cost);prev=tmp;
    }
  }
  return dp[n];
}
function bestTargetDistance(clean,target){
  if(clean.includes(target))return 0;
  let best=99;
  for(let len=Math.max(2,target.length-1);len<=target.length+1;len++){
    for(let i=0;i+len<=clean.length;i++)best=Math.min(best,editDistance(clean.slice(i,i+len),target));
  }
  return best;
}
function parseBandTextType(text){
  const raw=(text||"").toUpperCase();
  const clean=raw.replace(/[^A-Z0-9]/g,"").replace(/O/g,"0");
  const dPR=bestTargetDistance(clean,"PR200"),dPrimer=bestTargetDistance(clean,"PRIMER"),dLH=bestTargetDistance(clean,"LH100");
  if(dPR<=1||dPrimer<=1)return{type:"PR",dPR,dPrimer,dLH,clean};
  if(dLH<=1)return{type:"LH",dPR,dPrimer,dLH,clean};
  // Partial evidence: require recognizable PR + 200 pattern, or PRIME stem.
  if((/PR.{0,2}2.{0,1}00/.test(clean))||clean.includes("PRIME"))return{type:"PR",dPR,dPrimer,dLH,clean};
  return{type:null,dPR,dPrimer,dLH,clean};
}
async function ocrBandType(imgData,band,x0,x1){
  const worker=await getOCRWorker();
  if(!worker)return{type:null,text:"",confidence:0,reason:"OCRライブラリ読込不可"};
  const sheet=preparePrimerOCRSheet(imgData,band,x0,x1);
  try{
    const res=await worker.recognize(sheet);
    const text=res?.data?.text||"",confidence=Math.round(res?.data?.confidence||0),parsed=parseBandTextType(text);
    return {type:parsed.type,text:text.trim(),confidence,parsed,reason:parsed.type?`OCR ${parsed.type}`:`OCR要確認`};
  }catch(e){
    console.warn("OCR failed",e);
    return{type:null,text:"",confidence:0,reason:"OCR失敗"};
  }
}


function setCorrectSelects(leftName,rightName){
  const l=$("leftCorrect"),r=$("rightCorrect");
  l.value=CORRECT_VALUES.has(leftName)?leftName:"";
  r.value=CORRECT_VALUES.has(rightName)?rightName:"";
  $("sendResult").disabled=false;
  $("sendMessage").className="sendNote";
  $("sendMessage").textContent="判定が正しければ、そのまま「結果を送信」でOKです。";
}
function analysisImageDataURL(){
  const c=document.createElement("canvas");
  c.width=1200;c.height=560;
  const x=c.getContext("2d");
  x.fillStyle="#fff";x.fillRect(0,0,c.width,c.height);
  x.fillStyle="#111";x.font="bold 28px sans-serif";
  x.fillText(`左  判定: ${$("left").textContent}`,24,38);
  x.fillText(`右  判定: ${$("right").textContent}`,624,38);
  x.drawImage(normL,0,60,600,500);
  x.drawImage(normR,600,60,600,500);
  return c.toDataURL("image/png");
}
function currentResultStatus(){
  const t=$("status").textContent.trim();
  return (t==="OK"||t==="ERROR")?t:"要確認";
}
async function sendResultToSheet(){
  if(!LAST_ANALYSIS)return;
  const lc=$("leftCorrect").value,rc=$("rightCorrect").value;
  if(!CORRECT_VALUES.has(lc)||!CORRECT_VALUES.has(rc)){
    $("sendMessage").className="sendNote sendError";
    $("sendMessage").textContent="左・右の正解を選んでください。";
    return;
  }
  const btn=$("sendResult"),msg=$("sendMessage");
  btn.disabled=true;btn.textContent="送信中…";
  msg.className="sendNote";msg.textContent="元画像と解析画像を送信しています…";

  const predictedL=LAST_ANALYSIS.left||"";
  const predictedR=LAST_ANALYSIS.right||"";
  const confirmation=(predictedL===lc&&predictedR===rc)?"判定一致":"修正あり";

  const payload={
    device:DEVICE_PROFILE.kind,
    leftResult:predictedL,
    rightResult:predictedR,
    leftCorrect:lc,
    rightCorrect:rc,
    result:LAST_ANALYSIS.status,
    confirmation,
    leftTilt:DEVICE_PROFILE.leftTilt,
    rightTilt:DEVICE_PROFILE.rightTilt,
    originalImage:photo.toDataURL("image/jpeg",0.72),
    analysisImage:analysisImageDataURL()
  };

  try{
    await fetch(APPS_SCRIPT_URL,{
      method:"POST",
      mode:"no-cors",
      headers:{"Content-Type":"text/plain;charset=utf-8"},
      body:JSON.stringify(payload)
    });
    msg.className="sendNote sendDone";
    msg.textContent="送信しました。スプレッドシートで確認できます。";
    btn.textContent="送信済み";
  }catch(e){
    console.error(e);
    msg.className="sendNote sendError";
    msg.textContent="送信できませんでした。通信状態を確認してもう一度押してください。";
    btn.textContent="結果を送信";
    btn.disabled=false;
  }
}
$("sendResult").onclick=sendResultToSheet;
$("leftCorrect").onchange=()=>{if(LAST_ANALYSIS){$("sendResult").disabled=false;$("sendResult").textContent="結果を送信";}};
$("rightCorrect").onchange=()=>{if(LAST_ANALYSIS){$("sendResult").disabled=false;$("sendResult").textContent="結果を送信";}};

async function analyze(){
  $("left").textContent="-";$("right").textContent="-";$("leftScore").textContent="";$("rightScore").textContent="";
  LAST_ANALYSIS=null;$("sendResult").disabled=true;$("sendResult").textContent="結果を送信";
  $("sendMessage").className="sendNote";$("sendMessage").textContent="判定中です…";
  setProgress(5);setStatus("2本を確認しています…","info");await sleep(20);

  const img=pctx.getImageData(0,0,photo.width,photo.height);
  const masks=makeColorMasks(img);
  const compsC=connectedComponents(masks.C,masks.W,masks.H),compsM=connectedComponents(masks.M,masks.W,masks.H),compsY=connectedComponents(masks.Y,masks.W,masks.H);
  const mid=photo.width/2;

  // Normal ink detection is done independently on enlarged left/right images.
  // This avoids the tablet camera making each bottle too small inside the full frame.
  const sideL=makeSideSearchCanvas("L"),sideR=makeSideSearchCanvas("R");
  const searchL=detectTableOnSide(sideL),searchR=detectTableOnSide(sideR);
  const tL=searchL.t,tR=searchR.t;

  // Primer keeps using the original canonical full image, because the band OCR
  // already has its own wide crop and preprocessing.
  const bandL=classifyBandText(img,0,mid), bandR=classifyBandText(img,mid,photo.width);
  const primerFallbackL=safePrimerFallback(img,bandL,compsC,compsM,compsY,0,mid), primerFallbackR=safePrimerFallback(img,bandR,compsC,compsM,compsY,mid,photo.width);

  const centers=[];
  if(bandL.band)centers.push(bandL.band.x+bandL.band.w/2);
  if(bandR.band)centers.push(bandR.band.x+bandR.band.w/2);
  if(centers.length===2 && Math.abs(centers[1]-centers[0])<photo.width*.24){setStatus("要確認：2本を左右に離して写してください","warn");setProgress(100);return;}

  setProgress(35);setStatus("色・PRIMERを判定中…","info");await sleep(20);

  async function one(t,band,fallback,canvas,sideX0,sideX1,sourceCanvas,bottleSide){
    if(t){
      const raw=document.createElement("canvas"); normalizeTable(sourceCanvas,t,raw);
      const k=estimateShear(raw);
      const sheared=document.createElement("canvas");
      shearCanvas(raw,k,sheared);

      // v3.1 main path:
      // Ignore faint grid lines. C/M/Y/K define the rows; check marks are
      // searched inside two broad vertical strips and assigned to the nearest row.
      canvas.width=sheared.width;canvas.height=sheared.height;
      canvas.getContext("2d",{willReadFrequently:true}).drawImage(sheared,0,0);

      const rowResult=classifyByColorRows(canvas,bottleSide,DEVICE_PROFILE);
      if(rowResult){
        rowResult.shear=k;
        rowResult.mode=t.mode;
        rowResult.band=band;
        rowResult.ocr=null;
        rowResult.rectifyMode="color-row";
        return rowResult;
      }

      // Fallback only if the strong color anchors themselves cannot be established.
      const r=classifyNormalized(canvas);
      r.shear=k;r.mode=t.mode;r.band=band;r.ocr=null;r.rectifyMode="legacy";
      return r;
    }

    const ocr=await ocrBandType(img,band.band,sideX0,sideX1);
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
      drawMessageCanvas(canvas,"PRIMER",`表なし / PR帯寄り / 明るさ=${fallback.q.mean.toFixed(0)}`,"#eef7ff");
      return {name:"PRIMER",primer:true,reason:`表なし+PR帯寄り / 色マス候補${fallback.colorCount} / 明るさ ${fallback.q.mean.toFixed(0)}`,ocr};
    }
    drawMessageCanvas(canvas,"要確認","表もPR-200も確定できません");
    return {name:null,uncertain:true,reason:`帯文字曖昧 LH=${band.lh.toFixed(2)} PR=${band.pr.toFixed(2)} / 色マス=${fallback.colorCount} / 明るさ=${fallback.q.mean.toFixed(0)}`,ocr};
  }

  const rL=await one(tL,bandL,primerFallbackL,normL,0,mid,sideL,"L");
  const rR=await one(tR,bandR,primerFallbackR,normR,mid,photo.width,sideR,"R");

  $("left").textContent=rL.name||"?"; $("right").textContent=rR.name||"?";
  $("leftScore").textContent=rL.uncertain?"要確認":(rL.primer?"":"");
  $("rightScore").textContent=rR.uncertain?"要確認":(rR.primer?"":"");

  const desc=r=>r.primer||r.uncertain
    ?`${r.name||"要確認"} / ${r.reason}${r.ocr?` / OCR=${(r.ocr.text||"-").replace(/\s+/g," ")}`:""}`
    :`${r.best.name} / 2位=${r.second.name} / 方式=${r.rectifyMode||"-"} / device=${DEVICE_PROFILE.kind} / side=${r.bottleSide||"-"} tilt=${r.sideTilt||0} / 斜線=${(r.best.diag||0).toFixed(2)} / band LH=${r.band?.lh?.toFixed?.(2)||"-"} PR=${r.band?.pr?.toFixed?.(2)||"-"}`;
  $("debugText").textContent=`左: ${desc(rL)}　右: ${desc(rR)}`;

  setProgress(100);
  if(!rL.name||!rR.name)setStatus("要確認","warn");
  else if(rL.name===rR.name)setStatus("OK","ok");
  else setStatus("ERROR","ng");

  LAST_ANALYSIS={
    left:rL.name||"",
    right:rR.name||"",
    status:currentResultStatus()
  };
  setCorrectSelects(rL.name,rR.name);
}

updateDiag();
$("debugBtn").onclick=()=>$("debug").classList.toggle("on");
})();
