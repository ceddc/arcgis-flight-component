import{Fz as be,Fv as we,FW as De,wi as f,ws as w,FE as Ve,E0 as W,wj as r,eG as z,wk as ee,Fy as xe,wq as L,dy as te,dw as A,gJ as B,FX as Ee,hb as ie,wh as ne,El as S,eR as _,dv as v,FY as se,wu as ae,bt as o,m8 as re,gI as ye,qV as Le,dz as Se,dG as le,gF as oe,gG as Ce,Fw as Me,vR as Ae,Ej as $e,EX as Re,wt as H,bF as Te,qo as ce,qq as he,aC as de,eT as Oe,bw as G,pd as U,a$ as h,b1 as j,ib as pe,eU as ue,cS as qe,dx as q,nd as Ie,Ew as Ue,Ex as ze,FZ as je,wB as V,ng as Fe,nh as k,F_ as Ne,s1 as We,F$ as $,G0 as Be,FF as X,qR as He,tQ as Ge,qS as ke,qT as Xe,qU as Qe,qW as Ze,b0 as C,G1 as Je,by as Q}from"./arcgis-scene-C3i20sGt.js";import{t as Ye}from"./VisualElement-BJgzGwpW.js";function fe(t,e){const n=t.fragment;n.include(be),t.include(we),n.include(De),n.uniforms.add(new f("globalAlpha",i=>i.globalAlpha),new w("glowColor",i=>i.glowColor),new f("glowWidth",(i,s)=>i.glowWidth*s.camera.pixelRatio),new f("glowFalloff",i=>i.glowFalloff),new w("innerColor",i=>i.innerColor),new f("innerWidth",(i,s)=>i.innerWidth*s.camera.pixelRatio),new Ve("depthMap",i=>{var s;return(s=i.depth)==null?void 0:s.attachment}),new W("normalMap",i=>i.normals)),n.code.add(r`vec4 premultipliedColor(vec3 rgb, float alpha) {
return vec4(rgb * alpha, alpha);
}`),n.code.add(r`vec4 laserlineProfile(float dist) {
if (dist > glowWidth) {
return vec4(0.0);
}
float innerAlpha = (1.0 - smoothstep(0.0, innerWidth, dist));
float glowAlpha = pow(max(0.0, 1.0 - dist / glowWidth), glowFalloff);
return blendColorsPremultiplied(
premultipliedColor(innerColor, innerAlpha),
premultipliedColor(glowColor, glowAlpha)
);
}`),n.code.add(r`bool laserlineReconstructFromDepth(out vec3 pos, out vec3 normal, out float angleCutoffAdjust, out float depthDiscontinuityAlpha) {
float depth = depthFromTexture(depthMap, uv);
if (depth == 1.0) {
return false;
}
float linearDepth = linearizeDepth(depth);
pos = reconstructPosition(gl_FragCoord.xy, linearDepth);
float minStep = 6e-8;
float depthStep = clamp(depth + minStep, 0.0, 1.0);
float linearDepthStep = linearizeDepth(depthStep);
float depthError = abs(linearDepthStep - linearDepth);
vec3 normalReconstructed = normalize(cross(dFdx(pos), dFdy(pos)));
vec3 normalFromTexture = normalize(texture(normalMap, uv).xyz * 2.0 - 1.0);
float blendFactor = smoothstep(0.15, 0.2, depthError);
normal = normalize(mix(normalReconstructed, normalFromTexture, blendFactor));
angleCutoffAdjust = mix(0.0, 0.004, blendFactor);
float ddepth = fwidth(linearDepth);
depthDiscontinuityAlpha = 1.0 - smoothstep(0.0, 0.01, -ddepth / linearDepth);
return true;
}`),e.contrastControlEnabled?n.uniforms.add(new W("frameColor",(i,s)=>i.colors),new f("globalAlphaContrastBoost",i=>i.globalAlphaContrastBoost)).code.add(r`float rgbToLuminance(vec3 color) {
return dot(vec3(0.2126, 0.7152, 0.0722), color);
}
vec4 laserlineOutput(vec4 color) {
float backgroundLuminance = rgbToLuminance(texture(frameColor, uv).rgb);
float alpha = clamp(globalAlpha * max(backgroundLuminance * globalAlphaContrastBoost, 1.0), 0.0, 1.0);
return color * alpha;
}`):n.code.add(r`vec4 laserlineOutput(vec4 color) {
return color * globalAlpha;
}`)}const F=z(6);function ge(t){const e=new ee;e.include(xe),e.include(fe,t);const n=e.fragment;if(t.lineVerticalPlaneEnabled||t.heightManifoldEnabled)if(n.uniforms.add(new f("maxPixelDistance",(i,s)=>t.heightManifoldEnabled?2*s.camera.computeScreenPixelSizeAt(i.heightManifoldTarget):2*s.camera.computeScreenPixelSizeAt(i.lineVerticalPlaneSegment.origin))),n.code.add(r`float planeDistancePixels(vec4 plane, vec3 pos) {
float dist = dot(plane.xyz, pos) + plane.w;
float width = fwidth(dist);
dist /= min(width, maxPixelDistance);
return abs(dist);
}`),t.spherical){const i=(a,l,c)=>_(a,l.heightManifoldTarget,c.camera.viewMatrix),s=(a,l)=>_(a,[0,0,0],l.camera.viewMatrix);n.uniforms.add(new L("heightManifoldOrigin",(a,l)=>(i(u,a,l),s(D,l),te(D,D,u),A(p,D),p[3]=B(D),p)),new Ee("globalOrigin",a=>s(u,a)),new f("cosSphericalAngleThreshold",(a,l)=>1-Math.max(2,ie(l.camera.eye,a.heightManifoldTarget)*l.camera.perRenderPixelRatio)/B(a.heightManifoldTarget))),n.code.add(r`float globeDistancePixels(float posInGlobalOriginLength) {
float dist = abs(posInGlobalOriginLength - heightManifoldOrigin.w);
float width = fwidth(dist);
dist /= min(width, maxPixelDistance);
return abs(dist);
}
float heightManifoldDistancePixels(vec4 heightPlane, vec3 pos) {
vec3 posInGlobalOriginNorm = normalize(globalOrigin - pos);
float cosAngle = dot(posInGlobalOriginNorm, heightManifoldOrigin.xyz);
vec3 posInGlobalOrigin = globalOrigin - pos;
float posInGlobalOriginLength = length(posInGlobalOrigin);
float sphericalDistance = globeDistancePixels(posInGlobalOriginLength);
float planarDistance = planeDistancePixels(heightPlane, pos);
return cosAngle < cosSphericalAngleThreshold ? sphericalDistance : planarDistance;
}`)}else n.code.add(r`float heightManifoldDistancePixels(vec4 heightPlane, vec3 pos) {
return planeDistancePixels(heightPlane, pos);
}`);if(t.pointDistanceEnabled&&(n.uniforms.add(new f("maxPixelDistance",(i,s)=>2*s.camera.computeScreenPixelSizeAt(i.pointDistanceTarget))),n.code.add(r`float sphereDistancePixels(vec4 sphere, vec3 pos) {
float dist = distance(sphere.xyz, pos) - sphere.w;
float width = fwidth(dist);
dist /= min(width, maxPixelDistance);
return abs(dist);
}`)),t.intersectsLineEnabled&&n.uniforms.add(new ne("perScreenPixelRatio",i=>i.camera.perScreenPixelRatio)).code.add(r`float lineDistancePixels(vec3 start, vec3 dir, float radius, vec3 pos) {
float dist = length(cross(dir, pos - start)) / (length(pos) * perScreenPixelRatio);
return abs(dist) - radius;
}`),(t.lineVerticalPlaneEnabled||t.intersectsLineEnabled)&&n.code.add(r`bool pointIsWithinLine(vec3 pos, vec3 start, vec3 end) {
vec3 dir = end - start;
float t2 = dot(dir, pos - start);
float l2 = dot(dir, dir);
return t2 >= 0.0 && t2 <= l2;
}`),n.main.add(r`vec3 pos;
vec3 normal;
float angleCutoffAdjust;
float depthDiscontinuityAlpha;
if (!laserlineReconstructFromDepth(pos, normal, angleCutoffAdjust, depthDiscontinuityAlpha)) {
fragColor = vec4(0.0);
return;
}
vec4 color = vec4(0.0);`),t.heightManifoldEnabled){n.uniforms.add(new S("angleCutoff",s=>M(s)),new L("heightPlane",(s,a)=>me(s.heightManifoldTarget,s.renderCoordsHelper.worldUpAtPosition(s.heightManifoldTarget,u),a.camera.viewMatrix)));const i=t.spherical?r`normalize(globalOrigin - pos)`:r`heightPlane.xyz`;n.main.add(r`
      vec2 angleCutoffAdjusted = angleCutoff - angleCutoffAdjust;
      // Fade out laserlines on flat surfaces
      float heightManifoldAlpha = 1.0 - smoothstep(angleCutoffAdjusted.x, angleCutoffAdjusted.y, abs(dot(normal, ${i})));
      vec4 heightManifoldColor = laserlineProfile(heightManifoldDistancePixels(heightPlane, pos));
      color = max(color, heightManifoldColor * heightManifoldAlpha);`)}return t.pointDistanceEnabled&&(n.uniforms.add(new S("angleCutoff",i=>M(i)),new L("pointDistanceSphere",(i,s)=>Ke(i,s))),n.main.add(r`float pointDistanceSphereDistance = sphereDistancePixels(pointDistanceSphere, pos);
vec4 pointDistanceSphereColor = laserlineProfile(pointDistanceSphereDistance);
float pointDistanceSphereAlpha = 1.0 - smoothstep(angleCutoff.x, angleCutoff.y, abs(dot(normal, normalize(pos - pointDistanceSphere.xyz))));
color = max(color, pointDistanceSphereColor * pointDistanceSphereAlpha);`)),t.lineVerticalPlaneEnabled&&(n.uniforms.add(new S("angleCutoff",i=>M(i)),new L("lineVerticalPlane",(i,s)=>et(i,s)),new w("lineVerticalStart",(i,s)=>tt(i,s)),new w("lineVerticalEnd",(i,s)=>it(i,s))),n.main.add(r`if (pointIsWithinLine(pos, lineVerticalStart, lineVerticalEnd)) {
float lineVerticalDistance = planeDistancePixels(lineVerticalPlane, pos);
vec4 lineVerticalColor = laserlineProfile(lineVerticalDistance);
float lineVerticalAlpha = 1.0 - smoothstep(angleCutoff.x, angleCutoff.y, abs(dot(normal, lineVerticalPlane.xyz)));
color = max(color, lineVerticalColor * lineVerticalAlpha);
}`)),t.intersectsLineEnabled&&(n.uniforms.add(new S("angleCutoff",i=>M(i)),new w("intersectsLineStart",(i,s)=>_(u,i.lineStartWorld,s.camera.viewMatrix)),new w("intersectsLineEnd",(i,s)=>_(u,i.lineEndWorld,s.camera.viewMatrix)),new w("intersectsLineDirection",(i,s)=>(v(p,i.intersectsLineSegment.vector),p[3]=0,A(u,se(p,p,s.camera.viewMatrix)))),new f("intersectsLineRadius",i=>i.intersectsLineRadius)),n.main.add(r`if (pointIsWithinLine(pos, intersectsLineStart, intersectsLineEnd)) {
float intersectsLineDistance = lineDistancePixels(intersectsLineStart, intersectsLineDirection, intersectsLineRadius, pos);
vec4 intersectsLineColor = laserlineProfile(intersectsLineDistance);
float intersectsLineAlpha = 1.0 - smoothstep(angleCutoff.x, angleCutoff.y, 1.0 - abs(dot(normal, intersectsLineDirection)));
color = max(color, intersectsLineColor * intersectsLineAlpha);
}`)),n.main.add(r`fragColor = laserlineOutput(color * depthDiscontinuityAlpha);`),e}function M(t){return re(nt,Math.cos(t.angleCutoff),Math.cos(Math.max(0,t.angleCutoff-z(2))))}function Ke(t,e){return _(I,t.pointDistanceOrigin,e.camera.viewMatrix),I[3]=ie(t.pointDistanceOrigin,t.pointDistanceTarget),I}function et(t,e){const n=Le(t.lineVerticalPlaneSegment,.5,u),i=t.renderCoordsHelper.worldUpAtPosition(n,st),s=A(D,t.lineVerticalPlaneSegment.vector),a=Se(u,i,s);return A(a,a),me(t.lineVerticalPlaneSegment.origin,a,e.camera.viewMatrix)}function tt(t,e){const n=v(u,t.lineVerticalPlaneSegment.origin);return t.renderCoordsHelper.setAltitude(n,0),_(n,n,e.camera.viewMatrix)}function it(t,e){const n=le(u,t.lineVerticalPlaneSegment.origin,t.lineVerticalPlaneSegment.vector);return t.renderCoordsHelper.setAltitude(n,0),_(n,n,e.camera.viewMatrix)}function me(t,e,n){return _(Z,t,n),v(p,e),p[3]=0,se(p,p,n),ye(Z,p,at)}const nt=oe(),u=o(),p=ae(),st=o(),D=o(),Z=o(),at=Ce(),I=ae(),rt=Object.freeze(Object.defineProperty({__proto__:null,build:ge,defaultAngleCutoff:F},Symbol.toStringTag,{value:"Module"}));function _e(t){const e=new ee;e.include(fe,t);const{vertex:n,fragment:i}=e;n.uniforms.add(new Me("modelView",(a,{camera:l})=>Ae(ot,l.viewMatrix,a.origin)),new $e("proj",({camera:a})=>a.projectionMatrix),new f("glowWidth",(a,{camera:l})=>a.glowWidth*l.pixelRatio),new Re("pixelToNDC",({camera:a})=>re(lt,2/a.fullViewport[2],2/a.fullViewport[3]))),e.attributes.add("start","vec3"),e.attributes.add("end","vec3"),t.spherical&&(e.attributes.add("startUp","vec3"),e.attributes.add("endUp","vec3")),e.attributes.add("extrude","vec2"),e.varyings.add("uv","vec2"),e.varyings.add("vViewStart","vec3"),e.varyings.add("vViewEnd","vec3"),e.varyings.add("vViewSegmentNormal","vec3"),e.varyings.add("vViewStartNormal","vec3"),e.varyings.add("vViewEndNormal","vec3");const s=!t.spherical;return n.main.add(r`
    vec3 pos = mix(start, end, extrude.x);

    vec4 viewPos = modelView * vec4(pos, 1);
    vec4 projPos = proj * viewPos;
    vec2 ndcPos = projPos.xy / projPos.w;

    // in planar we hardcode the up vectors to be Z-up */
    ${H(s,r`vec3 startUp = vec3(0, 0, 1);`)}
    ${H(s,r`vec3 endUp = vec3(0, 0, 1);`)}

    // up vector corresponding to the location of the vertex, selecting either startUp or endUp */
    vec3 up = extrude.y * mix(startUp, endUp, extrude.x);
    vec3 viewUp = (modelView * vec4(up, 0)).xyz;

    vec4 projPosUp = proj * vec4(viewPos.xyz + viewUp, 1);
    vec2 projUp = normalize(projPosUp.xy / projPosUp.w - ndcPos);

    // extrude ndcPos along projUp to the edge of the screen
    vec2 lxy = abs(sign(projUp) - ndcPos);
    ndcPos += length(lxy) * projUp;

    vViewStart = (modelView * vec4(start, 1)).xyz;
    vViewEnd = (modelView * vec4(end, 1)).xyz;

    vec3 viewStartEndDir = vViewEnd - vViewStart;

    vec3 viewStartUp = (modelView * vec4(startUp, 0)).xyz;

    // the normal of the plane that aligns with the segment and the up vector
    vViewSegmentNormal = normalize(cross(viewStartUp, viewStartEndDir));

    // the normal orthogonal to the segment normal and the start up vector
    vViewStartNormal = -normalize(cross(vViewSegmentNormal, viewStartUp));

    // the normal orthogonal to the segment normal and the end up vector
    vec3 viewEndUp = (modelView * vec4(endUp, 0)).xyz;
    vViewEndNormal = normalize(cross(vViewSegmentNormal, viewEndUp));

    // Add enough padding in the X screen space direction for "glow"
    float xPaddingPixels = sign(dot(vViewSegmentNormal, viewPos.xyz)) * (extrude.x * 2.0 - 1.0) * glowWidth;
    ndcPos.x += xPaddingPixels * pixelToNDC.x;

    // uv is used to read back depth to reconstruct the position at the fragment
    uv = ndcPos * 0.5 + 0.5;

    gl_Position = vec4(ndcPos, 0, 1);
  `),i.uniforms.add(new ne("perScreenPixelRatio",a=>a.camera.perScreenPixelRatio)),i.code.add(r`float planeDistance(vec3 planeNormal, vec3 planeOrigin, vec3 pos) {
return dot(planeNormal, pos - planeOrigin);
}
float segmentDistancePixels(vec3 segmentNormal, vec3 startNormal, vec3 endNormal, vec3 pos, vec3 start, vec3 end) {
float distSegmentPlane = planeDistance(segmentNormal, start, pos);
float distStartPlane = planeDistance(startNormal, start, pos);
float distEndPlane = planeDistance(endNormal, end, pos);
float dist = max(max(distStartPlane, distEndPlane), abs(distSegmentPlane));
float width = fwidth(distSegmentPlane);
float maxPixelDistance = length(pos) * perScreenPixelRatio * 2.0;
float pixelDist = dist / min(width, maxPixelDistance);
return abs(pixelDist);
}`),i.main.add(r`fragColor = vec4(0.0);
vec3 dEndStart = vViewEnd - vViewStart;
if (dot(dEndStart, dEndStart) < 1e-5) {
return;
}
vec3 pos;
vec3 normal;
float angleCutoffAdjust;
float depthDiscontinuityAlpha;
if (!laserlineReconstructFromDepth(pos, normal, angleCutoffAdjust, depthDiscontinuityAlpha)) {
return;
}
float distance = segmentDistancePixels(
vViewSegmentNormal,
vViewStartNormal,
vViewEndNormal,
pos,
vViewStart,
vViewEnd
);
vec4 color = laserlineProfile(distance);
float alpha = (1.0 - smoothstep(0.995 - angleCutoffAdjust, 0.999 - angleCutoffAdjust, abs(dot(normal, vViewSegmentNormal))));
fragColor = laserlineOutput(color * alpha * depthDiscontinuityAlpha);`),e}const lt=oe(),ot=Te(),ct=Object.freeze(Object.defineProperty({__proto__:null,build:_e},Symbol.toStringTag,{value:"Module"}));let ht=class extends Oe{constructor(){super(...arguments),this.innerColor=G(1,1,1),this.innerWidth=1,this.glowColor=G(1,.5,0),this.glowWidth=8,this.glowFalloff=8,this.globalAlpha=.75,this.globalAlphaContrastBoost=2,this.angleCutoff=z(6),this.pointDistanceOrigin=o(),this.pointDistanceTarget=o(),this.lineVerticalPlaneSegment=U(),this.intersectsLineSegment=U(),this.intersectsLineRadius=3,this.heightManifoldTarget=o(),this.lineStartWorld=o(),this.lineEndWorld=o()}},R=class extends ce{constructor(){super(...arguments),this.shader=new he(rt,()=>de(()=>Promise.resolve().then(()=>ft),void 0,import.meta.url))}};R=h([j("esri.views.3d.webgl-engine.effects.laserlines.LaserlineTechnique")],R);let dt=class extends ht{constructor(){super(...arguments),this.origin=o()}},T=class extends ce{constructor(t,e){super(t,e,pe(e.spherical?ve:Pe)),this.shader=new he(ct,()=>de(()=>Promise.resolve().then(()=>gt),void 0,import.meta.url))}};T=h([j("esri.views.3d.webgl-engine.effects.laserlines.LaserlinePathTechnique")],T);const ve=ue().vec3f("start").vec3f("end").vec2f("extrude").vec3f("startUp").vec3f("endUp"),Pe=ue().vec3f("start").vec3f("end").vec2f("extrude");class J{constructor(e){this._renderCoordsHelper=e,this._origin=o(),this._dirty=!1,this._count=0}set vertices(e){const n=qe(3*e.length);let i=0;for(const s of e)n[i++]=s[0],n[i++]=s[1],n[i++]=s[2];this.buffers=[n]}set buffers(e){if(this._buffers=e,this._buffers.length>0){const n=this._buffers[0],i=3*Math.floor(n.length/3/2);q(this._origin,n[i],n[i+1],n[i+2])}else q(this._origin,0,0,0);this._dirty=!0}get origin(){return this._origin}draw(e){const n=this._ensureVAO(e);n!=null&&(e.bindVAO(n),e.drawArrays(Ie.TRIANGLES,0,this._count))}dispose(){this._vao!=null&&this._vao.dispose()}get _layout(){return this._renderCoordsHelper.viewingMode===1?ve:Pe}_ensureVAO(e){return this._buffers==null?null:(this._vao??(this._vao=this._createVAO(e,this._buffers)),this._ensureVertexData(this._vao,this._buffers),this._vao)}_createVAO(e,n){const i=this._createDataBuffer(n);return this._dirty=!1,new Ue(e,new ze(e,pe(this._layout),i))}_ensureVertexData(e,n){var s;if(!this._dirty)return;const i=this._createDataBuffer(n);(s=e.buffer())==null||s.setData(i),this._dirty=!1}_createDataBuffer(e){const n=e.reduce((g,d)=>g+Y(d),0);this._count=n;const i=this._layout.createBuffer(n),s=this._origin;let a=0,l=0;const c="startUp"in i?this._setUpVectors.bind(this,i):void 0;for(const g of e){for(let d=0;d<g.length;d+=3){const y=q(K,g[d],g[d+1],g[d+2]);d===0?l=this._renderCoordsHelper.getAltitude(y):this._renderCoordsHelper.setAltitude(y,l);const m=a+2*d;c==null||c(d,m,g,y);const N=te(K,y,s);if(d<g.length-3){for(let P=0;P<6;P++)i.start.setVec(m+P,N);i.extrude.setValues(m,0,-1),i.extrude.setValues(m+1,1,-1),i.extrude.setValues(m+2,1,1),i.extrude.setValues(m+3,0,-1),i.extrude.setValues(m+4,1,1),i.extrude.setValues(m+5,0,1)}if(d>0)for(let P=-6;P<0;P++)i.end.setVec(m+P,N)}a+=Y(g)}return i.buffer}_setUpVectors(e,n,i,s,a){const l=this._renderCoordsHelper.worldUpAtPosition(a,pt);if(n<s.length-3)for(let c=0;c<6;c++)e.startUp.setVec(i+c,l);if(n>0)for(let c=-6;c<0;c++)e.endUp.setVec(i+c,l)}}function Y(t){return 3*(2*(t.length/3-1))}const pt=o(),K=o();class O extends je{constructor(){super(...arguments),this.contrastControlEnabled=!1,this.spherical=!1}}h([V()],O.prototype,"contrastControlEnabled",void 0),h([V()],O.prototype,"spherical",void 0);class E extends O{constructor(){super(...arguments),this.heightManifoldEnabled=!1,this.pointDistanceEnabled=!1,this.lineVerticalPlaneEnabled=!1,this.intersectsLineEnabled=!1}}h([V()],E.prototype,"heightManifoldEnabled",void 0),h([V()],E.prototype,"pointDistanceEnabled",void 0),h([V()],E.prototype,"lineVerticalPlaneEnabled",void 0),h([V()],E.prototype,"intersectsLineEnabled",void 0);let b=class extends Fe{get requireGeometryDepth(){return!0}constructor(t){super(t),this.isDecoration=!0,this.produces=k.LASERLINES,this.consumes={required:[k.LASERLINES,"normals"]},this._configuration=new E,this._pathTechniqueConfiguration=new O,this._intersectsLineInfinite=!1,this._pathVerticalPlaneEnabled=!1,this._passParameters=new dt,this._blit=new Ne(t.view.stage.renderView.techniques,2)}initialize(){this._passParameters.renderCoordsHelper=this.view.renderCoordsHelper,this._configuration.spherical=this.view.state.viewingMode===1,this._configuration.contrastControlEnabled=this.contrastControlEnabled,this._pathTechniqueConfiguration.spherical=this.view.state.viewingMode===1,this._pathTechniqueConfiguration.contrastControlEnabled=this.contrastControlEnabled}destroy(){this._pathVerticalPlaneData=We(this._pathVerticalPlaneData)}get heightManifoldEnabled(){return this._configuration.heightManifoldEnabled}set heightManifoldEnabled(t){this._configuration.heightManifoldEnabled!==t&&(this._configuration.heightManifoldEnabled=t,this.requestRender(1))}get heightManifoldTarget(){return this._passParameters.heightManifoldTarget}set heightManifoldTarget(t){v(this._passParameters.heightManifoldTarget,t),this.requestRender(1)}get pointDistanceEnabled(){return this._configuration.pointDistanceEnabled}set pointDistanceEnabled(t){t!==this._configuration.pointDistanceEnabled&&(this._configuration.pointDistanceEnabled=t,this.requestRender(1))}get pointDistanceTarget(){return this._passParameters.pointDistanceTarget}set pointDistanceTarget(t){v(this._passParameters.pointDistanceTarget,t),this.requestRender(1)}get pointDistanceOrigin(){return this._passParameters.pointDistanceOrigin}set pointDistanceOrigin(t){v(this._passParameters.pointDistanceOrigin,t),this.requestRender(1)}get lineVerticalPlaneEnabled(){return this._configuration.lineVerticalPlaneEnabled}set lineVerticalPlaneEnabled(t){t!==this._configuration.lineVerticalPlaneEnabled&&(this._configuration.lineVerticalPlaneEnabled=t,this.requestRender(1))}get lineVerticalPlaneSegment(){return this._passParameters.lineVerticalPlaneSegment}set lineVerticalPlaneSegment(t){$(t,this._passParameters.lineVerticalPlaneSegment),this.requestRender(1)}get intersectsLineEnabled(){return this._configuration.intersectsLineEnabled}set intersectsLineEnabled(t){t!==this._configuration.intersectsLineEnabled&&(this._configuration.intersectsLineEnabled=t,this.requestRender(1))}get intersectsLineSegment(){return this._passParameters.intersectsLineSegment}set intersectsLineSegment(t){$(t,this._passParameters.intersectsLineSegment),this.requestRender(1)}get intersectsLineInfinite(){return this._intersectsLineInfinite}set intersectsLineInfinite(t){t!==this._intersectsLineInfinite&&(this._intersectsLineInfinite=t,this.requestRender(1))}get pathVerticalPlaneEnabled(){return this._pathVerticalPlaneEnabled}set pathVerticalPlaneEnabled(t){t!==this._pathVerticalPlaneEnabled&&(this._pathVerticalPlaneEnabled=t,this._pathVerticalPlaneData!=null&&this.requestRender(1))}set pathVerticalPlaneVertices(t){this._pathVerticalPlaneData==null&&(this._pathVerticalPlaneData=new J(this._passParameters.renderCoordsHelper)),this._pathVerticalPlaneData.vertices=t,this.pathVerticalPlaneEnabled&&this.requestRender(1)}set pathVerticalPlaneBuffers(t){this._pathVerticalPlaneData==null&&(this._pathVerticalPlaneData=new J(this._passParameters.renderCoordsHelper)),this._pathVerticalPlaneData.buffers=t,this.pathVerticalPlaneEnabled&&this.requestRender(1)}setParameters(t){Be(this._passParameters,t)&&this.requestRender(1)}precompile(){this.techniques.precompile(R,this._configuration),this.contrastControlEnabled&&this._blit.precompile(),this.pathVerticalPlaneEnabled&&this._pathVerticalPlaneData&&this.techniques.precompile(T,this._pathTechniqueConfiguration)}render(t){const e=t.find(({name:a})=>a===this.produces);if(this.isDecoration&&!this.bindParameters.decorations)return e;const n=this.renderingContext,i=t.find(({name:a})=>a==="normals");if(this._passParameters.normals=i==null?void 0:i.getTexture(),!this.contrastControlEnabled)return n.bindFramebuffer(e.fbo),this._renderLaserLines(),e;this._passParameters.colors=e.getTexture();const s=this.fboCache.acquire(e.fbo.width,e.fbo.height,"laser lines");return n.bindFramebuffer(s.fbo),n.setClearColor(0,0,0,0),n.clear(16640),this._renderLaserLines(),n.unbindTexture(e.getTexture()),this._blit.blend(s,e,this.bindParameters)||this.requestRender(1),s.release(),e}_renderLaserLines(){(this.heightManifoldEnabled||this.pointDistanceEnabled||this.lineVerticalPlaneSegment||this.intersectsLineEnabled)&&this._renderUnified(),this.pathVerticalPlaneEnabled&&this._renderPath()}_renderUnified(){if(!this._updatePassParameters())return;const t=this.techniques.getCompiled(R,this._configuration);if(t){const e=this.renderingContext;e.setDrawBuffers([X]),e.bindTechnique(t,this.bindParameters,this._passParameters),e.screen.draw()}else this.requestRender(1)}_renderPath(){if(this._pathVerticalPlaneData==null)return;const t=this.techniques.get(T,this._pathTechniqueConfiguration);if(t.compiled){const e=this.renderingContext;this._passParameters.origin=this._pathVerticalPlaneData.origin,e.setDrawBuffers([X]),e.bindTechnique(t,this.bindParameters,this._passParameters),this._pathVerticalPlaneData.draw(e)}else this.requestRender(1)}_updatePassParameters(){if(!this.intersectsLineEnabled)return!0;const t=this.bindParameters.camera,e=this._passParameters;if(this._intersectsLineInfinite){if(He(Ge(e.intersectsLineSegment.origin,e.intersectsLineSegment.vector),x),x.c0=-Number.MAX_VALUE,!ke(t.frustum,x))return!1;Xe(x,e.lineStartWorld),Qe(x,e.lineEndWorld)}else v(e.lineStartWorld,e.intersectsLineSegment.origin),le(e.lineEndWorld,e.intersectsLineSegment.origin,e.intersectsLineSegment.vector);return!0}get test(){}};h([C({constructOnly:!0})],b.prototype,"contrastControlEnabled",void 0),h([C()],b.prototype,"isDecoration",void 0),h([C()],b.prototype,"produces",void 0),h([C()],b.prototype,"consumes",void 0),b=h([j("esri.views.3d.webgl-engine.effects.laserlines.LaserLineRenderer")],b);const x=Ze();class wt extends Ye{constructor(e){super(e),this._angleCutoff=F,this._style={},this._heightManifoldTarget=o(),this._heightManifoldEnabled=!1,this._intersectsLine=U(),this._intersectsLineEnabled=!1,this._intersectsLineInfinite=!1,this._lineVerticalPlaneSegment=null,this._pathVerticalPlaneBuffers=null,this._pointDistanceLine=null,this.applyProperties(e)}get testData(){}createResources(){this._ensureRenderer()}destroyResources(){this._disposeRenderer()}updateVisibility(){this._syncRenderer(),this._syncHeightManifold(),this._syncIntersectsLine(),this._syncPathVerticalPlane(),this._syncLineVerticalPlane(),this._syncPointDistance()}get angleCutoff(){return this._angleCutoff}set angleCutoff(e){this._angleCutoff!==e&&(this._angleCutoff=e,this._syncAngleCutoff())}get style(){return this._style}set style(e){this._style=e,this._syncStyle()}get heightManifoldTarget(){return this._heightManifoldEnabled?this._heightManifoldTarget:null}set heightManifoldTarget(e){e!=null?(v(this._heightManifoldTarget,e),this._heightManifoldEnabled=!0):this._heightManifoldEnabled=!1,this._syncRenderer(),this._syncHeightManifold()}set intersectsWorldUpAtLocation(e){if(e==null)return void(this.intersectsLine=null);const n=this.view.renderCoordsHelper.worldUpAtPosition(e,ut);this.intersectsLine=Je(e,n),this.intersectsLineInfinite=!0}get intersectsLine(){return this._intersectsLineEnabled?this._intersectsLine:null}set intersectsLine(e){e!=null?($(e,this._intersectsLine),this._intersectsLineEnabled=!0):this._intersectsLineEnabled=!1,this._syncIntersectsLine(),this._syncRenderer()}get intersectsLineInfinite(){return this._intersectsLineInfinite}set intersectsLineInfinite(e){this._intersectsLineInfinite=e,this._syncIntersectsLineInfinite()}get lineVerticalPlaneSegment(){return this._lineVerticalPlaneSegment}set lineVerticalPlaneSegment(e){this._lineVerticalPlaneSegment=e!=null?$(e):null,this._syncLineVerticalPlane(),this._syncRenderer()}get pathVerticalPlane(){return this._pathVerticalPlaneBuffers}set pathVerticalPlane(e){this._pathVerticalPlaneBuffers=e,this._syncPathVerticalPlane(),this._syncLineVerticalPlane(),this._syncPointDistance(),this._syncRenderer()}get pointDistanceLine(){return this._pointDistanceLine}set pointDistanceLine(e){this._pointDistanceLine=e!=null?{origin:Q(e.origin),target:e.target?Q(e.target):null}:null,this._syncPointDistance(),this._syncRenderer()}get isDecoration(){return this._isDecoration}set isDecoration(e){this._isDecoration=e,this._renderer&&(this._renderer.isDecoration=e)}_syncRenderer(){this.attached&&this.visible&&(this._intersectsLineEnabled||this._heightManifoldEnabled||this._pointDistanceLine!=null||this._pathVerticalPlaneBuffers!=null)?this._ensureRenderer():this._disposeRenderer()}_ensureRenderer(){this._renderer==null&&(this._renderer=new b({view:this.view,contrastControlEnabled:!0,isDecoration:this.isDecoration}),this._syncStyle(),this._syncHeightManifold(),this._syncIntersectsLine(),this._syncIntersectsLineInfinite(),this._syncPathVerticalPlane(),this._syncLineVerticalPlane(),this._syncPointDistance(),this._syncAngleCutoff())}_syncStyle(){this._renderer!=null&&this._renderer.setParameters(this._style)}_syncAngleCutoff(){var e;(e=this._renderer)==null||e.setParameters({angleCutoff:this._angleCutoff})}_syncHeightManifold(){this._renderer!=null&&(this._renderer.heightManifoldEnabled=this._heightManifoldEnabled&&this.visible,this._heightManifoldEnabled&&(this._renderer.heightManifoldTarget=this._heightManifoldTarget))}_syncIntersectsLine(){this._renderer!=null&&(this._renderer.intersectsLineEnabled=this._intersectsLineEnabled&&this.visible,this._intersectsLineEnabled&&(this._renderer.intersectsLineSegment=this._intersectsLine))}_syncIntersectsLineInfinite(){this._renderer!=null&&(this._renderer.intersectsLineInfinite=this._intersectsLineInfinite)}_syncPathVerticalPlane(){this._renderer!=null&&(this._renderer.pathVerticalPlaneEnabled=this._pathVerticalPlaneBuffers!=null&&this.visible,this._pathVerticalPlaneBuffers!=null&&(this._renderer.pathVerticalPlaneBuffers=this._pathVerticalPlaneBuffers))}_syncLineVerticalPlane(){this._renderer!=null&&(this._renderer.lineVerticalPlaneEnabled=this._lineVerticalPlaneSegment!=null&&this.visible,this._lineVerticalPlaneSegment!=null&&(this._renderer.lineVerticalPlaneSegment=this._lineVerticalPlaneSegment))}_syncPointDistance(){if(this._renderer==null)return;const e=this._pointDistanceLine,n=e!=null;this._renderer.pointDistanceEnabled=n&&e.target!=null&&this.visible,n&&(this._renderer.pointDistanceOrigin=e.origin,e.target!=null&&(this._renderer.pointDistanceTarget=e.target))}_disposeRenderer(){this._renderer!=null&&this.view.stage&&(this._renderer.destroy(),this._renderer=null)}forEachMaterial(){}}const ut=o(),ft=Object.freeze(Object.defineProperty({__proto__:null,build:ge,defaultAngleCutoff:F},Symbol.toStringTag,{value:"Module"})),gt=Object.freeze(Object.defineProperty({__proto__:null,build:_e},Symbol.toStringTag,{value:"Module"}));export{wt as c};
