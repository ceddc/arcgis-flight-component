import{ed as Pi,eL as Ti,oS as Je,r_ as wt,ga as bt,rU as St,r$ as Ct,g_ as ti,Gx as Ke,Ge as Di,fa as ii,Gy as Mi,bt as $,eA as et,jj as _e,mI as Ri,g7 as ai,hx as Et,fp as Ai,Ee as mt,dv as Oe,fo as Gi,fe as si,Gz as $t,dw as Fi,ca as Ii,gG as zi,gO as Ei,m4 as $i,hp as Oi,dy as Pt,gJ as qi,dH as Be,lx as Vi,y$ as Bi,fq as ki,nm as Li,GA as Ot,eP as gt,Ed as Hi,GB as ji,G7 as Wi,wj as _,eT as Tt,ws as xe,GC as Ni,a$ as T,wB as he,gF as Dt,wk as tt,GD as qe,wi as vt,El as Ui,EX as We,m8 as Mt,Ej as Ne,FX as qt,GE as _t,GF as Vt,GG as Xi,GH as Yi,GI as Zi,GJ as Qi,En as ni,wt as ae,Fy as ri,GK as Ji,E0 as Le,qo as it,qq as at,aC as st,qs as nt,Ep as Rt,qt as oi,b1 as Ce,GL as Ki,FS as ea,ng as li,nh as ci,sy as Bt,Ef as Ee,de as pe,GM as ze,qv as kt,sR as Lt,dx as Ve,nd as ui,GN as di,b0 as fe,Ez as ta,fW as ia,rH as aa,c8 as sa,aZ as dt,rJ as na,mM as Ht,fD as ra,iZ as oa,rT as la,dP as ca,rI as ua,ei as da,dg as ht,rK as ha,aX as pa,aV as fa,aU as ma,rL as ga,mv as jt,b6 as va,rM as _a,hw as xa,pb as ya,aP as wa}from"./arcgis-scene-C3i20sGt.js";import{v as ba,M as Wt,E as Sa}from"./tiles3DUtils-DzswM2x3.js";import{a as Ca}from"./LayerView3D-BoVctj1G.js";import{E as Pa}from"./LayerElevationProvider-Cjffk3ja.js";import{h as Ta}from"./baUtils-DS_a2-H3.js";import{M as Da}from"./Tiles3DBVH-DJsUvF-w.js";import{s as Nt}from"./I3SUtil-CFtTYtJV.js";import{I as Ma}from"./LayerView-hS238Oyi.js";import"./projectBoundingSphere-DOFEYh4T.js";import"./featurePopupQueryUtils-HEiwDKEt.js";import"./I3SBinaryReader-D53tART0.js";let Ra=class extends Pi{constructor(e,t,i,a,s,n,o,u,c){super(e,0,0,0,t),this.usedMemory=e,this.nodes=t,this.usedTileMemory=i,this.cachedNodes=a,this.cacheTileMemory=s,this.textureAtlasMemory=n,this.orderTextureMemory=o,this.fadingTextureMemory=u,this.sortBufferMemory=c}};const se=4096,At=64,Ge=1023,ye=Ge+1,hi=se*At/ye,Ue=4,Aa=ye*Ue,Ut=Ge*Ue,Ga=se*At;let Fa=class{constructor(e=hi){this._pageCount=e;const t=Math.ceil(e/32);this._bitset=new Uint32Array(t)}get pageCount(){return this._pageCount}isAllocated(e){const t=e/32|0,i=e%32;return!!(this._bitset[t]&1<<i)}allocate(e){const t=e/32|0,i=e%32;this._bitset[t]|=1<<i}free(e){const t=e/32|0,i=e%32;this._bitset[t]&=~(1<<i)}findFirstFreePage(){for(let e=0;e<this._bitset.length;e++)if(this._bitset[e]!==4294967295)for(let t=0;t<32;t++){const i=32*e+t;if(i>=this._pageCount)break;if(!(this._bitset[e]&1<<t))return i}return null}resize(e){this._pageCount=e;const t=Math.ceil(e/32),i=this._bitset.length;if(t!==i){const a=new Uint32Array(t),s=Math.min(i,t);a.set(this._bitset.subarray(0,s)),this._bitset=a}this._clearExcessBits(this._bitset,e)}_clearExcessBits(e,t){const i=Math.floor((t-1)/32),a=(t-1)%32;if(t>0&&a<31){const s=(1<<a+1)-1;e[i]&=s}i+1<e.length&&e.fill(0,i+1)}},Ia=class extends Ti{constructor(e){super("GaussianSplatSortWorker","sort",{sort:t=>[t.distances.buffer,t.atlasIndices.buffer,t.sortedAtlasIndices.buffer]},e,{strategy:"dedicated"})}sort(e,t){return this.invokeMethod("sort",e,t)}clear(){return this.broadcast({},"clear")}async destroyWorkerAndSelf(){await this.broadcast({},"destroy"),this.destroy()}};class za{constructor(e){this.texture=null,this._fadeTextureCapacity=0,this._rctx=e}get usedMemory(){var e;return(((e=this.texture)==null?void 0:e.usedMemory)??0)+Je(this._fadeBuffer)}ensureCapacity(e){var d;const t=this.texture;if(this._fadeTextureCapacity>=e&&(t!=null&&t.hasWebGLTextureObject))return;const i=Math.max(Math.ceil(e*Ke),hi),[a,s]=this._evalTextureSize(i),n=a*s,o=this._fadeBuffer,u=new Uint8Array(n);o&&u.set(o.subarray(0,this._fadeTextureCapacity)),this._fadeBuffer=u,this._fadeTextureCapacity=n,(d=this.texture)==null||d.dispose();const c=new wt;c.width=a,c.height=s,c.pixelFormat=36244,c.dataType=bt.UNSIGNED_BYTE,c.internalFormat=St.R8UI,c.unpackAlignment=1,c.wrapMode=33071,c.samplingMode=9728,c.isImmutable=!0,this.texture=new Ct(this._rctx,c)}updateTexture(e){this.ensureCapacity(e);const t=this.texture.descriptor.width,i=Math.ceil(e/t),a=t*i;this.texture.updateData(0,0,0,t,i,this._fadeBuffer.subarray(0,a))}updateBuffer(e,t){this.ensureCapacity(t+1),this._fadeBuffer&&(this._fadeBuffer[t]=e)}clear(){var e;this._fadeBuffer=void 0,this._fadeTextureCapacity=0,(e=this.texture)==null||e.dispose(),this.texture=null}destroy(){this.clear()}_evalTextureSize(e){const t=Math.ceil(Math.sqrt(e)),i=Math.ceil(e/t);return ti(t,i)}}let Ea=class{constructor(e){this.texture=null,this._orderTextureCapacity=0,this._rctx=e}get usedMemory(){var e;return(((e=this.texture)==null?void 0:e.usedMemory)??0)+Je(this._uploadAtlasIndices)}ensureCapacity(e){var c;if(e<=0)return{textureWidth:0,rowCount:0,paddedSize:0};const t=this.texture;if(this._orderTextureCapacity>=e&&(t!=null&&t.hasWebGLTextureObject)){const d=t.descriptor.width,l=Math.ceil(e/d);return{textureWidth:d,rowCount:l,paddedSize:d*l}}const i=Math.max(Math.ceil(e*Ke),Ga),[a,s]=this._evalTextureSize(i),n=a*s;this._orderTextureCapacity=n,(c=this.texture)==null||c.dispose();const o=new wt;o.width=a,o.height=s,o.pixelFormat=36244,o.dataType=bt.UNSIGNED_INT,o.internalFormat=St.R32UI,o.wrapMode=33071,o.samplingMode=9728,o.isImmutable=!0,this.texture=new Ct(this._rctx,o);const u=Math.ceil(e/a);return{textureWidth:a,rowCount:u,paddedSize:a*u}}setData(e,t){const{textureWidth:i,rowCount:a,paddedSize:s}=this.ensureCapacity(t);if(e.length>=s)return void this.texture.updateData(0,0,0,i,a,e);(!this._uploadAtlasIndices||this._uploadAtlasIndices.length<s)&&(this._uploadAtlasIndices=new Uint32Array(s));const n=this._uploadAtlasIndices;n.set(e.subarray(0,t)),this.texture.updateData(0,0,0,i,a,n)}clear(){var e;this._orderTextureCapacity=0,this._uploadAtlasIndices=void 0,(e=this.texture)==null||e.dispose(),this.texture=null}destroy(){this.clear()}_evalTextureSize(e){const t=Math.ceil(Math.sqrt(e)),i=Math.ceil(e/t);return ti(t,i)}},$a=class{constructor(e,t,i,a){this._splatAtlasTextureHeight=At,this.texture=null,this._rctx=e,this._fboCache=i,this._onCachedTextureEvicted=a,this.pageAllocator=new Fa,this._cache=t.newCache("gaussian texture cache",s=>{s.dispose(),this._onCachedTextureEvicted()})}get usedMemory(){var e;return((e=this.texture)==null?void 0:e.usedMemory)??0}ensureTextureAtlas(){var i;if((i=this.texture)!=null&&i.hasWebGLTextureObject)return;this.texture=null;const e=this._cache.pop("splatTextureAtlas");if(e)return void(this.texture=e);const t=new wt;t.height=this._splatAtlasTextureHeight,t.width=se,t.pixelFormat=36249,t.dataType=bt.UNSIGNED_INT,t.internalFormat=St.RGBA32UI,t.samplingMode=9728,t.wrapMode=33071,t.isImmutable=!0,this.texture=new Ct(this._rctx,t),this._updatePageAllocator()}grow(){var a;if(!this.texture)return this.ensureTextureAtlas(),!1;const e=Math.floor(this._splatAtlasTextureHeight*Ke);if(e>Math.min(Ta("esri-mobile")?1048:4096,this._rctx.parameters.maxTextureSize))return!1;const t=new Di(this._rctx,this.texture),i=this._fboCache.acquire(se,e,"gaussian splat atlas resize",12);return this._rctx.blitFramebuffer(t,i.fbo,16384,9728,0,0,se,this._splatAtlasTextureHeight,0,0,se,this._splatAtlasTextureHeight),this.texture=(a=i.fbo)==null?void 0:a.detachColorTexture(),t.dispose(),i.dispose(),this._splatAtlasTextureHeight=e,this._updatePageAllocator(),!0}requestPage(){let e=this.pageAllocator.findFirstFreePage();return e===null&&this.grow()&&(e=this.pageAllocator.findFirstFreePage()),e!==null&&this.pageAllocator.allocate(e),e}freePage(e){this.pageAllocator.free(e)}update(e,t,i){this.ensureTextureAtlas(),this.texture.updateData(0,e,t,ye,1,i)}_updatePageAllocator(){const e=se*this._splatAtlasTextureHeight/ye;this.pageAllocator.pageCount!==e&&this.pageAllocator.resize(e)}clear(){this.texture&&(this._cache.put("splatTextureAtlas",this.texture),this.texture=null)}destroy(){var e;this._onCachedTextureEvicted=()=>{},this._cache.destroy(),(e=this.texture)==null||e.dispose(),this.texture=null}};class Oa{constructor(e,t,i){this._updating=ii(!1),this._useDeterministicSort=!1,this._sortBufferMemory=0,this.visibleGaussians=0,this._visibleTileDepthRange=new Mi,this._previousVisibleTileDepthRangeEye=$(),this._previousVisibleTileDepthRangeViewForward=$(),this._previousVisibleTileDepthRangeClippingBox=et(),this._latestSortedGaussianTilesVersion=0,this._previousVisibleTileDepthRangeTilesVersion=-1,this._previousVisibleTileDepthRangeHasClippingBox=!1,this._bufferCapacity=0,this._requestedLyr3dVisibilityChange=0,this._latestCompletedLyr3dVisibilityChange=0,this._latestUpdatedGaussianTiles=new Array,this._latestSortedGaussianTiles=new Array,this._nextCommittedVisibleGaussianTiles=new Array,this._cameraDirectionNormalized=$(),this._frameTask=null,this._workerHandle=null,this._sortAbortController=null,this._isSorting=!1,this._pendingSortTask=!1,this._scheduledSortStartTimeout=null,this._lastSortStartTime=_e(-1/0),this._sortInterval=_e(80),this._renderer=e,this._onSortComplete=t,this._orderTexture=new Ea(this._renderer.renderingContext),this._fadingTexture=new za(this._renderer.renderingContext),this._textureAtlas=new $a(this._renderer.renderingContext,this._renderer.view.resourceController.memoryController,this._renderer.fboCache,i);const{resourceController:a}=this._renderer.view;this._workerHandle=new Ia(Ri(a)),this._frameTask=a.scheduler.registerTask(ai.GAUSSIAN_SPLAT_SORTING)}get textureAtlas(){return this._textureAtlas}get orderTexture(){return this._orderTexture}get fadingTexture(){return this._fadingTexture}get textureAtlasMemory(){return this._textureAtlas.usedMemory}get orderTextureMemory(){return this._orderTexture.usedMemory}get fadingTextureMemory(){return this._fadingTexture.usedMemory}get sortBufferMemory(){return this._sortBufferMemory}get usedMemory(){return this.textureAtlasMemory+this.orderTextureMemory+this.fadingTextureMemory+this.sortBufferMemory}queryVisibleTileDepthRange(e,t){if(this.visibleGaussians===0)return null;const{eye:i,viewForward:a}=e,s=i[0],n=i[1],o=i[2],u=a[0],c=a[1],d=a[2],l=this._visibleTileDepthRange;if(this._previousVisibleTileDepthRangeTilesVersion===this._latestSortedGaussianTilesVersion&&Et(this._previousVisibleTileDepthRangeEye,i)&&Et(this._previousVisibleTileDepthRangeViewForward,a)&&(t==null?!this._previousVisibleTileDepthRangeHasClippingBox:this._previousVisibleTileDepthRangeHasClippingBox&&Ai(this._previousVisibleTileDepthRangeClippingBox,t)))return l.near<=l.far?l:null;let g=1/0,p=-1/0;const f=this._latestSortedGaussianTiles;for(let b=0;b<f.length;b++){const v=f[b];if(t!=null){const R=v.boundingBox;if(!mt(R,t))continue}const E=u*(v.obbCenterX-s)+c*(v.obbCenterY-n)+d*(v.obbCenterZ-o),S=v.paddedMbsRadius,M=E-S;M<g&&(g=M);const F=E+S;F>p&&(p=F)}const w=g<=p;return w?l.set(g,p):l.set(1/0,-1/0),this._previousVisibleTileDepthRangeTilesVersion=this._latestSortedGaussianTilesVersion,this._previousVisibleTileDepthRangeHasClippingBox=t!=null,Oe(this._previousVisibleTileDepthRangeEye,i),Oe(this._previousVisibleTileDepthRangeViewForward,a),t!=null&&Gi(this._previousVisibleTileDepthRangeClippingBox,t),w?l:null}updateGaussianVisibility(e,t){this._latestUpdatedGaussianTiles=e,this._requestedLyr3dVisibilityChange=t,this.requestSort()}get updating(){return this._updating.value}destroy(){var e;this._sortAbortController=si(this._sortAbortController),this._pendingSortTask=!1,this._updating.value=!1,this._scheduledSortStartTimeout!=null&&(clearTimeout(this._scheduledSortStartTimeout),this._scheduledSortStartTimeout=null),this._frameTask.remove(),(e=this._workerHandle)==null||e.destroyWorkerAndSelf(),this._textureAtlas.destroy(),this._orderTexture.destroy(),this._fadingTexture.destroy()}requestSort(){return this._updating.value=!0,!this._pendingSortTask&&(this._pendingSortTask=!0,this._scheduleSortStart(),!0)}_scheduleSortStart(){if(this._isSorting)return;const e=$t()-this._lastSortStartTime,t=this._sortInterval-e;t<=0?this._startSortIfRequired():this._scheduledSortStartTimeout==null&&(this._scheduledSortStartTimeout=setTimeout(()=>{this._scheduledSortStartTimeout=null,this._pendingSortTask&&!this._isSorting&&this._scheduleSortStart()},t))}_startSortIfRequired(){if(this._isSorting||!this._pendingSortTask)return;const e=new AbortController;this._sortAbortController=e,this._isSorting=!0,this._pendingSortTask=!1,this._lastSortStartTime=$t(),this._sortOnWorker(e.signal).finally(()=>{this._sortAbortController===e&&(this._sortAbortController=null),this._handleSortComplete()})}_handleSortComplete(){this._isSorting=!1,this._pendingSortTask?this._scheduleSortStart():this._updating.value=!1}_clearBuffersAndTextures(){this._atlasIndicesBuffer=void 0,this._sortedAtlasIndicesBuffer=void 0,this._distancesBuffer=void 0,this._bufferCapacity=0,this._sortBufferMemory=0,this._orderTexture.clear(),this._textureAtlas.clear()}_computeExpandedCapacity(e,t){let i=Math.max(1,e);for(;i<t;)i=Math.ceil(i*Ke);return i}_ensureSortBufferCapacities(e){if(this._bufferCapacity<e){const t=this._computeExpandedCapacity(this._bufferCapacity,e);this._atlasIndicesBuffer=new Uint32Array(t),this._sortedAtlasIndicesBuffer=new Uint32Array(t),this._distancesBuffer=new Float64Array(t),this._bufferCapacity=t,this._sortBufferMemory=Je(this._atlasIndicesBuffer,this._sortedAtlasIndicesBuffer,this._distancesBuffer)}}_clearAllBuffersAndTextures(){var e;this._clearBuffersAndTextures(),this._latestSortedGaussianTiles.length=0,this._nextCommittedVisibleGaussianTiles.length=0,this._previousVisibleTileDepthRangeTilesVersion=-1,(e=this._workerHandle)==null||e.clear()}async _sortOnWorker(e){var t;try{if(this._latestUpdatedGaussianTiles.length===0)return this.visibleGaussians=0,this._clearAllBuffersAndTextures(),this._latestCompletedLyr3dVisibilityChange=this._requestedLyr3dVisibilityChange,this._onSortComplete(this._latestSortedGaussianTiles,this._latestCompletedLyr3dVisibilityChange),void this._renderer.requestRender(1);this._useDeterministicSort&&this._latestUpdatedGaussianTiles.sort((A,P)=>A.obb.centerX-P.obb.centerX||A.obb.centerY-P.obb.centerY||A.obb.centerZ-P.obb.centerZ);const i=this._latestUpdatedGaussianTiles,a=i.length,s=this._requestedLyr3dVisibilityChange;let n=0;for(let A=0;A<a;A++)n+=i[A].gaussianCount;this._ensureSortBufferCapacities(n),this._textureAtlas.ensureTextureAtlas();const o=this._renderer.camera;Fi(this._cameraDirectionNormalized,o.ray.direction);const u=this._cameraDirectionNormalized[0],c=this._cameraDirectionNormalized[1],d=this._cameraDirectionNormalized[2];let l=0;const g=this._atlasIndicesBuffer,p=this._distancesBuffer,f=this._renderer.clippingBox,w=this._nextCommittedVisibleGaussianTiles;w.length=0;let b=0;const{frustum:v}=o,E=this._renderer.tileCullingRevision,S=v[0],M=v[1],F=v[2],R=v[3],I=v[4],L=v[5];for(let A=0;A<a;A++){const P=i[A],{gaussianAtlasIndices:ee,relativePositions:W,obbCenterX:H,obbCenterY:G,obbCenterZ:h,paddedMbsRadius:m}=P,C=P.gaussianCount;if(P.cullingRevision!==E){let y=f==null||mt(P.boundingBox,f);if(y){const x=1.5*m;y=S[0]*H+S[1]*G+S[2]*h+S[3]<x&&M[0]*H+M[1]*G+M[2]*h+M[3]<x&&F[0]*H+F[1]*G+F[2]*h+F[3]<x&&R[0]*H+R[1]*G+R[2]*h+R[3]<x&&I[0]*H+I[1]*G+I[2]*h+I[3]<x&&L[0]*H+L[1]*G+L[2]*h+L[3]<x}P.cullingRevision=E,P.cullingVisible=y}if(!P.cullingVisible)continue;g.set(ee,l),w[b++]=P;const D=u*H+c*G+d*h,j=l+C;for(let y=l,x=0;y<j;y++,x+=3){const N=W[x],U=W[x+1],B=W[x+2];p[y]=N*u+U*c+B*d+D}l=j}if(w.length=b,l===0)return this.visibleGaussians=0,this._clearAllBuffersAndTextures(),this._latestCompletedLyr3dVisibilityChange=s,this._onSortComplete(this._latestSortedGaussianTiles,this._latestCompletedLyr3dVisibilityChange),void this._renderer.requestRender(1);const q={distances:this._distancesBuffer,atlasIndices:this._atlasIndicesBuffer,sortedAtlasIndices:this._sortedAtlasIndicesBuffer,numGaussians:l,preciseSort:this._useDeterministicSort},z=await((t=this._workerHandle)==null?void 0:t.sort(q,e));if(e.aborted)return;z&&(this._distancesBuffer=z.distances,this._atlasIndicesBuffer=z.atlasIndices,this._sortedAtlasIndicesBuffer=z.sortedAtlasIndices);const O=async A=>{this._orderTexture.setData(this._sortedAtlasIndicesBuffer,l);const P=this._latestSortedGaussianTiles;this._latestSortedGaussianTiles=w,this._nextCommittedVisibleGaussianTiles=P,this._latestSortedGaussianTilesVersion++,this._latestCompletedLyr3dVisibilityChange=s,this.visibleGaussians=l,this._onSortComplete(this._latestSortedGaussianTiles,this._latestCompletedLyr3dVisibilityChange),this._renderer.requestRender(1),A.madeProgress()};await this._frameTask.schedule(O,e)}catch(i){if(Ii(i))return}}set useDeterministicSort(e){this._useDeterministicSort=e}}var k;let qa=(k=class{constructor(e){this.layerView=e,this._numFadingTiles=ii(0),this._tmpFullyFadedOutTiles=new Array,this._previousNumFadingTiles=0,this._lastStoppedFading=_e(0),this._currentFadeDuration=this.baseFadeDuration}get numFadingTiles(){return this._numFadingTiles.value}fadeTile(e,t,i){const a=this._getTargetOpacity(t);if(e.fadeDirection=t,!this.fadingEnabled)return void this._instantTileFading(e,a);const s=e.opacityModifier;if(s!==a){const n=this._getFadeProgressFromOpacity(s,t);this._startTileFading(e,n,i)}else this._stopTileFading(e)}updateAllTileFading(e){var i;const t=this._tmpFullyFadedOutTiles;t.length=0,this.layerView.tileHandles.forEach(a=>{this._updateTileFading(a,e)&&t.push(a)}),t.length>0&&(this.layerView.notifyTileObbsChanged(t),this._numFadingTiles.value===0&&this.layerView.updateGaussians()),this._numFadingTiles.value>0&&((i=this.layerView.view.stage)==null||i.renderView.requestRender(2))}onFadeDurationChanged(e){e===0&&this.numFadingTiles>0&&this._instantlyFullyFadeAllTiles()}isTileFadingOut(e){return e.fadeProgress!=null&&e.fadeDirection===1}onTileDiscarded(e){e.fadeProgress!=null&&(this._numFadingTiles.value--,this._numFadingTiles.value===0&&(this._lastStoppedFading=_e(performance.now())))}updateFadeDuration(){if(this.numFadingTiles&&this.numFadingTiles>=this._previousNumFadingTiles){const e=.95*this._currentFadeDuration;this._currentFadeDuration=_e(Math.max(e,k.minimumFadeDuration))}else this.numFadingTiles===0&&performance.now()-this._lastStoppedFading>k.resetFadeDurationInterval&&(this._currentFadeDuration=this.baseFadeDuration);return this._previousNumFadingTiles=this.numFadingTiles,this._currentFadeDuration}get updating(){return this._numFadingTiles.value>0}get baseFadeDuration(){return this.layerView.view.qualitySettings.fadeDuration}get fadingEnabled(){return this.baseFadeDuration!==0}_startTileFading(e,t,i){e.fadeProgress==null&&this._numFadingTiles.value++,e.fadeDuration=i,e.fadeProgress=t}_stopTileFading(e){e.fadeProgress!=null&&(e.fadeDirection===1&&this._onTileFullyFadedOut(e),this._numFadingTiles.value--,this._numFadingTiles.value===0&&(this._lastStoppedFading=_e(performance.now())),e.fadeDuration=null,e.fadeProgress=null)}_updateTileFading(e,t){const{fadeProgress:i,fadeDirection:a}=e;if(i==null)return!1;const s=this._fadeDirectionToSign(a),n=e.fadeDuration,o=this._getTargetOpacity(a),u=t/Math.abs(n||1),c=Math.min(i+u,1),d=s*(1-(a===0?k.fadeInEase:k.fadeOutEase)(c)),l=c===1;if(e.opacityModifier=l?o:o-d,l){const g=a===1;return this._stopTileFading(e),this._updateOpacityModifier(e),g}return e.fadeProgress=c,this._updateOpacityModifier(e),!1}_updateOpacityModifier(e){const t=255*e.opacityModifier;for(let i=0;i<e.pageIds.length;i++){const a=e.pageIds[i];this.layerView.data.fadingTexture.updateBuffer(t,a)}}_instantTileFading(e,t){e.fadeDuration=null,e.fadeProgress=null,e.opacityModifier=t,this._updateOpacityModifier(e),e.fadeDirection===1&&this._onTileFullyFadedOut(e)}_instantlyFullyFadeAllTiles(){const e=this._tmpFullyFadedOutTiles;e.length=0,this.layerView.tileHandles.forEach(t=>{if(t.fadeProgress!=null){const i=t.fadeDirection===1;this._instantTileFading(t,this._getTargetOpacity(t.fadeDirection)),i&&e.push(t)}}),e.length>0&&(this.layerView.updateGaussians(),this.layerView.notifyTileObbsChanged(e)),this._numFadingTiles.value=0}_onTileFullyFadedOut(e){e.lifecycleState=0,this.layerView.moveTileToCache(e)}_fadeDirectionToSign(e){return e===0?1:-1}_getTargetOpacity(e){return e===0?1:0}_getFadeProgressFromOpacity(e,t){const i=Math.max(0,Math.min(e,1));return t===0?k.inverseFadeInEase(i):k.inverseFadeOutEase(i)}},k.fadeInEase=e=>e*(2-e),k.fadeOutEase=e=>e*e,k.inverseFadeInEase=e=>1-Math.sqrt(1-e),k.inverseFadeOutEase=e=>Math.sqrt(1-e),k.minimumFadeDuration=_e(80),k.resetFadeDurationInterval=_e(1e3),k),Va=class{constructor(e){this.layerView=e,this.type=0,this.slicePlaneEnabled=!1,this.isGround=!1,this._ellipsoidLocalRayOrigin=$(),this._ellipsoidLocalRayDir=$(),this.intersectionNormal=$(),this.intersectionRayDir=$(),this.intersectionPlane=zi(),this.layerViewUid=e.uid;const t=e.view.viewingMode,i=(e.useEsriCrs?e.fullExtentInLocalViewSpatialReference:e.layer.fullExtent?Ei(e.layer.fullExtent,e.view.renderSpatialReference):void 0)??e.view.extent,a=$i(i);this._bvh=Da(t,a)}destroy(){this._bvh.destroy()}addTile(e){this._bvh.addTile(e)}removeTile(e){this._bvh.removeTile(e)}intersect(e,t,i,a,s,n){const{intersectionRayDir:o,intersectionPlane:u,layerViewUid:c,intersectionNormal:d}=this,l=Oi(i,a);Pt(o,a,i);const g=1/qi(o);Be(o,o,g),Vi(d,o),Bi(u,o[0],o[1],o[2],-ki(o,i));const p=new ke,f=new ke,w=e.options.store,b=w===0,v=w===2,E=w===1||v,S=v?new Array:null,M=(h,m,C,D,j,y,x,N)=>{const U=h.point??(h.point=$());U[0]=C,U[1]=D,U[2]=j,h.dist=m,h.normal=d;const B=h.outwardDirection??(h.outwardDirection=$()),X=y*y+x*x+N*N;if(X>0){const Y=1/Math.sqrt(X);B[0]=y*Y,B[1]=x*Y,B[2]=N*Y}else B[0]=d[0],B[1]=d[1],B[2]=d[2];return h.layerViewUid=c,h},F=i[0],R=i[1],I=i[2],L=o[0],q=o[1],z=o[2],O=this.layerView.clippingBox,A=h=>{const{relativePositions:m,packedRotations:C,packedOpacityScaledScales:D,gaussianCount:j,obb:y,maxSplatMbsRadiusSquared:x}=h,N=y.centerX,U=y.centerY,B=y.centerZ;let X=-1;const Y=O[0],te=O[1],Pe=O[2],ce=O[3],ue=O[4],ne=O[5];for(let Z=0,K=0;Z<j;Z++,K+=3){const Q=m[K]+N,re=m[K+1]+U,J=m[K+2]+B;if(Q<Y||re<te||J<Pe||Q>ce||re>ue||J>ne)continue;const V=Q-F,ie=re-R,me=J-I,de=V*L+ie*q+me*z;if(de<0&&de*de>x)continue;const Fe=de<0?0:de;if(V*V+ie*ie+me*me-Fe*Fe>x||b&&p.dist!=null&&(X<0&&(X=Math.sqrt(x)),Math.max(de-X,0)*g>=p.dist))continue;const ge=this._intersectGaussianEllipsoid(V,ie,me,L,q,z,C[Z],D[Z]);if(ge<0)continue;const oe=ge*g;if(t!=null&&!t(i,a,oe))continue;const Te=p.dist==null||oe<p.dist,De=E&&(f.dist==null||oe>f.dist);if(!Te&&!De&&!v)continue;const Me=L*ge,Re=q*ge,Ae=z*ge,Ie=F+Me,rt=R+Re,ot=I+Ae,lt=Me-V,ct=Re-ie,ut=Ae-me;if(Te&&M(p,oe,Ie,rt,ot,lt,ct,ut),De&&M(f,oe,Ie,rt,ot,lt,ct,ut),v){const Ci=new ke;S.push(M(Ci,oe,Ie,rt,ot,lt,ct,ut))}}},P=h=>{const{relativePositions:m,packedRotations:C,packedOpacityScaledScales:D,gaussianCount:j,obb:y,maxSplatMbsRadiusSquared:x}=h,N=y.centerX,U=y.centerY,B=y.centerZ;let X=-1;const Y=F-N,te=R-U,Pe=I-B;for(let ce=0,ue=0;ce<j;ce++,ue+=3){const ne=m[ue]-Y,Z=m[ue+1]-te,K=m[ue+2]-Pe,Q=ne*L+Z*q+K*z;if(Q<0&&Q*Q>x)continue;const re=Q<0?0:Q;if(ne*ne+Z*Z+K*K-re*re>x||b&&p.dist!=null&&(X<0&&(X=Math.sqrt(x)),Math.max(Q-X,0)*g>=p.dist))continue;const J=this._intersectGaussianEllipsoid(ne,Z,K,L,q,z,C[ce],D[ce]);if(J<0)continue;const V=J*g;if(t!=null&&!t(i,a,V))continue;const ie=p.dist==null||V<p.dist,me=E&&(f.dist==null||V>f.dist);if(!ie&&!me&&!v)continue;const de=L*J,Fe=q*J,ge=z*J,oe=F+de,Te=R+Fe,De=I+ge,Me=de-ne,Re=Fe-Z,Ae=ge-K;if(ie&&M(p,V,oe,Te,De,Me,Re,Ae),me&&M(f,V,oe,Te,De,Me,Re,Ae),v){const Ie=new ke;S.push(M(Ie,V,oe,Te,De,Me,Re,Ae))}}},ee=(h,m)=>{const{min:C,max:D}=h.obb.signedDistanceRangePlane(u);if(D<0)return;const j=C*g;if(!(b&&p.dist!=null&&p.dist<j)){if(p.dist!=null&&f.dist!=null){const y=D*g;if(p.dist<j&&f.dist>y)return}m?A(h):P(h)}},W=h=>{ee(h,!1)},H=h=>{const m=h.boundingBox;mt(m,O)&&ee(h,!Hi(O,m))};this._bvh.forEachTileIntersectingRay(i,a,O!=null?H:W,n);const G=(h,m)=>{const{layerViewUid:C}=m,D=new ji(m.point,m.outwardDirection,C);h.set(0,D,m.dist,m.dist,m.normal)};if(Xt(p)){const h=e.results.min;(h.distance==null||p.dist<h.distance)&&G(h,p)}if(Xt(f)&&E){const h=e.results.max;(h.distance==null||f.dist>h.distance)&&G(h,f)}if(v&&(S!=null&&S.length))for(const h of S){const m=new Li(l);G(m,h),e.results.all.push(m)}}_intersectGaussianEllipsoid(e,t,i,a,s,n,o,u){const c=o>>>30,d=1023&o,l=o>>>10&1023,g=o>>>20&1023,p=(d&He)*pt*(1-2*(d>>>9&1)),f=(l&He)*pt*(1-2*(l>>>9&1)),w=(g&He)*pt*(1-2*(g>>>9&1));let b,v,E,S;const M=p*p+f*f+w*w,F=Math.sqrt(Math.max(0,1-M));switch(c){case 0:b=F,v=w,E=f,S=p;break;case 1:b=w,v=F,E=f,S=p;break;case 2:b=w,v=f,E=F,S=p;break;default:b=w,v=f,E=p,S=F}const R=this._ellipsoidLocalRayOrigin;R[0]=-e,R[1]=-t,R[2]=-i,Ot(R,R,-b,-v,-E,S);const I=this._ellipsoidLocalRayDir;I[0]=a,I[1]=s,I[2]=n,Ot(I,I,-b,-v,-E,S);const L=ft[255&u],q=ft[u>>>8&255],z=ft[u>>>16],O=R[0]*L,A=R[1]*q,P=R[2]*z,ee=O*O+A*A+P*P;if(ee<=1)return 0;const W=I[0]*L,H=I[1]*q,G=I[2]*z,h=W*W+H*H+G*G,m=O*W+A*H+P*G;if(m>0)return Yt;const C=m*m-h*(ee-1);return C<0?Yt:(-m-Math.sqrt(C))/h}getElevationRange(e){return this._bvh.getElevationRangeIntersectingSphere(e)??new gt(0,0)}};function Xt(r){return r.dist!=null&&r.point!=null}class ke{constructor(){this.point=null,this.dist=null,this.normal=null,this.outwardDirection=null,this.layerViewUid=""}}const He=511,pt=Math.SQRT1_2/He,Yt=-1,Ba=3,ft=(()=>{const r=new Float64Array(256);for(let e=0;e<r.length;e++)r[e]=Math.exp(10-e/16)/Ba;return r})();let ka=class{constructor(e,t,i,a,s,n,o,u,c,d){this.handle=e,this.obb=t,this.gaussianAtlasIndices=i,this.pageIds=a,this.relativePositions=s,this.packedRotations=n,this.packedOpacityScaledScales=o,this.gaussianCount=u,this.maxSplatMbsRadiusSquared=c,this.elevationRange=d,this.bvhIntersectionGeneration=0,this.lifecycleState=0,this.cullingRevision=-1,this.cullingVisible=!1,this.fadeDirection=0,this.opacityModifier=0,this.usedMemory=Je(this.gaussianAtlasIndices,this.pageIds,this.relativePositions,this.packedRotations,this.packedOpacityScaledScales);const l=$();t.getCenter(l),this.obbCenterX=l[0],this.obbCenterY=l[1],this.obbCenterZ=l[2];const g=t.radius??-1;this._mbsRadius=g;const p=g<0?-1:g*g;this._mbsRadiusSquared=p;const f=t.halfSize;this._obbShortestHalfsize=f?Math.min(f[0],f[1],f[2]):0;const w=et();t.toAaBoundingBox(w),this.boundingBox=w;const b=g>=0?g:.5*Wi(w);this.paddedMbsRadius=b+Math.sqrt(Math.max(0,c))}boundingVolumeIntersectsRay(e,t){if(!this.obb)return!0;const{obbCenterX:i,obbCenterY:a,obbCenterZ:s}=this,n=i-e[0],o=a-e[1],u=s-e[2],c=n*t[0]+o*t[1]+u*t[2],d=n*n+o*o+u*u-c*c;return(this._mbsRadiusSquared<0||d<=this._mbsRadiusSquared)&&this.obb.intersectRay(e,t)}boundingVolumeIntersectsSphere(e){var d;const t=this._mbsRadius;if(t<0)return!0;const i=e.center,a=e.radius,s=t+a,n=this.obbCenterX-i[0];if(n>s)return!1;const o=this.obbCenterY-i[1];if(o>s)return!1;const u=this.obbCenterZ-i[2];if(u>s)return!1;const c=n*n+o*o+u*u;return c>s*s?!1:c<=(this._obbShortestHalfsize+a)**2?!0:Math.sqrt(c)+t<=a||(((d=this.obb)==null?void 0:d.intersectSphere(e))??!0)}};function pi(r){r.code.add(_`void computeCovariance3D(in mat3 rotation, in vec3 scale, out vec3 covarianceA, out vec3 covarianceB) {
mat3 scaleMatrix = mat3(
vec3(scale.x, 0.0, 0.0),
vec3(0.0, scale.y, 0.0),
vec3(0.0, 0.0, scale.z)
);
mat3 scaledRotation = scaleMatrix * rotation;
mat3 covariance3D = transpose(scaledRotation) * scaledRotation;
covarianceA = vec3(covariance3D[0][0], covariance3D[0][1], covariance3D[0][2]);
covarianceB = vec3(covariance3D[1][1], covariance3D[1][2], covariance3D[2][2]);
}
vec3 computeGaussianCovariance2D(vec3 viewSpaceCenter, float focalLength, vec2 tanFov, float[6] cov3D, mat4 view) {
vec4 viewSpacePoint = vec4(viewSpaceCenter, 1);
vec2 clampLimit = 1.3 * tanFov;
vec2 normalized = viewSpacePoint.xy / viewSpacePoint.z;
viewSpacePoint.xy = clamp(normalized, -clampLimit, clampLimit) * viewSpacePoint.z;
float invZ = 1.0 / viewSpacePoint.z;
float invZSquared = invZ * invZ;
mat3 projectionJacobian = mat3(
focalLength * invZ,  0.0,                   -(focalLength * viewSpacePoint.x) * invZSquared,
0.0,                 focalLength * invZ,    -(focalLength * viewSpacePoint.y) * invZSquared,
0.0,                 0.0,                   0.0
);
mat3 worldToView = transpose(mat3(view));
mat3 covarianceProjection = worldToView * projectionJacobian;
mat3 covariance3D = mat3(
cov3D[0], cov3D[1], cov3D[2],
cov3D[1], cov3D[3], cov3D[4],
cov3D[2], cov3D[4], cov3D[5]
);
mat3 covariance2D = transpose(covarianceProjection) * transpose(covariance3D) * covarianceProjection;
const float regularization = 0.3;
covariance2D[0][0] += regularization;
covariance2D[1][1] += regularization;
return vec3(covariance2D[0][0], covariance2D[0][1], covariance2D[1][1]);
}
void computePackedGaussianCovariance3D(uvec4 packedGaussian, out vec3 covarianceA, out vec3 covarianceB) {
vec3 scale = unpackScale(packedGaussian);
vec4 quaternion = unpackQuaternion(packedGaussian);
mat3 rotation = quaternionToRotationMatrix(quaternion);
computeCovariance3D(rotation, scale.xyz, covarianceA, covarianceB);
}`)}function Xe(r){r.code.add(_`float computeGaussianCovarianceDeterminant(vec3 covariance2D) {
return covariance2D.x * covariance2D.z - covariance2D.y * covariance2D.y;
}
vec2 computeGaussianCovarianceEigenvalues(vec3 covariance2D) {
float mid = 0.5 * (covariance2D.x + covariance2D.z);
float radius = length(vec2((covariance2D.x - covariance2D.z) * 0.5, covariance2D.y));
return vec2(mid + radius, mid - radius);
}
vec2 computeGaussianAxisLengths(vec2 eigenvalues, float gaussianEllipseThreshold) {
return ceil(sqrt(eigenvalues * gaussianEllipseThreshold));
}
float computeGaussianEllipseThreshold(float gaussianLogAlphaCutoff) {
return max(0.0, -2.0 * gaussianLogAlphaCutoff);
}
bool rejectGaussianByMinimumRadius(float maxRadius, float opacity, float minSplatRadius) {
return minSplatRadius > 0.0 && maxRadius * opacity < minSplatRadius;
}
bool rejectGaussianByScreenBounds(vec2 ndcPosition, float maxRadius, vec2 clipSpacePixelScale) {
vec2 radiusNDC = maxRadius * clipSpacePixelScale;
return any(greaterThan(abs(ndcPosition) - radiusNDC, vec2(1.0)));
}
vec2 computeGaussianMajorAxisDirection(vec3 covariance2D, float majorEigenvalue) {
return normalize(vec2(covariance2D.y, majorEigenvalue - covariance2D.x));
}
vec2 computeGaussianUnitQuadCorner(int vertexID) {
return vec2((vertexID << 1) & 2, vertexID & 2) - 1.0;
}
vec2 computeGaussianQuadOffset(vec3 covariance2D, vec2 eigenvalues, vec2 axisLengths, int vertexID) {
vec2 majorAxisDirection = computeGaussianMajorAxisDirection(covariance2D, eigenvalues.x);
vec2 majorAxis = axisLengths.x * majorAxisDirection;
vec2 minorAxis = axisLengths.y * vec2(majorAxisDirection.y, -majorAxisDirection.x);
vec2 corner = computeGaussianUnitQuadCorner(vertexID);
return corner.x * majorAxis + corner.y * minorAxis;
}
vec3 computeGaussianConic(vec3 covariance2D, float determinant) {
return vec3(covariance2D.z, -covariance2D.y, covariance2D.x) * (1.0 / determinant);
}
float evaluateGaussianExponent(vec3 conic, vec2 offsetFromCenter) {
float x = offsetFromCenter.x;
float y = offsetFromCenter.y;
return -0.5 * dot(conic, vec3(x * x, 2.0 * x * y, y * y));
}`)}function fi(r){r.code.add(_`
    uint fetchOrderedGaussianIndex(uint instanceID) {
      uint orderTextureWidth = uint(textureSize(splatOrderTexture, 0).x);
      uint x = instanceID % orderTextureWidth;
      uint y = instanceID / orderTextureWidth;

      return texelFetch(splatOrderTexture, ivec2(x, y), 0).r;
    }

    uvec4 fetchPackedGaussian(uint gaussianIndex) {
      uint gaussianIndexX = gaussianIndex & ${Zt}u;
      uint gaussianIndexY = gaussianIndex >> ${Qt}u;

      return texelFetch(splatAtlasTexture, ivec2(gaussianIndexX, gaussianIndexY), 0);
    }

    uvec4 fetchPackedGaussianHeader(uint gaussianIndex) {
      uint headerIndex = gaussianIndex | ${La}u;
      uint headerIndexX = headerIndex & ${Zt}u;
      uint headerIndexY = headerIndex >> ${Qt}u;

      return texelFetch(splatAtlasTexture, ivec2(headerIndexX, headerIndexY), 0);
    }

    vec3 fetchGaussianCameraRelativePosition(uint gaussianIndex, uvec4 packedGaussian) {
      uvec4 packedHeader = fetchPackedGaussianHeader(gaussianIndex);
      vec3 tileOriginRelativePosition = unpackTileOriginRelativePosition(packedGaussian);

      return unpackCameraRelativeGaussianPosition(packedHeader, tileOriginRelativePosition);
    }

    uint fetchGaussianPageIndex(uint gaussianIndex) {
      return gaussianIndex >> ${Ha}u;
    }
  `)}const Zt=""+(se-1),Qt=`${Math.log2(se)}`,La=""+(ye-1),Ha=`${Math.log2(ye)}`;let mi=class extends Tt{constructor(){super(...arguments),this.tileCameraPosition=$(),this.cameraDelta=$()}};function gi(r){r.code.add(_`float unpackOpacity(uvec4 packedGaussian) {
return float((packedGaussian.w >> 24u) & 0xffu) / 255.0;
}
vec4 unpackColor(uvec4 packedGaussian) {
vec4 color;
color.r = float((packedGaussian.w >> 1u) & 0xfeu);
color.g = float((packedGaussian.w >> 9u) & 0xffu);
color.b = float((packedGaussian.w >> 16u) & 0xfeu);
color.a = float((packedGaussian.w >> 24u) & 0xffu);
return color / 255.0;
}`),r.code.add(_`vec3 unpackScale(uvec4 packedGaussian) {
uint sx = (packedGaussian.z >> 10u) & 0xffu;
uint sy = (packedGaussian.z >> 18u) & 0xffu;
uint szLow = (packedGaussian.z >> 26u) & 0x3fu;
uint szHigh = packedGaussian.a & 0x3u;
uint sz = szLow | (szHigh << 6u);
return exp(vec3(sx, sy, sz) / 16.0 - 10.0);
}`),r.code.add(_`const uint MASK_9_BITS = 0x1FFu;
const float SQRT_HALF = 0.7071067811865476;
const ivec3 COMPONENT_ORDER[4] = ivec3[4](
ivec3(3, 2, 1),
ivec3(3, 2, 0),
ivec3(3, 1, 0),
ivec3(2, 1, 0)
);
vec4 unpackQuaternion(uvec4 packedGaussian) {
uint packedRotation = packedGaussian.x;
uint largestComponent = packedRotation >> 30u;
vec4 quaternion = vec4(0.0);
float sumSquares = 0.0;
uint bitfield = packedRotation;
for (int j = 0; j < 3; ++j) {
int index = COMPONENT_ORDER[int(largestComponent)][j];
uint magnitude = bitfield & MASK_9_BITS;
uint signBit = (bitfield >> 9u) & 1u;
bitfield = bitfield >> 10u;
float value = SQRT_HALF * float(magnitude) / float(MASK_9_BITS);
quaternion[index] = signBit == 1u ? -value : value;
sumSquares += value * value;
}
quaternion[int(largestComponent)] = sqrt(1.0 - sumSquares);
return quaternion;
}`),r.code.add(_`vec3 unpackTileOriginRelativePosition(uvec4 packedGaussian) {
uint packedPositionLow = packedGaussian.y;
uint packedPositionHigh = packedGaussian.z;
uint x = packedPositionLow & 0x3FFFu;
uint y = (packedPositionLow >> 14u) & 0x3FFFu;
uint zLow = (packedPositionLow >> 28u) & 0xFu;
uint zHigh = packedPositionHigh & 0x3FFu;
uint z = zLow | (zHigh << 4u);
return vec3(float(x), float(y), float(z));
}`),r.uniforms.add(new xe("tileCameraPosition",e=>e.tileCameraPosition),new xe("cameraDelta",e=>e.cameraDelta)).code.add(_`vec3 unpackCameraRelativeGaussianPosition(uvec4 packedHeader, highp vec3 position) {
vec3 tileOrigin = uintBitsToFloat(packedHeader.xyz);
float invPosScale = 1.0 / exp2(float(packedHeader.w & 0xfu));
vec3 delta = tileOrigin.xyz - tileCameraPosition;
vec3 cameraRelativePosition = position * invPosScale + delta * 2.048 - cameraDelta;
return cameraRelativePosition;
}`)}function vi(r){r.code.add(_`mat3 quaternionToRotationMatrix(vec4 q) {
float x2 = q.x + q.x;
float y2 = q.y + q.y;
float z2 = q.z + q.z;
float xx = x2 * q.x;
float yy = y2 * q.y;
float zz = z2 * q.z;
float xy = x2 * q.y;
float xz = x2 * q.z;
float yz = y2 * q.z;
float wx = x2 * q.w;
float wy = y2 * q.w;
float wz = z2 * q.w;
return mat3(
1.0 - (yy + zz), xy - wz, xz + wy,
xy + wz, 1.0 - (xx + zz), yz - wx,
xz - wy, yz + wx, 1.0 - (xx + yy)
);
}`)}function _i(r){r.code.add(_`vec3 encodeNormalizedDepthToRGB(float normalizedDepth) {
float depth24 = normalizedDepth * 16777215.0;
float high = floor(depth24 / 65536.0);
depth24 -= high * 65536.0;
float mid = floor(depth24 / 256.0);
float low = depth24 - mid * 256.0;
return vec3(high, mid, low) / 255.0;
}`),r.code.add(_`float decodeRGBToNormalizedDepth(vec3 rgb) {
rgb *= 255.0;
float depth = rgb.r * 65536.0 + rgb.g * 256.0 + rgb.b;
depth /= 16777215.0;
return depth;
}`)}class le extends Ni{constructor(e){super(),this.spherical=e,this.alphaCutoff=1,this.fadingEnabled=!1,this.clippingEnabled=!1,this.receiveShadows=!1,this.hasShadowHighlights=!1,this.output=0,this.hasEmission=!1,this.receiveAmbientOcclusion=!1,this.receiveGlobalIllumination=!1,this.pbrMode=0,this.useCustomDTRExponentForWater=!1,this.useFillLights=!1,this.hasColorTexture=!0}}function ja(r){switch(r){case 2:return .005;case 0:return .05;default:return .01}}T([he({count:3})],le.prototype,"alphaCutoff",void 0),T([he()],le.prototype,"fadingEnabled",void 0),T([he()],le.prototype,"clippingEnabled",void 0),T([he()],le.prototype,"receiveShadows",void 0),T([he()],le.prototype,"hasShadowHighlights",void 0),T([he({count:12})],le.prototype,"output",void 0),T([he()],le.prototype,"receiveAmbientOcclusion",void 0),T([he()],le.prototype,"receiveGlobalIllumination",void 0);class Gt extends mi{constructor(){super(...arguments),this.clipMinCameraRelative=$(),this.clipMaxCameraRelative=$(),this.focalLength=-1,this.minSplatRadius=-1,this.tanFov=Dt(),this.origin=$()}}function xi(r){const{clippingEnabled:e,hasSlicePlane:t,receiveShadows:i,spherical:a}=r,s=new tt;s.varyings.add("vColor","vec4"),s.varyings.add("conicOpacity","vec4"),s.varyings.add("gaussianLogAlphaCutoff","float"),s.varyings.add("offsetFromCenter","vec2"),Jt(r)&&s.varyings.add("fragmentPositionCameraRelative","vec3"),s.vertex.uniforms.add(new qe("splatOrderTexture",l=>l.splatOrder),new qe("splatFadingTexture",l=>l.splatFading),new qe("splatAtlasTexture",l=>l.splatAtlas),new vt("focalLength",l=>l.focalLength),new vt("minSplatRadius",l=>l.minSplatRadius),new Ui("tanFov",l=>l.tanFov),new We("inverseScreenSize",({camera:l})=>Mt(Wa,1/l.fullWidth,1/l.fullHeight)),new Ne("proj",l=>l.camera.projectionMatrix),new Ne("view",l=>l.camera.viewMatrix),new We("nearFar",l=>l.camera.nearFar),new qt("cameraPosition",l=>l.camera.eye)),e&&(s.vertex.uniforms.add(new xe("clipMin",l=>l.clipMinCameraRelative),new xe("clipMax",l=>l.clipMaxCameraRelative)),s.fragment.uniforms.add(new xe("clipMin",l=>l.clipMinCameraRelative),new xe("clipMax",l=>l.clipMaxCameraRelative))),s.vertex.include(gi),s.vertex.include(fi),s.vertex.include(vi),s.vertex.include(pi),s.vertex.include(Xe),s.vertex.include(_t,r),i?(s.fragment.uniforms.add(new qt("cameraPosition",l=>l.camera.eye)),s.fragment.include(Vt,r)):s.vertex.include(Vt,r),s.include(Xi,r),Yi(i?s.fragment:s.vertex),Zi(i?s.fragment:s.vertex),i&&s.include(Qi,r),s.outputs.add("fragColor","vec4",0),s.outputs.add("fragDepthColor","vec4",1);const n=ja(r.alphaCutoff),o=Math.log(n),u=_`float groundLightAlignment = dot(groundNormal, mainLightDirection);
float additionalAmbientScale = additionalDirectedAmbientLight(groundLightAlignment);
vec3 additionalLight = mainLightIntensity * additionalAmbientScale * ambientBoostFactor * lightingGlobalFactor;`,c=_`
    vec3 groundNormal = ${a?_`normalize(cameraRelativePosition + cameraPosition)`:_`vec3(0.0, 0.0, 1.0)`};
    ${u}
    float shadow = ${a?_`lightingGlobalFactor * (1.0 - additionalAmbientScale)`:_`0.0`};
    vColor.rgb = evaluateSceneLighting(groundNormal, vColor.rgb, shadow, 0.0, additionalLight);
  `,d=_`
    vec3 groundNormal = ${a?_`normalize(fragmentPositionCameraRelative + cameraPosition)`:_`vec3(0.0, 0.0, 1.0)`};
    ${u}
    float shadow = readShadow(additionalAmbientScale, fragmentPositionCameraRelative);
    shadedColor = evaluateSceneLighting(groundNormal, vColor.rgb, shadow, 0.0, additionalLight);
  `;return s.vertex.main.add(`
    uint gaussianIndex = fetchOrderedGaussianIndex(uint(gl_InstanceID));
    uvec4 packedGaussian = fetchPackedGaussian(gaussianIndex);
    uint pageNum = fetchGaussianPageIndex(gaussianIndex);

    // Unpack color first so very transparent splats can discard before fetching the page header.
    vColor = unpackColor(packedGaussian);

    // Apply per-page fading before the early alpha rejection.
    ${ae(r.fadingEnabled,`
      uint fadingTextureWidth = uint(textureSize(splatFadingTexture, 0).x);
      uint fadeX = pageNum  % fadingTextureWidth;
      uint fadeY = pageNum  / fadingTextureWidth;
      uint opacityModifierByte = texelFetch(splatFadingTexture, ivec2(fadeX , fadeY), 0).r;
      float opacityModifier = float(opacityModifierByte) / 255.0;
      vColor.a *= opacityModifier;
      `)}

    // Set default position outside clip space for early returns.
    gl_Position = ${ni};

    if (vColor.a < ${n}) {
      return;
    }

    // Delay the page header fetch until the splat survives the opacity reject.
    vec3 cameraRelativePosition = fetchGaussianCameraRelativePosition(gaussianIndex, packedGaussian);

    ${ae(e,`
      if (cameraRelativePosition.x < clipMin.x || cameraRelativePosition.y < clipMin.y || cameraRelativePosition.z < clipMin.z ||
        cameraRelativePosition.x > clipMax.x || cameraRelativePosition.y > clipMax.y || cameraRelativePosition.z > clipMax.z) {
        return;
      }
      `)}

    ${ae(t,`if (rejectBySlice(cameraRelativePosition)) {
        return;
      }`)}

    vec4 viewPos = vec4(mat3(view) * cameraRelativePosition, 1);

    if (viewPos.z > -nearFar.x || viewPos.z < -nearFar.y) {
      return;
    }

    vec3 covarianceA;
    vec3 covarianceB;
    computePackedGaussianCovariance3D(packedGaussian, covarianceA, covarianceB);

    float covariance3D[6] = float[6](covarianceA.x, covarianceA.y, covarianceA.z, covarianceB.x, covarianceB.y, covarianceB.z);

    vec3 covariance2D = computeGaussianCovariance2D(viewPos.xyz, focalLength, tanFov, covariance3D, view);

    // Reject degenerate covariances before inverting them into conic coefficients.
    float determinant = computeGaussianCovarianceDeterminant(covariance2D);
    if (determinant <= 0.) {
      return;
    }

    vec2 eigenvalues = computeGaussianCovarianceEigenvalues(covariance2D);

    // Fold the per-splat opacity into the log cutoff so the vertex-side ellipse
    // bound matches the fragment alpha discard after fading.
    gaussianLogAlphaCutoff = ${o} - log(vColor.a);
    float gaussianEllipseThreshold = computeGaussianEllipseThreshold(gaussianLogAlphaCutoff);
    vec2 axisLengths = computeGaussianAxisLengths(eigenvalues, gaussianEllipseThreshold);
    float maxRadius = max(axisLengths.x, axisLengths.y);

    // Ignore Gaussians with very small contribution, with tolerance based on the quality profile.
    if (rejectGaussianByMinimumRadius(maxRadius, vColor.a, minSplatRadius)) {
      return;
    }

    vec4 projPos = proj * viewPos;
    float invW = 1. / (projPos.w + 1e-7);
    vec3 ndcPos = projPos.xyz * invW;
    vec2 clipSpacePixelScale = 2.0 * inverseScreenSize;

    // Cull splats whose screen-space ellipse cannot touch the viewport.
    if (rejectGaussianByScreenBounds(ndcPos.xy, maxRadius, clipSpacePixelScale)) {
      return;
    }

    offsetFromCenter = computeGaussianQuadOffset(covariance2D, eigenvalues, axisLengths, gl_VertexID);

    ${ae(Jt(r),`float viewSpacePixelScale = -viewPos.z / focalLength;
      vec3 fragmentViewOffset = vec3(offsetFromCenter * viewSpacePixelScale, 0.0);
      fragmentPositionCameraRelative = cameraRelativePosition + transpose(mat3(view)) * fragmentViewOffset;`)}

    // Store conic coefficients with opacity for fragment-side falloff.
    vec3 conic = computeGaussianConic(covariance2D, determinant);
    conicOpacity = vec4(conic, vColor.a);

    // Handle environment lighting per vertex when no shadow map is active.
    // When shadows are received, defer lighting to the fragment shader for crisp shadow borders.
  ${ae(i,"forwardLinearDepth(-viewPos.z);",c)}

    // Place this quad corner in clip space around the projected splat center.
    vec2 quadClipPosition = ndcPos.xy + offsetFromCenter * clipSpacePixelScale - inverseScreenSize;

    gl_Position = vec4(quadClipPosition, ndcPos.z, 1.0);

  `),s.fragment.include(_i),s.fragment.include(Xe),s.fragment.include(_t,r),s.fragment.main.add(`
    ${ae(e,`if (fragmentPositionCameraRelative.x < clipMin.x || fragmentPositionCameraRelative.y < clipMin.y || fragmentPositionCameraRelative.z < clipMin.z ||
        fragmentPositionCameraRelative.x > clipMax.x || fragmentPositionCameraRelative.y > clipMax.y || fragmentPositionCameraRelative.z > clipMax.z) {
        discard;
      }`)}
    ${ae(t,"if (rejectBySlice(fragmentPositionCameraRelative)) { discard; }")}

    float gaussianExponent = evaluateGaussianExponent(conicOpacity.xyz, offsetFromCenter);

    // A positive exponent indicates alpha > 1, which should not happen.
    // We also early check the opacity-aware alpha cutoff to avoid unnecessary exp().
    if (gaussianExponent > 0.0 || gaussianExponent < gaussianLogAlphaCutoff) {
      discard;
    }

    float gaussianFalloff = exp(gaussianExponent);

    // Cap at 0.99 to avoid blending issues, such as seams between overlapping Gaussians.
    float alpha = min(.99f, conicOpacity.w * gaussianFalloff);

    vec3 shadedColor = vColor.rgb;
  ${ae(i,d)}
    fragColor = vec4(shadedColor * alpha, alpha);

    // We simulate first hit based depth using 0.25 as the opacity threshold.
    // This works because we render in front-to-back order,
    // i.e. the first hit that counts completely saturates the alpha channel
    // and further splats do not contribute.
    float depthHit = step(0.25, alpha);
    float normalizedDepth = gl_FragCoord.z;
    fragDepthColor = vec4(encodeNormalizedDepthToRGB(normalizedDepth) * depthHit, depthHit);
  `),s}function Jt(r){const{clippingEnabled:e,hasSlicePlane:t,receiveShadows:i}=r;return i||t||e}const Wa=Dt(),Na=Object.freeze(Object.defineProperty({__proto__:null,GaussianSplatPassParameters:Gt,build:xi},Symbol.toStringTag,{value:"Module"}));let Ft=class extends Tt{};function yi(r){const e=new tt;e.include(ri);const{hasEmission:t}=r,i=e.fragment;return t&&i.include(Ji,r),i.uniforms.add(new Le("colorTexture",a=>a.color),new Le("splatOutputColor",a=>a.splatColor)),t&&i.uniforms.add(new Le("emissionTexture",a=>a.emission)),e.outputs.add("fragColor","vec4",0),t&&e.outputs.add("fragEmission","vec4",1),e.fragment.main.add(_`
      vec4 color = texture(colorTexture, uv);
      vec4 splatColor = texture(splatOutputColor, uv);

      fragColor = splatColor + color * (1.0 - splatColor.a);
      ${ae(t,_`
          vec4 emission = texture(emissionTexture, uv);
          float srcAlpha = splatColor.a;

          if (srcAlpha == 0.0) {
            fragEmission = emission;
            return;
          }

          vec3 oitDimming = emissionDimming(splatColor.rgb, 1.0 - srcAlpha);
          float opaqueSuppression = smoothstep(0.95, 1.0, srcAlpha);
          vec3 dimming = mix(oitDimming, vec3(0.0), opaqueSuppression);

          fragEmission = vec4(emission.rgb * dimming, emission.a);
        `)}
    `),e}const Ua=Object.freeze(Object.defineProperty({__proto__:null,GaussianSplatCompositionPassParameters:Ft,build:yi},Symbol.toStringTag,{value:"Module"}));let Ye=class extends it{constructor(){super(...arguments),this.shader=new at(Ua,()=>st(()=>Promise.resolve().then(()=>es),void 0,import.meta.url))}initializePipeline(){return nt({colorWrite:oi,depthTest:null,depthWrite:Rt})}};Ye=T([Ce("esri.views.3d.webgl-engine.shaders.GaussianSplatCompositionTechnique")],Ye);class wi extends Ki{constructor(){super(...arguments),this.hasEmission=!1}}T([he()],wi.prototype,"hasEmission",void 0);class It extends Tt{}function bi(){const r=new tt;r.include(ri);const e=r.fragment;return e.uniforms.add(new Le("splatOutputDepth",t=>t.splatDepth)),e.include(_i),e.main.add(_`vec4 splatDepth = texture(splatOutputDepth, uv);
float depth = decodeRGBToNormalizedDepth(splatDepth.xyz);
if(splatDepth.a < 1.0) {
discard;
}
gl_FragDepth = depth;`),r}const Xa=Object.freeze(Object.defineProperty({__proto__:null,GaussianSplatDepthCompositionPassParameters:It,build:bi},Symbol.toStringTag,{value:"Module"}));let Ze=class extends it{constructor(){super(...arguments),this.shader=new at(Xa,()=>st(()=>Promise.resolve().then(()=>ts),void 0,import.meta.url))}initializePipeline(){return nt({colorWrite:null,depthTest:{func:515},depthWrite:Rt})}};Ze=T([Ce("esri.views.3d.webgl-engine.shaders.GaussianSplatDepthCompositionTechnique")],Ze);let Qe=class extends it{constructor(){super(...arguments),this.shader=new at(Na,()=>st(()=>Promise.resolve().then(()=>is),void 0,import.meta.url))}initializePipeline(){return nt({blending:ea(773,773,1,1,32774,32774),depthTest:{func:515},colorWrite:oi})}};Qe=T([Ce("esri.views.3d.webgl-engine.shaders.GaussianSplatTechnique")],Qe);var je,be;let we=(be=class extends li{constructor(e){super(e),this.produces=ci.GAUSSIAN_SPLAT,this._slicePlaneEnabled=!1,this.layerView=null,this._passParameters=new Gt,this._compositionPassParameters=new Ft,this._depthCompositionPassParameters=new It,this._compositionConfiguration=new wi,this._clipBox=et(),this._previousCameraDirection=$(),this._previousSortRequestCameraDirection=$(),this._tileCullingRevision=0,this._sortRequestDirectionEpsilon=.01,this._directionChangeEpsilon=.001,this._configuration=new le(e.view.state.isGlobal),Bt(this._clipBox,Ee)}async initialize(){this.addHandles([pe(()=>this.view.state.camera,()=>this._onCameraChange()),pe(()=>this.view.state.mode===2,()=>this.requestRender(1))])}precompile(){this._updateConfigurations(),this._compositionConfiguration.useFloatBlend=this.bindParameters.useFloatBlend.value,this._compositionConfiguration.hasEmission=this.bindParameters.hasOpaqueEmission,this.techniques.precompile(Qe,this._configuration),this.techniques.precompile(Ye,this._compositionConfiguration),this.techniques.precompile(Ze)}render(e){const t=e.find(({name:f})=>f===this.produces);if(this._updateConfigurations(),this._handleFading(),!this._data.visibleGaussians||!this._data.orderTexture.texture||!this._data.textureAtlas.texture)return t;const i=t.getAttachment(ze);this._compositionConfiguration.useFloatBlend=this.bindParameters.useFloatBlend.value,this._compositionConfiguration.hasEmission=i!=null;const{fullWidth:a,fullHeight:s}=this.bindParameters.camera;this._prepareParameters(s,a);const n=this.renderingContext,o=this.fboCache,u=o.acquire(a,s,"gaussian color output"),c=t.getAttachment(kt);u.attachDepth(c);const d=this.techniques.get(Qe,this._configuration);this._renderGaussianColorAndDepth(u,d);const l=o.acquire(a,s,this.produces);this._depthCompositionPassParameters.splatDepth=u.getTexture(ze),l.attachDepth(t.getAttachment(kt)),n.bindFramebuffer(l.fbo);const g=this.techniques.get(Ze);n.bindTechnique(g,this.bindParameters,this._depthCompositionPassParameters),n.screen.draw(),this._compositionPassParameters.color=t.getTexture(),this._compositionPassParameters.splatColor=u.getTexture(),i?(l.acquireColor(ze,8,"emissive"),this._compositionPassParameters.emission=t.getTexture(ze)):this._compositionPassParameters.emission=null,n.bindFramebuffer(l.fbo);const p=this.techniques.get(Ye,this._compositionConfiguration);return n.bindTechnique(p,this.bindParameters,this._compositionPassParameters),n.screen.draw(),u.release(),l}get slicePlaneEnabled(){return this._slicePlaneEnabled}set slicePlaneEnabled(e){this._slicePlaneEnabled!==e&&(this._slicePlaneEnabled=e,this.requestRender(1))}set clippingBox(e){const t=e||Ee;this._hasSameClipBox(t)||(Bt(this._clipBox,t),this._tileCullingRevision=Nt(this._tileCullingRevision,1),this._data.requestSort(),this.requestRender(1))}get clippingBox(){return this._clippingEnabled?this._clipBox:null}get tileCullingRevision(){return this._tileCullingRevision}get _clippingEnabled(){return!Lt(this._clipBox,Ee,(e,t)=>e===t)}get _isIdle(){return this.view.state.mode===2}get _data(){return this.layerView.data}get _fadeHelper(){return this.layerView.fadeHelper}_updateConfigurations(){const{idleMinimumOpacity:e,nonIdleMinimumOpacity:t}=this.view.qualitySettings.gaussianSplat;this._configuration.alphaCutoff=this._isIdle?e:t,this._configuration.fadingEnabled=this._fadeHelper.fadingEnabled,this._configuration.receiveShadows=this.bindParameters.shadowMap.ready,this._configuration.hasShadowHighlights=this._configuration.receiveShadows&&this.bindParameters.hasShadowHighlights,this._configuration.clippingEnabled=this._clippingEnabled,this._configuration.hasSlicePlane=this._slicePlaneEnabled&&this.bindParameters.slicePlane!=null}_onCameraChange(){this._tileCullingRevision=Nt(this._tileCullingRevision,1);const e=this.view.state.camera.ray.direction;this._directionChanged(e)&&(Oe(this._previousCameraDirection,e),this._shouldRequestSort(e)&&this._data.requestSort()&&Oe(this._previousSortRequestCameraDirection,e))}_directionChanged(e){return Math.abs(e[0]-this._previousCameraDirection[0])>this._directionChangeEpsilon||Math.abs(e[1]-this._previousCameraDirection[1])>this._directionChangeEpsilon||Math.abs(e[2]-this._previousCameraDirection[2])>this._directionChangeEpsilon}_shouldRequestSort(e){return Math.abs(e[0]-this._previousSortRequestCameraDirection[0])>this._sortRequestDirectionEpsilon||Math.abs(e[1]-this._previousSortRequestCameraDirection[1])>this._sortRequestDirectionEpsilon||Math.abs(e[2]-this._previousSortRequestCameraDirection[2])>this._sortRequestDirectionEpsilon}_prepareParameters(e,t){this._passParameters.splatOrder=this._data.orderTexture.texture,this._passParameters.splatFading=this._data.fadingTexture.texture,this._passParameters.splatAtlas=this._data.textureAtlas.texture;const i=Math.tan(.5*this.camera.fovY),a=i/e*t;Mt(this._passParameters.tanFov,a,i),this._passParameters.focalLength=e/(2*i);const s=this.view.qualitySettings.gaussianSplat,n=this._isIdle?s.idleMinimumSplatPixelRadius:s.nonIdleMinimumSplatPixelRadius;this._passParameters.minSplatRadius=n*Math.sqrt(t*e)/Math.sqrt(2073600),Oe(this._passParameters.origin,this.bindParameters.camera.eye),this._prepareHighPrecisionCameraPosition(),this._updateSlicePlaneLocalOrigin(),this._updateClipUniforms()}_updateClipUniforms(){const e=this.clippingBox||Ee,[t,i,a,s,n,o]=e,[u,c,d]=this.camera.eye,{clipMinCameraRelative:l,clipMaxCameraRelative:g}=this._passParameters;Ve(l,t-u,i-c,a-d),Ve(g,s-u,n-c,o-d)}_updateSlicePlaneLocalOrigin(){this._passParameters.slicePlaneLocalOrigin=this.camera.eye}_hasSameClipBox(e){return Lt(this._clipBox,e,(t,i)=>t===i)}_renderGaussianColorAndDepth(e,t){const i=this.renderingContext;e.acquireColor(ze,5,"gaussian depth output"),i.bindFramebuffer(e.fbo),i.setClearColor(0,0,0,0),i.clear(16384),this.renderingContext.bindTechnique(t,this.bindParameters,this._passParameters),this.renderingContext.drawArraysInstanced(ui.TRIANGLE_STRIP,0,4,this._data.visibleGaussians)}_prepareHighPrecisionCameraPosition(){Be(this._passParameters.tileCameraPosition,this.camera.eye,1/je.tileSize),di(this._passParameters.tileCameraPosition,this._passParameters.tileCameraPosition),Be(this._passParameters.cameraDelta,this._passParameters.tileCameraPosition,je.tileSize),Pt(this._passParameters.cameraDelta,this.camera.eye,this._passParameters.cameraDelta)}_handleFading(){var t;if(this._fadeHelper.numFadingTiles===0)return void(this._previousFrameStart=null);this._previousFrameStart??(this._previousFrameStart=this.view.stage.renderer.renderContext.time);const e=((t=this.view.stage)==null?void 0:t.renderer.renderContext.time)-this._previousFrameStart;this._fadeHelper.updateAllTileFading(e),this._previousFrameStart=this.view.stage.renderer.renderContext.time,this._data.fadingTexture.updateTexture(this._data.textureAtlas.pageAllocator.pageCount)}},je=be,be.tileSize=2.048,be);T([fe()],we.prototype,"produces",void 0),T([fe({constructOnly:!0})],we.prototype,"layerView",void 0),we=je=T([Ce("esri.views.3d.webgl-engine.lib.GaussianSplatRenderNode")],we);class zt extends mi{constructor(){super(...arguments),this.clipMinCameraRelative=$(),this.clipMaxCameraRelative=$(),this.minSplatRadius=-1}}function Si(r){const{clippingEnabled:e,hasSlicePlane:t}=r,i=new tt,{fragment:a,varyings:s,vertex:n}=i;s.add("conic","vec3"),s.add("gaussianLogAlphaCutoff","float"),s.add("offsetFromCenter","vec2"),n.uniforms.add(new qe("splatOrderTexture",c=>c.splatOrder),new qe("splatAtlasTexture",c=>c.splatAtlas),new vt("minSplatRadius",c=>c.minSplatRadius),new We("inverseScreenSize",({camera:c})=>Mt(Ya,1/c.fullWidth,1/c.fullHeight)),new Ne("proj",c=>c.camera.projectionMatrix),new Ne("view",c=>c.camera.viewMatrix),new We("nearFar",c=>c.camera.nearFar)),e&&n.uniforms.add(new xe("clipMin",c=>c.clipMinCameraRelative),new xe("clipMax",c=>c.clipMaxCameraRelative)),n.include(gi),n.include(fi),n.include(vi),n.include(pi),n.include(Xe),n.include(_t,r),n.code.add(_`float safeClipW(float clipW) {
return abs(clipW) < 1e-7 ? (clipW < 0.0 ? -1e-7 : 1e-7) : clipW;
}`),n.code.add(_`vec3 computeProjectivePixelGradient(
vec3 clipGradient,
vec3 clipWGradient,
float clipValue,
float safeW,
float invWSquared,
float halfScreenSize
) {
return (clipGradient * safeW - clipValue * clipWGradient) * invWSquared * halfScreenSize;
}`),n.code.add(_`vec3 multiplyCovariance3D(float[6] covariance3D, vec3 value) {
return vec3(
covariance3D[0] * value.x + covariance3D[1] * value.y + covariance3D[2] * value.z,
covariance3D[1] * value.x + covariance3D[3] * value.y + covariance3D[4] * value.z,
covariance3D[2] * value.x + covariance3D[4] * value.y + covariance3D[5] * value.z
);
}`),n.code.add(_`vec3 computeProjectiveCovariance2D(vec3 pixelXGradient, vec3 pixelYGradient, float[6] covariance3D, mat4 view) {
mat3 worldToView = transpose(mat3(view));
vec3 axisX = worldToView * pixelXGradient;
vec3 axisY = worldToView * pixelYGradient;
vec3 covarianceAxisX = multiplyCovariance3D(covariance3D, axisX);
vec3 covarianceAxisY = multiplyCovariance3D(covariance3D, axisY);
const float regularization = 0.3;
float covarianceXX = dot(axisX, covarianceAxisX) + regularization;
float covarianceXY = dot(axisX, covarianceAxisY);
float covarianceYY = dot(axisY, covarianceAxisY) + regularization;
return vec3(covarianceXX, covarianceXY, covarianceYY);
}`),n.code.add(_`float biasDepth(float linearDepth) {
const float bias = 80.0 * .000015259;
return min(linearDepth + bias, 1.0);
}`);const o=.25,u=Math.log(o);return n.main.add(`
    uint gaussianIndex = fetchOrderedGaussianIndex(uint(gl_InstanceID));
    uvec4 packedGaussian = fetchPackedGaussian(gaussianIndex);

    float opacity = unpackOpacity(packedGaussian);

    gl_Position = ${ni};

    if (opacity < ${o}) {
      return;
    }

    vec3 cameraRelativePosition = fetchGaussianCameraRelativePosition(gaussianIndex, packedGaussian);

    ${ae(e,_`if (cameraRelativePosition.x < clipMin.x || cameraRelativePosition.y < clipMin.y || cameraRelativePosition.z < clipMin.z ||
cameraRelativePosition.x > clipMax.x || cameraRelativePosition.y > clipMax.y || cameraRelativePosition.z > clipMax.z) {
return;
}`)}

    ${ae(t,_`if (rejectBySlice(cameraRelativePosition)) {
return;
}`)}

    vec4 viewPos = vec4(mat3(view) * cameraRelativePosition, 1.0);

    if (viewPos.z > -nearFar.x || viewPos.z < -nearFar.y) {
      return;
    }

    vec3 covarianceA;
    vec3 covarianceB;
    computePackedGaussianCovariance3D(packedGaussian, covarianceA, covarianceB);

    float covariance3D[6] = float[6](covarianceA.x, covarianceA.y, covarianceA.z, covarianceB.x, covarianceB.y, covarianceB.z);

    vec4 projPos = proj * viewPos;
    float safeW = safeClipW(projPos.w);
    float invWSquared = 1.0 / (safeW * safeW);
    vec2 halfScreenSize = 0.5 / inverseScreenSize;
    float maxShadowSplatRadius = max(halfScreenSize.x, halfScreenSize.y);

    // Projection matrix columns are the clip-space derivatives with respect to view-space xyz.
    vec3 clipWGradient = vec3(proj[0][3], proj[1][3], proj[2][3]);
    vec3 pixelXGradient = computeProjectivePixelGradient(
      vec3(proj[0][0], proj[1][0], proj[2][0]),
      clipWGradient,
      projPos.x,
      safeW,
      invWSquared,
      halfScreenSize.x
    );
    vec3 pixelYGradient = computeProjectivePixelGradient(
      vec3(proj[0][1], proj[1][1], proj[2][1]),
      clipWGradient,
      projPos.y,
      safeW,
      invWSquared,
      halfScreenSize.y
    );
    vec3 covariance2D = computeProjectiveCovariance2D(pixelXGradient, pixelYGradient, covariance3D, view);

    float determinant = computeGaussianCovarianceDeterminant(covariance2D);
    if (determinant <= 0.0) {
      return;
    }

    vec2 eigenvalues = computeGaussianCovarianceEigenvalues(covariance2D);

    gaussianLogAlphaCutoff = ${u} - log(opacity);
    float gaussianEllipseThreshold = computeGaussianEllipseThreshold(gaussianLogAlphaCutoff);
    vec2 axisLengths = computeGaussianAxisLengths(eigenvalues, gaussianEllipseThreshold);
    float maxRadius = max(axisLengths.x, axisLengths.y);

    // Avoid invalid/extremely large footprints.
    if (maxRadius < 0.0 || maxRadius > maxShadowSplatRadius) {
      return;
    }

    if (rejectGaussianByMinimumRadius(maxRadius, opacity, minSplatRadius)) {
      return;
    }

    vec3 ndcPos = projPos.xyz / safeW;
    vec2 clipSpacePixelScale = 2.0 * inverseScreenSize;

    if (rejectGaussianByScreenBounds(ndcPos.xy, maxRadius, clipSpacePixelScale)) {
      return;
    }

    offsetFromCenter = computeGaussianQuadOffset(covariance2D, eigenvalues, axisLengths, gl_VertexID);
    conic = computeGaussianConic(covariance2D, determinant);
    float linearDepth = (-viewPos.z - nearFar.x) / (nearFar.y - nearFar.x);
    float biasedDepth = biasDepth(linearDepth);

    vec2 clipPos = ndcPos.xy + offsetFromCenter * clipSpacePixelScale - inverseScreenSize;
    gl_Position = vec4(clipPos, biasedDepth * 2.0 - 1.0, 1.0);
  `),a.include(Xe),a.main.add(_`float gaussianExponent = evaluateGaussianExponent(conic, offsetFromCenter);
if (gaussianExponent > 0.0 || gaussianExponent < gaussianLogAlphaCutoff) {
discard;
}`),i}const Ya=Dt(),Za=Object.freeze(Object.defineProperty({__proto__:null,GaussianSplatShadowPassParameters:zt,build:Si},Symbol.toStringTag,{value:"Module"}));let xt=class extends it{constructor(){super(...arguments),this.shader=new at(Za,()=>st(()=>Promise.resolve().then(()=>as),void 0,import.meta.url))}initializePipeline(){return nt({colorWrite:null,depthTest:{func:515},depthWrite:Rt})}};xt=T([Ce("esri.views.3d.webgl-engine.shaders.GaussianSplatShadowTechnique")],xt);let $e=class extends li{constructor(r){super(r),this.produces=ci.SHADOW_CASTERS,this.layerView=null,this._passParameters=new zt,this._cameraPosition=$(),this._configuration=new le(r.view.state.isGlobal)}render(){const r=this.bindRenderTarget();return this._render(),r}queryDepthRange(r){return this.layerView.suspended?null:this._data.queryVisibleTileDepthRange(r,this.layerView.clippingBox)}get _data(){return this.layerView.data}get _clippingEnabled(){return this.layerView.clippingBox!=null}get _isIdle(){return this.view.state.mode===2}_render(){const r=this._data;if(this.layerView.suspended||r.visibleGaussians===0||!r.orderTexture.texture||!r.textureAtlas.texture)return;this._updateShadowConfigurations();const e=this.techniques.getCompiled(xt,this._configuration);e?(this._prepareShadowParameters(this.bindParameters.camera),this.renderingContext.bindTechnique(e,this.bindParameters,this._passParameters),this.renderingContext.drawArraysInstanced(ui.TRIANGLE_STRIP,0,4,r.visibleGaussians)):this.requestRender(1)}_updateShadowConfigurations(){this._configuration.clippingEnabled=this._clippingEnabled,this._configuration.hasSlicePlane=this.layerView.slicePlaneEnabled&&this.bindParameters.slicePlane!=null,this._configuration.output=this.bindParameters.output}_prepareShadowParameters(r){const e=this._data;this._passParameters.splatOrder=e.orderTexture.texture,this._passParameters.splatAtlas=e.textureAtlas.texture;const{fullHeight:t,fullWidth:i}=r,a=this.view.qualitySettings.gaussianSplat,s=this._isIdle?a.idleMinimumSplatPixelRadius:a.nonIdleMinimumSplatPixelRadius;this._passParameters.minSplatRadius=s*Math.sqrt(i*t)/Math.sqrt(2073600),this._updateShadowCameraPosition(r),this._prepareShadowHighPrecisionCameraPosition(),this._passParameters.slicePlaneLocalOrigin=this._cameraPosition,this._updateShadowClipUniforms()}_updateShadowClipUniforms(){const r=this.layerView.clippingBox||Ee,[e,t,i,a,s,n]=r,[o,u,c]=this._cameraPosition,{clipMinCameraRelative:d,clipMaxCameraRelative:l}=this._passParameters;Ve(d,e-o,t-u,i-c),Ve(l,a-o,s-u,n-c)}_prepareShadowHighPrecisionCameraPosition(){Be(this._passParameters.tileCameraPosition,this._cameraPosition,1/we.tileSize),di(this._passParameters.tileCameraPosition,this._passParameters.tileCameraPosition),Be(this._passParameters.cameraDelta,this._passParameters.tileCameraPosition,we.tileSize),Pt(this._passParameters.cameraDelta,this._cameraPosition,this._passParameters.cameraDelta)}_updateShadowCameraPosition(r){const e=r.viewInverseTransposeMatrix;Ve(this._cameraPosition,e[3],e[7],e[11])}};T([fe()],$e.prototype,"produces",void 0),T([fe({constructOnly:!0})],$e.prototype,"layerView",void 0),$e=T([Ce("esri.views.3d.webgl-engine.lib.GaussianSplatShadowRenderNode")],$e);var yt;const Qa=()=>wa.getLogger("esri.views.3d.layers.GaussianSplatLayerView3D"),Kt=3,Ja=Kt*Kt,ei=255,Ka=(()=>{const r=new Int16Array(ei+1);r[0]=-255;for(let e=1;e<r.length;e++)r[e]=Math.round(16*Math.log(e/ei));return r})();var Se;let ve=(Se=class extends Ca(Ma){constructor(e){super(e),this.type="gaussian-splat-3d",this.ignoresMemoryFactor=!1,this._tileHandles=new Map,this._pageBuffer=new Uint32Array(Aa),this._tmpTilesWithChangedVisibility=new Array,this._currentLyr3dVisibilityChange=0,this._tileFadeInsAwaitingInitialSort=new Map,this._tileFadeOutsAwaitingInitialSort=new Map,this._fadeDurationPerVisibilityChange=new Map,this._tmpSortedTileHandles=new Set,this._createRenderableAbortController=new AbortController,this._initializationController=null,this._wasmLayerId=-1,this._metersPerVCSUnit=1,this._usedTileMemory=0,this._cacheTileMemory=0,this._useEsriCrs=!1,this.fullExtentInLocalViewSpatialReference=null,this._suspendedHandle=null,this._conversionBuffer=new ArrayBuffer(4),this._u32View=new Uint32Array(this._conversionBuffer),this._f32View=new Float32Array(this._conversionBuffer);const t=e.view.resourceController;this._memCache=t.memoryController.newCache(`GaussianSplat-${this.uid}`,i=>this._deleteTile(i)),this._frameTask=t.scheduler.registerTask(ai.GAUSSIAN_SPLAT_TEXTURE_ATLAS)}get _clippingBox(){var t;if(!((t=this.view)!=null&&t.clippingArea))return null;const e=et();return ta(this.view.clippingArea,e,this.view.renderSpatialReference)?e:null}get clippingBox(){var e;return((e=this._renderNode)==null?void 0:e.clippingBox)??null}initialize(){var t;if(!this._canProjectWithoutEngine())throw ia("layer",this.layer.spatialReference.wkid,(t=this.view.renderSpatialReference)==null?void 0:t.wkid);this._initializationController=new AbortController;const e=aa(this,this._initializationController.signal).then(i=>{sa(this._initializationController.signal),this._wasmLayerId=i,this._renderNode=new we({view:this.view,layerView:this}),this.data=new Oa(this._renderNode,(a,s)=>this._onSortComplete(a,s),()=>this._freeInvisibleTiles()),this._shadowRenderNode=new $e({view:this.view,layerView:this}),this.fadeHelper=new qa(this),this._intersectionHandler=new Va(this),this.view.sceneIntersectionHelper.addIntersectionHandler(this._intersectionHandler),this._elevationProvider=new Pa({view:this.view,layerElevationSource:this,intersectionHandler:this._intersectionHandler}),this.view.elevationProvider.register(2,this._elevationProvider),this.addHandles([pe(()=>this.layer.elevationInfo,a=>this._elevationInfoChanged(a)),pe(()=>this.slicePlaneEnabled,a=>this._slicePlaneEnabledChanged(a),dt)]),this._suspendedHandle=pe(()=>this.suspended,a=>{var s;return(s=this._wasm)==null?void 0:s.setEnabled(this,!a)},dt),this.addHandles([pe(()=>this._clippingBox,a=>this._renderNode.clippingBox=a,dt)]),this.setMaximumGaussianCount(this.view.qualitySettings.gaussianSplat.maximumNumberOfGaussians),this._initializationController=null});this.addHandles([pe(()=>this.view.qualitySettings.fadeDuration,i=>{const a=this.data;a&&(this.fadeHelper.onFadeDurationChanged(i),a.fadingTexture.updateTexture(a.textureAtlas.pageAllocator.pageCount))}),pe(()=>this.view.qualitySettings.gaussianSplat.maximumNumberOfGaussians,i=>this.setMaximumGaussianCount(i*this.view.quality)),pe(()=>this.view.quality,i=>this.setMaximumGaussianCount(this.view.qualitySettings.gaussianSplat.maximumNumberOfGaussians*i))]),this.addResolvingPromise(e)}get wasmLayerId(){return this._wasmLayerId}get metersPerVCSUnit(){return this._metersPerVCSUnit}get tileHandles(){return this._tileHandles}get _wasm(){return na(this.view)}get usedMemory(){var e;return this._usedTileMemory+(((e=this.data)==null?void 0:e.usedMemory)??0)}get cachedMemory(){return this._cacheTileMemory}get unloadedMemory(){return 0}get useEsriCrs(){return this._useEsriCrs}get elevationProvider(){return this._elevationProvider}get elevationOffset(){return Ht(this.layer.elevationInfo)}get elevationRange(){const e=this.fullExtent;return e!=null&&e.zmin&&(e!=null&&e.zmax)?new gt(e.zmin,e.zmax):null}getElevationRange(e){return this._intersectionHandler.getElevationRange(e)}get fullExtent(){return this.layer.fullExtent}get visibleAtCurrentScale(){return ra(this.layer.effectiveScaleRange,this.view.scale)}isUpdating(){const e=this._wasm;return!(this._wasmLayerId<0||e==null)&&(e.isUpdating(this._wasmLayerId)||this.data.updating||this.fadeHelper.updating)}updatingFlagChanged(){this.notifyChange("updating")}async createRenderable(e){if(this.destroyed||this.destroying)throw new Error("IntegratedMesh3DTilesLayerView3D: createRenderable called after destroy");const{meshData:t}=e;if(!ba(t))throw new Error("meshData not valid");const i=t.desc.prims[0],a=i.vertexCount;if(a===0)return Qa().warnOnce("encountered tile with zero Gaussians"),()=>({memUsageBytes:0,numGaussians:0});const s=i.atrbs[0].view,n=i.atrbs[0].view.byteCount,o=i.atrbs[0].view.byteOffset;let u=null;if(s.type!=="U32")throw new Error("unexpected meshData.data format");u=new Uint32Array(t.data.buffer,o,n/4);const c=this.extractHeader(u),d=2.048,l=c.tileOrigin.x*d,g=c.tileOrigin.y*d,p=c.tileOrigin.z*d,f=t.desc;if(f.obb==null)throw new Error("meshData.desc.obb undefined");const w=f.obb.quaternion,b=new oa(f.obb.center,f.obb.halfSize,la(...w)),v=this.view.state.isGlobal,E=v?ca(this.view.spatialReference).radius:0,S={handle:e.handle,bufferView:u,totalGaussians:a,packedHeader:c.packedHeader,tileOrigin:{x:l,y:g,z:p},invPosScale:c.invPosScale,obb:b,origin:{x:b.centerX,y:b.centerY,z:b.centerZ},isGlobal:v,ellipsoidRadius:E},M=await this._frameTask.scheduleGenerator(F=>this._createRenderableTask(S,F),this._createRenderableAbortController.signal);return()=>M}*_createRenderableTask(e,t){const{handle:i,bufferView:a,totalGaussians:s,packedHeader:n,tileOrigin:o,invPosScale:u,obb:c,origin:d,isGlobal:l,ellipsoidRadius:g}=e,p=o.x,f=o.y,w=o.z,b=d.x,v=d.y,E=d.z,S=new Uint32Array(s),M=new Float32Array(3*s),F=new Uint32Array(s),R=new Uint32Array(s),I=new Array,L=Math.ceil(s/Ge);for(let C=0;C<L;C++){let D=this.data.textureAtlas.requestPage();if(D===null&&(this._freeInvisibleTiles(),D=this.data.textureAtlas.requestPage()),D===null)throw new Error("ran out of gaussian splat memory");I.push(D);const j=s-C*Ge,y=Math.min(j,Ge),x=C*Ge,N=ye*D;for(let te=0;te<y;te++)S[x+te]=N+te;const U=C*Ut;this._pageBuffer.set(a.subarray(U,U+y*Ue)),this._pageBuffer.set(n,Ut);const B=D*ye,X=B%se,Y=Math.floor(B/se);this.data.textureAtlas.update(X,Y,this._pageBuffer),t.madeProgress()&&(t=yield)}let q=1/0,z=-1/0,O=1/0,A=-1/0,P=0,ee=-1,W=0;for(let C=0;C<s;C++){const D=C*Ue,j=a[D],y=a[D+1],x=a[D+2],N=a[D+3],U=16383&y,B=y>>>14&16383,X=y>>>28&15|(1023&x)<<4,Y=Ka[N>>>24],te=(x>>>10&255)+Y,Pe=(x>>>18&255)+Y,ce=(x>>>26&63|(3&N)<<6)+Y,ue=te>0?te:0,ne=Pe>0?Pe:0,Z=ce>0?ce:0,K=ue|ne<<8|Z<<16,Q=Math.max(ue,ne,Z),re=U*u+p,J=B*u+f,V=X*u+w;if(M[P]=re-b,M[P+1]=J-v,M[P+2]=V-E,l){const ie=re*re+J*J+V*V;O=Math.min(O,ie),A=Math.max(A,ie)}else q=Math.min(q,V),z=Math.max(z,V);F[C]=j,R[C]=K,Q>ee&&(ee=Q),P+=3,W++,W===yt.createRenderableBatchSize&&(W=0,t.madeProgress()&&(t=yield))}W>0&&t.madeProgress(),l&&(q=Math.sqrt(O)-g,z=Math.sqrt(A)-g);const H=this._extractGaussianSplatMbsRadiusSquared(ee),{fullExtent:G}=this.layer;G!=null&&G.hasZ&&G.zmax&&G.zmin&&(q=Math.max(q,G.zmin),z=Math.min(z,G.zmax));const h=new gt(q,z),m=new ka(i,c,S,I,M,F,R,s,H,h);return this._memCache.put(`${m.handle}`,m),this._tileHandles.set(i,m),this._cacheTileMemory+=m.usedMemory,{memUsageBytes:m.usedMemory,numGaussians:s}}_extractGaussianSplatMbsRadiusSquared(e){return Math.exp(e/8-20)*Ja}freeRenderable(e){var s;this._tileFadeInsAwaitingInitialSort.delete(e),this._tileFadeOutsAwaitingInitialSort.delete(e);const t=(s=this.data)==null?void 0:s.textureAtlas;let i=!1;const a=this._tileHandles.get(e);a&&(a.lifecycleState!==0?(i=!0,this.fadeHelper.onTileDiscarded(a),this._usedTileMemory-=a.usedMemory,this._intersectionHandler.removeTile(a)):this._cacheTileMemory-=a.usedMemory,t&&a.pageIds.forEach(n=>t.freePage(n)),this.freeObject(a),this._tileHandles.delete(e)),i&&this.updateGaussians()}freeObject(e){this._memCache.pop(`${e.handle}`)}notifyTileObbsChanged(e){this._elevationProvider&&this._elevationProvider.notifyObjectsChangedFunctional(t=>{for(const i of e)t(i.obb)})}setRenderableVisibility(e,t,i){const a=this._currentLyr3dVisibilityChange+1,s=this.fadeHelper.updateFadeDuration();this._fadeDurationPerVisibilityChange.set(a,s);let n=!1;for(let o=0;o<i;o++){const u=this._tileHandles.get(e[o]);if(!u)continue;const c=t[o]?this._prepareTileFadeIn(u,a,s):this._prepareTileFadeOut(u,a);n||(n=c)}n?(this._currentLyr3dVisibilityChange=a,this.updateGaussians()):this._fadeDurationPerVisibilityChange.delete(a)}_prepareTileFadeIn(e,t,i){const a=this._tileFadeOutsAwaitingInitialSort.delete(e.handle);return e.lifecycleState===2?(this.fadeHelper.fadeTile(e,0,i),!1):this._tileFadeInsAwaitingInitialSort.get(e.handle)!==t?(e.lifecycleState===0&&this._popTileFromCache(e),e.lifecycleState=1,this._tileFadeInsAwaitingInitialSort.set(e.handle,t),!0):a}_prepareTileFadeOut(e,t){const i=this._tileFadeInsAwaitingInitialSort.delete(e.handle);return i&&e.lifecycleState===1&&(this.moveTileToCache(e),e.lifecycleState=0),e.lifecycleState!==2?i:this._tileFadeOutsAwaitingInitialSort.get(e.handle)!==t?(this._tileFadeOutsAwaitingInitialSort.set(e.handle,t),!0):i}_onSortComplete(e,t){const i=this._tmpTilesWithChangedVisibility;i.length=0;const a=this._tmpSortedTileHandles;a.clear();for(let n=0;n<e.length;n++){const o=e[n];a.add(o.handle)}this._triggerFadeIns(t,a,i);const s=this._triggerFadeOuts(t,i);a.clear(),i.length>0&&this.notifyTileObbsChanged(i),s&&this.updateGaussians(),this._cleanupVisibilityChangeFadeDurations(t)}_triggerFadeIns(e,t,i){for(const[a,s]of this._tileFadeInsAwaitingInitialSort){if(s>e||!t.has(a))continue;const n=this._tileHandles.get(a);if(!n){this._tileFadeInsAwaitingInitialSort.delete(a);continue}const o=this._getFadeDurationForPendingVisibilityChange(s),u=n.lifecycleState===0;n.lifecycleState!==2&&(n.lifecycleState=2,u&&this._popTileFromCache(n),i.push(n)),this.fadeHelper.fadeTile(n,0,o),this._tileFadeInsAwaitingInitialSort.delete(a)}}_triggerFadeOuts(e,t){let i=!1;for(const[a,s]of this._tileFadeOutsAwaitingInitialSort){if(s>e)continue;const n=this._tileHandles.get(a);if(n){const o=n.lifecycleState===2,u=this._getFadeDurationForPendingVisibilityChange(s);this.fadeHelper.fadeTile(n,1,u),o&&n.lifecycleState===0&&(t.push(n),i=!0)}this._tileFadeOutsAwaitingInitialSort.delete(a)}return i}_getFadeDurationForPendingVisibilityChange(e){return this._fadeDurationPerVisibilityChange.get(e)??this.fadeHelper.baseFadeDuration}_cleanupVisibilityChangeFadeDurations(e){if(this._fadeDurationPerVisibilityChange.size!==0)for(const t of this._fadeDurationPerVisibilityChange.keys())t<=e&&this._fadeDurationPerVisibilityChange.delete(t)}_popTileFromCache(e){this._usedTileMemory+=e.usedMemory,this._cacheTileMemory-=e.usedMemory,this._intersectionHandler.addTile(e),this._memCache.pop(Wt(e.handle))}moveTileToCache(e){this._usedTileMemory-=e.usedMemory,this._cacheTileMemory+=e.usedMemory,this._intersectionHandler.removeTile(e),this._memCache.put(Wt(e.handle),e)}destroy(){this._initializationController=si(this._initializationController),this._createRenderableAbortController.abort(),ua(this),this._suspendedHandle&&(this._suspendedHandle=da(this._suspendedHandle)),this._intersectionHandler&&(this.view.sceneIntersectionHelper.removeIntersectionHandler(this._intersectionHandler),this._intersectionHandler=null),this._elevationProvider&&this.view.elevationProvider&&(this._elevationProvider.notifyObjectsChangedFunctional(e=>{for(const t of this._tileHandles.values())e(t.obb)}),this.view.elevationProvider.unregister(this._elevationProvider),this._elevationProvider=null),this._frameTask.remove(),this._shadowRenderNode=ht(this._shadowRenderNode),this._renderNode=ht(this._renderNode),this._memCache.destroy(),this.data=ht(this.data)}_canProjectWithoutEngine(){if(this.view.state.viewingMode===1||ha(this.view.renderSpatialReference)||pa(this.view.renderSpatialReference))return!0;if(this.layer.esriCrsSpatialReference&&fa(this.layer.esriCrsSpatialReference,this.view.renderSpatialReference)){if(this.layer.esriCrsSpatialReference.vcsWkid===115700)return!1;let e=Sa(this.layer.esriCrsSpatialReference);if(!e){const i=this.layer.esriCrsSpatialReference;let a="meters";!ma(i)&&i.wkid&&i.wkid!==-1&&(a=ga(jt.units[jt[i.wkid]])),a&&(e=new va({heightModel:"gravity-related-height",heightUnit:a}))}const t=this.view.heightModelInfo;return this._useEsriCrs=_a(e,t,!1)===0,this._useEsriCrs&&(e&&(this._metersPerVCSUnit=xa(1,e.heightUnit,"meters")),this.fullExtentInLocalViewSpatialReference=this.layer.esriCrsFullExtent),this._useEsriCrs}return!1}_elevationInfoChanged(e){var t,i,a;if(e!=null&&e.offset)if(this._useEsriCrs){const s=ya(e==null?void 0:e.unit)/this._metersPerVCSUnit,n=(e==null?void 0:e.offset)??0;(t=this._wasm)==null||t.setLayerOffset(this,n*s)}else(i=this._wasm)==null||i.setLayerOffset(this,Ht(e));else(a=this._wasm)==null||a.setLayerOffset(this,0)}_slicePlaneEnabledChanged(e){this._renderNode&&(this._renderNode.slicePlaneEnabled=e),this._intersectionHandler&&(this._intersectionHandler.slicePlaneEnabled=e)}updateGaussians(){const e=new Array;for(const t of this._tileHandles.values())t.lifecycleState!==0&&e.push(t);this.data.updateGaussianVisibility(e,this._currentLyr3dVisibilityChange),this.notifyChange("updating")}setMaximumGaussianCount(e){var t;(t=this._wasm)==null||t.setMaximumGaussianSplatCount(e)}_freeInvisibleTiles(){for(const e of this._tileHandles.values())e.lifecycleState===0&&this._deleteTile(e)}extractHeader(e){const t=e.length-4,i=this.reinterpretU32AsFloat(e[t]),a=this.reinterpretU32AsFloat(e[t+1]),s=this.reinterpretU32AsFloat(e[t+2]),n=1/(1<<(255&e[t+3]));return{packedHeader:e.subarray(t,t+4),tileOrigin:{x:i,y:a,z:s},invPosScale:n}}_deleteTile(e){var t;(t=this._wasm)==null||t.onRenderableEvicted(this,e.handle,e.usedMemory),this.freeRenderable(e.handle)}reinterpretU32AsFloat(e){return this._u32View[0]=e,this._f32View[0]}get performanceInfo(){var o,u,c,d;let e=0,t=0;this._tileHandles.forEach(l=>{l.lifecycleState===0?t++:e++});const i=((o=this.data)==null?void 0:o.textureAtlasMemory)??0,a=((u=this.data)==null?void 0:u.orderTextureMemory)??0,s=((c=this.data)==null?void 0:c.fadingTextureMemory)??0,n=((d=this.data)==null?void 0:d.sortBufferMemory)??0;return new Ra(this.usedMemory,e,this._usedTileMemory,t,this._cacheTileMemory,i,a,s,n)}get test(){}},yt=Se,Se.createRenderableBatchSize=64,Se);T([fe()],ve.prototype,"layer",void 0),T([fe({readOnly:!0})],ve.prototype,"_clippingBox",null),T([fe()],ve.prototype,"elevationOffset",null),T([fe({readOnly:!0})],ve.prototype,"visibleAtCurrentScale",null),T([fe()],ve.prototype,"fullExtentInLocalViewSpatialReference",void 0),ve=yt=T([Ce("esri.views.3d.layers.GaussianSplatLayerView3D")],ve);const Ts=ve,es=Object.freeze(Object.defineProperty({__proto__:null,GaussianSplatCompositionPassParameters:Ft,build:yi},Symbol.toStringTag,{value:"Module"})),ts=Object.freeze(Object.defineProperty({__proto__:null,GaussianSplatDepthCompositionPassParameters:It,build:bi},Symbol.toStringTag,{value:"Module"})),is=Object.freeze(Object.defineProperty({__proto__:null,GaussianSplatPassParameters:Gt,build:xi},Symbol.toStringTag,{value:"Module"})),as=Object.freeze(Object.defineProperty({__proto__:null,GaussianSplatShadowPassParameters:zt,build:Si},Symbol.toStringTag,{value:"Module"}));export{Ts as default};
