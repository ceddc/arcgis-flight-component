var aa = Object.getPrototypeOf;
var oa = Reflect.get;
var Sn = (n) => {
  throw TypeError(n);
};
var ye = (n, t, e) => t.has(n) || Sn("Cannot " + e);
var l = (n, t, e) => (ye(n, t, "read from private field"), e ? e.call(n) : t.get(n)), f = (n, t, e) => t.has(n) ? Sn("Cannot add the same private member more than once") : t instanceof WeakSet ? t.add(n) : t.set(n, e), p = (n, t, e, i) => (ye(n, t, "write to private field"), i ? i.call(n, e) : t.set(n, e), e), O = (n, t, e) => (ye(n, t, "access private method"), e);
var $e = (n, t, e) => oa(aa(n), e, t);
const $ = (n, t, ...e) => {
  try {
    return n == null ? void 0 : n.call(t, ...e);
  } catch (i) {
    console.error(i, n);
  }
}, Oe = async (n, t, ...e) => {
  try {
    return await (n == null ? void 0 : n.call(t, ...e));
  } catch (i) {
    console.error(i, n);
  }
}, Je = /* @__PURE__ */ Symbol.for("controller"), ra = (n) => typeof n == "object" && n !== null && (Je in n || "hostConnected" in n || "hostDisconnected" in n || "hostUpdate" in n || "hostUpdated" in n), sa = (n) => typeof (n == null ? void 0 : n.then) == "function";
let zt;
const ct = (n) => {
  zt !== n && (zt = n, queueMicrotask(() => zt === n ? zt = void 0 : 0));
}, pe = (n) => zt;
let K = [];
const ai = (n) => {
  if (n === void 0) {
    K = [];
    return;
  }
  const t = K.indexOf(n);
  K = t === -1 ? [...K, n] : K.slice(0, t + 1), queueMicrotask(() => K = []);
}, oi = () => K;
let lt;
const ca = (n) => {
  lt !== n && (lt = n, queueMicrotask(() => lt === n ? lt = void 0 : 0));
}, la = () => {
  const n = lt;
  return lt = void 0, n;
}, da = async (n, t) => {
  const e = Ze(n);
  if (e === void 0)
    return n;
  if (await e.ready, typeof t == "function") {
    const i = e.watchExports(
      (a) => t(a, i)
    );
  }
  return e.exports;
}, ha = async (n) => {
  const t = Ze(n);
  return await t.ready, t;
}, Ze = (n) => {
  const e = pe().manager.X(n);
  if (e !== void 0)
    return e;
  if (ra(n))
    return n;
  const i = la();
  if (i !== void 0)
    return i;
};
let Te = !1;
const ua = (n) => {
  Te = !0;
  try {
    return n();
  } finally {
    Te = !1;
  }
};
/**
 * @license
 * Copyright 2019 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
const Qt = globalThis, Qe = Qt.ShadowRoot && (Qt.ShadyCSS === void 0 || Qt.ShadyCSS.nativeShadow) && "adoptedStyleSheets" in Document.prototype && "replace" in CSSStyleSheet.prototype, Xe = Symbol(), An = /* @__PURE__ */ new WeakMap();
let ri = class {
  constructor(t, e, i) {
    if (this._$cssResult$ = !0, i !== Xe) throw Error("CSSResult is not constructable. Use `unsafeCSS` or `css` instead.");
    this.cssText = t, this.t = e;
  }
  get styleSheet() {
    let t = this.o;
    const e = this.t;
    if (Qe && t === void 0) {
      const i = e !== void 0 && e.length === 1;
      i && (t = An.get(e)), t === void 0 && ((this.o = t = new CSSStyleSheet()).replaceSync(this.cssText), i && An.set(e, t));
    }
    return t;
  }
  toString() {
    return this.cssText;
  }
};
const pa = (n) => new ri(typeof n == "string" ? n : n + "", void 0, Xe), wt = (n, ...t) => {
  const e = n.length === 1 ? n[0] : t.reduce((i, a, o) => i + ((r) => {
    if (r._$cssResult$ === !0) return r.cssText;
    if (typeof r == "number") return r;
    throw Error("Value passed to 'css' function must be a 'css' function result: " + r + ". Use 'unsafeCSS' to pass non-literal values, but take care to ensure page security.");
  })(a) + n[o + 1], n[0]);
  return new ri(e, n, Xe);
}, fa = (n, t) => {
  if (Qe) n.adoptedStyleSheets = t.map((e) => e instanceof CSSStyleSheet ? e : e.styleSheet);
  else for (const e of t) {
    const i = document.createElement("style"), a = Qt.litNonce;
    a !== void 0 && i.setAttribute("nonce", a), i.textContent = e.cssText, n.appendChild(i);
  }
}, zn = Qe ? (n) => n : (n) => n instanceof CSSStyleSheet ? ((t) => {
  let e = "";
  for (const i of t.cssRules) e += i.cssText;
  return pa(e);
})(n) : n;
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
const { is: ba, defineProperty: ga, getOwnPropertyDescriptor: va, getOwnPropertyNames: ma, getOwnPropertySymbols: ya, getPrototypeOf: $a } = Object, W = globalThis, _n = W.trustedTypes, xa = _n ? _n.emptyScript : "", xe = W.reactiveElementPolyfillSupport, _t = (n, t) => n, Re = { toAttribute(n, t) {
  switch (t) {
    case Boolean:
      n = n ? xa : null;
      break;
    case Object:
    case Array:
      n = n == null ? n : JSON.stringify(n);
  }
  return n;
}, fromAttribute(n, t) {
  let e = n;
  switch (t) {
    case Boolean:
      e = n !== null;
      break;
    case Number:
      e = n === null ? null : Number(n);
      break;
    case Object:
    case Array:
      try {
        e = JSON.parse(n);
      } catch {
        e = null;
      }
  }
  return e;
} }, Ye = (n, t) => !ba(n, t), Ln = { attribute: !0, type: String, converter: Re, reflect: !1, useDefault: !1, hasChanged: Ye };
Symbol.metadata ?? (Symbol.metadata = Symbol("metadata")), W.litPropertyMetadata ?? (W.litPropertyMetadata = /* @__PURE__ */ new WeakMap());
let rt = class extends HTMLElement {
  static addInitializer(t) {
    this._$Ei(), (this.l ?? (this.l = [])).push(t);
  }
  static get observedAttributes() {
    return this.finalize(), this._$Eh && [...this._$Eh.keys()];
  }
  static createProperty(t, e = Ln) {
    if (e.state && (e.attribute = !1), this._$Ei(), this.prototype.hasOwnProperty(t) && ((e = Object.create(e)).wrapped = !0), this.elementProperties.set(t, e), !e.noAccessor) {
      const i = Symbol(), a = this.getPropertyDescriptor(t, i, e);
      a !== void 0 && ga(this.prototype, t, a);
    }
  }
  static getPropertyDescriptor(t, e, i) {
    const { get: a, set: o } = va(this.prototype, t) ?? { get() {
      return this[e];
    }, set(r) {
      this[e] = r;
    } };
    return { get: a, set(r) {
      const s = a == null ? void 0 : a.call(this);
      o == null || o.call(this, r), this.requestUpdate(t, s, i);
    }, configurable: !0, enumerable: !0 };
  }
  static getPropertyOptions(t) {
    return this.elementProperties.get(t) ?? Ln;
  }
  static _$Ei() {
    if (this.hasOwnProperty(_t("elementProperties"))) return;
    const t = $a(this);
    t.finalize(), t.l !== void 0 && (this.l = [...t.l]), this.elementProperties = new Map(t.elementProperties);
  }
  static finalize() {
    if (this.hasOwnProperty(_t("finalized"))) return;
    if (this.finalized = !0, this._$Ei(), this.hasOwnProperty(_t("properties"))) {
      const e = this.properties, i = [...ma(e), ...ya(e)];
      for (const a of i) this.createProperty(a, e[a]);
    }
    const t = this[Symbol.metadata];
    if (t !== null) {
      const e = litPropertyMetadata.get(t);
      if (e !== void 0) for (const [i, a] of e) this.elementProperties.set(i, a);
    }
    this._$Eh = /* @__PURE__ */ new Map();
    for (const [e, i] of this.elementProperties) {
      const a = this._$Eu(e, i);
      a !== void 0 && this._$Eh.set(a, e);
    }
    this.elementStyles = this.finalizeStyles(this.styles);
  }
  static finalizeStyles(t) {
    const e = [];
    if (Array.isArray(t)) {
      const i = new Set(t.flat(1 / 0).reverse());
      for (const a of i) e.unshift(zn(a));
    } else t !== void 0 && e.push(zn(t));
    return e;
  }
  static _$Eu(t, e) {
    const i = e.attribute;
    return i === !1 ? void 0 : typeof i == "string" ? i : typeof t == "string" ? t.toLowerCase() : void 0;
  }
  constructor() {
    super(), this._$Ep = void 0, this.isUpdatePending = !1, this.hasUpdated = !1, this._$Em = null, this._$Ev();
  }
  _$Ev() {
    var t;
    this._$ES = new Promise((e) => this.enableUpdating = e), this._$AL = /* @__PURE__ */ new Map(), this._$E_(), this.requestUpdate(), (t = this.constructor.l) == null || t.forEach((e) => e(this));
  }
  addController(t) {
    var e;
    (this._$EO ?? (this._$EO = /* @__PURE__ */ new Set())).add(t), this.renderRoot !== void 0 && this.isConnected && ((e = t.hostConnected) == null || e.call(t));
  }
  removeController(t) {
    var e;
    (e = this._$EO) == null || e.delete(t);
  }
  _$E_() {
    const t = /* @__PURE__ */ new Map(), e = this.constructor.elementProperties;
    for (const i of e.keys()) this.hasOwnProperty(i) && (t.set(i, this[i]), delete this[i]);
    t.size > 0 && (this._$Ep = t);
  }
  createRenderRoot() {
    const t = this.shadowRoot ?? this.attachShadow(this.constructor.shadowRootOptions);
    return fa(t, this.constructor.elementStyles), t;
  }
  connectedCallback() {
    var t;
    this.renderRoot ?? (this.renderRoot = this.createRenderRoot()), this.enableUpdating(!0), (t = this._$EO) == null || t.forEach((e) => {
      var i;
      return (i = e.hostConnected) == null ? void 0 : i.call(e);
    });
  }
  enableUpdating(t) {
  }
  disconnectedCallback() {
    var t;
    (t = this._$EO) == null || t.forEach((e) => {
      var i;
      return (i = e.hostDisconnected) == null ? void 0 : i.call(e);
    });
  }
  attributeChangedCallback(t, e, i) {
    this._$AK(t, i);
  }
  _$ET(t, e) {
    var o;
    const i = this.constructor.elementProperties.get(t), a = this.constructor._$Eu(t, i);
    if (a !== void 0 && i.reflect === !0) {
      const r = (((o = i.converter) == null ? void 0 : o.toAttribute) !== void 0 ? i.converter : Re).toAttribute(e, i.type);
      this._$Em = t, r == null ? this.removeAttribute(a) : this.setAttribute(a, r), this._$Em = null;
    }
  }
  _$AK(t, e) {
    var o, r;
    const i = this.constructor, a = i._$Eh.get(t);
    if (a !== void 0 && this._$Em !== a) {
      const s = i.getPropertyOptions(a), c = typeof s.converter == "function" ? { fromAttribute: s.converter } : ((o = s.converter) == null ? void 0 : o.fromAttribute) !== void 0 ? s.converter : Re;
      this._$Em = a;
      const d = c.fromAttribute(e, s.type);
      this[a] = d ?? ((r = this._$Ej) == null ? void 0 : r.get(a)) ?? d, this._$Em = null;
    }
  }
  requestUpdate(t, e, i, a = !1, o) {
    var r;
    if (t !== void 0) {
      const s = this.constructor;
      if (a === !1 && (o = this[t]), i ?? (i = s.getPropertyOptions(t)), !((i.hasChanged ?? Ye)(o, e) || i.useDefault && i.reflect && o === ((r = this._$Ej) == null ? void 0 : r.get(t)) && !this.hasAttribute(s._$Eu(t, i)))) return;
      this.C(t, e, i);
    }
    this.isUpdatePending === !1 && (this._$ES = this._$EP());
  }
  C(t, e, { useDefault: i, reflect: a, wrapped: o }, r) {
    i && !(this._$Ej ?? (this._$Ej = /* @__PURE__ */ new Map())).has(t) && (this._$Ej.set(t, r ?? e ?? this[t]), o !== !0 || r !== void 0) || (this._$AL.has(t) || (this.hasUpdated || i || (e = void 0), this._$AL.set(t, e)), a === !0 && this._$Em !== t && (this._$Eq ?? (this._$Eq = /* @__PURE__ */ new Set())).add(t));
  }
  async _$EP() {
    this.isUpdatePending = !0;
    try {
      await this._$ES;
    } catch (e) {
      Promise.reject(e);
    }
    const t = this.scheduleUpdate();
    return t != null && await t, !this.isUpdatePending;
  }
  scheduleUpdate() {
    return this.performUpdate();
  }
  performUpdate() {
    var i;
    if (!this.isUpdatePending) return;
    if (!this.hasUpdated) {
      if (this.renderRoot ?? (this.renderRoot = this.createRenderRoot()), this._$Ep) {
        for (const [o, r] of this._$Ep) this[o] = r;
        this._$Ep = void 0;
      }
      const a = this.constructor.elementProperties;
      if (a.size > 0) for (const [o, r] of a) {
        const { wrapped: s } = r, c = this[o];
        s !== !0 || this._$AL.has(o) || c === void 0 || this.C(o, void 0, r, c);
      }
    }
    let t = !1;
    const e = this._$AL;
    try {
      t = this.shouldUpdate(e), t ? (this.willUpdate(e), (i = this._$EO) == null || i.forEach((a) => {
        var o;
        return (o = a.hostUpdate) == null ? void 0 : o.call(a);
      }), this.update(e)) : this._$EM();
    } catch (a) {
      throw t = !1, this._$EM(), a;
    }
    t && this._$AE(e);
  }
  willUpdate(t) {
  }
  _$AE(t) {
    var e;
    (e = this._$EO) == null || e.forEach((i) => {
      var a;
      return (a = i.hostUpdated) == null ? void 0 : a.call(i);
    }), this.hasUpdated || (this.hasUpdated = !0, this.firstUpdated(t)), this.updated(t);
  }
  _$EM() {
    this._$AL = /* @__PURE__ */ new Map(), this.isUpdatePending = !1;
  }
  get updateComplete() {
    return this.getUpdateComplete();
  }
  getUpdateComplete() {
    return this._$ES;
  }
  shouldUpdate(t) {
    return !0;
  }
  update(t) {
    this._$Eq && (this._$Eq = this._$Eq.forEach((e) => this._$ET(e, this[e]))), this._$EM();
  }
  updated(t) {
  }
  firstUpdated(t) {
  }
};
rt.elementStyles = [], rt.shadowRootOptions = { mode: "open" }, rt[_t("elementProperties")] = /* @__PURE__ */ new Map(), rt[_t("finalized")] = /* @__PURE__ */ new Map(), xe == null || xe({ ReactiveElement: rt }), (W.reactiveElementVersions ?? (W.reactiveElementVersions = [])).push("2.1.2");
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
const Lt = globalThis, On = (n) => n, te = Lt.trustedTypes, Tn = te ? te.createPolicy("lit-html", { createHTML: (n) => n }) : void 0, si = "$lit$", F = `lit$${Math.random().toFixed(9).slice(2)}$`, ci = "?" + F, ka = `<${ci}>`, at = document, It = () => at.createComment(""), Mt = (n) => n === null || typeof n != "object" && typeof n != "function", tn = Array.isArray, Ca = (n) => tn(n) || typeof (n == null ? void 0 : n[Symbol.iterator]) == "function", ke = `[ 	
\f\r]`, At = /<(?:(!--|\/[^a-zA-Z])|(\/?[a-zA-Z][^>\s]*)|(\/?$))/g, Rn = /-->/g, Pn = />/g, G = RegExp(`>|${ke}(?:([^\\s"'>=/]+)(${ke}*=${ke}*(?:[^ 	
\f\r"'\`<>=]|("|')|))|$)`, "g"), Nn = /'/g, In = /"/g, li = /^(?:script|style|textarea|title)$/i, di = (n) => (t, ...e) => ({ _$litType$: n, strings: t, values: e }), b = di(1), Pe = di(2), q = Symbol.for("lit-noChange"), v = Symbol.for("lit-nothing"), Mn = /* @__PURE__ */ new WeakMap(), Z = at.createTreeWalker(at, 129);
function hi(n, t) {
  if (!tn(n) || !n.hasOwnProperty("raw")) throw Error("invalid template strings array");
  return Tn !== void 0 ? Tn.createHTML(t) : t;
}
const Ea = (n, t) => {
  const e = n.length - 1, i = [];
  let a, o = t === 2 ? "<svg>" : t === 3 ? "<math>" : "", r = At;
  for (let s = 0; s < e; s++) {
    const c = n[s];
    let d, h, u = -1, m = 0;
    for (; m < c.length && (r.lastIndex = m, h = r.exec(c), h !== null); ) m = r.lastIndex, r === At ? h[1] === "!--" ? r = Rn : h[1] !== void 0 ? r = Pn : h[2] !== void 0 ? (li.test(h[2]) && (a = RegExp("</" + h[2], "g")), r = G) : h[3] !== void 0 && (r = G) : r === G ? h[0] === ">" ? (r = a ?? At, u = -1) : h[1] === void 0 ? u = -2 : (u = r.lastIndex - h[2].length, d = h[1], r = h[3] === void 0 ? G : h[3] === '"' ? In : Nn) : r === In || r === Nn ? r = G : r === Rn || r === Pn ? r = At : (r = G, a = void 0);
    const y = r === G && n[s + 1].startsWith("/>") ? " " : "";
    o += r === At ? c + ka : u >= 0 ? (i.push(d), c.slice(0, u) + si + c.slice(u) + F + y) : c + F + (u === -2 ? s : y);
  }
  return [hi(n, o + (n[e] || "<?>") + (t === 2 ? "</svg>" : t === 3 ? "</math>" : "")), i];
};
class Ut {
  constructor({ strings: t, _$litType$: e }, i) {
    let a;
    this.parts = [];
    let o = 0, r = 0;
    const s = t.length - 1, c = this.parts, [d, h] = Ea(t, e);
    if (this.el = Ut.createElement(d, i), Z.currentNode = this.el.content, e === 2 || e === 3) {
      const u = this.el.content.firstChild;
      u.replaceWith(...u.childNodes);
    }
    for (; (a = Z.nextNode()) !== null && c.length < s; ) {
      if (a.nodeType === 1) {
        if (a.hasAttributes()) for (const u of a.getAttributeNames()) if (u.endsWith(si)) {
          const m = h[r++], y = a.getAttribute(u).split(F), L = /([.?@])?(.*)/.exec(m);
          c.push({ type: 1, index: o, name: L[2], strings: y, ctor: L[1] === "." ? Sa : L[1] === "?" ? Aa : L[1] === "@" ? za : fe }), a.removeAttribute(u);
        } else u.startsWith(F) && (c.push({ type: 6, index: o }), a.removeAttribute(u));
        if (li.test(a.tagName)) {
          const u = a.textContent.split(F), m = u.length - 1;
          if (m > 0) {
            a.textContent = te ? te.emptyScript : "";
            for (let y = 0; y < m; y++) a.append(u[y], It()), Z.nextNode(), c.push({ type: 2, index: ++o });
            a.append(u[m], It());
          }
        }
      } else if (a.nodeType === 8) if (a.data === ci) c.push({ type: 2, index: o });
      else {
        let u = -1;
        for (; (u = a.data.indexOf(F, u + 1)) !== -1; ) c.push({ type: 7, index: o }), u += F.length - 1;
      }
      o++;
    }
  }
  static createElement(t, e) {
    const i = at.createElement("template");
    return i.innerHTML = t, i;
  }
}
function Et(n, t, e = n, i) {
  var r, s;
  if (t === q) return t;
  let a = i !== void 0 ? (r = e._$Co) == null ? void 0 : r[i] : e._$Cl;
  const o = Mt(t) ? void 0 : t._$litDirective$;
  return (a == null ? void 0 : a.constructor) !== o && ((s = a == null ? void 0 : a._$AO) == null || s.call(a, !1), o === void 0 ? a = void 0 : (a = new o(n), a._$AT(n, e, i)), i !== void 0 ? (e._$Co ?? (e._$Co = []))[i] = a : e._$Cl = a), a !== void 0 && (t = Et(n, a._$AS(n, t.values), a, i)), t;
}
class wa {
  constructor(t, e) {
    this._$AV = [], this._$AN = void 0, this._$AD = t, this._$AM = e;
  }
  get parentNode() {
    return this._$AM.parentNode;
  }
  get _$AU() {
    return this._$AM._$AU;
  }
  u(t) {
    const { el: { content: e }, parts: i } = this._$AD, a = ((t == null ? void 0 : t.creationScope) ?? at).importNode(e, !0);
    Z.currentNode = a;
    let o = Z.nextNode(), r = 0, s = 0, c = i[0];
    for (; c !== void 0; ) {
      if (r === c.index) {
        let d;
        c.type === 2 ? d = new Jt(o, o.nextSibling, this, t) : c.type === 1 ? d = new c.ctor(o, c.name, c.strings, this, t) : c.type === 6 && (d = new _a(o, this, t)), this._$AV.push(d), c = i[++s];
      }
      r !== (c == null ? void 0 : c.index) && (o = Z.nextNode(), r++);
    }
    return Z.currentNode = at, a;
  }
  p(t) {
    let e = 0;
    for (const i of this._$AV) i !== void 0 && (i.strings !== void 0 ? (i._$AI(t, i, e), e += i.strings.length - 2) : i._$AI(t[e])), e++;
  }
}
class Jt {
  get _$AU() {
    var t;
    return ((t = this._$AM) == null ? void 0 : t._$AU) ?? this._$Cv;
  }
  constructor(t, e, i, a) {
    this.type = 2, this._$AH = v, this._$AN = void 0, this._$AA = t, this._$AB = e, this._$AM = i, this.options = a, this._$Cv = (a == null ? void 0 : a.isConnected) ?? !0;
  }
  get parentNode() {
    let t = this._$AA.parentNode;
    const e = this._$AM;
    return e !== void 0 && (t == null ? void 0 : t.nodeType) === 11 && (t = e.parentNode), t;
  }
  get startNode() {
    return this._$AA;
  }
  get endNode() {
    return this._$AB;
  }
  _$AI(t, e = this) {
    t = Et(this, t, e), Mt(t) ? t === v || t == null || t === "" ? (this._$AH !== v && this._$AR(), this._$AH = v) : t !== this._$AH && t !== q && this._(t) : t._$litType$ !== void 0 ? this.$(t) : t.nodeType !== void 0 ? this.T(t) : Ca(t) ? this.k(t) : this._(t);
  }
  O(t) {
    return this._$AA.parentNode.insertBefore(t, this._$AB);
  }
  T(t) {
    this._$AH !== t && (this._$AR(), this._$AH = this.O(t));
  }
  _(t) {
    this._$AH !== v && Mt(this._$AH) ? this._$AA.nextSibling.data = t : this.T(at.createTextNode(t)), this._$AH = t;
  }
  $(t) {
    var o;
    const { values: e, _$litType$: i } = t, a = typeof i == "number" ? this._$AC(t) : (i.el === void 0 && (i.el = Ut.createElement(hi(i.h, i.h[0]), this.options)), i);
    if (((o = this._$AH) == null ? void 0 : o._$AD) === a) this._$AH.p(e);
    else {
      const r = new wa(a, this), s = r.u(this.options);
      r.p(e), this.T(s), this._$AH = r;
    }
  }
  _$AC(t) {
    let e = Mn.get(t.strings);
    return e === void 0 && Mn.set(t.strings, e = new Ut(t)), e;
  }
  k(t) {
    tn(this._$AH) || (this._$AH = [], this._$AR());
    const e = this._$AH;
    let i, a = 0;
    for (const o of t) a === e.length ? e.push(i = new Jt(this.O(It()), this.O(It()), this, this.options)) : i = e[a], i._$AI(o), a++;
    a < e.length && (this._$AR(i && i._$AB.nextSibling, a), e.length = a);
  }
  _$AR(t = this._$AA.nextSibling, e) {
    var i;
    for ((i = this._$AP) == null ? void 0 : i.call(this, !1, !0, e); t !== this._$AB; ) {
      const a = On(t).nextSibling;
      On(t).remove(), t = a;
    }
  }
  setConnected(t) {
    var e;
    this._$AM === void 0 && (this._$Cv = t, (e = this._$AP) == null || e.call(this, t));
  }
}
class fe {
  get tagName() {
    return this.element.tagName;
  }
  get _$AU() {
    return this._$AM._$AU;
  }
  constructor(t, e, i, a, o) {
    this.type = 1, this._$AH = v, this._$AN = void 0, this.element = t, this.name = e, this._$AM = a, this.options = o, i.length > 2 || i[0] !== "" || i[1] !== "" ? (this._$AH = Array(i.length - 1).fill(new String()), this.strings = i) : this._$AH = v;
  }
  _$AI(t, e = this, i, a) {
    const o = this.strings;
    let r = !1;
    if (o === void 0) t = Et(this, t, e, 0), r = !Mt(t) || t !== this._$AH && t !== q, r && (this._$AH = t);
    else {
      const s = t;
      let c, d;
      for (t = o[0], c = 0; c < o.length - 1; c++) d = Et(this, s[i + c], e, c), d === q && (d = this._$AH[c]), r || (r = !Mt(d) || d !== this._$AH[c]), d === v ? t = v : t !== v && (t += (d ?? "") + o[c + 1]), this._$AH[c] = d;
    }
    r && !a && this.j(t);
  }
  j(t) {
    t === v ? this.element.removeAttribute(this.name) : this.element.setAttribute(this.name, t ?? "");
  }
}
class Sa extends fe {
  constructor() {
    super(...arguments), this.type = 3;
  }
  j(t) {
    this.element[this.name] = t === v ? void 0 : t;
  }
}
class Aa extends fe {
  constructor() {
    super(...arguments), this.type = 4;
  }
  j(t) {
    this.element.toggleAttribute(this.name, !!t && t !== v);
  }
}
class za extends fe {
  constructor(t, e, i, a, o) {
    super(t, e, i, a, o), this.type = 5;
  }
  _$AI(t, e = this) {
    if ((t = Et(this, t, e, 0) ?? v) === q) return;
    const i = this._$AH, a = t === v && i !== v || t.capture !== i.capture || t.once !== i.once || t.passive !== i.passive, o = t !== v && (i === v || a);
    a && this.element.removeEventListener(this.name, this, i), o && this.element.addEventListener(this.name, this, t), this._$AH = t;
  }
  handleEvent(t) {
    var e;
    typeof this._$AH == "function" ? this._$AH.call(((e = this.options) == null ? void 0 : e.host) ?? this.element, t) : this._$AH.handleEvent(t);
  }
}
class _a {
  constructor(t, e, i) {
    this.element = t, this.type = 6, this._$AN = void 0, this._$AM = e, this.options = i;
  }
  get _$AU() {
    return this._$AM._$AU;
  }
  _$AI(t) {
    Et(this, t);
  }
}
const Ce = Lt.litHtmlPolyfillSupport;
Ce == null || Ce(Ut, Jt), (Lt.litHtmlVersions ?? (Lt.litHtmlVersions = [])).push("3.3.3");
const La = (n, t, e) => {
  const i = (e == null ? void 0 : e.renderBefore) ?? t;
  let a = i._$litPart$;
  if (a === void 0) {
    const o = (e == null ? void 0 : e.renderBefore) ?? null;
    i._$litPart$ = a = new Jt(t.insertBefore(It(), o), o, void 0, e ?? {});
  }
  return a._$AI(n), a;
};
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
const et = globalThis;
let nt = class extends rt {
  constructor() {
    super(...arguments), this.renderOptions = { host: this }, this._$Do = void 0;
  }
  createRenderRoot() {
    var e;
    const t = super.createRenderRoot();
    return (e = this.renderOptions).renderBefore ?? (e.renderBefore = t.firstChild), t;
  }
  update(t) {
    const e = this.render();
    this.hasUpdated || (this.renderOptions.isConnected = this.isConnected), super.update(t), this._$Do = La(e, this.renderRoot, this.renderOptions);
  }
  connectedCallback() {
    var t;
    super.connectedCallback(), (t = this._$Do) == null || t.setConnected(!0);
  }
  disconnectedCallback() {
    var t;
    super.disconnectedCallback(), (t = this._$Do) == null || t.setConnected(!1);
  }
  render() {
    return q;
  }
};
var ii;
nt._$litElement$ = !0, nt.finalized = !0, (ii = et.litElementHydrateSupport) == null || ii.call(et, { LitElement: nt });
const Ee = et.litElementPolyfillSupport;
Ee == null || Ee({ LitElement: nt });
(et.litElementVersions ?? (et.litElementVersions = [])).push("4.2.2");
class Dt {
  /**
   * Creates a new deferred promise.
   */
  constructor() {
    this.promise = new Promise((t, e) => {
      this.resolve = t, this.reject = e;
    });
  }
}
const Oa = (n, t) => {
  const e = t / Ta;
  let i = 0;
  const a = setInterval(() => {
    i += e, i >= t && (clearInterval(a), n());
  }, e);
  return a;
}, Ta = 4, Un = /* @__PURE__ */ new Set(), ui = (n) => typeof n == "string" ? n : "el" in n ? n.el.localName : "localName" in n ? n.localName : n.declaredClass, pi = (n, t, e, i) => {
  const a = ui(t);
  if (i != null && i.once) {
    const r = `${n}${a}${e}`;
    if (Un.has(r))
      return;
    Un.add(r);
  }
  let o;
  if (i != null && i.detail) {
    o = {};
    for (const [r, s] of Object.entries(i.detail))
      if ((typeof s == "object" || typeof s == "function") && s !== null) {
        const c = new WeakRef(s);
        Object.defineProperty(o, r, {
          enumerable: !0,
          get() {
            return c.deref();
          }
        });
      } else
        o[r] = s;
    console[n](`[${a}]: ${e}`, o);
  } else
    console[n](`[${a}]: ${e}`);
}, Ra = (n) => {
  const t = `[${ui(n)}] `;
  return (e) => {
    const i = e instanceof Error && e.message ? e : new Error(String(e));
    i.message = `${t}${i.message}`, setTimeout(() => {
      throw e;
    });
  };
}, Pa = (n, t, e) => {
  const i = Object.keys(n), a = i.length;
  B === void 0 && queueMicrotask(be), B ?? (B = /* @__PURE__ */ new Map());
  let o = B.get(n);
  return o === void 0 && (o = { callbacks: [], keyCount: a }, B.set(n, o)), o.keyCount !== a && (o.callbacks.forEach((r) => r(i)), o.callbacks = [], o.keyCount = a), o.callbacks.push((r) => {
    const s = (d) => $(t, null, d), c = r[a];
    c === void 0 ? s(void 0) : n[c] === e ? s(c) : s(void 0);
  }), e;
};
let B;
const be = () => {
  B == null || B.forEach(({ callbacks: n }, t) => {
    const e = Object.keys(t);
    n.forEach((i) => i(e));
  }), B = void 0;
}, Na = (n, t, e) => {
  const i = n.manager;
  return i.V !== v && i.V !== e && i.S(void 0, void 0), i.T.length === 0 && queueMicrotask(() => i.S(void 0, void 0)), i.V = e, i.T.push((a, o) => $(t, void 0, e === o ? a : void 0)), e;
}, fi = (n = [
  pe(),
  ...oi()
], t, e) => {
  const i = Array.isArray(n) ? n : [n];
  let a = i.length + 1;
  const o = (r) => {
    a -= 1, r !== void 0 && (a = Math.min(a, 0)), a === 0 && t(r);
  };
  i.forEach(
    (r) => Pa(
      r,
      (s) => o(s === void 0 ? void 0 : { key: s, host: r, isReactive: !1 }),
      e
    )
  );
  for (const r of i)
    if ("manager" in r && r.manager.component === r) {
      Na(
        r,
        (s) => o(s === void 0 ? void 0 : { key: s, host: r, isReactive: !0 }),
        e
      );
      break;
    }
  return e;
}, Ia = (n = "", t = {}, e = pe()) => {
  const i = {
    emit: (a) => {
      n === "" && be();
      const o = new CustomEvent(n, {
        detail: a,
        cancelable: !0,
        bubbles: !0,
        composed: !0,
        ...t
      });
      return e.el.dispatchEvent(o), o;
    }
  };
  return n === "" && fi(
    void 0,
    (a) => n = a.key,
    i
  ), i;
}, Ma = Ia.bind(null, "");
var bi;
bi = Je;
var ut, pt, Q, ft, bt, gt, vt, mt, j, X, C, T, M, yt, Xt;
class en {
  constructor(t) {
    f(this, yt);
    f(this, ut);
    f(this, pt);
    f(this, Q);
    f(this, ft);
    f(this, bt);
    f(this, gt);
    f(this, vt);
    f(this, mt);
    f(this, j);
    f(this, X);
    f(this, C);
    f(this, T);
    f(this, M);
    p(this, ut, []), p(this, pt, []), p(this, Q, []), p(this, ft, []), p(this, bt, []), p(this, gt, []), p(this, vt, []), p(this, mt, []), p(this, j, []), p(this, X, !1), this.P = new Dt(), this.connectedCalled = !1, this.loadedCalled = !1, this[bi] = !0, p(this, M, []);
    const e = this, i = t ?? pe();
    p(e, C, i), e.ready = e.P.promise, p(e, T, Hn(e)), e.component = i, l(e, C).addController(e), l(e, C).manager === void 0 || (ai(e), queueMicrotask(() => e.catchUpLifecycle()));
  }
  /**
   * If controller is being added dynamically, after the component
   * construction, then trigger connected and load right away
   */
  catchUpLifecycle() {
    const { manager: t } = l(this, C);
    t.connectedCalled && !this.connectedCalled && this.triggerConnected(), l(t, X) && this.triggerLoad().then(
      () => (
        // Call loaded ourself, unless manager is going to do it
        t.loadedCalled && this.triggerLoaded()
      )
    ).catch(Ra(l(this, C)));
  }
  get exports() {
    return l(this, T);
  }
  /**
   * Set controller's exports property (for usage with proxyExports()) and mark
   * controller as ready (for usage in other controllers). Also, triggers
   * re-render of the component
   */
  set exports(t) {
    const e = l(this, T);
    e !== t && (p(this, T, t), l(this, M).forEach($), this.connectedCalled && this.O !== !1 && l(this, C).requestUpdate(this.O, e)), this.P.resolve(t);
  }
  setProvisionalExports(t, e = !0) {
    p(this, T, e ? Hn(t) : t), l(this, M).forEach($);
  }
  watchExports(t) {
    const e = () => t(l(this, T));
    return l(this, M).push(e), () => void l(this, M).splice(l(this, M).indexOf(e), 1);
  }
  /**
   * A flexible utility for making sure a controller is loaded before it's used,
   * regardless of how or where a controller was defined:
   *
   * @example
   * makeGenericController(async (component, controller) => {
   *   // Await some controller from the component:
   *   await controller.use(component.someController);
   *   // Initialize new controllers
   *   await controller.use(load(importCoreReactiveUtils));
   *   await controller.use(new ViewModelController(component,newWidgetsHomeHomeViewModel));
   *   await controller.use(someController(component));
   * });
   *
   * @remarks
   * If your controller is not async, and you are not creating it async, then
   * you are not required to use controller.use - you can use it directly.
   * Similarly, accessing controllers after componentWillLoad callback does not
   * require awaiting them as they are guaranteed to be loaded by then.
   */
  get use() {
    return ct(l(this, C)), da;
  }
  /**
   * Just like controller.use, but returns the controller itself, rather than it's
   * exports
   *
   * Use cases:
   * - You have a controller and you want to make sure it's loaded before you
   *   try to use it
   * - Your controller is not using exports, so you wish to access some props on
   *   it directly
   * - You have a controller exports only, and you want to retrieve the
   *   controller itself. This is useful if you wish to call .watchExports() or
   *   some other method on the controller
   */
  get useRef() {
    return ct(l(this, C)), ha;
  }
  /**
   * Like useRef, but doesn't wait for the controller to get ready
   *
   * @private
   */
  get useRefSync() {
    return ct(l(this, C)), Ze;
  }
  controllerRemoved() {
    l(this, C).el.isConnected && this.triggerDisconnected(), this.triggerDestroy();
  }
  // Register a lifecycle callback
  onConnected(t) {
    l(this, ut).push(t);
  }
  onDisconnected(t) {
    l(this, pt).push(t);
  }
  onLoad(t) {
    l(this, Q).push(t);
  }
  onLoaded(t) {
    l(this, ft).push(t);
  }
  onUpdate(t) {
    l(this, bt).push(t);
  }
  onUpdated(t) {
    l(this, gt).push(t);
  }
  onDestroy(t) {
    l(this, vt).push(t);
  }
  onLifecycle(t) {
    l(this, mt).push(t), this.connectedCalled && l(this, C).el.isConnected && O(this, yt, Xt).call(this, t);
  }
  // Call each lifecycle hook
  /** @private */
  triggerConnected() {
    const t = this;
    t.hostConnected && $(t.hostConnected, t), l(t, ut).forEach($), t.triggerLifecycle(), t.connectedCalled = !0;
  }
  /** @private */
  triggerDisconnected() {
    const t = this;
    t.hostDisconnected && $(t.hostDisconnected, t), l(t, pt).forEach($), l(t, j).forEach($), p(t, j, []);
  }
  /** @private */
  async triggerLoad() {
    if (l(this, X))
      return;
    p(this, X, !0);
    const t = this;
    t.hostLoad && await Oe(t.hostLoad, t), l(this, Q).length > 0 && await Promise.allSettled(l(this, Q).map(Oe)), this.P.resolve(l(this, T));
  }
  /** @private */
  triggerLoaded() {
    this.loadedCalled || (this.hostLoaded && $(this.hostLoaded, this), l(this, ft).forEach($), this.loadedCalled = !0);
  }
  /** @private */
  triggerUpdate(t) {
    this.hostUpdate && $(this.hostUpdate, this, t), l(this, bt).forEach(Dn, t);
  }
  /** @private */
  triggerUpdated(t) {
    this.hostUpdated && $(this.hostUpdated, this, t), l(this, gt).forEach(Dn, t);
  }
  /** @private */
  triggerDestroy() {
    this.hostDestroy && $(this.hostDestroy, this), l(this, vt).forEach($);
  }
  /** @private */
  triggerLifecycle() {
    this.hostLifecycle && O(this, yt, Xt).call(this, () => this.hostLifecycle()), l(this, mt).forEach(O(this, yt, Xt), this);
  }
}
ut = new WeakMap(), pt = new WeakMap(), Q = new WeakMap(), ft = new WeakMap(), bt = new WeakMap(), gt = new WeakMap(), vt = new WeakMap(), mt = new WeakMap(), j = new WeakMap(), X = new WeakMap(), C = new WeakMap(), T = new WeakMap(), M = new WeakMap(), yt = new WeakSet(), Xt = function(t) {
  ct(l(this, C));
  const e = $(t);
  (Array.isArray(e) ? e : [e]).forEach((a) => {
    typeof a == "function" ? l(this, j).push(a) : typeof a == "object" && typeof a.remove == "function" && l(this, j).push(a.remove);
  });
};
function Dn(n) {
  $(n, void 0, this);
}
const Ua = en, Hn = (n) => {
  if (typeof n != "object" && typeof n != "function" || n === null)
    return n;
  const t = {
    get(i, a, o) {
      if (!((a === "exports" || a === "_exports") && a in i && i[a] === e) && (a in i || a in Promise.prototype || typeof a == "symbol"))
        return typeof i == "function" ? i[a] : Reflect.get(i, a, o);
    }
  }, e = new Proxy(n, t);
  return e;
}, Da = (n) => (
  //#endregion camelToKebab
  n.replace(Ha, (t, e) => `${e === 0 ? "" : "-"}${t.toLowerCase()}`)
), Ha = /[A-Z]+(?![a-z])|[A-Z]/gu, Fa = 1, ja = 2, Ba = 4, Wa = 8, qa = 16, Va = 32, Ga = 64, Ka = 128, gi = (n) => {
  var e, i;
  let t = n;
  for (; t = t.parentNode ?? t.host; )
    if ((e = t == null ? void 0 : t.constructor) != null && e.lumina) {
      const a = t;
      return (i = a.manager) != null && i.loadedCalled || (a.J ?? a._offspring).push(n), (a.I ?? a._postLoad).promise;
    }
  return !1;
}, Fn = {};
function vi() {
}
function mi(n) {
  for (const t of ["Associated", "Disabled", "Reset", "StateRestore"]) {
    const e = `orm${t}Callback`;
    n.prototype["f" + e] = async function(...i) {
      await this.componentOnReady(), (this.el ?? this).dispatchEvent(
        new CustomEvent(`luminaF${e}`, { detail: i })
      );
    };
  }
}
const Yt = Object.defineProperty, Ja = globalThis.HTMLElement ?? vi;
var E, U, $t, Wt, Ne;
const le = class le extends Ja {
  constructor() {
    var a, o;
    super();
    f(this, Wt);
    f(this, E);
    f(this, U);
    f(this, $t);
    p(this, U, {}), p(this, $t, []), this.I = new Dt(), this.H = new Dt(), this.J = [];
    const e = this, i = e.constructor;
    e._offspring = e.J, e._postLoad = e.I, (a = i.C) == null || a.forEach((r) => {
      Object.hasOwn(e, r) && (l(e, U)[r] = e[r], delete e[r]);
    }), i.A ? O(o = e, Wt, Ne).call(o, { a: i.A }) : i.B.then(async (r) => {
      var s, c;
      await i.K.p, O(c = e, Wt, Ne).call(
        c,
        /**
         * "$$" is our top-level await polyfill due to broken top-level await
         * support in Safari. Only applies in CDN build.
         * See https://devtopia.esri.com/WebGIS/arcgis-web-components/issues/3933
         * and https://bugs.webkit.org/show_bug.cgi?id=242740
         */
        await (((s = r.default) == null ? void 0 : s.then(
          (d) => typeof d == "function" ? { a: d } : d
        )) ?? r)
      );
    }).catch((r) => {
      e.H.reject(r), setTimeout(() => {
        throw r;
      });
    });
  }
  static F() {
    for (const e of this.C ?? [])
      Yt(this.prototype, e, {
        configurable: !0,
        enumerable: !0,
        get() {
          return l(this, U)[e];
        },
        set(i) {
          l(this, U)[e] = i;
        }
      });
    for (const e of this.E ?? [])
      Yt(this.prototype, e, {
        async value(...i) {
          return l(this, E) || await this.H.promise, await l(this, E)[e](...i);
        },
        configurable: !0
      });
    for (const e of this.D ?? [])
      Yt(this.prototype, e, {
        value(...i) {
          return l(this, E)[e](...i);
        },
        configurable: !0
      });
  }
  get manager() {
    var e;
    return (e = l(this, E)) == null ? void 0 : e.manager;
  }
  /*
   * This method must be statically present rather than added later, or else,
   * browsers won't call it. Same for connected and disconnected callbacks.
   */
  attributeChangedCallback(e, i, a) {
    var o;
    (o = l(this, E)) == null || o.attributeChangedCallback(e, i, a), l(this, E) || l(this, $t).push(e);
  }
  connectedCallback() {
    var e, i;
    l(this, E) ? (i = (e = l(this, E)).connectedCallback) == null || i.call(e) : queueMicrotask(() => this.G = gi(this));
  }
  disconnectedCallback() {
    var e, i;
    (i = (e = l(this, E)) == null ? void 0 : e.disconnectedCallback) == null || i.call(e);
  }
  /**
   * Creates a promise that resolves once the component is fully loaded
   */
  async componentOnReady() {
    return await this.H.promise, this;
  }
  /**
   * Implemented on the proxy for compatibility with Lit Context.
   */
  addController() {
  }
  /**
   * Implemented on the proxy for compatibility with Lit Context.
   */
  requestUpdate() {
    var e;
    (e = l(this, E)) == null || e.requestUpdate();
  }
};
E = new WeakMap(), U = new WeakMap(), $t = new WeakMap(), Wt = new WeakSet(), Ne = function(e) {
  var m;
  const i = this.constructor, a = i.L, o = l(this, U), r = Object.values(e).find(
    (y) => y.L === a
  ), s = `${a}--lazy`;
  let c = r;
  for (; c && !Object.hasOwn(c, "lumina"); )
    c = Object.getPrototypeOf(c);
  Qa(c), !i.A && (i.A = r, customElements.define(s, r)), r.N = this;
  const h = document.createElement(s);
  r.N = void 0, p(this, E, h), p(this, U, h), l(this, $t).forEach(
    (y) => h.attributeChangedCallback(
      y,
      // Lit doesn't look at this value, thus even if attribute already exists, that's ok
      null,
      this.getAttribute(y)
    )
  ), Object.entries(o).forEach(Za, h);
  const u = this.isConnected;
  (u || this.G) && ((m = h.connectedCallback) == null || m.call(h), u || h.disconnectedCallback());
}, le.lumina = !0, mi(le);
let jn = le;
function Za([n, t]) {
  this[n] = t;
}
const Qa = (n) => {
  const t = n.prototype, e = Element.prototype;
  Object.hasOwn(t, "isConnected") || (t.setAttribute = function(a, o) {
    e.setAttribute.call(this.el, a, o);
  }, t.removeAttribute = function(a) {
    e.removeAttribute.call(this.el, a);
  }, t.hasAttribute = function(a) {
    return e.hasAttribute.call(this.el, a);
  }, Yt(t, "isConnected", {
    get() {
      return Reflect.get(e, "isConnected", this.el);
    }
  }));
};
var D, _, xt;
class Xa extends Ua {
  constructor(e) {
    super(e);
    f(this, D);
    f(this, _);
    f(this, xt);
    this.destroyed = !1, this.R = !1, this.V = v, this.T = [], p(this, xt, /* @__PURE__ */ new WeakMap()), p(this, _, e), this.exports = void 0, this.hasDestroy = Ie in e && typeof e.destroy == "function", nt.prototype.addController.call(e, {
      // Lit will call these callbacks
      // We do not directly implement hostConnected and etc on ControllerManager
      // because ControllerManager is also included in the list of controllers
      // we manage - and for each controller we manage we call hostConnected
      // (from inside of .triggerConnected). So there would be an infinite
      // loop if Lit calls hostConnected which in turn calls
      // triggerConnected which calls hostConnected again.
      hostConnected: () => {
        if (this.destroyed) {
          const i = e.el.localName;
          throw e.el.remove(), new Error(
            `The ${i} component has already been destroyed. It cannot be used again. If you meant to disconnect and reconnect a component without automatic destroy, set the ${Ie} prop.`
          );
        }
        l(this, D) !== void 0 && clearTimeout(l(this, D)), be();
        for (const i of e.M)
          "triggerConnected" in i ? i.triggerConnected() : $(i.hostConnected, i);
      },
      hostDisconnected: () => {
        for (const i of e.M)
          "triggerDisconnected" in i ? i.triggerDisconnected() : $(i.hostDisconnected, i);
        this.hasDestroy && !this.destroyed && this.U();
      },
      hostUpdate: () => {
        for (const i of e.M)
          "triggerUpdate" in i ? i.triggerUpdate(this.Q) : $(i.hostUpdate, i, this.Q);
      },
      hostUpdated: () => {
        for (const i of e.M)
          "triggerUpdated" in i ? i.triggerUpdated(this.Q) : $(i.hostUpdated, i, this.Q);
        this.Q = void 0;
      }
    }), queueMicrotask(() => this.R = !0), ct(e);
  }
  // Keep this method async needlessly for now to avoid a breaking change if we
  // would need to make it async in the future
  // eslint-disable-next-line @typescript-eslint/require-await
  async destroy() {
    if (!this.destroyed) {
      l(this, _).el.isConnected && (this.hasDestroy = !1, l(this, _).el.remove()), p(this, D, void 0), this.destroyed = !0;
      for (const e of l(this, _).M)
        "triggerDestroy" in e ? e.triggerDestroy() : $(e.hostDestroy, e);
      l(this, _).M.splice(0);
    }
  }
  /** @private */
  U() {
    l(this, D) !== void 0 && clearTimeout(l(this, D)), !l(this, _).el.isConnected && !l(this, _).autoDestroyDisabled && p(this, D, Oa(() => void l(this, _).destroy(), Ya));
  }
  /** @private */
  S(e, i) {
    const a = this.T;
    this.V = v, this.T = [], a.forEach((o) => o(e, i));
  }
  /**
   * Associate an exports object with a controller for reverse lookup in
   * controller.use
   *
   * @private
   */
  W(e, i) {
    (typeof i == "object" && i !== null || typeof i == "function") && l(this, xt).set(i, e);
  }
  /** @private */
  X(e) {
    if (typeof e == "object" && e !== null || typeof e == "function")
      return l(this, xt).get(e);
  }
}
D = new WeakMap(), _ = new WeakMap(), xt = new WeakMap();
let Ya = 1e3;
const Ie = "autoDestroyDisabled";
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
const nn = { ATTRIBUTE: 1, CHILD: 2 }, ge = (n) => (...t) => ({ _$litDirective$: n, values: t });
let ve = class {
  constructor(t) {
  }
  get _$AU() {
    return this._$AM._$AU;
  }
  _$AT(t, e, i) {
    this._$Ct = t, this._$AM = e, this._$Ci = i;
  }
  _$AS(t, e) {
    return this.update(t, e);
  }
  update(t, e) {
    return this.render(...e);
  }
};
/**
 * @license
 * Copyright 2018 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
const to = ge(class extends ve {
  constructor(n) {
    var t;
    if (super(n), n.type !== nn.ATTRIBUTE || n.name !== "class" || ((t = n.strings) == null ? void 0 : t.length) > 2) throw Error("`classMap()` can only be used in the `class` attribute and must be the only part in the attribute.");
  }
  render(n) {
    return " " + Object.keys(n).filter((t) => n[t]).join(" ") + " ";
  }
  update(n, [t]) {
    var i, a;
    if (this.st === void 0) {
      this.st = /* @__PURE__ */ new Set(), n.strings !== void 0 && (this.nt = new Set(n.strings.join(" ").split(/\s/).filter((o) => o !== "")));
      for (const o in t) t[o] && !((i = this.nt) != null && i.has(o)) && this.st.add(o);
      return this.render(t);
    }
    const e = n.element.classList;
    for (const o of this.st) o in t || (e.remove(o), this.st.delete(o));
    for (const o in t) {
      const r = !!t[o];
      r === this.st.has(o) || (a = this.nt) != null && a.has(o) || (r ? (e.add(o), this.st.add(o)) : (e.remove(o), this.st.delete(o)));
    }
    return q;
  }
});
/**
 * @license
 * Copyright 2018 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
const yi = "important", eo = " !" + yi, no = ge(class extends ve {
  constructor(n) {
    var t;
    if (super(n), n.type !== nn.ATTRIBUTE || n.name !== "style" || ((t = n.strings) == null ? void 0 : t.length) > 2) throw Error("The `styleMap` directive must be used in the `style` attribute and must be the only part in the attribute.");
  }
  render(n) {
    return Object.keys(n).reduce((t, e) => {
      const i = n[e];
      return i == null ? t : t + `${e = e.includes("-") ? e : e.replace(/(?:^(webkit|moz|ms|o)|)(?=[A-Z])/g, "-$&").toLowerCase()}:${i};`;
    }, "");
  }
  update(n, [t]) {
    const { style: e } = n.element;
    if (this.ft === void 0) return this.ft = new Set(Object.keys(t)), this.render(t);
    for (const i of this.ft) t[i] == null && (this.ft.delete(i), i.includes("-") ? e.removeProperty(i) : e[i] = null);
    for (const i in t) {
      const a = t[i];
      if (a != null) {
        this.ft.add(i);
        const o = typeof a == "string" && a.endsWith(eo);
        i.includes("-") || o ? e.setProperty(i, o ? a.slice(0, -11) : a, o ? yi : "") : e[i] = a;
      }
    }
    return q;
  }
});
/**
 * @license
 * Copyright 2020 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
const io = (n) => n.strings === void 0, ao = {}, oo = (n, t = ao) => n._$AH = t;
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
const Ot = (n, t) => {
  var i;
  const e = n._$AN;
  if (e === void 0) return !1;
  for (const a of e) (i = a._$AO) == null || i.call(a, t, !1), Ot(a, t);
  return !0;
}, ee = (n) => {
  let t, e;
  do {
    if ((t = n._$AM) === void 0) break;
    e = t._$AN, e.delete(n), n = t;
  } while ((e == null ? void 0 : e.size) === 0);
}, $i = (n) => {
  for (let t; t = n._$AM; n = t) {
    let e = t._$AN;
    if (e === void 0) t._$AN = e = /* @__PURE__ */ new Set();
    else if (e.has(n)) break;
    e.add(n), co(t);
  }
};
function ro(n) {
  this._$AN !== void 0 ? (ee(this), this._$AM = n, $i(this)) : this._$AM = n;
}
function so(n, t = !1, e = 0) {
  const i = this._$AH, a = this._$AN;
  if (a !== void 0 && a.size !== 0) if (t) if (Array.isArray(i)) for (let o = e; o < i.length; o++) Ot(i[o], !1), ee(i[o]);
  else i != null && (Ot(i, !1), ee(i));
  else Ot(this, n);
}
const co = (n) => {
  n.type == nn.CHILD && (n._$AP ?? (n._$AP = so), n._$AQ ?? (n._$AQ = ro));
};
class lo extends ve {
  constructor() {
    super(...arguments), this._$AN = void 0;
  }
  _$AT(t, e, i) {
    super._$AT(t, e, i), $i(this), this.isConnected = t._$AU;
  }
  _$AO(t, e = !0) {
    var i, a;
    t !== this.isConnected && (this.isConnected = t, t ? (i = this.reconnected) == null || i.call(this) : (a = this.disconnected) == null || a.call(this)), e && (Ot(this, t), ee(this));
  }
  setValue(t) {
    if (io(this._$Ct)) this._$Ct._$AI(t, this);
    else {
      const e = [...this._$Ct._$AH];
      e[this._$Ci] = t, this._$Ct._$AI(e, this, 0);
    }
  }
  disconnected() {
  }
  reconnected() {
  }
}
/**
 * @license
 * Copyright 2020 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
const ne = () => new ho();
class ho {
}
const we = /* @__PURE__ */ new WeakMap(), dt = ge(class extends lo {
  render(n) {
    return v;
  }
  update(n, [t]) {
    var i;
    const e = t !== this.G;
    return e && this.rt(void 0), (e || this.lt !== this.ct) && (this.G = t, this.ht = (i = n.options) == null ? void 0 : i.host, this.rt(this.ct = n.element)), v;
  }
  rt(n) {
    if (this.G !== void 0) if (this.isConnected || (n = void 0), typeof this.G == "function") {
      const t = this.ht ?? globalThis;
      let e = we.get(t);
      e === void 0 && (e = /* @__PURE__ */ new WeakMap(), we.set(t, e)), e.get(this.G) !== void 0 && this.G.call(this.ht, void 0), e.set(this.G, n), n !== void 0 && this.G.call(this.ht, n);
    } else this.G.value = n;
  }
  get lt() {
    var n, t;
    return typeof this.G == "function" ? (n = we.get(this.ht ?? globalThis)) == null ? void 0 : n.get(this.G) : (t = this.G) == null ? void 0 : t.value;
  }
  disconnected() {
    this.lt === this.ct && this.rt(void 0);
  }
  reconnected() {
    this.rt(this.ct);
  }
});
var Y, qt, Vt, tt, R, Gt, H, Me, xi, ki;
const J = class J extends nt {
  constructor() {
    super();
    f(this, H);
    /**
     * The JS API's Accessor observables. This is used to integrate with the JS
     * API's reactivity system.
     *
     * @private
     */
    f(this, Y);
    f(this, qt);
    f(this, Vt);
    f(this, tt);
    f(this, R);
    f(this, Gt);
    this.M = [], this.manager = new Xa(this);
    const e = this, i = e.constructor, a = i.N, o = i.K.o, r = J.prototype.shouldUpdate;
    p(e, tt, (a == null ? void 0 : a.H) ?? new Dt()), e.I = (a == null ? void 0 : a.I) ?? new Dt(), e.J = (a == null ? void 0 : a.J) ?? [], e._offspring = e.J, e._postLoad = e.I, e.el = a ?? e, p(e, Vt, e.enableUpdating), e.enableUpdating = vi, e.shouldUpdate !== r && (p(e, qt, e.shouldUpdate), e.shouldUpdate = r), o && (p(e, Y, /* @__PURE__ */ new Map()), i.elementProperties.forEach((s, c) => l(e, Y).set(c, o())));
  }
  /**
   * Customize Lit's default style handling to support non-shadow-root styles
   */
  static finalizeStyles(e) {
    var o;
    const i = super.finalizeStyles(e), a = this.shadowRootOptions === Fn;
    return ((o = this.K) == null ? void 0 : o.commonStyles) === void 0 || a ? i : [this.K.commonStyles, ...i];
  }
  static createProperty(e, i) {
    const a = typeof i == "number" ? i : Array.isArray(i) ? i[0] : 0, o = Array.isArray(i) ? i[1] : void 0, r = (o == null ? void 0 : o.hasChanged) ?? Ye, s = {
      /**
       * By default to infer attribute name from property name, Lit just
       * converts property name to lowercase. That is consistent with
       * native DOM attributes.
       *
       * However, that is not consistent with Stencil and would be a
       * breaking change for us. Also, kebab-case is more common among the
       * web components. But the most important reason is that we have
       * some pretty long attribute names, which would be utterly
       * unreadable in lowercase.
       *
       * Also, if browsers add new attributes, that may cause a conflict
       * with our attributes.
       *
       * Thus, overwriting Lit's default behavior to use kebab-case:
       */
      attribute: a & Fa && typeof e == "string" ? Da(e) : !1,
      reflect: !!(a & ja),
      type: a & Ba ? Boolean : a & Wa ? Number : void 0,
      /**
       * At the moment in Lit, state:true just means attribute:false, so this
       * line is technically redundant, but let's keep it here just in case Lit
       * will add more meaning to state:true in the future.
       */
      state: !!(a & qa),
      // Controllers add this option to Lit
      readOnly: !!(a & Va),
      noAccessor: !!(a & Ga),
      useDefault: !!(a & Ka),
      c: !1,
      ...o,
      hasChanged(c, d) {
        const h = r(c, d);
        return s.c = h, h;
      }
    };
    super.createProperty(e, s);
  }
  static getPropertyDescriptor(e, i, a) {
    const o = this.K, r = super.getPropertyDescriptor(e, i, a);
    return a.d = r, {
      ...r,
      get() {
        var s, c;
        return (s = o.t) == null || s.call(o, l(this, Y).get(e)), (c = r.get) == null ? void 0 : c.call(this);
      },
      set(s) {
        var d, h;
        const c = this.manager;
        if (a.readOnly && !Te && (c.R || c.connectedCalled))
          throw Error(
            `Cannot assign to read-only property "${e}" of ${this.el.localName}. Trying to assign "${s}"`
          );
        r.set.call(this, s ?? void 0), a.c && ((h = (d = l(this, Y)) == null ? void 0 : d.get(e)) == null || h.notify()), c.T.length > 0 && (be(), c == null || c.S(e, s));
      }
    };
  }
  /**
   * @see [MDN ElementInternals](https://developer.mozilla.org/docs/Web/API/ElementInternals)
   */
  get elementInternals() {
    return l(this, Gt) ?? p(this, Gt, this.el.attachInternals()), l(this, Gt);
  }
  connectedCallback() {
    this.hasAttribute("defer-hydration") || O(this, H, Me).call(this, !0);
  }
  disconnectedCallback() {
    var e;
    super.disconnectedCallback(), (e = l(this, R)) == null || e.destroy(), p(this, R, void 0);
  }
  /**
   * Overwrite Lit's default behavior of attaching shadow root to the lit
   * element, and instead use this.el to support lazy builds.
   *
   * Also, support the case when component asked to not use shadow root
   */
  createRenderRoot() {
    const e = this.el.shadowRoot, i = this.constructor, a = i.shadowRootOptions, r = e ?? (a === Fn ? this.el : this.el.attachShadow(a));
    if (e)
      return this.manager.connectedCalled || O(this, H, Me).call(this, !1), nt.prototype.createRenderRoot.call(this), e;
    if (this.isConnected) {
      const s = r.getRootNode();
      s.adoptedStyleSheets = [
        ...s.adoptedStyleSheets,
        ...i.elementStyles.map((c) => "styleSheet" in c ? c.styleSheet : c)
      ];
    }
    return r;
  }
  /**
   * Overwriting default shouldUpdate simply to get access to
   * "changedProperties" so that we can later provide it to ControllerManager
   */
  shouldUpdate(e) {
    var i;
    return this.manager.Q = e, ((i = l(this, qt)) == null ? void 0 : i.call(this, e)) ?? !0;
  }
  update(e) {
    l(this, R) ? O(this, H, xi).call(this, e) : super.update(e);
  }
  listen(e, i, a) {
    const o = (i == null ? void 0 : i.bind(this)) ?? i;
    this.manager.onLifecycle(() => (this.el.addEventListener(e, o, a), () => this.el.removeEventListener(e, o, a)));
  }
  listenOn(e, i, a, o) {
    const r = (a == null ? void 0 : a.bind(this)) ?? a;
    this.manager.onLifecycle(() => (e.addEventListener(i, r, o), () => e.removeEventListener(i, r, o)));
  }
  /**
   * Creates a promise that resolves once the component is fully loaded.
   *
   * @example
   * const map = document.createElement('arcgis-map');
   * document.body.append(map);
   * map.componentOnReady().then(() => {
   *   console.log('Map is ready to go!');
   * });
   */
  async componentOnReady() {
    return await l(this, tt).promise, this;
  }
  /**
   * Adds a controller to the host, which connects the controller's lifecycle
   * methods to the host's lifecycle.
   *
   * @remarks
   * Even though Lit's LitElement already has addController,
   * we overwrite it with a compatible version to have more control over
   * timing, and to add support for load/loaded lifecycle hooks.
   */
  addController(e) {
    var i;
    this.M.push(e), !(Je in e) && this.renderRoot && this.el.isConnected && ((i = e.hostConnected) == null || i.call(e));
  }
  /**
   * Removes a controller from the host.
   */
  removeController(e) {
    var i;
    this.M.splice(this.M.indexOf(e), 1), (i = e.controllerRemoved) == null || i.call(e);
  }
};
Y = new WeakMap(), qt = new WeakMap(), Vt = new WeakMap(), tt = new WeakMap(), R = new WeakMap(), Gt = new WeakMap(), H = new WeakSet(), Me = function(e) {
  var o, r;
  const i = (r = (o = this.constructor.K).c) == null ? void 0 : r.call(o, () => this.requestUpdate());
  p(this, R, i);
  const a = !this.manager.connectedCalled;
  e && $e(J.prototype, this, "connectedCallback").call(this), a ? queueMicrotask(
    // eslint-disable-next-line @typescript-eslint/promise-function-async, @typescript-eslint/no-misused-promises
    () => O(this, H, ki).call(this).catch((s) => {
      l(this, tt).reject(s), setTimeout(() => {
        throw s;
      });
    })
  ) : i && this.requestUpdate();
}, xi = function(e) {
  try {
    l(this, R).clear(), this.constructor.K.r(
      l(this, R),
      () => $e(J.prototype, this, "update").call(this, e)
    );
  } catch (i) {
    throw l(this, R).clear(), i;
  }
}, ki = async function() {
  var o, r;
  const e = this.el.G ?? gi(this.el);
  e && await e;
  const i = [];
  for (const s of this.M)
    "triggerLoad" in s ? i.push(s.triggerLoad()) : i.push(Oe(s.hostLoad, s));
  await Promise.all(i), await ((o = this.load) == null ? void 0 : o.call(this)), this.manager.hasDestroy && this.manager.onUpdate(
    (s) => s.has(Ie) && this.manager.U()
  ), l(this, Vt).call(this, !0), this.performUpdate(), this.I.resolve(), await 0;
  const a = this.J.filter((s) => {
    var c;
    return !((c = s.manager) != null && c.loadedCalled);
  });
  a.length && await Promise.allSettled(a.map(async (s) => await s.componentOnReady())), this.J.length = 0, this.el.setAttribute(this.constructor.K.hydratedAttribute, "");
  for (const s of this.M)
    "triggerLoaded" in s ? s.triggerLoaded() : $(s.hostLoaded, s);
  (r = this.loaded) == null || r.call(this), l(this, tt).resolve();
}, J.lumina = !0, mi(J);
let V = J;
const uo = (n) => {
  let t;
  const e = (a) => {
    var o;
    t = new URL(
      a,
      /**
       * setAssetPath() is called in global scope whenever Lumina runtime is
       * imported. Thus we need to carefully handle different environments.
       *
       * Need `|| undefined` because Stencil's unit tests mock-dock defines
       * `location.href` as empty string, which crashes `new URL()`. Stencil's
       * test environment does not define `NODE_ENV` by default, so we have to
       * add a few bytes to production.
       *
       * For happy-dom and jsdom, we are assuming that `NODE_ENV` is set.
       * Depending on configuration, `location?.href` is either undefined (not
       * an exception) or `about:blank` (an exception - thus handling that case
       * explicitly).
       *
       * For Node.js without a DOM environment, `location?.href` is undefined so
       * all is good.
       */
      ((o = globalThis.location) == null ? void 0 : o.href) || void 0
    ).href;
  }, i = {
    ...n,
    // FEATURE: research https://vitejs.dev/guide/build.html#advanced-base-options
    getAssetPath(a) {
      var r;
      const o = new URL(a, t);
      return o.origin !== ((r = globalThis.location) == null ? void 0 : r.origin) ? o.href : o.pathname;
    },
    setAssetPath: e,
    customElement(a, o) {
      o.K = i, o.L = a, customElements.get(a) || customElements.define(a, o);
    }
  };
  return e(n.defaultAssetPath), i;
}, g = (n) => typeof n == "object" && n != null ? to(n) : n, po = (n) => typeof n == "object" && n != null ? no(n) : n, k = v;
function fo(n, t, e) {
  e == null ? n.removeAttribute(t) : n.setAttribute(t, e);
}
const bo = {
  toAttribute: (n) => n === !0 ? "" : n === !1 ? null : n
}, go = "calcite-mode-auto", vo = "calcite-mode-dark";
function Bn() {
  const { classList: n } = document.body, t = window.matchMedia("(prefers-color-scheme: dark)").matches, e = () => n.contains(vo) || n.contains(go) && t ? "dark" : "light", i = (r) => document.body.dispatchEvent(new CustomEvent("calciteModeChange", { bubbles: !0, detail: { mode: r } })), a = (r) => {
    o !== r && i(r), o = r;
  };
  let o = e();
  i(o), window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", (r) => a(r.matches ? "dark" : "light")), new MutationObserver(() => a(e())).observe(document.body, {
    attributes: !0,
    attributeFilter: ["class"]
  });
}
let Se;
const mo = {
  focusTrapStack: [],
  logLevel: "info"
};
function yo() {
  return {
    ...mo,
    ...globalThis.calciteConfig ?? {}
  };
}
function Ci() {
  return Se || (Se = yo()), Se;
}
const Wn = "5.1.2", $o = "2026-07-03", xo = "76e59cb3c";
function ko() {
  const n = Ci();
  n && n.version || (console.info(`Using Calcite Components ${Wn} [Date: ${$o}, Revision: ${xo}]`), Object.defineProperty(n, "version", {
    value: Wn,
    writable: !1
  }), globalThis.calciteConfig = n);
}
document.readyState === "interactive" ? Bn() : document.addEventListener("DOMContentLoaded", Bn, { once: !0 });
queueMicrotask(ko);
const Co = uo({ defaultAssetPath: "https://js.arcgis.com/calcite-components/5.1.2/", hydratedAttribute: "calcite-hydrated" }), { customElement: St, getAssetPath: Ei, setAssetPath: as } = Co;
function Eo(n) {
  return n.map((t) => {
    let e = "";
    for (let i = 0; i < t; i++)
      e += ((1 + Math.random()) * 65536 | 0).toString(16).substring(1);
    return e;
  }).join("-");
}
const wi = () => Eo([2, 1, 1, 1, 3]), wo = (n) => (...t) => {
  const e = oi(), i = new n(...t), a = i.exports;
  ai(e.at(-1));
  const o = i.component.manager;
  o.W(i, a), i.watchExports(o.W.bind(o, i)), ca(i);
  const r = [i.component, ...e].reverse();
  return fi(
    r,
    (s) => s === void 0 ? void 0 : So(i, s, a),
    a
  );
}, So = (n, { host: t, key: e, isReactive: i }, a) => {
  var u;
  const o = t, r = o[e] !== n.exports, s = o[e] !== a, c = a !== n.exports;
  if (r && !s && c && (o[e] = n.exports), t === n.component) {
    if (i) {
      const m = n.component.manager;
      s && m.W(n, o[e]), n.onUpdate((y) => {
        if (y.has(e)) {
          const L = o[e];
          L !== n.exports && m.W(n, L);
        }
      });
    }
    n.O = i ? void 0 : e;
  }
  const h = (u = n.component.constructor.elementProperties.get(e)) == null ? void 0 : u.readOnly;
  n.watchExports(() => {
    o[e] !== n.exports && (h ? ua(() => {
      o[e] = n.exports;
    }) : o[e] = n.exports);
  });
}, Ao = (n, t) => {
  let e = n;
  for (; e; ) {
    if (e === t)
      return !0;
    if (!e.parentNode)
      return !1;
    e.parentNode instanceof ShadowRoot ? e = e.parentNode.host : e = e.parentNode;
  }
  return !1;
}, Si = (n, t, e) => {
  const i = zo(t).subscribe;
  return i((a) => {
    a.some((r) => Ao(n, r.target)) && e();
  });
}, Ae = {}, zo = (n) => {
  const t = n.join(","), e = Ae[t];
  if (e !== void 0)
    return e;
  const i = /* @__PURE__ */ new Set(), a = new MutationObserver((r) => i.forEach((s) => s(r)));
  globalThis.document && a.observe(document.documentElement, {
    attributes: !0,
    attributeFilter: n,
    subtree: !0
  });
  const o = {
    subscribe: (r) => (i.add(r), () => {
      i.delete(r), i.size === 0 && (a.disconnect(), Ae[t] = void 0);
    })
  };
  return Ae[t] = o, o;
}, _o = (n, t) => {
  var i, a;
  let e = n;
  for (; e; ) {
    const o = (i = e.closest) == null ? void 0 : i.call(e, t);
    if (o)
      return o;
    const r = (a = e.getRootNode) == null ? void 0 : a.call(e);
    if (r === globalThis.document)
      return;
    e = r == null ? void 0 : r.host;
  }
}, Ai = (n, t, e) => {
  const i = _o(n, `[${t}]`);
  return (i == null ? void 0 : i.getAttribute(t)) ?? e;
}, Lo = "ar,bg,bs,ca,cs,da,de,el,en,es,et,fi,fr,he,hr,hu,id,it,ja,ko,lt,lv,nl,nb,no,pl,pt-BR,pt-PT,ro,ru,sk,sl,sr,sv,th,tr,uk,vi,zh-CN,zh-HK,zh-TW".split(
  ","
), Oo = (
  //#endregion supportedLocales
  /* @__PURE__ */ new Set(Lo)
), ie = "en", To = {
  //#region localeEquivalencies
  // Locale equivalencies aligned with ArcGIS Maps SDK for JavaScript:
  // https://developers.arcgis.com/javascript/latest/localization/#locale-support
  // We resolve to `pt-BR` as it will have the same translations as `pt`, which has no corresponding bundle
  pt: "pt-BR",
  // We support both 'nb' and 'no' (BCP 47) for Norwegian but only `no` has corresponding bundle
  nb: "no",
  // We support both 'nn' and 'no' (BCP 47) for Norwegian but only `no` has corresponding bundle
  // See https://devtopia.esri.com/WebGIS/arcgis-web-components/issues/4667
  nn: "no",
  // We use `zh-CN` as base translation for chinese locales which has no corresponding bundle.
  zh: "zh-CN"
  //#endregion localeEquivalencies
}, Ro = async (n, t, e = "") => {
  const i = `${t}/${e}`, a = `${i}${n}.json`;
  return ze[a] ?? (ze[a] = zi(n, i)), await ze[a];
}, ze = {}, zi = async (n, t) => {
  const e = `${t}${n}.json`;
  try {
    const i = await fetch(e);
    if (i.ok)
      return await i.json();
  } catch (i) {
    return pi("error", "intl", `An unknown error occurred while fetching localization strings at ${e}`, {
      detail: { error: i }
    }), {};
  }
  return n === ie ? {} : await zi(ie, t);
}, _i = (n) => {
  var e;
  const t = Ai(n, "lang", ((e = globalThis.navigator) == null ? void 0 : e.language) || ie);
  return { lang: t, t9nLocale: Li(t) };
}, Li = (n) => {
  const [t, e] = n.split("-"), i = t.toLowerCase();
  let a = i;
  return e && (a = `${i}-${e.toUpperCase()}`), a = To[a] ?? a, Oo.has(a) ? a : e ? Li(i) : ie;
}, Po = (n, t, e, i) => {
  let a;
  const o = () => No(n, t(), i).then((r) => {
    ((a == null ? void 0 : a.lang) !== r.lang || a.t9nLocale !== r.t9nLocale || a.t9nStrings !== r.t9nStrings) && e(r), a = r;
  }).catch((r) => {
    pi("error", "intl", "Error updating component locale state", { detail: { error: r } });
  });
  return queueMicrotask(o), Si(n, ["lang"], o);
}, No = async (n, t, e = n.localName.split("-").slice(1).join("-")) => {
  const { lang: i, t9nLocale: a } = _i(n), o = `${t}/${e}/t9n`, s = (
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    e === null ? {} : await Ro(a, o, "messages.")
  );
  return { lang: i, t9nLocale: a, t9nStrings: s };
}, Oi = (n) => Ti(void 0, n), an = (n) => (t) => Ti(
  t,
  /**
   * GenericController is identical to Controller, in all except for typing.
   * So doing a type-cast here so as not to needlessly add one more object
   * to the prototype chain
   */
  n
);
class Io extends en {
  constructor(t, e) {
    super(t);
    const i = this.exports;
    try {
      ct(this.component);
      const a = e(this.component, this), o = this.exports !== i;
      if (sa(a)) {
        o || this.setProvisionalExports(a);
        const r = a.then((s) => {
          this.exports = s, super.catchUpLifecycle();
        }).catch((s) => {
          this.P.reject(s);
        });
        this.onLoad(async () => await r);
      } else
        (!o || a !== void 0) && (this.exports = a), queueMicrotask(() => super.catchUpLifecycle());
    } catch (a) {
      this.P.reject(a);
    }
  }
  /** Noop - will be called in the constructor instead */
  catchUpLifecycle() {
  }
}
const Ti = wo(Io), Mo = (n, t) => new Uo(n, t);
var kt, Ct, Kt;
class Uo extends en {
  constructor(e, i) {
    super();
    f(this, kt);
    f(this, Ct);
    f(this, Kt);
    p(this, Ct, e), p(this, Kt, i), p(this, kt, new MutationObserver((a) => {
      a.forEach((o) => {
        e.includes(o.attributeName) && i.call(
          this.component,
          this.component.el.getAttribute(o.attributeName),
          o.oldValue,
          o.attributeName
        );
      });
    }));
  }
  hostConnected() {
    l(this, Ct).forEach((e) => {
      this.component.el.hasAttribute(e) && l(this, Kt).call(this.component, this.component.el.getAttribute(e), null, e);
    }), l(this, kt).observe(this.component.el, {
      attributes: !0,
      attributeOldValue: !0,
      attributeFilter: l(this, Ct)
    });
  }
  hostDisconnected() {
    l(this, kt).disconnect();
  }
}
kt = new WeakMap(), Ct = new WeakMap(), Kt = new WeakMap();
const qn = "ltr", Do = () => Oi((n, t) => {
  t.exports = qn, t.onLifecycle(() => {
    const e = () => {
      const i = Ai(n.el, "dir", qn);
      t.exports = i === "rtl" ? "rtl" : "ltr";
    };
    return e(), Si(n.el, ["dir"], e);
  });
}), Ho = (n) => (t = {}) => (
  // eslint-disable-next-line @typescript-eslint/promise-function-async
  Oi((e, i) => {
    const a = _i(e.el), o = { _lang: a.lang, _t9nLocale: a.t9nLocale, _loading: !0 }, r = e;
    i.onLifecycle(
      () => Po(
        e.el,
        () => n("./assets"),
        ({ t9nLocale: c, t9nStrings: d, lang: h }) => {
          const u = {
            ...d,
            _lang: h,
            _t9nLocale: c,
            _loading: !1
          };
          i.exports = u;
          const m = d.componentLabel;
          typeof m == "string" && "label" in e && e.label == null && (e.label ?? (e.label = m)), s(r.messageOverrides);
        },
        t.name
      )
    );
    const s = (c) => {
      const d = i.exports, h = d._original ?? d, u = Ri(h, c);
      c && (u._original = h), i.exports = u;
    };
    return "messageOverrides" in r && i.onUpdate((c) => {
      c.has("messageOverrides") && s(r.messageOverrides);
    }), t.blocking ? (i.setProvisionalExports(o, !1), i.ready) : o;
  })
), Ri = (n, t) => {
  if (!t)
    return n;
  const e = { ...n };
  return Object.entries(t).forEach(([i, a]) => {
    n[i] !== void 0 && (typeof a == "object" ? e[i] = Ri(n[i], a) : e[i] = a ?? n[i]);
  }), e;
}, on = Ho(Ei), ot = {
  percentage: "percentage",
  progressRing: "ring--progress",
  ring: "ring",
  rings: "rings",
  text: "text",
  trackRing: "ring--track"
}, Fo = wt`:host{position:relative;margin-inline:auto;display:flex;align-items:center;justify-content:center;opacity:1;flex-direction:column;min-block-size:var(--calcite-loader-size);font-size:var(--calcite-loader-font-size);stroke-width:var(--calcite-internal-stroke-width);fill:none;transform:scale(1);padding-block:var(--calcite-loader-spacing, 4rem)}:host([scale=s]){--calcite-internal-stroke-width: 3;--calcite-internal-text-offset: var(--calcite-spacing-xxs);--calcite-internal-loader-font-size: var(--calcite-font-size--3);--calcite-internal-loader-size: 2rem;--calcite-internal-loader-size-inline: .75rem;--calcite-internal-loader-value-line-height: .625rem}:host([scale=m]){--calcite-internal-stroke-width: 6;--calcite-internal-text-offset: var(--calcite-spacing-sm);--calcite-internal-loader-font-size: var(--calcite-font-size-relative-md);--calcite-internal-loader-size: 4rem;--calcite-internal-loader-size-inline: 1rem;--calcite-internal-loader-value-line-height: 1.375rem}:host([scale=l]){--calcite-internal-stroke-width: 8;--calcite-internal-text-offset: var(--calcite-spacing-md);--calcite-internal-loader-font-size: var(--calcite-font-size-relative-xl);--calcite-internal-loader-size: 6rem;--calcite-internal-loader-size-inline: 1.5rem;--calcite-internal-loader-value-line-height: 1.71875rem}.text{display:block;text-align:center;font-size:var(--calcite-font-size-relative-sm);line-height:var(--calcite-font-line-height-sm);margin-block-start:var(--calcite-loader-text-spacing, var(--calcite-internal-text-offset));font-weight:var(--calcite-loader-text-weight, var(--calcite-font-weight-normal));color:var(--calcite-loader-text-color, var(--calcite-color-text-1))}.percentage{display:block;text-align:center;font-size:var(--calcite-loader-font-size);inline-size:var(--calcite-loader-size, var(--calcite-internal-loader-size));line-height:var(--calcite-internal-loader-value-line-height);align-self:center;color:var(--calcite-loader-text-color, var(--calcite-color-text-1))}.rings{position:relative;display:flex;overflow:visible;opacity:1;inline-size:var(--calcite-loader-size, var(--calcite-internal-loader-size));block-size:var(--calcite-loader-size, var(--calcite-internal-loader-size))}.ring{position:absolute;inset-block-start:0px;transform-origin:center;overflow:visible;inset-inline-start:0;inline-size:var(--calcite-loader-size, var(--calcite-internal-loader-size));block-size:var(--calcite-loader-size, var(--calcite-internal-loader-size))}.ring--track{stroke:var(--calcite-loader-track-color, var(--calcite-color-transparent-press))}.ring--progress{stroke:var(--calcite-loader-progress-color, var(--calcite-color-brand));transform:rotate(-90deg);transition:all var(--calcite-internal-animation-timing-fast) linear}:host([type=indeterminate]) .ring--progress{animation:loader-clockwise calc(var(--calcite-internal-animation-timing-slow) / var(--calcite-internal-duration-factor) * 2 / var(--calcite-internal-duration-factor)) linear infinite}:host([inline]){--calcite-internal-stroke-width: 2;position:relative;margin:0;stroke:currentColor;stroke-width:2;padding-block:0px;block-size:var(--calcite-loader-size, var(--calcite-loader-size-inline, var(--calcite-internal-loader-size-inline)));min-block-size:var(--calcite-loader-size, var(--calcite-loader-size-inline, var(--calcite-internal-loader-size-inline)));inline-size:var(--calcite-loader-size, var(--calcite-loader-size-inline, var(--calcite-internal-loader-size-inline)));vertical-align:calc(var(--calcite-loader-size, var(--calcite-loader-size-inline, var(--calcite-internal-loader-size-inline))) * -1 * .2)}:host([inline]) .rings{inset-block-start:0px;margin:0;inset-inline-start:0;inline-size:var(--calcite-loader-size, var(--calcite-loader-size-inline, var(--calcite-internal-loader-size-inline)));block-size:var(--calcite-loader-size, var(--calcite-loader-size-inline, var(--calcite-internal-loader-size-inline)))}:host([inline]) .ring{inline-size:var(--calcite-loader-size, var(--calcite-loader-size-inline, var(--calcite-internal-loader-size-inline)));block-size:var(--calcite-loader-size, var(--calcite-loader-size-inline, var(--calcite-internal-loader-size-inline)))}:host([inline]) .ring--progress{stroke:var(--calcite-loader-progress-color-inline, currentColor)}:host([complete]){opacity:0;transform:scale(.75);transform-origin:center;transition:opacity var(--calcite-internal-animation-timing-medium) linear 1s,transform var(--calcite-internal-animation-timing-medium) linear 1s}:host([complete]) .rings{opacity:0;transform:scale(.75);transform-origin:center;transition:opacity calc(.18s * var(--calcite-internal-duration-factor)) linear .8s,transform calc(.18s * var(--calcite-internal-duration-factor)) linear .8s}:host([complete]) .percentage{color:var(--calcite-color-brand);transform:scale(1.05);transform-origin:center;transition:color var(--calcite-internal-animation-timing-medium) linear,transform var(--calcite-internal-animation-timing-medium) linear}@keyframes loader-clockwise{0%{transform:rotate(0)}to{transform:rotate(360deg)}}:host([hidden]){display:none}[hidden]{display:none}`, de = class de extends V {
  constructor() {
    super(...arguments), this.messages = on({ name: null }), this.complete = !1, this.inline = !1, this.scale = "m", this.text = "", this.type = "indeterminate", this.value = 0;
  }
  connectedCallback() {
    super.connectedCallback(), this.updateFormatter();
  }
  load() {
    requestAnimationFrame(() => this.valueChangeHandler());
  }
  willUpdate(t) {
    t.has("value") && (this.hasUpdated || this.value !== 0) && this.valueChangeHandler(), (t.has("type") && (this.hasUpdated || this.type !== "indeterminate") || t.has("messages")) && this.updateFormatter();
  }
  valueChangeHandler() {
    this.complete = this.type.startsWith("determinate") && this.value === 100;
  }
  formatValue() {
    return this.type !== "determinate-value" ? `${this.value}` : this.formatter.format(this.value / 100);
  }
  getSize(t) {
    return {
      s: 32,
      m: 64,
      l: 96
    }[t];
  }
  getInlineSize(t) {
    return {
      s: 12,
      m: 16,
      l: 24
    }[t];
  }
  updateFormatter() {
    var t;
    this.type !== "determinate-value" || ((t = this.formatter) == null ? void 0 : t.resolvedOptions().locale) === this.messages._lang || (this.formatter = new Intl.NumberFormat(this.messages._lang, {
      style: "percent"
    }));
  }
  render() {
    const { el: t, inline: e, label: i, text: a, type: o, value: r } = this, s = t.id || wi(), c = o !== "indeterminate", d = Math.floor(r);
    return this.el.ariaLabel = i, this.el.ariaValueMax = c ? "100" : void 0, this.el.ariaValueMin = c ? "0" : void 0, this.el.ariaValueNow = c ? d.toString() : void 0, fo(this.el, "id", s), this.el.role = "progressbar", b`<div class=${g(ot.rings)}>${this.renderRing("track")}${this.renderRing("progress")}${!e && c && b`<div class=${g(ot.percentage)}>${this.formatValue()}</div>` || ""}</div>${!e && a && b`<div class=${g(ot.text)}>${a}</div>` || ""}`;
  }
  renderRing(t) {
    const { inline: e, scale: i, value: a } = this, o = e ? this.getInlineSize(i) : this.getSize(i), s = o * 0.45;
    let c;
    if (t === "progress") {
      const d = 2 * s * Math.PI, h = (this.type.startsWith("determinate") ? a : 24) / 100 * d, u = d - h;
      c = { "stroke-dasharray": `${h} ${u}` };
    }
    return b`<svg aria-hidden=true class=${g({
      [ot.ring]: !0,
      [ot.trackRing]: t === "track",
      [ot.progressRing]: t === "progress"
    })} style=${po(c)} viewBox=${`0 0 ${o} ${o}`}>${Pe`<circle cx=${o / 2} cy=${o / 2} r=${s ?? v} />`}</svg>`;
  }
};
de.properties = { complete: [7, {}, { reflect: !0, type: Boolean }], inline: [7, {}, { reflect: !0, type: Boolean }], label: 1, scale: [3, {}, { reflect: !0 }], text: 1, type: [3, {}, { reflect: !0 }], value: [9, {}, { type: Number }] }, de.styles = Fo;
let Ue = de;
St("calcite-loader", Ue);
function jo(n) {
  return (!!n).toString();
}
function Ht(n, t, e) {
  const i = Bo(n);
  return new i(t, e);
}
function Bo(n) {
  class t extends window.MutationObserver {
    constructor(i) {
      super(i), this.observedEntry = [], this.callback = i;
    }
    observe(i, a) {
      return this.observedEntry.push({ target: i, options: a }), super.observe(i, a);
    }
    unobserve(i) {
      const a = this.observedEntry.filter((o) => o.target !== i);
      this.observedEntry = [], this.callback(super.takeRecords(), this), this.disconnect(), a.forEach((o) => this.observe(o.target, o.options));
    }
  }
  return (function() {
    return n === "intersection" ? window.IntersectionObserver : n === "mutation" ? t : window.ResizeObserver;
  })();
}
function Wo(n, t, e, i) {
  if (n && (t && n.unobserve(t), !!e)) {
    if (n instanceof MutationObserver) {
      n.observe(e, i);
      return;
    }
    n.observe(e);
  }
}
const Vn = /* @__PURE__ */ new Set(), Gn = {
  trace: 0,
  debug: 1,
  info: 2,
  warn: 4,
  error: 8,
  off: 10
};
function qo(n) {
  return Gn[n] >= Gn[Ci().logLevel];
}
function st(n, ...t) {
  if (!qo(n))
    return;
  console[n]("%ccalcite", "background: #007AC2; color: #fff; border-radius: 4px; padding: 2px 4px;", ...t);
}
let Kn;
const Vo = {
  debug: (n) => st("debug", n),
  info: (n) => st("info", n),
  warn: (n) => st("warn", n),
  error: (n) => st("error", n),
  trace: (n) => st("trace", n),
  deprecated: Go
};
function Go(n, { component: t, name: e, suggested: i, removalVersion: a }) {
  const o = `${n}:${n === "component" ? "" : t}${e}`, r = a === "future" ? "a future version" : `v${a}`;
  if (Vn.has(o))
    return;
  Vn.add(o);
  let s = "";
  s = n === "component" ? `This component is deprecated and will be removed in ${r}.` : `The [${e}] ${n} is deprecated and will be removed in ${r}.`, i && (Kn = new Intl.ListFormat("en", { style: "long", type: "disjunction" }), s += ` Use ${Kn.format([i].flat().map((d) => `"${d}"`))} instead.`);
  const c = `[${t.el.tagName.toLocaleLowerCase().slice(8)}] - ${s}`;
  st("warn", c);
}
const Jn = {
  flipRtl: "flip-rtl",
  svg: "svg"
}, Pi = {}, _e = {}, Ni = {
  s: 16,
  m: 24,
  l: 32
};
function Ii({ icon: n, scale: t }) {
  const e = Ni[t], i = Zo(n), a = i.charAt(i.length - 1) === "F";
  return `${a ? i.substring(0, i.length - 1) : i}${e}${a ? "F" : ""}`;
}
async function Ko(n) {
  const t = Ii(n), e = Mi(t);
  if (e)
    return e;
  _e[t] || (_e[t] = fetch(Ei(`./assets/icon/${t}.json`)).then((a) => a.json()).catch(() => (Vo.error(`${n.icon} (${n.scale}) icon failed to load`), "")));
  const i = await _e[t];
  return Pi[t] = i, i;
}
function Jo(n) {
  return Mi(Ii(n));
}
function Mi(n) {
  return Pi[n];
}
function Zo(n) {
  const t = !isNaN(Number(n.charAt(0))), e = n.split("-");
  if (e.length > 0) {
    const a = /[a-z]/i;
    n = e.map((o, r) => o.replace(a, function(c, d) {
      return r === 0 && d === 0 ? c : c.toUpperCase();
    })).join("");
  }
  return t ? `i${n}` : n;
}
const Qo = wt`:host{display:inline-flex;color:var(--calcite-icon-color, var(--calcite-ui-icon-color, currentColor))}:host([scale=s]){inline-size:16px;block-size:16px;min-inline-size:16px;min-block-size:16px}:host([scale=m]){inline-size:24px;block-size:24px;min-inline-size:24px;min-block-size:24px}:host([scale=l]){inline-size:32px;block-size:32px;min-inline-size:32px;min-block-size:32px}.flip-rtl{transform:scaleX(-1)}.svg{display:block}:host([hidden]){display:none}[hidden]{display:none}`, he = class he extends V {
  constructor() {
    super(...arguments), this.direction = Do(), this.visible = !1, this.flipRtl = !1, this.icon = null, this.preload = !1, this.scale = "m";
  }
  connectedCallback() {
    if (super.connectedCallback(), this.preload) {
      this.visible = !0, this.loadIconPathData();
      return;
    }
    this.visible || this.waitUntilVisible(() => {
      this.visible = !0, this.loadIconPathData();
    });
  }
  willUpdate(t) {
    (t.has("icon") && (this.hasUpdated || this.icon !== null) || t.has("scale") && (this.hasUpdated || this.scale !== "m")) && this.loadIconPathData();
  }
  disconnectedCallback() {
    var t;
    super.disconnectedCallback(), (t = this.intersectionObserver) == null || t.disconnect(), this.intersectionObserver = null;
  }
  async loadIconPathData() {
    const { icon: t, scale: e, visible: i } = this;
    if (!t || !i)
      return;
    const a = { icon: t, scale: e }, o = Jo(a) || await Ko(a);
    t === this.icon && (this.pathData = o);
  }
  waitUntilVisible(t) {
    if (this.intersectionObserver = Ht("intersection", (e) => {
      e.forEach((i) => {
        i.isIntersecting && (this.intersectionObserver.disconnect(), this.intersectionObserver = null, t());
      });
    }, { rootMargin: "50px" }), !this.intersectionObserver) {
      t();
      return;
    }
    this.intersectionObserver.observe(this.el);
  }
  render() {
    const { flipRtl: t, pathData: e, scale: i, textLabel: a } = this, o = this.direction, r = Ni[i], s = !!a, c = [].concat(e || "");
    return this.el.ariaHidden = jo(!s), this.el.ariaLabel = s ? a : null, this.el.role = s ? "img" : null, b`<svg aria-hidden=true class=${g({
      [Jn.flipRtl]: o === "rtl" && t,
      [Jn.svg]: !0
    })} fill=currentColor height=100% viewBox=${`0 0 ${r} ${r}`} width=100% xmlns=http://www.w3.org/2000/svg>${c.map((d) => typeof d == "string" ? Pe`<path d=${d ?? v} />` : Pe`<path d=${d.d ?? v} opacity=${("opacity" in d ? d.opacity : 1) ?? v} />`)}</svg>`;
  }
};
he.properties = { pathData: [16, {}, { state: !0 }], visible: [16, {}, { state: !0 }], flipRtl: [7, {}, { reflect: !0, type: Boolean }], icon: [3, { type: String }, { reflect: !0 }], preload: [7, {}, { reflect: !0, type: Boolean }], scale: [3, {}, { reflect: !0 }], textLabel: 1 }, he.styles = Qo;
let De = he;
St("calcite-icon", De);
/**
 * @license
 * Copyright 2020 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
const rn = Symbol.for(""), Xo = (n) => {
  if ((n == null ? void 0 : n.r) === rn) return n == null ? void 0 : n._$litStatic$;
}, Yo = (n) => ({ _$litStatic$: n, r: rn }), He = (n, ...t) => ({ _$litStatic$: t.reduce((e, i, a) => e + ((o) => {
  if (o._$litStatic$ !== void 0) return o._$litStatic$;
  throw Error(`Value passed to 'literal' function must be a 'literal' result: ${o}. Use 'unsafeStatic' to pass non-literal values, but
            take care to ensure page security.`);
})(i) + n[a + 1], n[0]), r: rn }), Zn = /* @__PURE__ */ new Map(), tr = (n) => (t, ...e) => {
  const i = e.length;
  let a, o;
  const r = [], s = [];
  let c, d = 0, h = !1;
  for (; d < i; ) {
    for (c = t[d]; d < i && (o = e[d], (a = Xo(o)) !== void 0); ) c += a + t[++d], h = !0;
    d !== i && s.push(o), r.push(c), d++;
  }
  if (d === i && r.push(t[i]), h) {
    const u = r.join("$$lit$$");
    (t = Zn.get(u)) === void 0 && (r.raw = r, Zn.set(u, t = r)), e = s;
  }
  return n(t, ...e);
}, Ui = tr(b);
var er = ["input:not([inert]):not([inert] *)", "select:not([inert]):not([inert] *)", "textarea:not([inert]):not([inert] *)", "a[href]:not([inert]):not([inert] *)", "button:not([inert]):not([inert] *)", "[tabindex]:not(slot):not([inert]):not([inert] *)", "audio[controls]:not([inert]):not([inert] *)", "video[controls]:not([inert]):not([inert] *)", '[contenteditable]:not([contenteditable="false"]):not([inert]):not([inert] *)', "details>summary:first-of-type:not([inert]):not([inert] *)", "details:not([inert]):not([inert] *)"], Fe = /* @__PURE__ */ er.join(","), Di = typeof Element > "u", Ft = Di ? function() {
} : Element.prototype.matches || Element.prototype.msMatchesSelector || Element.prototype.webkitMatchesSelector, ae = !Di && Element.prototype.getRootNode ? function(n) {
  var t;
  return n == null || (t = n.getRootNode) === null || t === void 0 ? void 0 : t.call(n);
} : function(n) {
  return n == null ? void 0 : n.ownerDocument;
}, oe = function(t, e) {
  var i;
  e === void 0 && (e = !0);
  var a = t == null || (i = t.getAttribute) === null || i === void 0 ? void 0 : i.call(t, "inert"), o = a === "" || a === "true", r = o || e && t && // closest does not exist on shadow roots, so we fall back to a manual
  // lookup upward, in case it is not defined.
  (typeof t.closest == "function" ? t.closest("[inert]") : oe(t.parentNode));
  return r;
}, nr = function(t) {
  var e, i = t == null || (e = t.getAttribute) === null || e === void 0 ? void 0 : e.call(t, "contenteditable");
  return i === "" || i === "true";
}, Hi = function(t, e, i) {
  if (oe(t))
    return [];
  var a = Array.prototype.slice.apply(t.querySelectorAll(Fe));
  return e && Ft.call(t, Fe) && a.unshift(t), a = a.filter(i), a;
}, re = function(t, e, i) {
  for (var a = [], o = Array.from(t); o.length; ) {
    var r = o.shift();
    if (!oe(r, !1))
      if (r.tagName === "SLOT") {
        var s = r.assignedElements(), c = s.length ? s : r.children, d = re(c, !0, i);
        i.flatten ? a.push.apply(a, d) : a.push({
          scopeParent: r,
          candidates: d
        });
      } else {
        var h = Ft.call(r, Fe);
        h && i.filter(r) && (e || !t.includes(r)) && a.push(r);
        var u = r.shadowRoot || // check for an undisclosed shadow
        typeof i.getShadowRoot == "function" && i.getShadowRoot(r), m = !oe(u, !1) && (!i.shadowRootFilter || i.shadowRootFilter(r));
        if (u && m) {
          var y = re(u === !0 ? r.children : u.children, !0, i);
          i.flatten ? a.push.apply(a, y) : a.push({
            scopeParent: r,
            candidates: y
          });
        } else
          o.unshift.apply(o, r.children);
      }
  }
  return a;
}, Fi = function(t) {
  return !isNaN(parseInt(t.getAttribute("tabindex"), 10));
}, ji = function(t) {
  if (!t)
    throw new Error("No node provided");
  return t.tabIndex < 0 && (/^(AUDIO|VIDEO|DETAILS)$/.test(t.tagName) || nr(t)) && !Fi(t) ? 0 : t.tabIndex;
}, ir = function(t, e) {
  var i = ji(t);
  return i < 0 && e && !Fi(t) ? 0 : i;
}, ar = function(t, e) {
  return t.tabIndex === e.tabIndex ? t.documentOrder - e.documentOrder : t.tabIndex - e.tabIndex;
}, Bi = function(t) {
  return t.tagName === "INPUT";
}, or = function(t) {
  return Bi(t) && t.type === "hidden";
}, rr = function(t) {
  var e = t.tagName === "DETAILS" && Array.prototype.slice.apply(t.children).some(function(i) {
    return i.tagName === "SUMMARY";
  });
  return e;
}, sr = function(t, e) {
  for (var i = 0; i < t.length; i++)
    if (t[i].checked && t[i].form === e)
      return t[i];
}, cr = function(t) {
  if (!t.name)
    return !0;
  var e = t.form || ae(t), i = function(s) {
    return e.querySelectorAll('input[type="radio"][name="' + s + '"]');
  }, a;
  if (typeof window < "u" && typeof window.CSS < "u" && typeof window.CSS.escape == "function")
    a = i(window.CSS.escape(t.name));
  else
    try {
      a = i(t.name);
    } catch (r) {
      return console.error("Looks like you have a radio button with a name attribute containing invalid CSS selector characters and need the CSS.escape polyfill: %s", r.message), !1;
    }
  var o = sr(a, t.form);
  return !o || o === t;
}, lr = function(t) {
  return Bi(t) && t.type === "radio";
}, dr = function(t) {
  return lr(t) && !cr(t);
}, hr = function(t) {
  var e, i = t && ae(t), a = (e = i) === null || e === void 0 ? void 0 : e.host, o = !1;
  if (i && i !== t) {
    var r, s, c;
    for (o = !!((r = a) !== null && r !== void 0 && (s = r.ownerDocument) !== null && s !== void 0 && s.contains(a) || t != null && (c = t.ownerDocument) !== null && c !== void 0 && c.contains(t)); !o && a; ) {
      var d, h, u;
      i = ae(a), a = (d = i) === null || d === void 0 ? void 0 : d.host, o = !!((h = a) !== null && h !== void 0 && (u = h.ownerDocument) !== null && u !== void 0 && u.contains(a));
    }
  }
  return o;
}, Qn = function(t) {
  var e = t.getBoundingClientRect(), i = e.width, a = e.height;
  return i === 0 && a === 0;
}, ur = function(t, e) {
  var i = e.displayCheck, a = e.getShadowRoot;
  if (i === "full-native" && "checkVisibility" in t) {
    var o = t.checkVisibility({
      // Checking opacity might be desirable for some use cases, but natively,
      // opacity zero elements _are_ focusable and tabbable.
      checkOpacity: !1,
      opacityProperty: !1,
      contentVisibilityAuto: !0,
      visibilityProperty: !0,
      // This is an alias for `visibilityProperty`. Contemporary browsers
      // support both. However, this alias has wider browser support (Chrome
      // >= 105 and Firefox >= 106, vs. Chrome >= 121 and Firefox >= 122), so
      // we include it anyway.
      checkVisibilityCSS: !0
    });
    return !o;
  }
  if (getComputedStyle(t).visibility === "hidden")
    return !0;
  var r = Ft.call(t, "details>summary:first-of-type"), s = r ? t.parentElement : t;
  if (Ft.call(s, "details:not([open]) *"))
    return !0;
  if (!i || i === "full" || // full-native can run this branch when it falls through in case
  // Element#checkVisibility is unsupported
  i === "full-native" || i === "legacy-full") {
    if (typeof a == "function") {
      for (var c = t; t; ) {
        var d = t.parentElement, h = ae(t);
        if (d && !d.shadowRoot && a(d) === !0)
          return Qn(t);
        t.assignedSlot ? t = t.assignedSlot : !d && h !== t.ownerDocument ? t = h.host : t = d;
      }
      t = c;
    }
    if (hr(t))
      return !t.getClientRects().length;
    if (i !== "legacy-full")
      return !0;
  } else if (i === "non-zero-area")
    return Qn(t);
  return !1;
}, pr = function(t) {
  if (/^(INPUT|BUTTON|SELECT|TEXTAREA)$/.test(t.tagName))
    for (var e = t.parentElement; e; ) {
      if (e.tagName === "FIELDSET" && e.disabled) {
        for (var i = 0; i < e.children.length; i++) {
          var a = e.children.item(i);
          if (a.tagName === "LEGEND")
            return Ft.call(e, "fieldset[disabled] *") ? !0 : !a.contains(t);
        }
        return !0;
      }
      e = e.parentElement;
    }
  return !1;
}, je = function(t, e) {
  return !(e.disabled || or(e) || ur(e, t) || // For a details element with a summary, the summary element gets the focus
  rr(e) || pr(e));
}, Xn = function(t, e) {
  return !(dr(e) || ji(e) < 0 || !je(t, e));
}, fr = function(t) {
  var e = parseInt(t.getAttribute("tabindex"), 10);
  return !!(isNaN(e) || e >= 0);
}, Wi = function(t) {
  var e = [], i = [];
  return t.forEach(function(a, o) {
    var r = !!a.scopeParent, s = r ? a.scopeParent : a, c = ir(s, r), d = r ? Wi(a.candidates) : s;
    c === 0 ? r ? e.push.apply(e, d) : e.push(s) : i.push({
      documentOrder: o,
      tabIndex: c,
      item: a,
      isScope: r,
      content: d
    });
  }), i.sort(ar).reduce(function(a, o) {
    return o.isScope ? a.push.apply(a, o.content) : a.push(o.content), a;
  }, []).concat(e);
}, br = function(t, e) {
  e = e || {};
  var i;
  return e.getShadowRoot ? i = re([t], e.includeContainer, {
    filter: Xn.bind(null, e),
    flatten: !1,
    getShadowRoot: e.getShadowRoot,
    shadowRootFilter: fr
  }) : i = Hi(t, e.includeContainer, Xn.bind(null, e)), Wi(i);
}, gr = function(t, e) {
  e = e || {};
  var i;
  return e.getShadowRoot ? i = re([t], e.includeContainer, {
    filter: je.bind(null, e),
    flatten: !0,
    getShadowRoot: e.getShadowRoot
  }) : i = Hi(t, e.includeContainer, je.bind(null, e)), i;
};
const qi = {
  getShadowRoot: !0
};
function sn(n) {
  return n.getRootNode();
}
function Vi(n) {
  return n.host || null;
}
function Gi(n, {
  selector: t,
  id: e
}) {
  if (!n)
    return null;
  n.assignedSlot && (n = n.assignedSlot);
  const i = sn(n);
  return (e ? "getElementById" in i ? (
    /*
      Check to make sure 'getElementById' exists in cases where element is no longer connected to the DOM and getRootNode() returns the element.
      https://github.com/Esri/calcite-design-system/pull/4280
       */
    i.getElementById(e)
  ) : null : t ? i.querySelector(t) : null) || Gi(Vi(i), { selector: t, id: e });
}
function Ki(n, t) {
  return n ? n.closest(t) || Ki(Vi(sn(n)), t) : null;
}
function vr(n) {
  return typeof (n == null ? void 0 : n.setFocus) == "function";
}
async function mr(n, t = !1, e = "tabbable", i, a) {
  return n ? vr(n) && i !== n ? n.setFocus(a) : (e === "tabbable" ? $r : kr)(n, t, a) : void 0;
}
function yr(n, t) {
  if (n)
    return br(n, { ...qi, includeContainer: t })[0] ?? n;
}
function $r(n, t, e) {
  var i;
  (i = yr(n, t)) == null || i.focus(e);
}
function xr(n, t) {
  if (n)
    return gr(n, { ...qi, includeContainer: t })[0] ?? n;
}
function kr(n, t, e) {
  var i;
  (i = xr(n, t)) == null || i.focus(e);
}
function Cr(n, t) {
  return n.filter((e) => e.matches(t));
}
function Er(n) {
  var t;
  for (const e of n.childNodes)
    if (e.nodeType === Node.TEXT_NODE && ((t = e.textContent) == null ? void 0 : t.trim()) !== "" || e.nodeType === Node.ELEMENT_NODE)
      return !0;
  return !1;
}
function N(n) {
  return !!wr(n).length;
}
function wr(n, t) {
  return Sr(n.currentTarget, t);
}
function Sr(n, t) {
  const e = n.assignedElements({
    flatten: !0
  });
  return t ? Cr(e, t) : e;
}
function Ar(n, t) {
  if (n.parentNode !== t.parentNode)
    return !1;
  const e = Array.from(n.parentNode.children);
  return e.indexOf(n) < e.indexOf(t);
}
const Ji = "calciteInternalLabelClick", cn = "calciteInternalLabelConnected", Be = "calciteInternalLabelDisconnected", Yn = "calcite-label", jt = /* @__PURE__ */ new WeakMap(), Tt = /* @__PURE__ */ new WeakMap(), Bt = /* @__PURE__ */ new WeakMap(), se = /* @__PURE__ */ new WeakMap(), ht = /* @__PURE__ */ new Set(), zr = (n) => {
  const { id: t } = n, e = t && Gi(n, { selector: `${Yn}[for="${t}"]` });
  if (e)
    return e;
  const i = Ki(n, Yn);
  return !i || // labelable components within other custom elements are not considered labelable
  _r(i, n) ? null : i;
};
function _r(n, t) {
  let e;
  const i = "custom-element-ancestor-check", a = (r) => {
    r.stopImmediatePropagation();
    const s = r.composedPath();
    e = s.slice(s.indexOf(t), s.indexOf(n));
  };
  return n.addEventListener(i, a, { once: !0 }), t.dispatchEvent(new CustomEvent(i, { composed: !0, bubbles: !0 })), n.removeEventListener(i, a), e.filter((r) => r !== t && r !== n).filter((r) => {
    var s;
    return (s = r.tagName) == null ? void 0 : s.includes("-");
  }).length > 0;
}
function Zi(n) {
  if (!n)
    return;
  const t = zr(n.el);
  if (Tt.has(t) && t === n.labelEl || !t && ht.has(n))
    return;
  const e = Rr.bind(n);
  if (t) {
    n.labelEl = t;
    const i = jt.get(t) || [];
    i.push(n), jt.set(t, i.sort(Qi)), Tt.has(n.labelEl) || (Tt.set(n.labelEl, ti), n.labelEl.addEventListener(Ji, ti)), ht.delete(n), document.removeEventListener(cn, Bt.get(n)), se.set(n, e), document.addEventListener(Be, e);
  } else ht.has(n) || (e(), document.removeEventListener(Be, se.get(n)));
}
function Lr(n) {
  if (!n || (ht.delete(n), document.removeEventListener(cn, Bt.get(n)), document.removeEventListener(Be, se.get(n)), Bt.delete(n), se.delete(n), !n.labelEl))
    return;
  const t = jt.get(n.labelEl);
  t.length === 1 && (n.labelEl.removeEventListener(Ji, Tt.get(n.labelEl)), Tt.delete(n.labelEl)), jt.set(
    n.labelEl,
    t.filter((e) => e !== n).sort(Qi)
  ), n.labelEl = null;
}
function Qi(n, t) {
  return Ar(n.el, t.el) ? -1 : 1;
}
function Or(n) {
  var t, e;
  return n.label || ((e = (t = n.labelEl) == null ? void 0 : t.textContent) == null ? void 0 : e.trim()) || "";
}
function ti(n) {
  const t = n.detail.sourceEvent.target, e = jt.get(this), i = e.find((r) => r.el === t);
  if (e.includes(i))
    return;
  const o = e[0];
  o.disabled || o.onLabelClick(n);
}
function Tr() {
  ht.has(this) && Zi(this);
}
function Rr() {
  ht.add(this);
  const n = Bt.get(this) || Tr.bind(this);
  Bt.set(this, n), document.addEventListener(cn, n);
}
function We(n) {
  return n === "l" ? "m" : "s";
}
async function Pr(n) {
  await n.componentOnReady(), await n.updateComplete;
}
const me = () => an((n, t) => {
  let e;
  function i() {
    e == null || e.abort();
  }
  return t.onLoad(() => {
    n.listen("focus", () => {
      e = new AbortController(), n.el.addEventListener("focusout", i, { signal: e.signal });
    });
  }), t.onDisconnected(() => {
    n.el.removeEventListener("focusout", i);
  }), async (a, o) => {
    if (n.disabled)
      return;
    const r = Ir(a());
    if (!r)
      return;
    const { target: s, includeContainer: c, strategy: d } = r, h = sn(n.el), u = h.activeElement;
    if (await Pr(n), !(u !== h.activeElement || e && !(e != null && e.signal.aborted)))
      return n.el.removeEventListener("focus", i), mr(s, c, d, n.el, o);
  };
});
function Nr(n) {
  return "target" in n && ("includeContainer" in n || "strategy" in n);
}
function Ir(n) {
  if (n)
    return Nr(n) ? n : { target: n };
}
const Mr = {
  container: "interaction-container"
}, Ur = ({ children: n, disabled: t }) => b`<div class=${g(Mr.container)} .inert=${t}>${n}</div>`, Xi = an((n, t) => (t.onUpdated(() => Hr(n)), Ur));
function Dr() {
  const { disabled: n } = this;
  n || HTMLElement.prototype.click.call(this);
}
function Yi(n) {
  n.target.disabled && n.preventDefault();
}
const ta = ["mousedown", "mouseup", "click"];
function ea(n) {
  n.target.disabled && (n.stopImmediatePropagation(), n.preventDefault());
}
const ce = { capture: !0 };
function Hr(n) {
  if (n.disabled) {
    n.el.setAttribute("aria-disabled", "true"), n.el.contains(document.activeElement) && document.activeElement.blur(), Fr(n);
    return;
  }
  Br(n), n.el.removeAttribute("aria-disabled");
}
function Fr(n) {
  n.el.click = Dr, jr(n.el);
}
function jr(n) {
  n.addEventListener("pointerdown", Yi, ce), ta.forEach((t) => n.addEventListener(t, ea, ce));
}
function Br(n) {
  delete n.el.click, Wr(n.el);
}
function Wr(n) {
  n.removeEventListener("pointerdown", Yi, ce), ta.forEach((t) => n.removeEventListener(t, ea, ce));
}
const na = (n) => an((t) => {
  function e(i) {
    var o;
    const { form: a } = t.elementInternals;
    if (!(i.defaultPrevented || t.disabled || (o = n == null ? void 0 : n.disabled) != null && o.call(n) || !a || t.type === "button")) {
      if (t.type === "submit") {
        a.requestSubmit();
        return;
      }
      a.reset();
    }
  }
  t.listen("luminaFormAssociatedCallback", ({ detail: [i] }) => {
    i ? t.el.addEventListener("click", e) : t.el.removeEventListener("click", e);
  });
}), w = {
  buttonLoader: "calcite-button--loader",
  content: "content",
  contentSlotted: "content--slotted",
  icon: "icon",
  iconStart: "icon--start",
  iconEnd: "icon--end",
  loadingIn: "loading-in",
  loadingOut: "loading-out",
  iconStartEmpty: "icon-start-empty",
  iconEndEmpty: "icon-end-empty",
  buttonPadding: "button-padding",
  buttonPaddingShrunk: "button-padding--shrunk"
}, qr = wt`:host([disabled]){cursor:default;-webkit-user-select:none;user-select:none;opacity:var(--calcite-opacity-disabled)}:host([disabled]) *,:host([disabled]) ::slotted(*){pointer-events:none}:host{display:inline-block;inline-size:auto;vertical-align:middle;border-radius:var(--calcite-button-corner-radius, var(--calcite-internal-button-corner-radius, 0))}:host a,:host button{--calcite-internal-button-content-margin: .5rem;--calcite-internal-button-padding-x: 7px;--calcite-internal-button-padding-y: 3px;position:relative;box-sizing:border-box;display:flex;block-size:100%;inline-size:100%;cursor:pointer;-webkit-user-select:none;user-select:none;appearance:none;align-items:center;justify-content:center;border-style:none;text-align:center;font-family:inherit;font-weight:var(--calcite-font-weight-normal);text-decoration-line:none;outline-color:transparent;box-shadow:var(--calcite-button-shadow, var(--calcite-shadow-none));background-color:var(--calcite-button-background-color, var(--calcite-internal-button-background-color, var(--calcite-color-transparent)));border-block-start-color:var(--calcite-button-border-color, var(--calcite-internal-button-border-block-start-color, var(--calcite-internal-button-border-color, var(--calcite-color-transparent))));border-block-end-color:var(--calcite-button-border-color, var(--calcite-internal-button-border-block-end-color, var(--calcite-internal-button-border-color, var(--calcite-color-transparent))));border-inline-start-color:var(--calcite-button-border-color, var(--calcite-internal-button-border-inline-start-color, var(--calcite-internal-button-border-color, var(--calcite-color-transparent))));border-inline-end-color:var(--calcite-button-border-color, var(--calcite-internal-button-border-inline-end-color, var(--calcite-internal-button-border-color, var(--calcite-color-transparent))));border-style:solid;border-width:var(--calcite-border-width-sm);border-radius:var(--calcite-button-corner-radius, var(--calcite-internal-button-corner-radius, 0));color:var(--calcite-button-text-color, var(--calcite-internal-button-text-color, currentColor));padding-block:var(--calcite-internal-button-padding-y);padding-inline:var(--calcite-internal-button-padding-x);transition:color var(--calcite-animation-timing) ease-in-out,background-color var(--calcite-animation-timing) ease-in-out,box-shadow var(--calcite-animation-timing) ease-in-out,outline-color var(--calcite-internal-animation-timing-fast) ease-in-out}:host a:hover,:host button:hover{text-decoration-line:none;background-color:var(--calcite-button-background-color, var(--calcite-internal-button-background-color-hover, var(--calcite-color-transparent)))}:host a:focus,:host button:focus{outline:var(--calcite-border-width-md) solid var(--calcite-color-focus, var(--calcite-ui-focus-color, var(--calcite-color-brand)));outline-offset:calc(var(--calcite-spacing-base) * calc(1 - (2*clamp(0,var(--calcite-offset-invert-focus),1))));background-color:var(--calcite-button-background-color, var(--calcite-internal-button-background-color))}:host a:active,:host button:active{background-color:var(--calcite-button-background-color, var(--calcite-internal-button-background-color-press, var(--calcite-color-transparent)))}:host a span,:host button span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}:host a calcite-loader,:host button calcite-loader{color:var(--calcite-button-loader-color, var(--calcite-internal-button-loader-color, var(--calcite-button-text-color, var(--calcite-internal-button-text-color))))}:host([round]){--calcite-internal-button-corner-radius: 50px}.content{margin-inline:var(--calcite-internal-button-content-margin)}.icon-start-empty .content{margin-inline-start:unset}.icon-end-empty .content{margin-inline-end:unset}:host([scale=m]) button,:host([scale=m]) a{--calcite-internal-button-content-margin: .75rem}:host([scale=l]) button,:host([scale=l]) a{--calcite-internal-button-content-margin: 1rem}:host([width=auto]){inline-size:auto}:host([width=half]){inline-size:50%}:host([width=full]){inline-size:100%}:host([alignment=center]:not([width=auto])) a,:host([alignment=center]:not([width=auto])) button{justify-content:center}:host([alignment=start]:not([width=auto])) a,:host([alignment=start]:not([width=auto])) button{justify-content:flex-start}:host([alignment=end]:not([width=auto])) a,:host([alignment=end]:not([width=auto])) button{justify-content:flex-end}:host([alignment*=space-between]:not([width=auto])) a,:host([alignment*=space-between]:not([width=auto])) button{justify-content:space-between}:host([alignment=icon-start-space-between]:not([width=auto])) .icon--start{margin-inline-end:auto}:host([alignment=icon-start-space-between]:not([width=auto])) a,:host([alignment=icon-start-space-between]:not([width=auto])) button{text-align:unset}:host([alignment=icon-end-space-between]:not([width=auto])) .icon--end{margin-inline-start:auto}:host([alignment=icon-end-space-between]:not([width=auto])) a,:host([alignment=icon-end-space-between]:not([width=auto])) button{text-align:unset}:host([alignment=center]) a:not(.content--slotted) .icon--start+.icon--end,:host([alignment=center]) button:not(.content--slotted) .icon--start+.icon--end{margin-inline-start:var(--calcite-internal-button-content-margin)}.icon--start,.icon--end{color:var(--calcite-button-icon-color, var(--calcite-icon-color, var(--calcite-ui-icon-color)))}:host([disabled]) ::slotted([calcite-hydrated][disabled]),:host([disabled]) [calcite-hydrated][disabled]{opacity:1}.interaction-container{display:contents}@keyframes loader-in{0%{inline-size:0;opacity:0;transform:scale(.5)}to{inline-size:1em;opacity:1;transform:scale(1)}}@keyframes loader-out{0%{inline-size:1em;opacity:1;transform:scale(1)}to{inline-size:0;opacity:0;transform:scale(.5)}}.calcite-button--loader{display:flex}.calcite-button--loader calcite-loader{margin:0}:host([loading]) button.content--slotted .calcite-button--loader calcite-loader,:host([loading]) a.content--slotted .calcite-button--loader calcite-loader{margin-inline-end:var(--calcite-internal-button-content-margin)}:host([loading]) button:not(.content--slotted) .icon--start,:host([loading]) button:not(.content--slotted) .icon--end,:host([loading]) a:not(.content--slotted) .icon--start,:host([loading]) a:not(.content--slotted) .icon--end{display:none}:host([appearance]) button,:host([appearance]) a{--calcite-internal-button-border-color: var(--calcite-color-transparent);border-style:solid;border-width:var(--calcite-button-border-size, 1px)}:host([kind=brand]){--calcite-internal-button-background-color: var(--calcite-color-brand);--calcite-internal-button-background-color-hover: var(--calcite-color-brand-hover);--calcite-internal-button-background-color-press: var(--calcite-color-brand-press);--calcite-internal-button-loader-color: var(--calcite-color-text-inverse);--calcite-internal-button-text-color: var(--calcite-color-text-inverse)}:host([kind=danger]){--calcite-internal-button-background-color: var(--calcite-color-status-danger);--calcite-internal-button-background-color-hover: var(--calcite-color-status-danger-hover);--calcite-internal-button-background-color-press: var(--calcite-color-status-danger-press);--calcite-internal-button-loader-color: var(--calcite-color-text-inverse);--calcite-internal-button-text-color: var(--calcite-color-text-inverse)}:host([kind=neutral]){--calcite-internal-button-background-color: var(--calcite-color-foreground-3);--calcite-internal-button-background-color-hover: var(--calcite-color-foreground-2);--calcite-internal-button-background-color-press: var(--calcite-color-foreground-1);--calcite-internal-button-loader-color: var(--calcite-color-text-1);--calcite-internal-button-text-color: var(--calcite-color-text-1)}:host([kind=inverse]){--calcite-internal-button-background-color: var(--calcite-color-inverse);--calcite-internal-button-background-color-hover: var(--calcite-color-inverse-hover);--calcite-internal-button-background-color-press: var(--calcite-color-inverse-press);--calcite-internal-button-loader-color: var(--calcite-color-text-inverse);--calcite-internal-button-text-color: var(--calcite-color-text-inverse)}:host([appearance=outline-fill]){--calcite-internal-button-background-color: var(--calcite-color-foreground-1);--calcite-internal-button-background-color-hover: var(--calcite-color-foreground-2);--calcite-internal-button-background-color-press: var(--calcite-color-foreground-3)}:host([appearance=outline-fill]) button,:host([appearance=outline-fill]) a{border-style:solid;border-width:var(--calcite-button-border-size, 1px)}:host([appearance=outline-fill][kind=brand]) button,:host([appearance=outline-fill][kind=brand]) a{--calcite-internal-button-border-color: var(--calcite-color-brand);--calcite-internal-button-text-color: var(--calcite-color-brand);--calcite-internal-button-loader-color: var(--calcite-color-brand)}:host([appearance=outline-fill][kind=brand]) button:hover,:host([appearance=outline-fill][kind=brand]) a:hover{--calcite-internal-button-border-color: var(--calcite-color-brand-hover);--calcite-internal-button-text-color: var(--calcite-color-brand-hover)}:host([appearance=outline-fill][kind=brand]) button:focus,:host([appearance=outline-fill][kind=brand]) a:focus{--calcite-internal-button-border-color: var(--calcite-color-brand);--calcite-internal-button-text-color: var(--calcite-color-brand)}:host([appearance=outline-fill][kind=brand]) button:active,:host([appearance=outline-fill][kind=brand]) a:active{--calcite-internal-button-border-color: var(--calcite-color-brand-press);--calcite-internal-button-text-color: var(--calcite-color-brand-press)}:host([appearance=outline-fill][kind=brand]) button calcite-loader,:host([appearance=outline-fill][kind=brand]) a calcite-loader{--calcite-internal-button-loader-color: var(--calcite-color-brand)}:host([appearance=outline-fill][kind=danger]) button,:host([appearance=outline-fill][kind=danger]) a{--calcite-internal-button-border-color: var(--calcite-color-status-danger);--calcite-internal-button-text-color: var(--calcite-color-status-danger);--calcite-internal-button-loader-color: var(--calcite-color-status-danger)}:host([appearance=outline-fill][kind=danger]) button:hover,:host([appearance=outline-fill][kind=danger]) a:hover{--calcite-internal-button-border-color: var(--calcite-color-status-danger-hover);--calcite-internal-button-text-color: var(--calcite-color-status-danger-hover)}:host([appearance=outline-fill][kind=danger]) button:focus,:host([appearance=outline-fill][kind=danger]) a:focus{--calcite-internal-button-border-color: var(--calcite-color-status-danger);--calcite-internal-button-text-color: var(--calcite-color-status-danger)}:host([appearance=outline-fill][kind=danger]) button:active,:host([appearance=outline-fill][kind=danger]) a:active{--calcite-internal-button-border-color: var(--calcite-color-status-danger-press);--calcite-internal-button-text-color: var(--calcite-color-status-danger-press)}:host([appearance=outline-fill][kind=danger]) button calcite-loader,:host([appearance=outline-fill][kind=danger]) a calcite-loader{--calcite-internal-button-loader-color: var(--calcite-color-status-danger)}:host([appearance=outline-fill][kind=neutral]) button,:host([appearance=outline-fill][kind=neutral]) a{--calcite-internal-button-border-color: var(--calcite-color-border-1);--calcite-internal-button-text-color: var(--calcite-color-text-1);--calcite-internal-button-loader-color: var(--calcite-color-text-1)}:host([appearance=outline-fill][kind=neutral]) button:hover,:host([appearance=outline-fill][kind=neutral]) a:hover{--calcite-internal-button-border-color: var(--calcite-color-border-input)}:host([appearance=outline-fill][kind=neutral]) button:focus,:host([appearance=outline-fill][kind=neutral]) a:focus{--calcite-internal-button-border-color: var(--calcite-color-foreground-3)}:host([appearance=outline-fill][kind=neutral]) button:active,:host([appearance=outline-fill][kind=neutral]) a:active{--calcite-internal-button-border-color: var(--calcite-color-text-3)}:host([appearance=solid][kind=neutral]){--calcite-internal-button-background-color-hover: var(--calcite-color-border-2);--calcite-internal-button-background-color-press: var(--calcite-color-border-1)}:host([appearance=outline-fill][kind=inverse]) button,:host([appearance=outline-fill][kind=inverse]) a{--calcite-internal-button-text-color: var(--calcite-color-text-1);--calcite-internal-button-border-color: var(--calcite-color-inverse);--calcite-internal-button-loader-color: var(--calcite-color-text-1)}:host([appearance=outline-fill][kind=inverse]) button:hover,:host([appearance=outline-fill][kind=inverse]) a:hover{--calcite-internal-button-border-color: var(--calcite-color-inverse-hover)}:host([appearance=outline-fill][kind=inverse]) button:focus,:host([appearance=outline-fill][kind=inverse]) a:focus{--calcite-internal-button-border-color: var(--calcite-color-inverse)}:host([appearance=outline-fill][kind=inverse]) button:active,:host([appearance=outline-fill][kind=inverse]) a:active{--calcite-internal-button-border-color: var(--calcite-color-inverse-press)}:host([appearance=outline]){--calcite-internal-button-background-color: var(--calcite-color-transparent);--calcite-internal-button-background-color-hover: var(--calcite-color-transparent-hover);--calcite-internal-button-background-color-press: var(--calcite-color-transparent-press)}:host([appearance=outline]) button,:host([appearance=outline]) a{border-style:solid;border-width:var(--calcite-button-border-size, 1px)}:host([appearance=outline][kind=brand]) button,:host([appearance=outline][kind=brand]) a{--calcite-internal-button-border-color: var(--calcite-color-brand);--calcite-internal-button-text-color: var(--calcite-color-brand);--calcite-internal-button-loader-color: var(--calcite-color-brand)}:host([appearance=outline][kind=brand]) button:hover,:host([appearance=outline][kind=brand]) a:hover{--calcite-internal-button-border-color: var(--calcite-color-brand-hover);--calcite-internal-button-text-color: var(--calcite-color-brand-hover)}:host([appearance=outline][kind=brand]) button:focus,:host([appearance=outline][kind=brand]) a:focus{--calcite-internal-button-border-color: var(--calcite-color-brand);--calcite-internal-button-text-color: var(--calcite-color-brand)}:host([appearance=outline][kind=brand]) button:active,:host([appearance=outline][kind=brand]) a:active{--calcite-internal-button-border-color: var(--calcite-color-brand-press);--calcite-internal-button-text-color: var(--calcite-color-brand-press)}:host([appearance=outline][kind=brand]) button calcite-loader,:host([appearance=outline][kind=brand]) a calcite-loader{--calcite-internal-button-loader-color: var(--calcite-color-brand)}:host([appearance=outline][kind=danger]) button,:host([appearance=outline][kind=danger]) a{--calcite-internal-button-border-color: var(--calcite-color-status-danger);--calcite-internal-button-text-color: var(--calcite-color-status-danger);--calcite-internal-button-loader-color: var(--calcite-color-status-danger)}:host([appearance=outline][kind=danger]) button:hover,:host([appearance=outline][kind=danger]) a:hover{--calcite-internal-button-border-color: var(--calcite-color-status-danger-hover);--calcite-internal-button-text-color: var(--calcite-color-status-danger-hover)}:host([appearance=outline][kind=danger]) button:focus,:host([appearance=outline][kind=danger]) a:focus{--calcite-internal-button-border-color: var(--calcite-color-status-danger);--calcite-internal-button-text-color: var(--calcite-color-status-danger)}:host([appearance=outline][kind=danger]) button:active,:host([appearance=outline][kind=danger]) a:active{--calcite-internal-button-border-color: var(--calcite-color-status-danger-press);--calcite-internal-button-text-color: var(--calcite-color-status-danger-press)}:host([appearance=outline][kind=danger]) button calcite-loader,:host([appearance=outline][kind=danger]) a calcite-loader{--calcite-internal-button-loader-color: var(--calcite-color-status-danger)}:host([appearance=outline][kind=neutral]) button,:host([appearance=outline][kind=neutral]) a{--calcite-internal-button-text-color: var(--calcite-color-text-1);--calcite-internal-button-border-color: var(--calcite-color-border-1);--calcite-internal-button-loader-color: var(--calcite-color-text-1)}:host([appearance=outline][kind=neutral]) button:hover,:host([appearance=outline][kind=neutral]) a:hover{--calcite-internal-button-border-color: var(--calcite-color-border-input)}:host([appearance=outline][kind=neutral]) button:focus,:host([appearance=outline][kind=neutral]) a:focus{--calcite-internal-button-border-color: var(--calcite-color-foreground-3)}:host([appearance=outline][kind=neutral]) button:active,:host([appearance=outline][kind=neutral]) a:active{--calcite-internal-button-border-color: var(--calcite-color-text-3)}:host([appearance=outline][kind=inverse]) button,:host([appearance=outline][kind=inverse]) a{--calcite-internal-button-text-color: var(--calcite-color-text-1);--calcite-internal-button-border-color: var(--calcite-color-inverse);--calcite-internal-button-loader-color: var(--calcite-color-text-1)}:host([appearance=outline][kind=inverse]) button:hover,:host([appearance=outline][kind=inverse]) a:hover{--calcite-internal-button-border-color: var(--calcite-color-inverse-hover)}:host([appearance=outline][kind=inverse]) button:focus,:host([appearance=outline][kind=inverse]) a:focus{--calcite-internal-button-border-color: var(--calcite-color-inverse)}:host([appearance=outline][kind=inverse]) button:active,:host([appearance=outline][kind=inverse]) a:active{--calcite-internal-button-border-color: var(--calcite-color-inverse-press)}:host([appearance=outline-fill][split-child=primary]) button,:host([appearance=outline][split-child=primary]) button,:host([appearance=outline-fill][split-child=primary]) a,:host([appearance=outline][split-child=primary]) a{border-inline-end-width:0;border-inline-start-width:1px}:host([appearance=outline-fill][split-child=secondary]) button,:host([appearance=outline][split-child=secondary]) button,:host([appearance=outline-fill][split-child=secondary]) a,:host([appearance=outline][split-child=secondary]) a{border-inline-start-width:0;border-inline-end-width:1px}:host([appearance=transparent]){--calcite-internal-button-background-color: var(--calcite-color-transparent);--calcite-internal-button-background-color-hover: var(--calcite-color-transparent-hover);--calcite-internal-button-background-color-press: var(--calcite-color-transparent-press)}:host([appearance=transparent]:not(.enable-editing-button)){--calcite-internal-button-background-color-hover: var(--calcite-color-transparent-hover);--calcite-internal-button-background-color-press: var(--calcite-color-transparent-press)}:host([appearance=transparent][kind=brand]) button,:host([appearance=transparent][kind=brand]) a{--calcite-internal-button-text-color: var(--calcite-color-brand);--calcite-internal-button-loader-color: var(--calcite-color-brand)}:host([appearance=transparent][kind=brand]) button:hover,:host([appearance=transparent][kind=brand]) a:hover{--calcite-internal-button-text-color: var(--calcite-color-brand-hover)}:host([appearance=transparent][kind=brand]) button:focus,:host([appearance=transparent][kind=brand]) a:focus{--calcite-internal-button-text-color: var(--calcite-color-brand)}:host([appearance=transparent][kind=brand]) button:active,:host([appearance=transparent][kind=brand]) a:active{--calcite-internal-button-text-color: var(--calcite-color-brand-press)}:host([appearance=transparent][kind=brand]) button calcite-loader,:host([appearance=transparent][kind=brand]) a calcite-loader{--calcite-internal-button-loader-color: var(--calcite-color-brand)}:host([appearance=transparent][kind=danger]) button,:host([appearance=transparent][kind=danger]) a{--calcite-internal-button-text-color: var(--calcite-color-status-danger);--calcite-internal-button-loader-color: var(--calcite-color-status-danger)}:host([appearance=transparent][kind=danger]) button:hover,:host([appearance=transparent][kind=danger]) a:hover{--calcite-internal-button-text-color: var(--calcite-color-status-danger-hover)}:host([appearance=transparent][kind=danger]) button:focus,:host([appearance=transparent][kind=danger]) a:focus{--calcite-internal-button-text-color: var(--calcite-color-status-danger)}:host([appearance=transparent][kind=danger]) button:active,:host([appearance=transparent][kind=danger]) a:active{--calcite-internal-button-text-color: var(--calcite-color-status-danger-press)}:host([appearance=transparent][kind=danger]) button calcite-loader,:host([appearance=transparent][kind=danger]) a calcite-loader{--calcite-internal-button-loader-color: var(--calcite-color-status-danger)}:host([appearance=transparent][kind=neutral]:not(.cancel-editing-button)) button,:host([appearance=transparent][kind=neutral]:not(.cancel-editing-button)) a,:host([appearance=transparent][kind=neutral]:not(.cancel-editing-button)) calcite-loader{--calcite-internal-button-text-color: var(--calcite-color-text-1)}:host([appearance=transparent][kind=neutral].cancel-editing-button) button{--calcite-internal-button-text-color: var(--calcite-color-text-3)}:host([appearance=transparent][kind=neutral].cancel-editing-button) button:hover{--calcite-internal-button-text-color: var(--calcite-color-text-1);--calcite-internal-button-padding-y: 0}:host(.confirm-changes-button) button:focus,:host(.cancel-editing-button) button:focus,:host(.enable-editing-button) button:focus{outline-offset:-2px}:host([appearance=transparent][kind=inverse]){--calcite-internal-button-background-color-hover: var(--calcite-color-transparent-hover);--calcite-internal-button-background-color-press: var(--calcite-color-transparent-press)}:host([appearance=transparent][kind=inverse]) button calcite-loader,:host([appearance=transparent][kind=inverse]) a calcite-loader{--calcite-internal-button-text-color: var(--calcite-color-text-inverse)}:host([scale=s]) button.content--slotted,:host([scale=s]) a.content--slotted{font-size:var(--calcite-font-size-relative-sm);line-height:var(--calcite-font-line-height-sm)}:host([scale=s][appearance=transparent]) button.content--slotted,:host([scale=s][appearance=transparent]) a.content--slotted{--calcite-internal-button-padding-x: .5rem}:host([scale=s]) button,:host([scale=s]) a{--calcite-internal-button-padding-y: 3px}:host([scale=m]) button.content--slotted,:host([scale=m]) a.content--slotted{--calcite-internal-button-padding-x: 11px;font-size:var(--calcite-font-size-relative-base);line-height:var(--calcite-font-line-height-base)}:host([scale=m]) button,:host([scale=m]) a{--calcite-internal-button-padding-y: 7px}:host([scale=m][appearance=transparent]) button.content--slotted,:host([scale=m][appearance=transparent]) a.content--slotted{--calcite-internal-button-padding-x: .75rem}:host([scale=l]) button.content--slotted,:host([scale=l]) a.content--slotted{--calcite-internal-button-padding-x: 15px;font-size:var(--calcite-font-size-relative-md);line-height:var(--calcite-font-line-height-md)}:host([scale=l]) .button-padding{--calcite-internal-button-padding-x: 1rem;--calcite-internal-button-padding-y: 11px}:host([scale=l]) .button-padding--shrunk{--calcite-internal-button-padding-y: 9px}:host([scale=s]) button:not(.content--slotted),:host([scale=s]) a:not(.content--slotted){--calcite-internal-button-padding-x: .125rem;--calcite-internal-button-padding-y: 3px;inline-size:1.5rem;font-size:var(--calcite-font-size-relative-md);line-height:var(--calcite-font-line-height-md);min-block-size:1.5rem}:host([scale=m]) button:not(.content--slotted),:host([scale=m]) a:not(.content--slotted){--calcite-internal-button-padding-x: .125rem;--calcite-internal-button-padding-y: 7px;inline-size:2rem;font-size:var(--calcite-font-size-relative-md);line-height:var(--calcite-font-line-height-md);min-block-size:2rem}:host([scale=l]) button:not(.content--slotted),:host([scale=l]) a:not(.content--slotted){--calcite-internal-button-padding-x: .125rem;--calcite-internal-button-padding-y: 9px;inline-size:2.75rem;font-size:var(--calcite-font-size-relative-md);line-height:var(--calcite-font-line-height-md);min-block-size:2.75rem}:host(:is([scale=s],[scale=m],[scale=l])[width=full]) a:not(.content--slotted),:host(:is([scale=s],[scale=m],[scale=l])[width=full]) button:not(.content--slotted){inline-size:var(--calcite-container-size-content-fluid)}:host([scale=l][appearance=transparent]) button:not(.content--slotted),:host([scale=l][appearance=transparent]) a:not(.content--slotted){--calcite-internal-button-padding-y: var(--calcite-space-sm-plus)}:host([scale=s][icon-start][icon-end]) button:not(.content--slotted),:host([scale=s][icon-start][icon-end]) a:not(.content--slotted){--calcite-internal-button-padding-x: 23px;block-size:1.5rem;font-size:var(--calcite-font-size-relative-md);line-height:var(--calcite-font-line-height-md)}:host([scale=s][icon-start][icon-end][appearance=transparent]) button:not(.content--slotted),:host([scale=s][icon-start][icon-end][appearance=transparent]) a:not(.content--slotted){--calcite-internal-button-padding-x: 1.5rem}:host([scale=m][icon-start][icon-end]) button:not(.content--slotted),:host([scale=m][icon-start][icon-end]) a:not(.content--slotted){--calcite-internal-button-padding-x: 2rem;block-size:2rem;font-size:var(--calcite-font-size-relative-md);line-height:var(--calcite-font-line-height-md)}:host([scale=m][icon-start][icon-end][appearance=transparent]) button:not(.content--slotted),:host([scale=m][icon-start][icon-end][appearance=transparent]) a:not(.content--slotted){--calcite-internal-button-padding-x: 33px}:host([scale=l][icon-start][icon-end]) button:not(.content--slotted),:host([scale=l][icon-start][icon-end]) a:not(.content--slotted){--calcite-internal-button-padding-x: 43px;block-size:2.75rem;font-size:var(--calcite-font-size-relative-md);line-height:var(--calcite-font-line-height-md)}:host([scale=l][icon-start][icon-end]) button:not(.content--slotted) .icon--start+.icon--end,:host([scale=l][icon-start][icon-end]) a:not(.content--slotted) .icon--start+.icon--end{margin-inline-start:1rem}:host([scale=l][icon-start][icon-end][appearance=transparent]) button:not(.content--slotted),:host([scale=l][icon-start][icon-end][appearance=transparent]) a:not(.content--slotted){--calcite-internal-button-padding-x: 2.75rem}:host([hidden]){display:none}[hidden]{display:none}`, Rt = class Rt extends V {
  constructor() {
    super(...arguments), this.attributeWatch = Mo(["aria-expanded"], this.handleGlobalAttributesChanged), this.contentRef = ne(), this.formTrigger = na({ disabled: () => !!this.href })(this), this.mutationObserver = Ht("mutation", () => this.updateHasContent()), this.resizeObserver = Ht("resize", () => this.setTooltipText()), this.focusSetter = me()(this), this.messages = on(), this.interactiveContainer = Xi(this), this.hasContent = !1, this.alignment = "center", this.appearance = "solid", this.disabled = !1, this.download = !1, this.kind = "brand", this.loading = !1, this.round = !1, this.scale = "m", this.splitChild = !1, this.type = "button", this.width = "auto";
  }
  async setFocus(t) {
    return this.focusSetter(() => this.childEl, t);
  }
  connectedCallback() {
    super.connectedCallback(), this.setupTextContentObserver(), Zi(this);
  }
  async load() {
    this.updateHasContent();
  }
  loaded() {
    this.setTooltipText();
  }
  disconnectedCallback() {
    var t, e;
    super.disconnectedCallback(), (t = this.mutationObserver) == null || t.disconnect(), Lr(this), (e = this.resizeObserver) == null || e.disconnect();
  }
  handleGlobalAttributesChanged() {
    this.requestUpdate();
  }
  updateHasContent() {
    this.hasContent = Er(this.el);
  }
  setupTextContentObserver() {
    var t;
    (t = this.mutationObserver) == null || t.observe(this.el, { childList: !0, subtree: !0 });
  }
  onLabelClick() {
    this.setFocus();
  }
  setTooltipText() {
    const { contentRef: { value: t } } = this;
    t && (this.tooltipText = t.offsetWidth < t.scrollWidth && this.el.innerText || null);
  }
  setChildEl(t) {
    Wo(this.resizeObserver, this.childEl, t), this.childEl = t;
  }
  render() {
    const t = this.href ? "a" : "button", e = this.href ? He`a` : He`button`, i = this.loading ? b`<div class=${g(w.buttonLoader)}><calcite-loader class=${g(this.loading ? w.loadingIn : w.loadingOut)} inline .label=${this.messages.loading} .scale=${this.scale === "l" ? "m" : "s"}></calcite-loader></div>` : null, a = !this.iconStart && !this.iconEnd, o = b`<calcite-icon class=${g({ [w.icon]: !0, [w.iconStart]: !0 })} .flipRtl=${this.iconFlipRtl === "start" || this.iconFlipRtl === "both"} .icon=${this.iconStart} .scale=${We(this.scale)}></calcite-icon>`, r = b`<calcite-icon class=${g({ [w.icon]: !0, [w.iconEnd]: !0 })} .flipRtl=${this.iconFlipRtl === "end" || this.iconFlipRtl === "both"} .icon=${this.iconEnd} .scale=${We(this.scale)}></calcite-icon>`, s = b`<span class=${g(w.content)} ${dt(this.contentRef)}><slot></slot></span>`;
    return this.interactiveContainer({ disabled: this.disabled, children: Ui`<${e} .ariaBusy=${this.loading} .ariaExpanded=${this.el.ariaExpanded ? this.el.ariaExpanded : null} .ariaLabel=${this.loading ? this.messages.loading : Or(this)} aria-live=polite class=${g({
      [w.buttonPadding]: a,
      [w.buttonPaddingShrunk]: !a,
      [w.contentSlotted]: this.hasContent,
      [w.iconStartEmpty]: !this.iconStart,
      [w.iconEndEmpty]: !this.iconEnd
    })} .disabled=${t === "button" ? this.disabled : null} download=${(t === "a" ? this.download === !0 || this.download === "" ? "" : this.download || null : null) ?? k} href=${(t === "a" && this.href) ?? k} name=${(t === "button" && this.name) ?? k} rel=${(t === "a" && this.rel) ?? k} tabindex=${(this.disabled ? -1 : null) ?? k} target=${(t === "a" && this.target) ?? k} title=${this.tooltipText ?? k} type=${(t === "button" ? this.type : null) ?? k} ${dt(this.setChildEl)}>${i}${this.iconStart ? o : null}${this.hasContent ? s : null}${this.iconEnd ? r : null}</${e}>` });
  }
};
Rt.properties = { hasContent: [16, {}, { state: !0 }], tooltipText: [16, {}, { state: !0 }], alignment: [3, {}, { reflect: !0 }], appearance: [3, {}, { reflect: !0 }], disabled: [7, {}, { reflect: !0, type: Boolean }], download: [3, { converter: bo }, { reflect: !0 }], form: [3, {}, { reflect: !0 }], href: [3, {}, { reflect: !0 }], iconEnd: [3, { type: String }, { reflect: !0 }], iconFlipRtl: [3, {}, { reflect: !0 }], iconStart: [3, { type: String }, { reflect: !0 }], kind: [3, {}, { reflect: !0 }], label: 1, loading: [7, {}, { reflect: !0, type: Boolean }], messageOverrides: [0, {}, { attribute: !1 }], name: [3, {}, { reflect: !0 }], rel: [3, {}, { reflect: !0 }], round: [7, {}, { reflect: !0, type: Boolean }], scale: [3, {}, { reflect: !0 }], splitChild: [3, {}, { reflect: !0 }], target: [3, {}, { reflect: !0 }], type: [3, {}, { reflect: !0 }], width: [3, {}, { reflect: !0 }] }, Rt.formAssociated = !0, Rt.styles = qr;
let qe = Rt;
St("calcite-button", qe);
/**
 * @license
 * Copyright 2021 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
const it = ge(class extends ve {
  constructor() {
    super(...arguments), this.key = v;
  }
  render(n, t) {
    return this.key = n, t;
  }
  update(n, [t, e]) {
    return t !== this.key && (oo(n), this.key = t), e;
  }
}), z = {
  button: "button",
  buttonTextVisible: "button--text-visible",
  buttonCompact: "button--compact",
  indicatorText: "indicator-text",
  iconContainer: "icon-container",
  slotContainer: "slot-container",
  slotContainerHidden: "slot-container--hidden",
  textContainer: "text-container",
  textContainerVisible: "text-container--visible",
  indicatorWithIcon: "indicator-with-icon",
  indicatorWithoutIcon: "indicator-without-icon"
}, ei = "calcite-action", Vr = {
  button: (n) => `${ei}-${n}-button`,
  indicator: (n) => `${ei}-${n}-indicator`
}, Gr = wt`:host{box-sizing:border-box;background-color:var(--calcite-color-foreground-1);color:var(--calcite-color-text-2);font-size:var(--calcite-font-size--1)}:host *{box-sizing:border-box}:host([disabled]){cursor:default;-webkit-user-select:none;user-select:none;opacity:var(--calcite-opacity-disabled)}:host([disabled]) *,:host([disabled]) ::slotted(*){pointer-events:none}:host([scale=s]){--calcite-internal-action-font-size: var(--calcite-font-size--2);--calcite-internal-action-min-height: var(--calcite-size-sm);--calcite-internal-action-line-height: 1rem;--calcite-internal-action-spacing: var(--calcite-spacing-xxs)}:host([scale=m]){--calcite-internal-action-font-size: var(--calcite-font-size--1);--calcite-internal-action-min-height: var(--calcite-size-md);--calcite-internal-action-line-height: 1rem;--calcite-internal-action-spacing: var(--calcite-spacing-sm)}:host([scale=l]){--calcite-internal-action-font-size: var(--calcite-font-size-0);--calcite-internal-action-min-height: var(--calcite-size-lg);--calcite-internal-action-line-height: 1.25rem;--calcite-internal-action-spacing: var(--calcite-spacing-sm-plus)}:host{display:flex;cursor:pointer;background-color:transparent;--calcite-internal-action-text-color: var(--calcite-color-text-3);border-radius:var(--calcite-action-corner-radius, var(--calcite-action-corner-radius-start-start, var(--calcite-corner-radius-xs)) var(--calcite-action-corner-radius-start-end, var(--calcite-corner-radius-xs)) var(--calcite-action-corner-radius-end-end, var(--calcite-corner-radius-xs)) var(--calcite-action-corner-radius-end-start, var(--calcite-corner-radius-xs)))}.interaction-container{border-radius:inherit}:host([width=full]){flex:1 0 auto}:host([width=full]) .button{justify-content:center}:host([width=full]) .button .text-container--visible{flex:none}:host([drag-handle]){cursor:move;--calcite-internal-action-text-color: var(--calcite-color-border-input);--calcite-internal-action-padding-inline: var(--calcite-spacing-xxs)}.button{position:relative;margin:0;display:flex;inline-size:auto;align-items:center;justify-content:flex-start;border-style:none;outline-color:transparent;box-sizing:border-box;background-color:var(--calcite-action-background-color, var(--calcite-color-foreground-1));border-radius:inherit;color:var(--calcite-action-text-color, var(--calcite-internal-action-text-color));cursor:inherit;flex:1 0 auto;font-family:inherit;font-size:var(--calcite-internal-action-font-size);font-weight:var(--calcite-font-weight-normal);line-height:var(--calcite-internal-action-line-height);min-block-size:var(--calcite-internal-action-height, var(--calcite-internal-action-min-height));max-block-size:var(--calcite-internal-action-height, none);padding-block:var(--calcite-internal-action-padding-block, var(--calcite-internal-action-spacing));padding-inline:var(--calcite-internal-action-padding-inline, var(--calcite-internal-action-spacing));text-align:start}.button:hover{background-color:var(--calcite-action-background-color-hover, var(--calcite-color-foreground-2));color:var(--calcite-action-text-color-press, var(--calcite-action-text-color-pressed, var(--calcite-color-text-1)))}.button:focus{outline:var(--calcite-border-width-md) solid var(--calcite-color-focus, var(--calcite-ui-focus-color, var(--calcite-color-brand)));outline-offset:calc(calc(-1 * var(--calcite-spacing-base)) * calc(1 - (2*clamp(0,var(--calcite-offset-invert-focus),1))))}.button:active{background-color:var(--calcite-action-background-color-press, var(--calcite-action-background-color-pressed, var(--calcite-color-foreground-3)))}.button--text-visible{gap:var(--calcite-internal-action-spacing);inline-size:100%}.icon-container{pointer-events:none;margin:0;display:flex;align-items:center;justify-content:center}.text-container{margin:0;inline-size:0px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;opacity:0;transition-property:opacity;transition-duration:var(--calcite-animation-timing);transition-timing-function:cubic-bezier(.4,0,.2,1);transition-property:inline-size}.text-container--visible{inline-size:auto;flex:1 1 auto;opacity:1}:host([active]) .button{background-color:var(--calcite-action-background-color, var(--calcite-color-foreground-3));color:var(--calcite-action-text-color-press, var(--calcite-action-text-color-pressed, var(--calcite-color-text-1)))}:host([active]) .button:hover{background-color:var(--calcite-action-background-color-hover, var(--calcite-color-foreground-3))}:host([active]) .button:active{background-color:var(--calcite-action-background-color-press, var(--calcite-action-background-color-pressed, var(--calcite-color-foreground-3)))}:host([loading]) .button:hover,:host([loading]) .button:focus{background-color:var(--calcite-action-background-color, var(--calcite-color-foreground-1))}:host([loading]) calcite-loader[inline]{margin-inline-end:0px}:host([appearance=transparent]):host([active]) .button{background-color:var(--calcite-action-background-color-press, var(--calcite-action-background-color-pressed, var(--calcite-color-transparent-press)))}:host([appearance=transparent]) .button{transition-property:box-shadow;transition-duration:var(--calcite-animation-timing);transition-timing-function:cubic-bezier(.4,0,.2,1);background-color:var(--calcite-action-background-color, var(--calcite-color-transparent))}:host([appearance=transparent]) .button:hover{background-color:var(--calcite-action-background-color-hover, var(--calcite-color-transparent-hover))}:host([appearance=transparent]) .button:active{background-color:var(--calcite-action-background-color-press, var(--calcite-action-background-color-pressed, var(--calcite-color-transparent-press)))}:host([selection-appearance=highlight]):host([active]) .button{background-color:var(--calcite-color-surface-highlight);color:var(--calcite-color-text-highlight)}:host([active-descendant]) .button{outline:var(--calcite-border-width-md) solid var(--calcite-color-focus, var(--calcite-ui-focus-color, var(--calcite-color-brand)));outline-offset:calc(calc(-1 * var(--calcite-spacing-base)) * calc(1 - (2*clamp(0,var(--calcite-offset-invert-focus),1))))}:host([alignment=center]) .button{justify-content:center}:host([alignment=end]) .button{justify-content:flex-end}:host([alignment=center]) .button .text-container--visible,:host([alignment=end]) .button .text-container--visible{flex:0 1 auto}:host([scale=s][compact]) .button,:host([scale=m][compact]) .button,:host([scale=l][compact]) .button{padding-inline:0px}.slot-container{display:flex}.slot-container--hidden{display:none}.indicator-with-icon{position:relative}.indicator-with-icon:after{content:"";position:absolute;block-size:.5rem;inline-size:.5rem;border-radius:9999px;inset-block-end:-.275rem;inset-inline-end:-.275rem;background-color:var(--calcite-action-indicator-color, var(--calcite-color-brand))}.indicator-without-icon{margin-inline:.25rem;inline-size:1rem;position:relative}.indicator-without-icon:after{content:"";position:absolute;block-size:.5rem;inline-size:.5rem;border-radius:9999px;inset-block-end:-.275rem;inset-inline-end:-.275rem;background-color:var(--calcite-action-indicator-color, var(--calcite-color-brand))}:host([scale=s]) .indicator-with-icon{position:relative}:host([scale=s]) .indicator-with-icon:after{content:"";position:absolute;block-size:.5rem;inline-size:.5rem;border-radius:9999px;inset-block-end:-.125rem;inset-inline-end:-.125rem;background-color:var(--calcite-action-indicator-color, var(--calcite-color-brand));block-size:.375rem;inline-size:.375rem}:host([scale=s]) .indicator-without-icon{position:relative}:host([scale=s]) .indicator-without-icon:after{content:"";position:absolute;block-size:.5rem;inline-size:.5rem;border-radius:9999px;inset-block-end:-.175rem;inset-inline-end:-.175rem;background-color:var(--calcite-action-indicator-color, var(--calcite-color-brand));block-size:.375rem;inline-size:.375rem}.indicator-text{position:absolute;inline-size:1px;block-size:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border-width:0}:host([hidden]){display:none}[hidden]{display:none}:host([disabled]) ::slotted([calcite-hydrated][disabled]),:host([disabled]) [calcite-hydrated][disabled]{opacity:1}.interaction-container{display:contents}`, Pt = class Pt extends V {
  constructor() {
    super(...arguments), this.guid = wi(), this.buttonRef = ne(), this.buttonId = Vr.button(this.guid), this.mutationObserver = Ht("mutation", () => this.requestUpdate()), this.messages = on({ blocking: !0 }), this.focusSetter = me()(this), this.indicatorRef = ne(), this.interactiveContainer = Xi(this), this.formTrigger = na()(this), this.active = !1, this.activeDescendant = !1, this.appearance = "transparent", this.compact = !1, this.disabled = !1, this.dragHandle = !1, this.iconFlipRtl = !1, this.indicator = !1, this.loading = !1, this.overflowDisabled = !1, this.scale = "m", this.width = "auto", this.textEnabled = !1, this.type = "button";
  }
  async setFocus(t) {
    return this.focusSetter(() => this.buttonRef.value, t);
  }
  connectedCallback() {
    var t;
    super.connectedCallback(), (t = this.mutationObserver) == null || t.observe(this.el, { childList: !0, subtree: !0 });
  }
  disconnectedCallback() {
    var t;
    super.disconnectedCallback(), (t = this.mutationObserver) == null || t.disconnect();
  }
  renderTextContainer() {
    const { text: t, textEnabled: e } = this, i = {
      [z.textContainer]: !0,
      [z.textContainerVisible]: e
    };
    return t ? it("text-container", b`<div class=${g(i)}>${t}</div>`) : null;
  }
  renderIndicatorText() {
    const { indicator: t, messages: e, buttonId: i } = this;
    return b`<div aria-labelledby=${i ?? k} aria-live=polite class=${g(z.indicatorText)} role=region ${dt(this.indicatorRef)}>${t ? e.indicator : null}</div>`;
  }
  renderIconContainer() {
    var y;
    const { loading: t, icon: e, scale: i, el: a, iconFlipRtl: o, indicator: r } = this, s = i === "l" ? "l" : "m", c = t ? b`<calcite-loader inline .label=${this.messages.loading} .scale=${s}></calcite-loader>` : null, d = e ? b`<calcite-icon class=${g({ [z.indicatorWithIcon]: r })} .flipRtl=${o} .icon=${e} .scale=${We(this.scale)}></calcite-icon>` : null, h = c || d, u = h || ((y = a.children) == null ? void 0 : y.length), m = b`<div class=${g({
      [z.slotContainer]: !0,
      [z.slotContainerHidden]: t
    })}><slot></slot></div>`;
    return u ? it("icon-container", b`<div aria-hidden=true class=${g(z.iconContainer)}>${h}${m}</div>`) : null;
  }
  renderButton() {
    var hn, un, pn, fn, bn, gn, vn, mn, yn, $n, xn, kn, Cn, En, wn;
    const { compact: t, disabled: e, icon: i, loading: a, textEnabled: o, label: r, text: s, indicator: c, indicatorRef: d, buttonId: h, messages: u } = this, m = r || s || "", y = c ? u.indicatorLabel.replace("{label}", m) : m, L = {
      [z.button]: !0,
      [z.buttonTextVisible]: o,
      [z.buttonCompact]: t
    }, ln = b`${this.renderIconContainer()}${this.renderTextContainer()}${!i && c && it("indicator-no-icon", b`<div class=${g(z.indicatorWithoutIcon)}></div>`) || ""}`, ia = c && d.value ? [d.value] : [], dn = [
      ...((hn = this.aria) == null ? void 0 : hn.controlsElements) ?? [],
      ...ia
    ];
    return this.dragHandle ? b`<span .ariaBusy=${a} .ariaControlsElements=${dn} .ariaDescribedByElements=${(un = this.aria) == null ? void 0 : un.describedByElements} .ariaExpanded=${(pn = this.aria) == null ? void 0 : pn.expanded} .ariaHasPopup=${(fn = this.aria) == null ? void 0 : fn.hasPopup} .ariaLabel=${y} .ariaLabelledByElements=${(bn = this.aria) == null ? void 0 : bn.labelledByElements} .ariaOwnsElements=${(gn = this.aria) == null ? void 0 : gn.ownsElements} .ariaPressed=${(vn = this.aria) == null ? void 0 : vn.pressed} class=${g(L)} id=${h ?? k} role=button tabindex=${(this.disabled ? void 0 : 0) ?? k} ${dt(this.buttonRef)}>${ln}</span>` : b`<button .ariaBusy=${a} .ariaChecked=${(mn = this.aria) == null ? void 0 : mn.checked} .ariaControlsElements=${dn} .ariaDescribedByElements=${(yn = this.aria) == null ? void 0 : yn.describedByElements} .ariaExpanded=${($n = this.aria) == null ? void 0 : $n.expanded} .ariaHasPopup=${(xn = this.aria) == null ? void 0 : xn.hasPopup} .ariaLabel=${y} .ariaLabelledByElements=${(kn = this.aria) == null ? void 0 : kn.labelledByElements} .ariaOwnsElements=${(Cn = this.aria) == null ? void 0 : Cn.ownsElements} .ariaPressed=${(En = this.aria) == null ? void 0 : En.pressed} class=${g(L)} .disabled=${e} id=${h ?? k} .role=${(wn = this.aria) == null ? void 0 : wn.role} type=${this.type ?? k} ${dt(this.buttonRef)}>${ln}</button>`;
  }
  render() {
    return this.interactiveContainer({ disabled: this.disabled, children: b`${this.renderButton()}${this.renderIndicatorText()}` });
  }
};
Pt.properties = { aria: [0, {}, { attribute: !1 }], active: [7, {}, { reflect: !0, type: Boolean }], activeDescendant: [7, {}, { reflect: !0, type: Boolean }], alignment: [3, {}, { reflect: !0 }], appearance: [3, {}, { reflect: !0 }], compact: [7, {}, { reflect: !0, type: Boolean }], disabled: [7, {}, { reflect: !0, type: Boolean }], dragHandle: [7, {}, { reflect: !0, type: Boolean }], form: [3, {}, { reflect: !0 }], icon: [3, { type: String }, { reflect: !0 }], iconFlipRtl: [7, {}, { reflect: !0, type: Boolean }], indicator: [7, {}, { reflect: !0, type: Boolean }], label: 1, loading: [7, {}, { reflect: !0, type: Boolean }], messageOverrides: [0, {}, { attribute: !1 }], overflowDisabled: [7, {}, { reflect: !0, type: Boolean }], scale: [3, {}, { reflect: !0 }], width: [3, {}, { reflect: !0 }], text: 1, textEnabled: [7, {}, { reflect: !0, type: Boolean }], type: [3, {}, { reflect: !0 }], selectionAppearance: [3, {}, { reflect: !0 }] }, Pt.formAssociated = !0, Pt.styles = Gr;
let Ve = Pt;
St("calcite-action", Ve);
const I = {
  container: "container",
  containerContent: "container-content",
  hasProgress: "progress-bar",
  hide: "hide",
  primary: "primary",
  secondary: "secondary",
  tertiary: "tertiary"
}, x = {
  logo: "logo",
  user: "user",
  progress: "progress",
  navigationAction: "navigation-action",
  contentStart: "content-start",
  contentEnd: "content-end",
  contentCenter: "content-center",
  navSecondary: "navigation-secondary",
  navTertiary: "navigation-tertiary"
}, Kr = {
  hamburger: "hamburger"
}, Jr = wt`:host([hidden]){display:none}[hidden]{display:none}:host{display:block}:host([scale=s]){--calcite-internal-navigation-primary-height: 3rem;--calcite-internal-navigation-secondary-height: 2.25rem;--calcite-internal-navigation-tertiary-height: 2.25rem;--calcite-internal-navigation-navigation-action-margin-inline: 8px}:host([scale=m]){--calcite-internal-navigation-primary-height: 4rem;--calcite-internal-navigation-secondary-height: 3rem;--calcite-internal-navigation-tertiary-height: 3rem;--calcite-internal-navigation-navigation-action-margin-inline: var(--calcite-font-size-sm)}:host([scale=l]){--calcite-internal-navigation-primary-height: 4.75rem;--calcite-internal-navigation-secondary-height: 4rem;--calcite-internal-navigation-tertiary-height: 4rem;--calcite-internal-navigation-navigation-action-margin-inline: var(--calcite-font-size-md)}.container{display:flex;inline-size:100%;flex-direction:column;margin-block:0;margin-inline:auto;background-color:var(--calcite-navigation-background-color, var(--calcite-navigation-background, var(--calcite-color-foreground-1)))}.container.primary,.container.secondary,.container.tertiary{border-block-end:1px solid;border-block-end-color:var(--calcite-navigation-border-color, var(--calcite-color-border-3))}.user,.logo{display:flex}.hide{display:none}.primary{block-size:var(--calcite-internal-navigation-primary-height)}.secondary{block-size:var(--calcite-internal-navigation-secondary-height)}.tertiary{block-size:var(--calcite-internal-navigation-tertiary-height)}.container-content{margin-inline:auto;display:flex;block-size:100%;inline-size:100%;margin-block:0;inline-size:var(--calcite-navigation-width, 100%);max-inline-size:100%}.container-content.progress-bar{margin-block-start:.125rem}slot[name]{display:flex;flex-direction:row}slot[name=navigation-secondary]::slotted(calcite-navigation),slot[name=navigation-tertiary]::slotted(calcite-navigation){inline-size:100%}slot[name=content-start]::slotted(*),slot[name=content-center]::slotted(*),slot[name=content-end]::slotted(*){display:flex;flex-direction:row;align-items:center}slot[name=progress],slot[name=progress] calcite-progress{inset-block-start:0;inset-inline:0}slot[name=content-end]{margin-inline-start:auto}slot[name=content-start]{margin-inline-end:auto}slot[name=content-end],slot[name=logo]~slot[name=user],slot[name=user]:only-child{margin-inline-start:auto}slot[name=content-center]{margin-inline-start:auto;margin-inline-end:auto}slot[name=content-start]~slot[name=content-center]{margin-inline-start:0px}slot[name=content-start]~slot[name=content-end],slot[name=content-center]~slot[name=content-end],slot[name=content-center]~slot[name=user],slot[name=content-end]~slot[name=user]{margin:0}slot[name=navigation-action] calcite-action{align-self:center;margin-inline-start:var(--calcite-internal-navigation-navigation-action-margin-inline)}`, ue = class ue extends V {
  constructor() {
    super(...arguments), this.navigationActionRef = ne(), this.focusSetter = me()(this), this.mutationObserver = Ht("mutation", () => {
      this.updateNavigationLogo(), this.updateNavigationUser(), this.updateNestedNavigation();
    }), this.navigationAction = !1, this.scale = "m", this.calciteNavigationActionSelect = Ma({ cancelable: !1 });
  }
  async setFocus(t) {
    return this.focusSetter(() => this.navigationActionRef.value, t);
  }
  connectedCallback() {
    var t;
    super.connectedCallback(), (t = this.mutationObserver) == null || t.observe(this.el, { childList: !0 }), this.updateNavigationLogo(), this.updateNavigationUser(), this.updateNestedNavigation();
  }
  updated(t) {
    (t.has("scale") || t.has("logoSlotHasElements") || t.has("userSlotHasElements") || t.has("secondarySlotHasElements") || t.has("tertiarySlotHasElements")) && (this.updateNavigationLogo(), this.updateNavigationUser(), this.updateNestedNavigation());
  }
  disconnectedCallback() {
    var t;
    super.disconnectedCallback(), (t = this.mutationObserver) == null || t.disconnect();
  }
  actionClickHandler() {
    this.calciteNavigationActionSelect.emit();
  }
  handleUserSlotChange(t) {
    this.isPrimaryLevel() && (this.userSlotHasElements = N(t));
  }
  handleLogoSlotChange(t) {
    this.isPrimaryLevel() && (this.logoSlotHasElements = N(t));
  }
  handleContentStartSlotChange(t) {
    this.isPrimaryLevel() && (this.primaryContentStartSlotHasElements = N(t));
  }
  handleContentEndSlotChange(t) {
    this.isPrimaryLevel() && (this.primaryContentEndSlotHasElements = N(t));
  }
  handleContentCenterSlotChange(t) {
    this.isPrimaryLevel() && (this.primaryContentCenterSlotHasElements = N(t));
  }
  handleSecondarySlotChange(t) {
    this.secondarySlotHasElements = N(t);
  }
  handleTertiarySlotChange(t) {
    this.tertiarySlotHasElements = N(t);
  }
  handleMenuActionSlotChange(t) {
    this.isPrimaryLevel() && (this.navigationActionSlotHasElements = N(t), this.navigationActionSlotHasElements && (this.navigationAction = !1));
  }
  handleProgressSlotChange(t) {
    this.isPrimaryLevel() && (this.progressSlotHasElement = N(t));
  }
  isPrimaryLevel() {
    return this.el.slot !== x.navSecondary && this.el.slot !== x.navTertiary;
  }
  getOwnedNavigationElements(t, e) {
    var a;
    const i = (a = this.el.shadowRoot) == null ? void 0 : a.querySelector(`slot[name="${t}"]`);
    return i ? i.assignedElements({ flatten: !0 }).filter((o) => o.matches(e)) : [];
  }
  updateNavigationLogo() {
    this.getOwnedNavigationElements(x.logo, "calcite-navigation-logo").forEach((t) => {
      t.scale = this.scale;
    });
  }
  updateNavigationUser() {
    this.getOwnedNavigationElements(x.user, "calcite-navigation-user").forEach((t) => {
      t.scale = this.scale;
    });
  }
  updateNestedNavigation() {
    [
      ...this.getOwnedNavigationElements(x.navSecondary, "calcite-navigation"),
      ...this.getOwnedNavigationElements(x.navTertiary, "calcite-navigation")
    ].forEach((e) => {
      e !== this.el && (e.scale = this.scale);
    });
  }
  renderMenuAction() {
    return b`<slot name=${x.navigationAction} @slotchange=${this.handleMenuActionSlotChange}>${this.navigationAction && b`<calcite-action .icon=${Kr.hamburger} @click=${this.actionClickHandler} .text=${this.label} ${dt(this.navigationActionRef)}></calcite-action>` || ""}</slot>`;
  }
  render() {
    const t = this.logoSlotHasElements || this.userSlotHasElements || this.navigationActionSlotHasElements || this.primaryContentCenterSlotHasElements || this.primaryContentEndSlotHasElements || this.primaryContentStartSlotHasElements || this.navigationAction, e = this.el.slot;
    return b`<div class=${g({
      [I.container]: !0,
      [I.secondary]: e === x.navSecondary,
      [I.tertiary]: e === x.navTertiary,
      [I.primary]: t
    })}><div class=${g({ [I.hide]: !this.progressSlotHasElement, [x.progress]: !0 })}><slot name=${x.progress} @slotchange=${this.handleProgressSlotChange}></slot></div><div class=${g({ [I.containerContent]: !0, [I.hasProgress]: this.progressSlotHasElement })}>${this.renderMenuAction()}<div class=${g({ [I.hide]: !this.logoSlotHasElements, [x.logo]: !0 })}><slot name=${x.logo} @slotchange=${this.handleLogoSlotChange}></slot></div><slot name=${x.contentStart} @slotchange=${this.handleContentStartSlotChange}></slot><slot name=${x.contentCenter} @slotchange=${this.handleContentCenterSlotChange}></slot><slot name=${x.contentEnd} @slotchange=${this.handleContentEndSlotChange}></slot><div class=${g({ [I.hide]: !this.userSlotHasElements, [x.user]: !0 })}><slot name=${x.user} @slotchange=${this.handleUserSlotChange}></slot></div></div></div><slot name=${x.navSecondary} @slotchange=${this.handleSecondarySlotChange}></slot><slot name=${x.navTertiary} @slotchange=${this.handleTertiarySlotChange}></slot>`;
  }
};
ue.properties = { logoSlotHasElements: [16, {}, { state: !0 }], navigationActionSlotHasElements: [16, {}, { state: !0 }], primaryContentCenterSlotHasElements: [16, {}, { state: !0 }], primaryContentEndSlotHasElements: [16, {}, { state: !0 }], primaryContentStartSlotHasElements: [16, {}, { state: !0 }], progressSlotHasElement: [16, {}, { state: !0 }], secondarySlotHasElements: [16, {}, { state: !0 }], tertiarySlotHasElements: [16, {}, { state: !0 }], userSlotHasElements: [16, {}, { state: !0 }], label: 1, navigationAction: [7, {}, { reflect: !0, type: Boolean }], scale: [3, {}, { reflect: !0 }] }, ue.styles = Jr;
let Ge = ue;
St("calcite-navigation", Ge);
const Zr = ({ children: n, class: t, hidden: e = !1, key: i, level: a }) => {
  const o = a ? Yo(`h${a}`) : He`div`;
  return it(i, Ui`<${o} class=${g(t)} .hidden=${e}>${n}</${o}>`);
}, A = {
  container: "container",
  containerLink: "container--link",
  textContainer: "text-container",
  heading: "heading",
  description: "description",
  image: "image",
  standalone: "standalone",
  icon: "icon"
}, Qr = wt`:host{display:inline-flex}:host([scale=s]){--calcite-internal-navigation-logo-padding-inline: var(--calcite-space-md);--calcite-internal-navigation-logo-image-size: 1.75rem;--calcite-internal-navigation-logo-heading-font-size: var(--calcite-font-size-relative-base);--calcite-internal-navigation-logo-heading-standalone-font-size: var(--calcite-font-size-1);--calcite-internal-navigation-logo-description-font-size: var(--calcite-font-size-relative-sm);--calcite-internal-navigation-logo-heading-line-height: var(--calcite-space-lg);--calcite-internal-navigation-logo-description-line-height: var(--calcite-space-lg)}:host([scale=m]){--calcite-internal-navigation-logo-padding-inline: var(--calcite-space-lg);--calcite-internal-navigation-logo-image-size: 1.75rem;--calcite-internal-navigation-logo-heading-font-size: var(--calcite-font-size-relative-md);--calcite-internal-navigation-logo-heading-standalone-font-size: var(--calcite-font-size-relative-xl);--calcite-internal-navigation-logo-description-font-size: var(--calcite-font-size-relative-base);--calcite-internal-navigation-logo-heading-line-height: var(--calcite-space-xl);--calcite-internal-navigation-logo-description-line-height: var(--calcite-space-lg)}:host([scale=l]){--calcite-internal-navigation-logo-padding-inline: var(--calcite-space-xl);--calcite-internal-navigation-logo-image-size: 2.75rem;--calcite-internal-navigation-logo-heading-font-size: var(--calcite-font-size-relative-xl);--calcite-internal-navigation-logo-heading-standalone-font-size: var(--calcite-font-size-relative-2xl);--calcite-internal-navigation-logo-description-font-size: var(--calcite-font-size-relative-lg);--calcite-internal-navigation-logo-heading-line-height: var(--calcite-space-2xl);--calcite-internal-navigation-logo-description-line-height: var(--calcite-space-2xl)}.container{margin:0;display:flex;align-items:center;justify-content:center;font-size:var(--calcite-font-size-relative-md);line-height:var(--calcite-font-line-height-md);background-color:var(--calcite-navigation-background-color, var(--calcite-internal-navigation-logo-background-color, var(--calcite-color-foreground-1)));border-block-end:2px solid var(--calcite-color-transparent);transition-property:background-color;transition-duration:var(--calcite-animation-timing);transition-timing-function:ease-in-out}.container--link{cursor:pointer;text-decoration-line:none;outline-color:transparent}:host(:focus) .container--link{outline:var(--calcite-border-width-md) solid var(--calcite-color-focus, var(--calcite-ui-focus-color, var(--calcite-color-brand)));outline-offset:calc(calc(-1 * var(--calcite-spacing-base)) * calc(1 - (2*clamp(0,var(--calcite-offset-invert-focus),1))))}.image{block-size:var(--calcite-internal-navigation-logo-image-size)}.image,.icon{margin:0;display:flex;color:var(--calcite-navigation-logo-text-color, var(--calcite-icon-color, var(--calcite-internal-navigation-logo-text-color, var(--calcite-ui-icon-color, inherit))));padding-inline:var(--calcite-internal-navigation-logo-padding-inline)}.image~.icon{padding-inline-start:0px}.image~.text-container,.icon~.text-container{padding-inline-start:0px}:host([href]:hover),:host([href]:focus){--calcite-internal-navigation-logo-background-color: var(--calcite-color-foreground-2)}:host([href]:active){--calcite-internal-navigation-logo-background-color: var(--calcite-color-foreground-3)}:host([active]) .container{border-block-end-color:var(--calcite-navigation-accent-color, var(--calcite-color-brand))}:host([active]),:host([href]:active){--calcite-internal-navigation-logo-text-color: var(--calcite-color-brand)}.text-container{margin-block-start:.125rem;display:flex;flex-direction:column;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;text-align:start;padding-inline:var(--calcite-internal-navigation-logo-padding-inline)}.heading{margin-inline-start:0px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-weight:var(--calcite-font-weight-medium);color:var(--calcite-navigation-logo-heading-text-color, var(--calcite-color-text-1));font-size:var(--calcite-internal-navigation-logo-heading-font-size);padding-block-start:var(--calcite-space-2xs);line-height:var(--calcite-internal-navigation-logo-heading-line-height)}.standalone{font-size:var(--calcite-internal-navigation-logo-heading-standalone-font-size);padding-block-start:0}.description{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--calcite-color-text-2);color:var(--calcite-navigation-logo-text-color, var(--calcite-color-text-2));font-size:var(--calcite-internal-navigation-logo-description-font-size);line-height:var(--calcite-internal-navigation-logo-description-line-height)}:host([hidden]){display:none}[hidden]{display:none}`, Nt = class Nt extends V {
  constructor() {
    super(...arguments), this.focusSetter = me()(this), this.iconFlipRtl = !1, this.scale = "m";
  }
  async setFocus(t) {
    return this.focusSetter(() => this.href ? this.el : void 0, t);
  }
  renderIcon() {
    return b`<calcite-icon class=${g(A.icon)} .flipRtl=${this.iconFlipRtl} .icon=${this.icon} .scale=${this.scale === "s" ? "m" : "l"}></calcite-icon>`;
  }
  renderHeaderContent() {
    const { heading: t, headingLevel: e, description: i } = this, a = t ? it(A.heading, Zr({ class: {
      [A.heading]: !0,
      [A.standalone]: !this.description
    }, level: e, children: t })) : null, o = i ? it(A.description, b`<span class=${g(A.description)}>${i}</span>`) : null;
    return a || o ? it(A.textContainer, b`<div class=${g(A.textContainer)}>${a}${o}</div>`) : null;
  }
  render() {
    const { icon: t, href: e, label: i, rel: a, target: o, thumbnail: r } = this, s = b`${r && b`<img alt=${(i || "") ?? k} class=${g(A.image)} src=${r ?? k}>` || ""}${t && this.renderIcon() || ""}${this.renderHeaderContent()}`;
    return e ? b`<a class=${g({
      [A.container]: !0,
      [A.containerLink]: !0
    })} href=${e ?? k} rel=${a ?? k} target=${o ?? k}>${s}</a>` : b`<div class=${g(A.container)}>${s}</div>`;
  }
};
Nt.properties = { active: [7, {}, { reflect: !0, type: Boolean }], description: 1, heading: 1, headingLevel: [11, {}, { type: Number, reflect: !0 }], href: [3, {}, { reflect: !0 }], icon: [3, { type: String }, { reflect: !0 }], iconFlipRtl: [7, {}, { reflect: !0, type: Boolean }], label: 1, rel: [3, {}, { reflect: !0 }], target: [3, {}, { reflect: !0 }], thumbnail: 1, scale: [3, {}, { reflect: !0 }] }, Nt.shadowRootOptions = { mode: "open", delegatesFocus: !0 }, Nt.styles = Qr;
let Ke = Nt;
St("calcite-navigation-logo", Ke);
const P = document.querySelector(".menu-button"), Le = document.querySelector(".sidebar"), Zt = document.querySelector("#doc-search"), S = document.querySelector("#search-results");
P == null || P.addEventListener("click", () => {
  const n = document.body.classList.toggle("nav-open");
  P.setAttribute("aria-expanded", String(n));
});
document.addEventListener("keydown", (n) => {
  n.key === "Escape" && (document.body.classList.remove("nav-open"), P == null || P.setAttribute("aria-expanded", "false"), S && (S.hidden = !0));
});
Le == null || Le.addEventListener("click", (n) => {
  n.target instanceof HTMLAnchorElement && (document.body.classList.remove("nav-open"), P == null || P.setAttribute("aria-expanded", "false"));
});
document.querySelectorAll(".copy-button").forEach((n) => {
  n.addEventListener("click", async () => {
    var e, i;
    const t = ((i = (e = n.parentElement) == null ? void 0 : e.querySelector("code")) == null ? void 0 : i.textContent) ?? "";
    try {
      await navigator.clipboard.writeText(t), n.textContent = "Copied";
    } catch {
      n.textContent = "Copy failed";
    }
    window.setTimeout(() => {
      n.textContent = "Copy";
    }, 1500);
  });
});
let ni;
function Xr(n, t) {
  if (!S) return;
  if (S.replaceChildren(), n.length === 0) {
    const i = document.createElement("p");
    i.textContent = `No results for "${t}".`, S.append(i), S.hidden = !1;
    return;
  }
  const e = document.createElement("ul");
  for (const i of n) {
    const a = document.createElement("li"), o = document.createElement("a");
    o.href = i.url;
    const r = document.createElement("strong");
    r.textContent = i.title;
    const s = document.createElement("span"), c = i.text.toLowerCase().indexOf(t.toLowerCase()), d = Math.max(0, c - 45);
    s.textContent = i.text.slice(d, d + 140), o.append(r, s), a.append(o), e.append(a);
  }
  S.append(e), S.hidden = !1;
}
Zt == null || Zt.addEventListener("input", async () => {
  const n = Zt.value.trim();
  if (!S) return;
  if (n.length < 2) {
    S.hidden = !0;
    return;
  }
  try {
    ni ?? (ni = await fetch("search-index.json").then((i) => {
      if (!i.ok) throw new Error("Documentation search index could not be loaded.");
      return i.json();
    }));
  } catch {
    S.replaceChildren();
    const i = document.createElement("p");
    i.textContent = "Search is temporarily unavailable.", S.append(i), S.hidden = !1;
    return;
  }
  const t = n.toLowerCase().split(/\s+/).filter(Boolean), e = ni.map((i) => {
    const a = `${i.title} ${i.text}`.toLowerCase(), o = t.reduce((r, s) => r + (a.includes(s) ? 1 : 0), 0);
    return { ...i, score: o };
  }).filter((i) => i.score === t.length).sort((i, a) => a.score - i.score || i.title.localeCompare(a.title)).slice(0, 7);
  Xr(e, n);
});
