(() => {
"use strict";

const $ = id => document.getElementById(id);
const file = $("file");
const photo = $("photo");
const pctx = photo.getContext("2d", {willReadFrequently:true});
const normL = $("normL");
const normR = $("normR");
const bar = $("bar");

const NAMES_L = ["C","M","Y","K"];
const NAMES_R = ["W","CL","LC","LM"];

function clamp(v,a,b){ return Math.max(a, Math.min(b,v)); }
function setProgress(v){ bar.style.width = `${clamp(v,0,100)}%`; }
function setStatus(text, kind="info"){
  const e=$("status");
  e.textContent=text;
  e.className=`status ${kind}`;
}
function sleep(ms=0){ return new Promise(r=>setTimeout(r,ms)); }

function rgbToHSV(r,g,b){
  r/=255; g/=255; b/=255;
  const mx=Math.max(r,g,b), mn=Math.min(r,g,b), d=mx-mn;
  let h=0;
  if(d!==0){
    if(mx===r) h=((g-b)/d)%6;
    else if(mx===g) h=(b-r)/d+2;
    else h=(r-g)/d+4;
    h*=60; if(h<0)h+=360;
  }
  return [h, mx===0?0:d/mx, mx];
}

function colorKind(r,g,b){
  const [h,s,v]=rgbToHSV(r,g,b);
  if(s<.27 || v<.22) return "";
  if(h>=170 && h<=235 && s>.32) return "C";
  if(((h>=315 && h<=359)||(h>=0 && h<=12)) && s>.34) return "M";
  if(h>=38 && h<=72 && s>.38) return "Y";
  return "";
}

function makeColorMasks(imgData){
  const {width:W,height:H,data}=imgData;
  const N=W*H;
  const C=new Uint8Array(N), M=new Uint8Array(N), Y=new Uint8Array(N);
  const y0=Math.floor(H*.18), y1=Math.floor(H*.88);

  for(let y=y0;y<y1;y++){
    let p=y*W;
    for(let x=0;x<W;x++,p++){
      const i=p*4;
      const k=colorKind(data[i],data[i+1],data[i+2]);
      if(k==="C") C[p]=1;
      else if(k==="M") M[p]=1;
      else if(k==="Y") Y[p]=1;
    }
  }
  return {C,M,Y,W,H};
}

function connectedComponents(mask,W,H){
  const comps=[];
  const q=new Int32Array(mask.length);
  const minArea=W*H*.00002;
  const maxArea=W*H*.012;

  for(let p=0;p<mask.length;p++){
    if(mask[p]!==1) continue;
    let head=0,tail=0;
    q[tail++]=p; mask[p]=2;
    let area=0,minx=W,maxx=0,miny=H,maxy=0,sx=0,sy=0;

    while(head<tail){
      const cur=q[head++], y=(cur/W)|0, x=cur-y*W;
      area++; sx+=x; sy+=y;
      if(x<minx)minx=x;if(x>maxx)maxx=x;
      if(y<miny)miny=y;if(y>maxy)maxy=y;

      const xa=x>0?x-1:x, xb=x<W-1?x+1:x;
      const ya=y>0?y-1:y, yb=y<H-1?y+1:y;
      for(let ny=ya;ny<=yb;ny++){
        let np=ny*W+xa;
        for(let nx=xa;nx<=xb;nx++,np++){
          if(mask[np]===1){ mask[np]=2; q[tail++]=np; }
        }
      }
    }

    const w=maxx-minx+1,h=maxy-miny+1,ar=w/h;
    const fill=area/(w*h);
    if(area<minArea || area>maxArea) continue;
    if(w<5 || h<7 || w>W*.12 || h>H*.12) continue;
    if(ar<.28 || ar>1.75) continue;
    if(fill<.30) continue;
    comps.push({x:minx,y:miny,w,h,area,fill,cx:sx/area,cy:sy/area});
  }
  comps.sort((a,b)=>b.area-a.area);
  return comps.slice(0,80);
}

function overlap1D(a0,a1,b0,b1){
  return Math.max(0,Math.min(a1,b1)-Math.max(a0,b0));
}

function bestTriplet(C,M,Y,x0,x1,H){
  const halfW=x1-x0;
  C=C.filter(c=>c.cx>=x0&&c.cx<x1&&c.cx<x0+halfW*.70);
  M=M.filter(c=>c.cx>=x0&&c.cx<x1&&c.cx<x0+halfW*.70);
  Y=Y.filter(c=>c.cx>=x0&&c.cx<x1&&c.cx<x0+halfW*.70);

  let best=null;
  for(const c of C) for(const m of M) for(const y of Y){
    if(!(c.cy<m.cy && m.cy<y.cy)) continue;
    if(c.cy<H*.32 || y.cy>H*.83) continue;

    const ax=m.cx-c.cx, ay=m.cy-c.cy;
    const bx=y.cx-m.cx, by=y.cy-m.cy;
    const d1=Math.hypot(ax,ay), d2=Math.hypot(bx,by);
    const avgH=(c.h+m.h+y.h)/3, avgW=(c.w+m.w+y.w)/3;

    if(!(d1>.60*avgH && d1<1.55*avgH && d2>.60*avgH && d2<1.55*avgH)) continue;

    const cos=(ax*bx+ay*by)/(d1*d2);
    if(cos<.965) continue;

    const ratio=d1/d2;
    if(ratio<.72 || ratio>1.38) continue;

    const xspread=Math.max(c.cx,m.cx,y.cx)-Math.min(c.cx,m.cx,y.cx);
    if(xspread>Math.max(avgW*.45,d1*.38)) continue;

    const ov1=overlap1D(c.x,c.x+c.w,m.x,m.x+m.w);
    const ov2=overlap1D(m.x,m.x+m.w,y.x,y.x+y.w);
    if(ov1<Math.min(c.w,m.w)*.52 || ov2<Math.min(m.w,y.w)*.52) continue;

    const gap1=m.y-(c.y+c.h);
    const gap2=y.y-(m.y+m.h);
    if(Math.abs(gap1)>avgH*.48 || Math.abs(gap2)>avgH*.48) continue;

    const minW=Math.min(c.w,m.w,y.w), maxW=Math.max(c.w,m.w,y.w);
    const minH=Math.min(c.h,m.h,y.h), maxH=Math.max(c.h,m.h,y.h);
    if(maxW/Math.max(1,minW)>1.65 || maxH/Math.max(1,minH)>1.55) continue;

    const fill=(c.fill+m.fill+y.fill)/3;
    const score=
      (c.area+m.area+y.area)*fill +
      cos*2600 -
      Math.abs(d1-d2)*30 -
      xspread*28 -
      (Math.abs(gap1)+Math.abs(gap2))*12;

    if(!best || score>best.score) best={score,c,m,y};
  }
  return best;
}


/* C/M/Yのうち1色が反射などで拾えない場合、
   残り2色の縦並びから欠けた1色の位置を推定する。 */
function syntheticComp(cx,cy,w,h,area,fill){
  return {cx,cy,w,h,area,fill,x:cx-w/2,y:cy-h/2};
}

function bestPairFallback(C,M,Y,x0,x1,H){
  const halfW=x1-x0;
  const filter = arr => arr.filter(c =>
    c.cx>=x0 && c.cx<x1 &&
    c.cx<x0+halfW*.70 &&
    c.cy>H*.35 && c.cy<H*.86
  );

  C=filter(C); M=filter(M); Y=filter(Y);

  const idx={C:0,M:1,Y:2};
  let best=null;

  function evaluate(a,b,ka,kb){
    const step=idx[kb]-idx[ka];
    if(step<=0 || b.cy<=a.cy) return;

    const dx=b.cx-a.cx, dy=b.cy-a.cy;
    const dist=Math.hypot(dx,dy);
    const avgH=(a.h+b.h)/2, avgW=(a.w+b.w)/2;
    const per=dist/step;

    if(per<.55*avgH || per>1.65*avgH) return;
    if(Math.abs(dx)/step>avgW*.75) return;

    const sizeRatio=Math.max(a.h,b.h)/Math.max(1,Math.min(a.h,b.h));
    if(sizeRatio>1.8) return;

    const fill=(a.fill+b.fill)/2;
    const score=(a.area+b.area)*fill -
      Math.abs(dx)*20 -
      Math.abs(per-avgH)*10;

    const vx=dx/step, vy=dy/step;
    const comps={C:null,M:null,Y:null};
    comps[ka]=a; comps[kb]=b;

    for(const key of ["C","M","Y"]){
      if(comps[key]) continue;
      const di=idx[key]-idx[ka];
      const cx=a.cx+vx*di, cy=a.cy+vy*di;
      const area=avgW*avgH*fill;
      comps[key]=syntheticComp(cx,cy,avgW,avgH,area,fill);
    }

    const candidate={
      score,
      c:comps.C,
      m:comps.M,
      y:comps.Y,
      fallback:true
    };
    if(!best || score>best.score) best=candidate;
  }

  for(const c of C){
    for(const m of M) evaluate(c,m,"C","M");
    for(const y of Y) evaluate(c,y,"C","Y");
  }
  for(const m of M){
    for(const y of Y) evaluate(m,y,"M","Y");
  }
  return best;
}

function detectTable(C,M,Y,x0,x1,H){
  const strict=bestTriplet(C,M,Y,x0,x1,H);
  if(strict){
    strict.mode="strict";
    return strict;
  }
  const fallback=bestPairFallback(C,M,Y,x0,x1,H);
  if(fallback){
    fallback.mode="pair";
    return fallback;
  }
  return null;
}

function drawPrimerCanvas(canvas){
  canvas.width=600;
  canvas.height=500;
  const ctx=canvas.getContext("2d");
  ctx.fillStyle="#f7f7f7";
  ctx.fillRect(0,0,canvas.width,canvas.height);
  ctx.fillStyle="#111";
  ctx.textAlign="center";
  ctx.textBaseline="middle";
  ctx.font="bold 58px sans-serif";
  ctx.fillText("PRIMER",canvas.width/2,canvas.height/2-18);
  ctx.fillStyle="#666";
  ctx.font="24px sans-serif";
  ctx.fillText("チェック表なし",canvas.width/2,canvas.height/2+52);
}

function normalizeTable(sourceCanvas,t,dstCanvas){
  const c=t.c, y=t.y;
  const C={x:c.cx,y:c.cy}, Y={x:y.cx,y:y.cy};
  const vx=(Y.x-C.x)/2, vy=(Y.y-C.y)/2;
  const vl=Math.hypot(vx,vy);
  const ux=vx/vl, uy=vy/vl;
  let hx=uy, hy=-ux;
  if(hx<0){hx=-hx;hy=-hy;}

  const scale=100, xmin=-.8, ymin=-.8;
  dstCanvas.width=600; dstCanvas.height=500;
  const ctx=dstCanvas.getContext("2d",{willReadFrequently:true});
  ctx.setTransform(1,0,0,1,0,0);
  ctx.clearRect(0,0,600,500);

  const a=scale/vl*hx;
  const ccoef=scale/vl*hy;
  const b=scale/vl*ux;
  const d=scale/vl*uy;
  const e=-(scale/vl)*(C.x*hx+C.y*hy)-xmin*scale;
  const f=-(scale/vl)*(C.x*ux+C.y*uy)-ymin*scale;

  ctx.setTransform(a,b,ccoef,d,e,f);
  ctx.drawImage(sourceCanvas,0,0);
  ctx.setTransform(1,0,0,1,0,0);
}

function grayscale(canvas){
  const ctx=canvas.getContext("2d",{willReadFrequently:true});
  const im=ctx.getImageData(0,0,canvas.width,canvas.height);
  const g=new Uint8Array(canvas.width*canvas.height);
  for(let i=0,p=0;i<im.data.length;i+=4,p++){
    g[p]=Math.round(.299*im.data[i]+.587*im.data[i+1]+.114*im.data[i+2]);
  }
  return {g,W:canvas.width,H:canvas.height};
}

function estimateShear(canvas){
  const {g,W,H}=grayscale(canvas);
  let bestK=0,bestScore=-Infinity;
  const xref=80;

  for(let ki=-15;ki<=15;ki++){
    const k=ki*.03;
    const bins=new Float32Array(760);

    for(let x=30;x<Math.min(W-20,470);x+=4){
      for(let y=12;y<H-12;y+=3){
        const gy=Math.abs(g[(y+1)*W+x]-g[(y-1)*W+x]);
        const yp=Math.round(y-k*(x-xref));
        if(yp>=0&&yp<bins.length) bins[yp]+=gy;
      }
    }

    let score=0;
    const work=Float32Array.from(bins);
    for(let n=0;n<5;n++){
      let bi=0,bv=-1;
      for(let i=5;i<work.length-5;i++){
        let v=0;
        for(let z=-2;z<=2;z++)v+=work[i+z];
        if(v>bv){bv=v;bi=i;}
      }
      score+=bv;
      for(let z=Math.max(0,bi-28);z<Math.min(work.length,bi+29);z++)work[z]=0;
    }
    if(score>bestScore){bestScore=score;bestK=k;}
  }
  return bestK;
}

function shearCanvas(src,k,dst){
  dst.width=src.width; dst.height=src.height;
  const ctx=dst.getContext("2d",{willReadFrequently:true});
  ctx.setTransform(1,0,0,1,0,0);
  ctx.clearRect(0,0,dst.width,dst.height);
  ctx.setTransform(1,-k,0,1,0,k*80);
  ctx.drawImage(src,0,0);
  ctx.setTransform(1,0,0,1,0,0);
}

function percentile(sorted,p){
  if(!sorted.length) return 0;
  const i=clamp(Math.floor((sorted.length-1)*p),0,sorted.length-1);
  return sorted[i];
}

function findColorRightEdge(canvas){
  const ctx=canvas.getContext("2d",{willReadFrequently:true});
  const im=ctx.getImageData(0,0,canvas.width,canvas.height);
  const W=canvas.width,H=canvas.height,d=im.data;
  const rows=[
    {y:80,k:"C"},
    {y:180,k:"M"},
    {y:280,k:"Y"}
  ];
  const rights=[];

  for(const row of rows){
    const xs=[];
    const ya=Math.max(0,row.y-48), yb=Math.min(H,row.y+48);
    for(let y=ya;y<yb;y+=2){
      for(let x=0;x<Math.min(185,W);x+=1){
        const i=(y*W+x)*4;
        if(colorKind(d[i],d[i+1],d[i+2])===row.k) xs.push(x);
      }
    }
    if(xs.length>30){
      xs.sort((a,b)=>a-b);
      rights.push(percentile(xs,.95));
    }
  }
  if(!rights.length) return 110;
  rights.sort((a,b)=>a-b);
  return Math.round(rights[(rights.length/2)|0]);
}

function smoothArray(a,r=2){
  const out=new Float32Array(a.length);
  for(let i=0;i<a.length;i++){
    let s=0,n=0;
    for(let j=Math.max(0,i-r);j<=Math.min(a.length-1,i+r);j++){s+=a[j];n++;}
    out[i]=s/n;
  }
  return out;
}

function verticalLineScore(g,W,H){
  const score=new Float32Array(W);
  const y0=25,y1=Math.min(H,435);

  for(let x=2;x<W-2;x++){
    let hits=0,sum=0,n=0;
    for(let y=y0;y<y1;y++){
      let mx=0;
      for(let xx=x-2;xx<=x+2;xx++){
        const v=Math.abs(g[y*W+(xx+1)]-g[y*W+(xx-1)]);
        if(v>mx)mx=v;
      }
      if(mx>55)hits++;
      sum+=Math.min(200,mx);
      n++;
    }
    score[x]=hits/Math.max(1,n)+.002*(sum/Math.max(1,n));
  }
  return smoothArray(score,2);
}

function localPeaks(a,start,end,minSep=6){
  const tmp=[];
  const s=Math.max(2,start),e=Math.min(a.length-2,end);
  for(let i=s;i<e;i++){
    if(a[i]>=a[i-1] && a[i]>=a[i+1]) tmp.push(i);
  }
  tmp.sort((x,y)=>a[y]-a[x]);

  const out=[];
  for(const i of tmp){
    if(out.every(j=>Math.abs(i-j)>=minSep)) out.push(i);
    if(out.length>=32) break;
  }
  return out;
}

function detectGridColumns(canvas){
  const {g,W,H}=grayscale(canvas);
  const x1=findColorRightEdge(canvas);
  const line=verticalLineScore(g,W,H);
  const peaks=localPeaks(line,x1+20,Math.min(W-8,x1+455),6);
  let best=null;

  for(const x2 of peaks){
    const w1=x2-x1;
    if(w1<30||w1>150) continue;

    for(const x3 of peaks){
      if(x3<=x2) continue;
      const w2=x3-x2;
      if(w2<35||w2>170) continue;
      if(w2<w1*.62) continue;

      for(const x4 of peaks){
        if(x4<=x3) continue;
        const w3=x4-x3;
        if(w3<40||w3>215) continue;
        if(w3<w2*.62) continue;

        const mn=Math.min(w1,w2,w3),mx=Math.max(w1,w2,w3);
        if(mx/Math.max(1,mn)>2.25) continue;

        const widthPenalty=(Math.abs(w2-w1)+Math.abs(w3-w2))*.002;
        const decreasePenalty=Math.max(0,w1-w2)*.01+Math.max(0,w2-w3)*.01;
        const s=line[x2]+line[x3]+line[x4]-widthPenalty-decreasePenalty;

        if(!best || s>best.score) best={score:s,xs:[x1,x2,x3,x4]};
      }
    }
  }

  if(best) return best.xs;

  // フォールバック。表を見つけた後なので大きく外しにくい比率。
  return [x1,x1+90,x1+190,x1+300].map(x=>clamp(Math.round(x),0,W-1));
}

function scoreCell(g,W,H,x0,x1,y0,y1){
  const cw=x1-x0,rh=y1-y0;
  const ax=Math.round(x0+cw*.18);
  const bx=Math.round(x1-cw*.12);
  const ay=Math.round(y0+rh*.18);
  const by=Math.round(y1-rh*.18);
  const ww=bx-ax,hh=by-ay;
  if(ww<10||hh<10) return {score:0,areaR:0};

  let sum=0,n=0;
  for(let y=ay;y<by;y+=2){
    for(let x=ax;x<bx;x+=2){
      sum+=g[y*W+x];n++;
    }
  }
  const mean=sum/Math.max(1,n);
  const thr=Math.min(135,mean-45);

  const mask=new Uint8Array(ww*hh);
  for(let yy=0;yy<hh;yy++){
    for(let xx=0;xx<ww;xx++){
      mask[yy*ww+xx]=g[(ay+yy)*W+(ax+xx)]<thr?1:0;
    }
  }

  const seen=new Uint8Array(ww*hh);
  const q=new Int32Array(ww*hh);
  let best=0,bestAreaR=0;

  for(let p=0;p<mask.length;p++){
    if(!mask[p]||seen[p]) continue;
    let head=0,tail=0,area=0;
    let minx=ww,maxx=0,miny=hh,maxy=0;
    q[tail++]=p;seen[p]=1;

    while(head<tail){
      const cur=q[head++],y=(cur/ww)|0,x=cur-y*ww;
      area++;
      if(x<minx)minx=x;if(x>maxx)maxx=x;
      if(y<miny)miny=y;if(y>maxy)maxy=y;

      if(x>0){
        const np=cur-1;if(mask[np]&&!seen[np]){seen[np]=1;q[tail++]=np;}
      }
      if(x<ww-1){
        const np=cur+1;if(mask[np]&&!seen[np]){seen[np]=1;q[tail++]=np;}
      }
      if(y>0){
        const np=cur-ww;if(mask[np]&&!seen[np]){seen[np]=1;q[tail++]=np;}
      }
      if(y<hh-1){
        const np=cur+ww;if(mask[np]&&!seen[np]){seen[np]=1;q[tail++]=np;}
      }
    }

    const bw=maxx-minx+1,bh=maxy-miny+1;
    if(area<12||bw<5||bh<5) continue;
    if(bw>ww*.95||bh>hh*.95) continue;

    const fill=area/(bw*bh);
    const areaR=area/(ww*hh);
    const span=(bw/ww)*(bh/hh);
    let s=areaR*(1+Math.min(1.3,span*2.5))*(.65+Math.min(.9,fill));
    if(bw>bh*4||bh>bw*4) s*=.25;

    if(s>best){best=s;bestAreaR=areaR;}
  }
  return {score:best,areaR:bestAreaR};
}


function maskPixelForLabel(kind,r,g,b){
  const [h,s,v]=rgbToHSV(r,g,b);

  if(kind==="C") return s>.28 && v>.22 && h>=170 && h<=235;
  if(kind==="M") return s>.30 && v>.22 && ((h>=315&&h<=359)||(h>=0&&h<=12));
  if(kind==="Y") return s>.34 && v>.28 && h>=38 && h<=72;

  // LCの薄い水色背景。彩度が低くても拾う。
  if(kind==="LCBG"){
    return v>.40 && s>.055 && s<.62 && h>=170 && h<=235 && b>r+6;
  }
  return false;
}

function percentileNumber(arr,p){
  if(!arr.length)return null;
  arr.sort((a,b)=>a-b);
  const i=Math.max(0,Math.min(arr.length-1,Math.floor((arr.length-1)*p)));
  return arr[i];
}

/*
  ラベル文字を「読む」のではなく、印刷されたラベルマスそのものを基準にする。
  左列: C/M/Y の背景色から右端を決定（Kも同じ列）
  右列: LCの水色背景から左右端を決定（W/CL/LMも同じ列）
*/
function detectLabelGeometry(canvas){
  const ctx=canvas.getContext("2d",{willReadFrequently:true});
  const im=ctx.getImageData(0,0,canvas.width,canvas.height);
  const W=im.width,H=im.height,d=im.data;

  const rows=[
    ["C",30,130],
    ["M",130,230],
    ["Y",230,330]
  ];

  const leftRanges=[];
  for(const [kind,y0,y1] of rows){
    const xs=[];
    for(let y=y0;y<Math.min(H,y1);y+=2){
      for(let x=0;x<Math.min(W,220);x++){
        const i=(y*W+x)*4;
        if(maskPixelForLabel(kind,d[i],d[i+1],d[i+2])) xs.push(x);
      }
    }
    if(xs.length>100){
      const lo=percentileNumber(xs.slice(),.05);
      const hi=percentileNumber(xs.slice(),.95);
      leftRanges.push([lo,hi]);
    }
  }

  if(leftRanges.length<2) return null;

  const leftStarts=leftRanges.map(v=>v[0]).sort((a,b)=>a-b);
  const leftEnds=leftRanges.map(v=>v[1]).sort((a,b)=>a-b);
  const xL0=leftStarts[(leftStarts.length/2)|0];
  const xL1=leftEnds[(leftEnds.length/2)|0];

  // LCセルだけを使って右ラベル列を特定する。
  // 文字CL/LM/Wは見ないので、文字自体を✓と誤認しない。
  const points=[];
  for(let y=225;y<Math.min(H,345);y++){
    for(let x=Math.max(0,Math.floor(xL1+18));x<Math.min(W,Math.floor(xL1+360));x++){
      const i=(y*W+x)*4;
      if(maskPixelForLabel("LCBG",d[i],d[i+1],d[i+2])) points.push([x,y]);
    }
  }
  if(points.length<250) return null;

  // 1次元xヒストグラムでLC背景の主成分を探す。
  const hist=new Uint16Array(W);
  for(const [x] of points) hist[x]++;

  const sm=new Float32Array(W);
  for(let x=0;x<W;x++){
    let s=0,n=0;
    for(let j=Math.max(0,x-4);j<=Math.min(W-1,x+4);j++){s+=hist[j];n++}
    sm[x]=s/n;
  }

  let peakX=0,peakV=0;
  for(let x=Math.floor(xL1+18);x<Math.min(W,Math.floor(xL1+360));x++){
    if(sm[x]>peakV){peakV=sm[x];peakX=x}
  }
  if(peakV<3) return null;

  const cutoff=Math.max(2,peakV*.23);
  let xR0=peakX,xR1=peakX;
  while(xR0>0 && sm[xR0-1]>=cutoff)xR0--;
  while(xR1<W-1 && sm[xR1+1]>=cutoff)xR1++;

  // LC文字部分の黒で穴が空いても全体幅を拾うため少し補正。
  const minRightWidth=45;
  if(xR1-xR0<minRightWidth){
    xR0=Math.max(0,peakX-35);
    xR1=Math.min(W-1,peakX+45);
  }

  const checkWidth=xR0-xL1;
  if(checkWidth<28 || checkWidth>180) return null;

  return {xL0,xL1,xR0,xR1,checkWidth};
}

function classifyNormalized(canvas){
  const ctx=canvas.getContext("2d",{willReadFrequently:true});
  const im=ctx.getImageData(0,0,canvas.width,canvas.height);
  const {g,W,H}=grayscale(canvas);
  const geo=detectLabelGeometry(canvas);

  if(!geo){
    return {
      name:null,
      best:{name:"?",score:0,areaR:0},
      second:{name:"?",score:0,areaR:0},
      gap:0,
      vals:[],
      labelGeometry:null
    };
  }

  const {xL0,xL1,xR0,xR1,checkWidth}=geo;
  const ys=[30,130,230,330,430];

  // 「文字マスの右側」だけを明示的にチェック欄とする。
  // 左チェック欄: CMYKラベル右端 ～ 右ラベル左端
  // 右チェック欄: 右ラベル右端 ～ 左チェック欄とほぼ同じ幅
  const leftCheck0=xL1;
  const leftCheck1=xR0;
  const rightCheck0=xR1;
  const rightCheck1=Math.min(W-1,xR1+checkWidth);

  const vals=[];
  for(let r=0;r<4;r++){
    vals.push({
      name:NAMES_L[r],row:r,side:"L",
      ...scoreCell(g,W,H,leftCheck0,leftCheck1,ys[r],ys[r+1])
    });
    vals.push({
      name:NAMES_R[r],row:r,side:"R",
      ...scoreCell(g,W,H,rightCheck0,rightCheck1,ys[r],ys[r+1])
    });
  }

  vals.sort((a,b)=>b.score-a.score);
  const best=vals[0],second=vals[1],gap=best.score-second.score;

  const accepted =
    best.areaR>.006 &&
    best.score>.038 &&
    (gap>.012 || best.score>second.score*1.38);

  ctx.save();

  // ラベル列を青、チェック欄を緑で可視化。
  ctx.lineWidth=3;
  ctx.strokeStyle="#2563eb";
  for(let r=0;r<4;r++){
    ctx.strokeRect(xL0+2,ys[r]+2,xL1-xL0-4,ys[r+1]-ys[r]-4);
    ctx.strokeRect(xR0+2,ys[r]+2,xR1-xR0-4,ys[r+1]-ys[r]-4);
  }

  ctx.strokeStyle="#16a34a";
  for(let r=0;r<4;r++){
    ctx.strokeRect(leftCheck0+2,ys[r]+2,leftCheck1-leftCheck0-4,ys[r+1]-ys[r]-4);
    ctx.strokeRect(rightCheck0+2,ys[r]+2,rightCheck1-rightCheck0-4,ys[r+1]-ys[r]-4);
  }

  // 最終候補を赤/橙
  const bx0=best.side==="L"?leftCheck0:rightCheck0;
  const bx1=best.side==="L"?leftCheck1:rightCheck1;
  ctx.lineWidth=7;
  ctx.strokeStyle=accepted?"#e00000":"#f59e0b";
  ctx.strokeRect(bx0+7,ys[best.row]+7,bx1-bx0-14,ys[best.row+1]-ys[best.row]-14);

  ctx.restore();

  return {name:accepted?best.name:null,best,second,gap,vals,labelGeometry:geo};
}

function confidenceText(r){
  if(!r || !r.best) return "";
  if(!r.name) return `候補 ${r.best.name} / 確信度不足`;
  const ratio=r.second.score>0?r.best.score/r.second.score:9;
  const pct=Math.round(clamp(65 + (r.best.score-.05)*120 + Math.min(20,(ratio-1)*12),65,99));
  return `信頼度目安 ${pct}%`;
}

async function analyze(){
  setProgress(8);
  setStatus("左右のチェック表を探しています…","info");
  await sleep(20);

  const img=pctx.getImageData(0,0,photo.width,photo.height);
  const masks=makeColorMasks(img);

  setProgress(22);
  await sleep(10);

  const compsC=connectedComponents(masks.C,masks.W,masks.H);
  const compsM=connectedComponents(masks.M,masks.W,masks.H);
  const compsY=connectedComponents(masks.Y,masks.W,masks.H);

  const mid=photo.width/2;

  /* strict検出に失敗しても、C/M/Yの2色が揃っていれば
     欠けた1色を推定して通常インクとして処理する。
     それも無ければ「チェック表なし = PRIMER」。 */
  const tL=detectTable(compsC,compsM,compsY,0,mid,photo.height);
  const tR=detectTable(compsC,compsM,compsY,mid,photo.width,photo.height);

  setProgress(40);
  setStatus("表の傾きを自動補正中…","info");
  await sleep(20);

  let kL=0,kR=0;
  let rL=null,rR=null;

  if(tL){
    const rawL=document.createElement("canvas");
    normalizeTable(photo,tL,rawL);
    kL=estimateShear(rawL);
    shearCanvas(rawL,kL,normL);
  }else{
    drawPrimerCanvas(normL);
  }

  if(tR){
    const rawR=document.createElement("canvas");
    normalizeTable(photo,tR,rawR);
    kR=estimateShear(rawR);
    shearCanvas(rawR,kR,normR);
  }else{
    drawPrimerCanvas(normR);
  }

  setProgress(66);
  setStatus("チェック欄を解析中…","info");
  await sleep(20);

  rL=tL ? classifyNormalized(normL) : {
    name:"PRIMER",
    primer:true,
    best:null,second:null,gap:0,xs:[]
  };

  rR=tR ? classifyNormalized(normR) : {
    name:"PRIMER",
    primer:true,
    best:null,second:null,gap:0,xs:[]
  };

  $("left").textContent=rL.name||"?";
  $("right").textContent=rR.name||"?";

  $("leftScore").textContent=rL.primer
    ? "チェック表なし → PRIMER"
    : confidenceText(rL);

  $("rightScore").textContent=rR.primer
    ? "チェック表なし → PRIMER"
    : confidenceText(rR);

  const debugL = rL.primer
    ? "左: PRIMER（チェック表なし）"
    : `左: mode=${tL.mode} 候補=${rL.best.name} score=${rL.best.score.toFixed(3)} / 2位=${rL.second.name} ${rL.second.score.toFixed(3)} / shear=${kL.toFixed(2)} / grid=${rL.xs.join(",")}`;

  const debugR = rR.primer
    ? "右: PRIMER（チェック表なし）"
    : `右: mode=${tR.mode} 候補=${rR.best.name} score=${rR.best.score.toFixed(3)} / 2位=${rR.second.name} ${rR.second.score.toFixed(3)} / shear=${kR.toFixed(2)} / grid=${rR.xs.join(",")}`;

  $("debugText").textContent = debugL + "　" + debugR;

  setProgress(100);

  if(!rL.name || !rR.name){
    setStatus("要確認","warn");
  }else if(rL.name===rR.name){
    setStatus("OK","ok");
  }else{
    setStatus("ERROR","ng");
  }

  $("retry").style.display="block";
}

file.addEventListener("change",async e=>{
  const f=e.target.files&&e.target.files[0];
  if(!f)return;

  $("left").textContent="-";
  $("right").textContent="-";
  $("leftScore").textContent="";
  $("rightScore").textContent="";
  $("retry").style.display="none";
  setProgress(0);
  setStatus("画像を読み込み中…","info");

  const img=new Image();
  const url=URL.createObjectURL(f);

  img.onload=async()=>{
    const maxW=1100;
    const s=Math.min(1,maxW/img.naturalWidth);
    photo.width=Math.round(img.naturalWidth*s);
    photo.height=Math.round(img.naturalHeight*s);
    pctx.drawImage(img,0,0,photo.width,photo.height);
    photo.style.display="block";
    $("message").textContent=`画像 ${img.naturalWidth}×${img.naturalHeight} を自動解析します`;
    URL.revokeObjectURL(url);

    try{
      await analyze();
    }catch(err){
      console.error(err);
      setStatus("解析エラー：" + err.message,"ng");
      $("debugText").textContent=String(err.stack||err);
      $("retry").style.display="block";
    }
  };

  img.onerror=()=>{
    URL.revokeObjectURL(url);
    setStatus("画像を読み込めませんでした","ng");
  };
  img.src=url;
});

$("retry").onclick=()=>file.click();
$("debugBtn").onclick=()=>{
  $("debug").classList.toggle("on");
};
})();