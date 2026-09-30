import{wk as te,EV as ie,EW as re,wp as ae,EX as se,EY as oe,wj as o,wr as ne,Ej as ce,wh as le,wt as w,EZ as pe,E_ as de,En as R,wm as he,wn as ve,wo as ue,wq as me,E0 as fe,E$ as U,F0 as q,F1 as Se,F2 as ge,Eo as Pe,eU as we,qo as ye,ib as _e,qq as xe,aC as $e,qs as D,E2 as I,E3 as ze,E4 as B,qt as F,ww as be,E5 as ke,wy as Ve,F3 as Oe,F4 as Y,F5 as H,F6 as Te,F7 as We,F8 as Ce,a$ as d,b1 as De,Eq as Ee,wB as m,es as Fe,E7 as E,Et as Me,F9 as G,rP as Le,EU as je,Fa as Ae,wF as Ne,dx as Q,ke as Re,eR as X,bt as Z,Fb as Ue}from"./arcgis-scene-C3i20sGt.js";function J(r){const e=new te,{space:a,anchor:t,hasTip:y,hasScreenSizePerspective:_}=r,f=a===2,k=a===1;e.attributes.add("position","vec3"),e.vertex.inputs.add("position",()=>"position"),e.include(ie,r),e.include(re,r);const{vertex:i,fragment:g,varyings:S}=e;ae(i,r),e.attributes.add("previousDelta","vec4"),e.attributes.add("uv0","vec2"),S.add("vColor","vec4"),S.add("vpos","vec3",{invariant:!0}),S.add("vUV","vec2"),S.add("vSize","float"),y&&S.add("vLineWidth","float"),i.uniforms.add(new se("nearFar",({camera:c})=>c.nearFar),new oe("viewport",({camera:c})=>c.fullViewport)).code.add(o`vec4 projectAndScale(vec4 pos) {
vec4 posNdc = proj * pos;
posNdc.xy *= viewport.zw / posNdc.w;
return posNdc;
}`),i.code.add(o`void clip(vec4 pos, inout vec4 prev) {
float vnp = nearFar[0] * 0.99;
if (prev.z > -nearFar[0]) {
float interpolation = (-vnp - pos.z) / (prev.z - pos.z);
prev = mix(pos, prev, interpolation);
}
}`),f?(e.attributes.add("normal","vec3"),ne(i),i.constants.add("tiltThreshold","float",.7),i.code.add(o`vec3 perpendicular(vec3 v) {
vec3 n = (viewNormal * vec4(normal.xyz, 1.0)).xyz;
vec3 n2 = cross(v, n);
vec3 forward = vec3(0.0, 0.0, 1.0);
float tiltDot = dot(forward, n);
return abs(tiltDot) < tiltThreshold ? n : n2;
}`)):i.code.add(o`vec2 perpendicular(vec2 v) {
return vec2(v.y, -v.x);
}`);const l=f?"vec3":"vec2";return i.code.add(o`
      ${l} normalizedSegment(${l} pos, ${l} prev) {
        ${l} segment = pos - prev;
        float segmentLen = length(segment);

        // normalize or zero if too short
        return (segmentLen > 0.001) ? segment / segmentLen : ${f?"vec3(0.0, 0.0, 0.0)":"vec2(0.0, 0.0)"};
      }

      ${l} displace(${l} pos, ${l} prev, float displacementLen) {
        ${l} segment = normalizedSegment(pos, prev);

        ${l} displacementDirU = perpendicular(segment);
        ${l} displacementDirV = segment;

        ${t===1?"pos -= 0.5 * displacementLen * displacementDirV;":""}

        return pos + displacementLen * (uv0.x * displacementDirU + uv0.y * displacementDirV);
      }
    `),k&&(i.uniforms.add(new ce("inverseProjectionMatrix",({camera:c})=>c.inverseProjectionMatrix)),i.code.add(o`vec3 inverseProject(vec4 posScreen) {
posScreen.xy = (posScreen.xy / viewport.zw) * posScreen.w;
return (inverseProjectionMatrix * posScreen).xyz;
}`),i.code.add(o`bool rayIntersectPlane(vec3 rayDir, vec3 planeOrigin, vec3 planeNormal, out vec3 intersection) {
float cos = dot(rayDir, planeNormal);
float t = dot(planeOrigin, planeNormal) / cos;
intersection = t * rayDir;
return abs(cos) > 0.001 && t > 0.0;
}`),i.uniforms.add(new le("perScreenPixelRatio",({camera:c})=>c.perScreenPixelRatio)),i.code.add(o`
      vec4 toFront(vec4 displacedPosScreen, vec3 posLeft, vec3 posRight, vec3 prev, float lineWidth) {
        // Project displaced position back to camera space
        vec3 displacedPos = inverseProject(displacedPosScreen);

        // Calculate the plane that we want the marker to lie in. Note that this will always be an approximation since ribbon lines are generally
        // not planar and we do not know the actual position of the displaced prev vertices (they are offset in screen space, too).
        vec3 planeNormal = normalize(cross(posLeft - posRight, posLeft - prev));
        vec3 planeOrigin = posLeft;

        ${w(r.hasCap,`if(prev.z > posLeft.z) {
                vec2 diff = posLeft.xy - posRight.xy;
                planeOrigin.xy += perpendicular(diff) / 2.0;
             }`)};

        // Move the plane towards the camera by a margin dependent on the line width (approximated in world space). This tolerance corrects for the
        // non-planarity in most cases, but sharp joins can place the prev vertices at arbitrary positions so markers can still clip.
        float offset = lineWidth * perScreenPixelRatio;
        planeOrigin *= (1.0 - offset);

        // Intersect camera ray with the plane and make sure it is within clip space
        vec3 rayDir = normalize(displacedPos);
        vec3 intersection;
        if (rayIntersectPlane(rayDir, planeOrigin, planeNormal, intersection) && intersection.z < -nearFar[0] && intersection.z > -nearFar[1]) {
          return vec4(intersection.xyz, 1.0);
        }

        // Fallback: use depth of pos or prev, whichever is closer to the camera
        float minDepth = planeOrigin.z > prev.z ? length(planeOrigin) : length(prev);
        displacedPos *= minDepth / length(displacedPos);
        return vec4(displacedPos.xyz, 1.0);
      }
  `)),pe(i),e.include(de),i.main.add(o`
    // Check for special value of uv0.y which is used by the Renderer when graphics
    // are removed before the VBO is recompacted. If this is the case, then we just
    // project outside of clip space.
    if (uv0.y == 0.0) {
      // Project out of clip space
      gl_Position = ${R};
    }
    else {
      vec4 pos  = view * vec4(position, 1.0);
      vec4 prev = view * vec4(position + previousDelta.xyz * previousDelta.w, 1.0);

      float lineWidth = getLineWidth(${w(_,"pos.xyz")});
      float screenMarkerSize = getScreenMarkerSize(lineWidth);

      clip(pos, prev);

      ${f?o`${w(r.hideOnShortSegments,o`
                if (areWorldMarkersHidden(pos.xyz, prev.xyz)) {
                  gl_Position = ${R};
                  return;
                }`)}
            pos.xyz = displace(pos.xyz, prev.xyz, getWorldMarkerSize(pos.xyz));
            vec4 displacedPosScreen = projectAndScale(pos);`:o`
            vec4 posScreen = projectAndScale(pos);
            vec4 prevScreen = projectAndScale(prev);
            vec4 displacedPosScreen = posScreen;

            displacedPosScreen.xy = displace(posScreen.xy, prevScreen.xy, screenMarkerSize);
            ${w(k,o`
                vec2 displacementDirU = perpendicular(normalizedSegment(posScreen.xy, prevScreen.xy));

                // We need three points of the ribbon line in camera space to calculate the plane it lies in
                // Note that we approximate the third point, since we have no information about the join around prev
                vec3 lineRight = inverseProject(posScreen + lineWidth * vec4(displacementDirU.xy, 0.0, 0.0));
                vec3 lineLeft = pos.xyz + (pos.xyz - lineRight);

                pos = toFront(displacedPosScreen, lineLeft, lineRight, prev.xyz, lineWidth);
                displacedPosScreen = projectAndScale(pos);`)}`}
      // Convert back into NDC
      displacedPosScreen.xy = (displacedPosScreen.xy / viewport.zw) * displacedPosScreen.w;

      // Convert texture coordinate into [0,1]
      vUV = (uv0 + 1.0) / 2.0;
      ${w(!f,"vUV = noPerspectiveWrite(vUV, displacedPosScreen.w);")}
      ${w(y,"vLineWidth = noPerspectiveWrite(lineWidth, displacedPosScreen.w);")}

      vSize = screenMarkerSize;
      vColor = getColor();

      // Use camera space for slicing
      vpos = pos.xyz;

      gl_Position = displacedPosScreen;
    }`),g.include(he,r),e.include(ve,r),g.include(ue),g.uniforms.add(new me("intrinsicColor",({color:c})=>c),new fe("tex",({markerTexture:c})=>c)).constants.add("texelSize","float",1/U).code.add(o`float markerAlpha(vec2 samplePos) {
samplePos += vec2(0.5, -0.5) * texelSize;
float sdf = texture(tex, samplePos).r;
float pixelDistance = sdf * vSize;
pixelDistance -= 0.5;
return clamp(0.5 - pixelDistance, 0.0, 1.0);
}`),y&&(e.include(q),g.constants.add("relativeMarkerSize","float",Se/U).constants.add("relativeTipLineWidth","float",ge).code.add(o`
    float tipAlpha(vec2 samplePos) {
      // Convert coordinates s.t. they are in pixels and relative to the tip of an arrow marker
      samplePos -= vec2(0.5, 0.5 + 0.5 * relativeMarkerSize);
      samplePos *= vSize;

      float halfMarkerSize = 0.5 * relativeMarkerSize * vSize;
      float halfTipLineWidth = 0.5 * max(1.0, relativeTipLineWidth * noPerspectiveRead(vLineWidth));

      ${w(f,"halfTipLineWidth *= fwidth(samplePos.y);")}

      float distance = max(abs(samplePos.x) - halfMarkerSize, abs(samplePos.y) - halfTipLineWidth);
      return clamp(0.5 - distance, 0.0, 1.0);
    }
  `)),e.include(Pe,r),e.include(q),g.main.add(o`
    discardBySlice(vpos);

    vec4 finalColor = intrinsicColor * vColor;

    // Cancel out perspective correct interpolation if in screen space or draped
    vec2 samplePos = ${w(!f,"noPerspectiveRead(vUV)","vUV")};
    finalColor.a *= ${y?"max(markerAlpha(samplePos), tipAlpha(samplePos))":"markerAlpha(samplePos)"};
    outputColorHighlightOLID(applySlice(finalColor, vpos), finalColor.rgb);`),e}const qe=Object.freeze(Object.defineProperty({__proto__:null,build:J},Symbol.toStringTag,{value:"Module"}));let M=class extends ye{constructor(e,a){super(e,a,_e(K(a))),this.shader=new xe(qe,()=>$e(()=>Promise.resolve().then(()=>Qe),void 0,import.meta.url))}_makePipelineState(e,a){const{output:t,space:y,hasOccludees:_}=e;return D({blending:Ve(t,!1,e.emissionDimmingPass),depthTest:y===0?null:ke(t),depthWrite:be(e),colorWrite:F,stencilWrite:_?B:null,stencilTest:_?a?I:ze:null,polygonOffset:{factor:0,units:-10}})}initializePipeline(e){return e.occluder?(this._occluderPipelineTransparent=D({blending:H,depthTest:Y,depthWrite:null,colorWrite:F,stencilWrite:null,stencilTest:Oe}),this._occluderPipelineOpaque=D({blending:H,depthTest:Y,depthWrite:null,colorWrite:F,stencilWrite:We,stencilTest:Te}),this._occluderPipelineMaskWrite=D({blending:null,depthTest:Ce,depthWrite:null,colorWrite:null,stencilWrite:B,stencilTest:I})):this._occluderPipelineTransparent=this._occluderPipelineOpaque=this._occluderPipelineMaskWrite=null,this._occludeePipelineState=this._makePipelineState(e,!0),this._makePipelineState(e,!1)}getPipeline(e,a,t){return t?this._occludeePipelineState:e.occluder===11?this._occluderPipelineTransparent??super.getPipeline(e,a,t):e.occluder===10?this._occluderPipelineOpaque??super.getPipeline(e,a,t):this._occluderPipelineMaskWrite??super.getPipeline(e,a,t)}};function K(r){const e=we().vec3f("position").vec4f16("previousDelta").vec2f16("uv0");return r.hasVVColor?e.f32("colorFeatureAttribute"):e.vec4u8("color",{glNormalized:!0}),r.hasVVOpacity&&e.f32("opacityFeatureAttribute"),r.hasVVSize?e.f32("sizeFeatureAttribute"):e.f16("size"),r.worldSpace&&e.vec3f16("normal"),e.freeze()}M=d([De("esri.views.3d.webgl-engine.shaders.LineMarkerTechnique")],M);class h extends Ee{constructor(e){super(),this.spherical=e,this.space=1,this.anchor=0,this.occluder=!1,this.writeDepth=!1,this.hideOnShortSegments=!1,this.hasCap=!1,this.hasTip=!1,this.hasVVSize=!1,this.hasVVColor=!1,this.hasVVOpacity=!1,this.hasOccludees=!1,this.hasScreenSizePerspective=!1,this.textureCoordinateType=0,this.emissionSource=0,this.discardInvisibleFragments=!0,this.occlusionPass=!1,this.hasVVInstancing=!1,this.hasSliceTranslatedView=!0,this.olidColorInstanced=!1,this.overlayEnabled=!1,this.snowCover=!1}get draped(){return this.space===0}get worldSpace(){return this.space===2}}d([m({count:3})],h.prototype,"space",void 0),d([m({count:2})],h.prototype,"anchor",void 0),d([m()],h.prototype,"occluder",void 0),d([m()],h.prototype,"writeDepth",void 0),d([m()],h.prototype,"hideOnShortSegments",void 0),d([m()],h.prototype,"hasCap",void 0),d([m()],h.prototype,"hasTip",void 0),d([m()],h.prototype,"hasVVSize",void 0),d([m()],h.prototype,"hasVVColor",void 0),d([m()],h.prototype,"hasVVOpacity",void 0),d([m()],h.prototype,"hasOccludees",void 0),d([m()],h.prototype,"hasScreenSizePerspective",void 0);class Je extends Fe{constructor(e,a){super(e,Be),this.produces=new Map([[2,t=>t===10||E(t)&&this.parameters.renderOccluded===8],[3,t=>Me(t)],[10,t=>G(t)&&this.parameters.renderOccluded===8],[11,t=>G(t)&&this.parameters.renderOccluded===8],[4,t=>E(t)&&this.parameters.writeDepth],[8,t=>E(t)&&!this.parameters.writeDepth],[18,t=>E(t)||t===10]]),this.intersectDraped=void 0,this._configuration=new h(a)}updateConfiguration(e){super.updateConfiguration(e),this._configuration.space=e.slot===18?0:this.parameters.worldSpace?2:1,this._configuration.hideOnShortSegments=this.parameters.hideOnShortSegments,this._configuration.hasCap=this.parameters.cap!==0,this._configuration.anchor=this.parameters.anchor,this._configuration.hasTip=this.parameters.hasTip,this._configuration.hasSlicePlane=this.parameters.hasSlicePlane,this._configuration.hasOccludees=e.hasOccludees,this._configuration.writeDepth=this.parameters.writeDepth,this._configuration.hasVVSize=this.parameters.hasVVSize,this._configuration.hasVVColor=this.parameters.hasVVColor,this._configuration.hasVVOpacity=this.parameters.hasVVOpacity,this._configuration.occluder=this.parameters.renderOccluded===8,this._configuration.hasScreenSizePerspective=this.parameters.screenSizePerspective!=null}get visible(){return this.parameters.color[3]>=Le}intersect(){}createBufferWriter(){return new Ye(K(this.parameters),this.parameters)}createGLMaterial(e){return new Ie(e)}}class Ie extends Ne{dispose(){var e;super.dispose(),(e=this._markerTextures)==null||e.release(this._markerPrimitive),this._markerPrimitive=null}beginSlot(e){const a=this._material.parameters.markerPrimitive;return a!==this._markerPrimitive&&(this._material.setParameters({markerTexture:this._markerTextures.swap(a,this._markerPrimitive)}),this._markerPrimitive=a),this.getTechnique(M,e)}}class Be extends je{constructor(){super(...arguments),this.width=0,this.color=[1,1,1,1],this.markerPrimitive="arrow",this.placement="end",this.cap=0,this.anchor=0,this.hasTip=!1,this.worldSpace=!1,this.hideOnShortSegments=!1,this.writeDepth=!0,this.hasSlicePlane=!1,this.vvFastUpdate=!1,this.stipplePattern=null,this.markerTexture=null}}class Ye{constructor(e,a){this.layout=e,this._parameters=a}elementCount(){return this._parameters.placement==="begin-end"?12:6}write(e,a,t,y,_){if(_==null)return;const{buffer:f,offset:k}=_,i=t.get("position").data,g=i.length/3;let S=[1,0,0];const l=t.get("normal");this._parameters.worldSpace&&l!=null&&(S=l.data);let c=1,L=0;this._parameters.vvSize?L=t.get("sizeFeatureAttribute").data[0]:t.has("size")&&(c=t.get("size").data[0]);let $=[1,1,1,1],j=0;this._parameters.vvColor?j=t.get("colorFeatureAttribute").data[0]:t.has("color")&&($=t.get("color").data);let A=0;this._parameters.vvOpacity&&(A=t.get("opacityFeatureAttribute").data[0]);const x=new Float32Array(f.buffer),P=Ae(f.buffer),V=new Uint8Array(f.buffer);let p=k*(this.layout.stride/4);const z=x.BYTES_PER_ELEMENT/P.BYTES_PER_ELEMENT,ee=4/z,b=(n,T,v,u)=>{x[p++]=n[0],x[p++]=n[1],x[p++]=n[2],Ue(T,n,P,p*z),p+=ee;let s=p*z;if(P[s++]=v[0],P[s++]=v[1],p=Math.ceil(s/z),this._parameters.vvColor)x[p++]=j;else{const W=Math.min(4*u,$.length-4),C=4*p++;V[C]=255*$[W],V[C+1]=255*$[W+1],V[C+2]=255*$[W+2],V[C+3]=255*$[W+3]}this._parameters.vvOpacity&&(x[p++]=A),s=p*z,this._parameters.vvSize?(x[p++]=L,s+=2):P[s++]=c,this._parameters.worldSpace&&(P[s++]=S[0],P[s++]=S[1],P[s++]=S[2]),p=Math.ceil(s/z)},N=(n,T)=>{const v=Q(He,i[3*n],i[3*n+1],i[3*n+2]),u=Ge;let s=n+T;do Q(u,i[3*s],i[3*s+1],i[3*s+2]),s+=T;while(Re(v,u)&&s>=0&&s<g);e&&(X(v,v,e),X(u,u,e)),b(v,u,[-1,-1],n),b(v,u,[1,-1],n),b(v,u,[1,1],n),b(v,u,[-1,-1],n),b(v,u,[1,1],n),b(v,u,[-1,1],n)},O=this._parameters.placement;O!=="begin"&&O!=="begin-end"||N(0,1),O!=="end"&&O!=="begin-end"||N(g-1,-1)}}const He=Z(),Ge=Z(),Qe=Object.freeze(Object.defineProperty({__proto__:null,build:J},Symbol.toStringTag,{value:"Module"}));export{Je as g};
