(() => {
const $ = id => document.getElementById(id);
const input=$('photo'), srcCanvas=$('photoCanvas'), sctx=srcCanvas.getContext('2d',{willReadFrequently:true});
const overlay=$('overlay'), octx=overlay.getContext('2d');
const stage=$('stage'), judgeBtn=$('judgeBtn'), resetBtn=$('resetBtn');
const warpL=$('warpL'), warpR=$('warpR');
const namesL=['C','M','Y','K'], namesR=['W','CL','LC','LM'];

let quads={L:null,R:null};
let drag={side:null,idx:-1};
let loaded=false;

function status(t,k='info'){
  const e=$('status'); e.textContent=t; e.className='status '+k;
}
function P(x,y){return {x,y}}
function clamp(v,a,b){return Math.max(a,Math.min(b,v))}
function color(side){return side==='L'?'#00a03c':'#0668ff'}

function initQuads(){
  const W=srcCanvas.width,H=srcCanvas.height;
  quads.L=[P(W*.10,H*.43),P(W*.43,H*.43),P(W*.43,H*.76),P(W*.10,H*.76)];
  quads.R=[P(W*.57,H*.43),P(W*.90,H*.43),P(W*.90,H*.76),P(W*.57,H*.76)];
  drawOverlay();
}
function drawOverlay(){
  overlay.width=srcCanvas.width; overlay.height=srcCanvas.height;
  octx.clearRect(0,0,overlay.width,overlay.height);
  for(const side of ['L','R']){
    const q=quads[side]; if(!q)continue;
    const c=color(side), rad=Math.max(10,srcCanvas.width/90);
    octx.lineWidth=Math.max(3,srcCanvas.width/380);
    octx.strokeStyle=c; octx.fillStyle=c+'18';
    octx.beginPath(); octx.moveTo(q[0].x,q[0].y);
    for(let i=1;i<4;i++)octx.lineTo(q[i].x,q[i].y);
    octx.closePath(); octx.fill(); octx.stroke();
    for(let i=0;i<4;i++){
      octx.beginPath(); octx.arc(q[i].x,q[i].y,rad,0,Math.PI*2);
      octx.fillStyle='#fff'; octx.fill(); octx.strokeStyle=c; octx.stroke();
    }
    octx.fillStyle=c;
    octx.font=`bold ${Math.max(16,srcCanvas.width/45)}px sans-serif`;
    octx.fillText(side==='L'?'左':'右',q[0].x,q[0].y-12);
  }
}
function pointerPos(e){
  const r=overlay.getBoundingClientRect();
  return {x:(e.clientX-r.left)*overlay.width/r.width,y:(e.clientY-r.top)*overlay.height/r.height};
}
overlay.addEventListener('pointerdown',e=>{
  const p=pointerPos(e),hit=Math.max(30,srcCanvas.width/32);
  let best=null;
  for(const side of ['L','R']){
    quads[side].forEach((a,i)=>{
      const d=Math.hypot(p.x-a.x,p.y-a.y);
      if(d<hit && (!best||d<best.d))best={side,idx:i,d};
    });
  }
  if(best){drag=best;overlay.setPointerCapture(e.pointerId);e.preventDefault()}
});
overlay.addEventListener('pointermove',e=>{
  if(!drag.side)return;
  const p=pointerPos(e);
  quads[drag.side][drag.idx]=P(clamp(p.x,0,srcCanvas.width-1),clamp(p.y,0,srcCanvas.height-1));
  drawOverlay(); e.preventDefault();
});
overlay.addEventListener('pointerup',()=>drag={side:null,idx:-1});
overlay.addEventListener('pointercancel',()=>drag={side:null,idx:-1});

input.addEventListener('change',e=>{
  const f=e.target.files&&e.target.files[0]; if(!f)return;
  const img=new Image(),url=URL.createObjectURL(f);
  $('loadmsg').textContent='読み込み中…'; status('読み込み中…','info');
  img.onload=()=>{
    const maxW=1400,s=Math.min(1,maxW/img.width);
    srcCanvas.width=Math.round(img.width*s); srcCanvas.height=Math.round(img.height*s);
    sctx.drawImage(img,0,0,srcCanvas.width,srcCanvas.height);
    overlay.width=srcCanvas.width; overlay.height=srcCanvas.height;
    stage.style.display='block'; loaded=true; judgeBtn.disabled=false; resetBtn.disabled=false;
    $('loadmsg').textContent=`画像OK ${img.width}×${img.height}`;
    initQuads(); status('緑と青の四隅をチェック表の四隅に合わせてください','info');
    URL.revokeObjectURL(url);
  };
  img.onerror=()=>status('画像を読み込めませんでした','ng');
  img.src=url;
});
resetBtn.onclick=initQuads;

/* 四隅から400x400へ補正 */
function warpQuad(q,dst){
  const size=400;
  dst.width=size; dst.height=size;
  const dctx=dst.getContext('2d',{willReadFrequently:true});
  const src=sctx.getImageData(0,0,srcCanvas.width,srcCanvas.height);
  const out=dctx.createImageData(size,size);
  const sd=src.data,od=out.data,SW=src.width,SH=src.height;

  function sample(x,y,oi){
    x=clamp(x,0,SW-1); y=clamp(y,0,SH-1);
    const x0=Math.floor(x),y0=Math.floor(y),x1=Math.min(SW-1,x0+1),y1=Math.min(SH-1,y0+1);
    const fx=x-x0,fy=y-y0;
    const i00=(y0*SW+x0)*4,i10=(y0*SW+x1)*4,i01=(y1*SW+x0)*4,i11=(y1*SW+x1)*4;
    for(let c=0;c<3;c++){
      const a=sd[i00+c]*(1-fx)+sd[i10+c]*fx;
      const b=sd[i01+c]*(1-fx)+sd[i11+c]*fx;
      od[oi+c]=a*(1-fy)+b*fy;
    }
    od[oi+3]=255;
  }

  let oi=0;
  for(let y=0;y<size;y++){
    const v=y/(size-1);
    for(let x=0;x<size;x++,oi+=4){
      const u=x/(size-1);
      const topx=q[0].x*(1-u)+q[1].x*u, topy=q[0].y*(1-u)+q[1].y*u;
      const botx=q[3].x*(1-u)+q[2].x*u, boty=q[3].y*(1-u)+q[2].y*u;
      sample(topx*(1-v)+botx*v,topy*(1-v)+boty*v,oi);
    }
  }
  dctx.putImageData(out,0,0);
}

function grayAt(d,w,x,y){
  const i=(y*w+x)*4;
  return .299*d[i]+.587*d[i+1]+.114*d[i+2];
}
function smooth(arr,r=3){
  const out=new Float32Array(arr.length);
  for(let i=0;i<arr.length;i++){
    let s=0,n=0;
    for(let j=Math.max(0,i-r);j<=Math.min(arr.length-1,i+r);j++){s+=arr[j];n++}
    out[i]=s/n;
  }
  return out;
}
function peakIn(prof,a,b){
  const lo=Math.max(2,Math.floor(a)),hi=Math.min(prof.length-2,Math.ceil(b));
  let bi=lo,bv=-1;
  for(let i=lo;i<hi;i++)if(prof[i]>bv){bv=prof[i];bi=i}
  return bi;
}

/* 
  重要な修正:
  4列を「均等幅」と決めつけず、実際の縦罫線を探す。
  これで LM の L が右側チェック欄へ食い込んで誤認されるのを防ぐ。
*/
function detectGrid(img){
  const W=img.width,H=img.height,d=img.data;

  // 縦罫線: x方向の明暗変化を高さ方向に平均
  let xp=new Float32Array(W);
  for(let x=2;x<W-2;x++){
    let s=0,n=0;
    for(let y=4;y<H-4;y+=2){
      s+=Math.abs(grayAt(d,W,x+1,y)-grayAt(d,W,x-1,y)); n++;
    }
    xp[x]=s/n;
  }
  xp=smooth(xp,3);

  // 実ラベルでの列幅に余裕を持たせた探索範囲
  const b1=peakIn(xp,W*.18,W*.42);
  const b2=peakIn(xp,W*.42,W*.70);
  const b3=peakIn(xp,W*.68,W*.94);
  let xs=[0,b1,b2,b3,W];

  // 明らかに変なら従来の概算へフォールバック
  const widths=[xs[1]-xs[0],xs[2]-xs[1],xs[3]-xs[2],xs[4]-xs[3]];
  if(widths.some(v=>v<W*.08)){
    xs=[0,W*.27,W*.55,W*.84,W];
  }

  // 横罫線は「チェック欄」2列だけを使うので文字の影響を受けにくい
  let yp=new Float32Array(H);
  const ranges=[
    [Math.floor(xs[1]+(xs[2]-xs[1])*.10),Math.floor(xs[2]-(xs[2]-xs[1])*.10)],
    [Math.floor(xs[3]+(xs[4]-xs[3])*.08),Math.floor(xs[4]-(xs[4]-xs[3])*.08)]
  ];
  for(let y=2;y<H-2;y++){
    let s=0,n=0;
    for(const [xa,xb] of ranges){
      for(let x=xa;x<xb;x+=2){
        s+=Math.abs(grayAt(d,W,x,y+1)-grayAt(d,W,x,y-1)); n++;
      }
    }
    yp[y]=n?s/n:0;
  }
  yp=smooth(yp,3);

  let y1=peakIn(yp,H*.16,H*.36);
  let y2=peakIn(yp,H*.38,H*.62);
  let y3=peakIn(yp,H*.64,H*.84);
  let ys=[0,y1,y2,y3,H];

  const hs=[ys[1]-ys[0],ys[2]-ys[1],ys[3]-ys[2],ys[4]-ys[3]];
  const avg=H/4;
  // 横線が文字や反射を拾って不自然なら4等分へ戻す
  if(hs.some(v=>v<avg*.55 || v>avg*1.55)){
    ys=[0,H*.25,H*.50,H*.75,H];
  }

  return {xs,ys};
}

/* 本当のチェック欄の中だけで黒い連結成分を探す */
function cellScoreRect(img,x0,x1,y0,y1){
  const W=img.width,d=img.data;
  const cellW=x1-x0,cellH=y1-y0;

  // 罫線と隣の文字を避ける。特に左端を多めに捨てる。
  const ax=Math.round(x0+cellW*.22);
  const bx=Math.round(x1-cellW*.12);
  const ay=Math.round(y0+cellH*.18);
  const by=Math.round(y1-cellH*.18);
  const ww=bx-ax,hh=by-ay;
  if(ww<10||hh<10)return {score:0,box:null,areaR:0};

  let sum=0,n=0;
  for(let y=ay;y<by;y+=2)for(let x=ax;x<bx;x+=2){sum+=grayAt(d,W,x,y);n++}
  const mean=sum/n;
  const thr=Math.min(135,mean-48);

  const mask=new Uint8Array(ww*hh);
  for(let yy=0;yy<hh;yy++)for(let xx=0;xx<ww;xx++){
    mask[yy*ww+xx]=grayAt(d,W,ax+xx,ay+yy)<thr?1:0;
  }

  const seen=new Uint8Array(ww*hh);
  const qx=new Int16Array(ww*hh), qy=new Int16Array(ww*hh);
  let best=0,bestBox=null,bestAreaR=0;

  for(let sy=0;sy<hh;sy++)for(let sx=0;sx<ww;sx++){
    const si=sy*ww+sx;if(!mask[si]||seen[si])continue;
    let head=0,tail=0,area=0,minx=sx,maxx=sx,miny=sy,maxy=sy;
    let diag=0,ortho=0;
    qx[tail]=sx;qy[tail]=sy;tail++;seen[si]=1;

    while(head<tail){
      const x=qx[head],y=qy[head];head++;area++;
      if(x<minx)minx=x;if(x>maxx)maxx=x;if(y<miny)miny=y;if(y>maxy)maxy=y;

      // ✓は斜め成分が多い。Lなど直交文字への軽いペナルティに使用。
      if(x+1<ww && y+1<hh && mask[(y+1)*ww+x+1])diag++;
      if(x+1<ww && y-1>=0 && mask[(y-1)*ww+x+1])diag++;
      if(x+1<ww && mask[y*ww+x+1])ortho++;
      if(y+1<hh && mask[(y+1)*ww+x])ortho++;

      const ns=[[x+1,y],[x-1,y],[x,y+1],[x,y-1]];
      for(const [nx,ny] of ns){
        if(nx<0||nx>=ww||ny<0||ny>=hh)continue;
        const ni=ny*ww+nx;
        if(mask[ni]&&!seen[ni]){seen[ni]=1;qx[tail]=nx;qy[tail]=ny;tail++}
      }
    }

    const bw=maxx-minx+1,bh=maxy-miny+1;
    if(area<12||bw<6||bh<6)continue;
    if(bw>ww*.92||bh>hh*.92)continue;

    const fill=area/(bw*bh),areaR=area/(ww*hh),span=(bw/ww)*(bh/hh);
    const diagRatio=diag/(diag+ortho+1);
    let score=areaR*(1+Math.min(1.2,span*2.5))*(0.65+Math.min(.9,fill));
    score*=0.72+Math.min(.55,diagRatio); // Lより✓を少し優遇
    if(bw>bh*4 || bh>bw*4)score*=.30;

    if(score>best){
      best=score;bestAreaR=areaR;
      bestBox={x:ax+minx,y:ay+miny,w:bw,h:bh,area,diagRatio};
    }
  }
  return {score:best,box:bestBox,areaR:bestAreaR};
}

function classify(canvas){
  const ctx=canvas.getContext('2d',{willReadFrequently:true});
  const img=ctx.getImageData(0,0,canvas.width,canvas.height);
  const grid=detectGrid(img), xs=grid.xs,ys=grid.ys;
  const vals=[];

  for(let r=0;r<4;r++){
    // 左側のチェック欄 = 縦罫線1～2
    vals.push({name:namesL[r],row:r,side:'L',...cellScoreRect(img,xs[1],xs[2],ys[r],ys[r+1])});
    // 右側のチェック欄 = 縦罫線3～4
    vals.push({name:namesR[r],row:r,side:'R',...cellScoreRect(img,xs[3],xs[4],ys[r],ys[r+1])});
  }

  vals.sort((a,b)=>b.score-a.score);
  const best=vals[0],second=vals[1],gap=best.score-second.score;
  const accepted=best.box && best.areaR>.009 && best.score>.014 &&
    (gap>.0045 || best.score>second.score*1.25);

  // 検出した罫線を表示
  ctx.save();
  ctx.lineWidth=2;
  ctx.strokeStyle='#16a34a';
  for(let i=1;i<4;i++){ctx.beginPath();ctx.moveTo(xs[i],0);ctx.lineTo(xs[i],canvas.height);ctx.stroke()}
  for(let i=1;i<4;i++){ctx.beginPath();ctx.moveTo(0,ys[i]);ctx.lineTo(canvas.width,ys[i]);ctx.stroke()}
  // 選ばれたセル
  const cx0=best.side==='L'?xs[1]:xs[3], cx1=best.side==='L'?xs[2]:xs[4];
  const cy0=ys[best.row],cy1=ys[best.row+1];
  ctx.lineWidth=6;ctx.strokeStyle=accepted?'#e00000':'#f59e0b';
  ctx.strokeRect(cx0+5,cy0+5,cx1-cx0-10,cy1-cy0-10);
  ctx.restore();

  return {name:accepted?best.name:null,best,second,gap,grid,vals};
}

function judge(){
  if(!loaded)return;
  warpQuad(quads.L,warpL); warpQuad(quads.R,warpR);
  const L=classify(warpL),R=classify(warpR);

  $('left').textContent=L.name||'?'; $('right').textContent=R.name||'?';
  $('scoreL').textContent=`score ${L.best.score.toFixed(3)} / 2位差 ${L.gap.toFixed(3)}`;
  $('scoreR').textContent=`score ${R.best.score.toFixed(3)} / 2位差 ${R.gap.toFixed(3)}`;

  if(!L.name||!R.name){
    status('判定不能：四隅を表の外枠に合わせて再判定','warn');
  }else if(L.name===R.name){
    status('OK','ok');
  }else{
    status('ERROR','ng');
  }
}
judgeBtn.onclick=judge;
})();