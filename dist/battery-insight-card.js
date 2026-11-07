/*
 * Battery Insight Card 1.3
 * Copyright (c) 2026 luigi-regolo
 * SPDX-License-Identifier: GPL-3.0-only
 */
(() => {
  'use strict';
  const TAG = 'battery-insight-card';
  const EDITOR = 'battery-insight-card-editor';
  const PRESETS = [
    ['smartphone','Dispositivi personali','mdi:devices'],
    ['volumetrici','Volumetrici','mdi:motion-sensor'],
    ['porte-finestre','Porte e finestre','mdi:door'],
    ['altri-sensori','Altri sensori','mdi:access-point'],
    ['spioncino','Spioncino','mdi:doorbell-video'],
    ['lock','Lock','mdi:lock-outline'],
    ['allarme','Allarme','mdi:shield-home-outline'],
    ['termosifoni','Termosifoni','mdi:radiator'],
  ];
  const LIMIT = 50;
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const iconName = (value, fallback='mdi:battery') => /^mdi:[a-z0-9-]{2,70}$/.test(String(value||'')) ? value : fallback;
  const entId = id => /^(sensor|binary_sensor)\.[a-z0-9_]+$/.test(String(id||'')) ? id : '';
  const sectionId = id => /^[a-z][a-z0-9-]{0,59}$/.test(String(id||'')) ? id : '';
  const num = (value, fallback) => Number.isFinite(Number(value)) ? Number(value) : fallback;
  const finitePct = value => {
    if(typeof value!=='string' && typeof value!=='number')return null;
    if(String(value).trim()==='')return null;
    const n=Number(value);
    return Number.isFinite(n)&&n>=0&&n<=100?n:null;
  };
  const presets = () => PRESETS.map(([id,name,icon])=>({id,name,icon,entities:[],visible:true}));
  const normalize = input => {
    const raw=input && typeof input==='object' && !Array.isArray(input)?input:{};
    const defaults=presets(); const incoming=Array.isArray(raw.sections)?raw.sections:[];
    const seenSections=new Set(); const seenEntities=new Set();
    const sections=[];
    for(const item of incoming.length?incoming:defaults){
      if(!item || typeof item!=='object' || sections.length>=LIMIT)continue;
      const id=sectionId(item.id);if(!id||seenSections.has(id))continue;
      seenSections.add(id);
      const known=defaults.find(x=>x.id===id);
      const ids=[];
      for(const e of Array.isArray(item.entities)?item.entities:[]){
        const eid=entId(e);if(eid && !seenEntities.has(eid)){ids.push(eid);seenEntities.add(eid);}
      }
      sections.push({id,name:String(item.name||known?.name||'Sezione').slice(0,70),
        icon:iconName(item.icon,known?.icon||'mdi:battery'),entities:ids,visible:item.visible!==false});
    }
    return {
      type:`custom:${TAG}`,
      eyebrow:String(raw.eyebrow==='MONITORAGGIO DISPOSITIVI'?'BATTERY INSIGHT CARD':(raw.eyebrow??'BATTERY INSIGHT CARD')).slice(0,90),
      title:String(raw.title??'Stato batterie').slice(0,80),
      theme_mode:['auto','light','dark'].includes(raw.theme_mode)?raw.theme_mode:'auto',
      low_threshold:Math.max(1,Math.min(100,Math.round(num(raw.low_threshold,25)))),
      critical_threshold:Math.max(0,Math.min(99,Math.round(num(raw.critical_threshold,10)))),
      hide_empty:raw.hide_empty===true,
      show_unavailable:raw.show_unavailable!==false,
      sections,
    };
  };
  const battery = (hass,id) => {
    const state=hass?.states?.[id];
    if(!state||['unknown','unavailable','none',''].includes(state.state))return {id,name:state?.attributes?.friendly_name||id,value:null,kind:'unavailable'};
    const name=state.attributes?.friendly_name||id;
    if(id.startsWith('binary_sensor.')){
      // Binary battery indicators cannot legitimately be presented as a percentage.
      if(state.attributes?.device_class!=='battery')return {id,name,value:null,kind:'unavailable'};
      return {id,name,value:null,kind:state.state==='on'?'low':state.state==='off'?'normal':'unavailable'};
    }
    const pct=finitePct(state.state);
    const isPercentBattery=state.attributes?.device_class==='battery' || state.attributes?.unit_of_measurement==='%';
    if(pct===null||!isPercentBattery)return {id,name,value:null,kind:'unavailable'};
    return {id,name,value:pct,kind:'percentage'};
  };
  const classify = (b,cfg)=> b.kind==='unavailable'?'unavailable':b.kind==='low'?'low':b.kind==='normal'?'normal':b.value<=cfg.critical_threshold?'critical':b.value<=cfg.low_threshold?'low':'normal';
  const summary = (items,cfg) => ({total:items.length,critical:items.filter(x=>classify(x,cfg)==='critical').length,
    low:items.filter(x=>['critical','low'].includes(classify(x,cfg))).length,
    unavailable:items.filter(x=>classify(x,cfg)==='unavailable').length,
    normal:items.filter(x=>classify(x,cfg)==='normal').length});
  const sortItems = (items,cfg) => [...items].sort((a,b)=>{
    const rank=x=>({'critical':0,'low':1,'normal':2,'unavailable':3})[classify(x,cfg)];
    return rank(a)-rank(b)||(a.value??101)-(b.value??101)||a.name.localeCompare(b.name,'it');
  });
  const icon = (name,cls='') => `<ha-icon class="bs-icon ${cls}" icon="${esc(iconName(name))}" aria-hidden="true"></ha-icon>`;
  const CARD_CSS=`
    :host{display:block;min-width:0;font-family:var(--ha-font-family-body,var(--paper-font-body1_-_font-family,Roboto,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif));color:var(--bs-text);font-size:14px}
    *,*:before,*:after{box-sizing:border-box}
    :host([data-theme=light]){--bs-bg:#fafbf9;--bs-tile:#f0f2ef;--bs-circle:#fff;--bs-line:#e0e5df;--bs-text:#18221c;--bs-muted:#56675c;--bs-accent:var(--edera-emerald-color,#0E6B52);--bs-ok:var(--bs-accent);--bs-btn:var(--bs-accent);--bs-red:#ae4742;--bs-amber:#ad701c}
    :host([data-theme=dark]){--bs-bg:#101211;--bs-tile:#191c1a;--bs-circle:#282b29;--bs-line:#2b302c;--bs-text:#f5f7f4;--bs-muted:#bbc5bd;--bs-accent:#0e795d;--bs-ok:#3fbf94;--bs-btn:var(--bs-text);--bs-red:#f17878;--bs-amber:#efb45f}
    button{font:inherit;cursor:pointer;color:inherit;-webkit-tap-highlight-color:transparent}
    button:focus-visible{outline:2px solid var(--bs-accent);outline-offset:2px}
    .bs-icon{height:21px;width:21px;--mdc-icon-size:21px;flex:none;display:inline-flex;align-items:center;justify-content:center}
    .bs-container{display:block;width:100%;max-width:100%;min-width:0;container-type:inline-size;--bs-pad:18px;--bs-gap:10px;--bs-sym:34px}
    .bs-shell{padding:var(--bs-pad);border:1px solid var(--bs-line);background:var(--bs-bg);border-radius:26px;min-width:0}
    .bs-eyebrow{font-size:10px;font-weight:750;letter-spacing:1.7px;color:var(--bs-muted);text-transform:uppercase}
    .bs-title{margin-top:7px;margin-bottom:12px;font-size:25px;line-height:1.14;font-weight:780;letter-spacing:-.7px;overflow-wrap:anywhere}
    .bs-title b{color:var(--bs-ok)}
    .bs-metrics{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:var(--bs-gap)}
    .bs-metric{background:var(--bs-tile);border:1px solid var(--bs-line);border-radius:18px;padding:11px 12px;min-width:0}
    .bs-metric-label{font-size:12px;color:var(--bs-muted);line-height:1.35}
    .bs-metric-value{font-size:30px;line-height:1.1;font-weight:700;letter-spacing:-.7px;margin:4px 0 6px;font-variant-numeric:tabular-nums}
    .bs-metric-value.low{color:var(--bs-amber)}.bs-metric-value.critical{color:var(--bs-red)}
    .bs-metric-track{height:5px;background:var(--bs-line);overflow:hidden;border-radius:99px;margin:0 0 6px}
    .bs-metric-fill{height:100%;background:var(--bs-ok);border-radius:99px}
    .bs-metric-detail{font-size:11.5px;color:var(--bs-muted);line-height:1.35;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
    .bs-heading{font-size:10px;font-weight:700;letter-spacing:1.3px;color:var(--bs-muted);margin:14px 4px 8px;text-transform:uppercase}
    .bs-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));grid-auto-rows:1fr;gap:var(--bs-gap)}
    .bs-tile{display:flex;flex-direction:column;gap:7px;min-width:0;min-height:88px;text-align:left;align-items:stretch;padding:10px 12px;border:1px solid var(--bs-line);border-radius:20px;background:var(--bs-tile)}
    .bs-tile:focus-visible{outline:2px solid color-mix(in srgb,var(--bs-text) 55%,transparent);outline-offset:2px}
    .bs-tile:active{background:color-mix(in srgb,var(--bs-text) 6%,var(--bs-tile))}
    .bs-tilehead{display:flex;align-items:center;gap:8px;min-width:0}
    .bs-tile-symbol{flex:none;width:var(--bs-sym);height:var(--bs-sym);border-radius:50%;background:var(--bs-circle);display:inline-flex;align-items:center;justify-content:center;color:var(--bs-text)}
    .bs-tile-symbol .bs-icon{width:18px;height:18px;--mdc-icon-size:18px}
    .bs-name{flex:1;min-width:0;font-size:13px;font-weight:650;line-height:1.25;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;overflow-wrap:anywhere}
    .bs-tile-state{flex:none;display:inline-flex;align-items:center;justify-content:center;color:var(--bs-muted)}
    .bs-tile-state .bs-icon{width:20px;height:20px;--mdc-icon-size:20px}
    .bs-tile-state.normal{color:var(--bs-ok)}.bs-tile-state.low{color:var(--bs-amber)}.bs-tile-state.critical{color:var(--bs-red)}
    .bs-tile-data{display:flex;align-items:baseline;justify-content:space-between;gap:6px;min-width:0;font-size:12px;color:var(--bs-muted)}
    .bs-sub{min-width:0;overflow-wrap:anywhere;line-height:1.35}
    .bs-sub em{display:block;font-style:normal;font-weight:600}.bs-sub em.low{color:var(--bs-amber)}.bs-sub em.critical{color:var(--bs-red)}
    .bs-min{flex:none;font-size:13px;font-weight:650;color:var(--bs-text);font-variant-numeric:tabular-nums}
    .bs-min.low{color:var(--bs-amber)}.bs-min.critical{color:var(--bs-red)}
    .bs-mini-track{height:4px;width:100%;background:var(--bs-line);border-radius:50px;overflow:hidden;margin-top:auto}
    .bs-mini-fill{height:100%;background:var(--bs-ok);border-radius:50px}
    .bs-mini-fill.low{background:var(--bs-amber)}.bs-mini-fill.critical{background:var(--bs-red)}
    /* Pulsante a pillola «Dettagli e stato», stesso stile di Weather Pulse e Entity Health. */
    .bs-details{display:flex;align-items:center;justify-content:space-between;gap:10px;width:100%;min-width:0;min-height:40px;padding:0 16px;margin-top:12px;border-radius:999px;font-weight:600;font-size:13.5px;text-align:left;color:var(--bs-btn);border:1px solid color-mix(in srgb,var(--bs-accent) 45%,transparent);background:color-mix(in srgb,var(--bs-accent) 12%,transparent)}
    .bs-details:hover,.bs-details[aria-expanded="true"]{background:color-mix(in srgb,var(--bs-accent) 22%,transparent)}
    .bs-details-label{display:inline-flex;align-items:center;gap:8px;min-width:0}
    .bs-details .bs-icon{width:18px;height:18px;--mdc-icon-size:18px}
    .bs-empty{padding:16px;color:var(--bs-muted);font-size:12px;text-align:center}
    @container (max-width:560px){.bs-container{--bs-pad:14px}.bs-title{font-size:23px}.bs-metric-value{font-size:27px}}
    @container (max-width:400px){.bs-container{--bs-pad:12px;--bs-gap:8px;--bs-sym:32px}.bs-shell{border-radius:23px}.bs-tile{padding:9px 10px}.bs-tilehead{flex-wrap:wrap;row-gap:6px}.bs-tile-symbol{order:1}.bs-tile-state{order:2;margin-left:auto}.bs-name{order:3;flex:1 1 100%;font-size:12.5px}.bs-tile-data{font-size:11.5px}.bs-metric-label,.bs-metric-detail{font-size:11.5px}.bs-metric-value{font-size:25px}}
    @container (max-width:270px){.bs-grid,.bs-metrics{grid-template-columns:1fr}}
    /* Popup: modello Entity Health Card (intestazione fissa e opaca, solo l'elenco scorre). */
    .bs-backdrop{position:fixed;inset:0;z-index:9999;background:#0009;display:flex;align-items:center;justify-content:center;overscroll-behavior:contain;padding:max(16px,env(safe-area-inset-top)) max(16px,env(safe-area-inset-right)) max(16px,env(safe-area-inset-bottom)) max(16px,env(safe-area-inset-left))}
    .bs-modal{width:min(390px,100%);max-height:min(88vh,680px);max-height:min(88dvh,680px);display:flex;flex-direction:column;background:var(--bs-bg);color:var(--bs-text);border:1px solid var(--bs-line);border-radius:26px;overflow:hidden;box-shadow:0 18px 60px #0005}
    .bs-mhead{flex:none;display:flex;align-items:center;justify-content:space-between;gap:12px;padding:16px 16px 12px 18px;background:var(--bs-bg);border-bottom:1px solid var(--bs-line)}
    .bs-mtitles{flex:1;min-width:0}.bs-mtitle{margin:0;font-size:17px;font-weight:600;line-height:1.3;overflow-wrap:anywhere}.bs-msub{font-size:12px;color:var(--bs-muted);margin-top:2px;overflow-wrap:anywhere}
    .bs-close{flex:none;display:grid;place-items:center;width:40px;height:40px;padding:0;border-radius:50%;border:1px solid var(--bs-line);background:var(--bs-tile);color:var(--bs-text);line-height:0}
    .bs-close .bs-icon{width:20px;height:20px;--mdc-icon-size:20px}
    .bs-mbody{overflow-y:auto;overflow-x:hidden;overscroll-behavior:contain;-webkit-overflow-scrolling:touch;padding:12px 18px 18px;min-width:0}
    .bs-stats{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin-bottom:12px}
    .bs-stat{background:var(--bs-tile);border-radius:16px;padding:10px 12px;min-width:0}
    .bs-stat b{display:block;font-size:22px;font-weight:700;line-height:1.1;font-variant-numeric:tabular-nums}.bs-stat.low b{color:var(--bs-amber)}
    .bs-stat span{display:block;font-size:11.5px;color:var(--bs-muted);margin-top:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .bs-filters{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:12px}
    .bs-filter{font-size:12.5px;padding:6px 11px;min-height:32px;border-radius:999px;border:1px solid var(--bs-line);background:var(--bs-tile);color:var(--bs-text)}
    .bs-filter[aria-pressed="true"]{background:color-mix(in srgb,var(--bs-accent) 14%,transparent);border-color:var(--bs-accent);font-weight:600}
    .bs-gh{display:flex;justify-content:space-between;font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:var(--bs-muted);font-weight:600;margin:14px 2px 6px}.bs-gh:first-of-type{margin-top:4px}
    .bs-list{display:grid;gap:8px}
    .bs-entry{display:grid;grid-template-columns:36px minmax(0,1fr) auto;gap:10px;align-items:center;background:var(--bs-tile);border-radius:16px;padding:10px 12px;min-width:0}
    .bs-eico{width:36px;height:36px;border-radius:50%;display:grid;place-items:center;background:var(--bs-circle);color:var(--bs-muted)}
    .bs-eico .bs-icon{width:19px;height:19px;--mdc-icon-size:19px}
    .bs-eico.normal{color:var(--bs-ok)}.bs-eico.low{color:var(--bs-amber);box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--bs-amber) 50%,transparent)}.bs-eico.critical{color:var(--bs-red);box-shadow:inset 0 0 0 1px color-mix(in srgb,var(--bs-red) 50%,transparent)}
    .bs-einfo{min-width:0}.bs-entryname{display:block;font-size:14px;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    .bs-entry-status{display:block;font-size:11.5px;color:var(--bs-muted);margin-top:1px}.bs-entry-status.low{color:var(--bs-amber)}.bs-entry-status.critical{color:var(--bs-red)}
    .bs-pct{font-size:13px;font-weight:650;font-variant-numeric:tabular-nums;white-space:nowrap}.bs-pct.low{color:var(--bs-amber)}.bs-pct.critical{color:var(--bs-red)}.bs-pct.unavailable{color:var(--bs-muted)}
    .bs-track{grid-column:2/-1;height:5px;background:var(--bs-line);border-radius:999px;overflow:hidden;margin-top:-2px}
    .bs-fill{height:100%;background:var(--bs-ok);border-radius:999px}.bs-fill.low{background:var(--bs-amber)}.bs-fill.critical{background:var(--bs-red)}
    .bs-msg{background:var(--bs-tile);border-radius:16px;padding:14px;font-size:13px;color:var(--bs-muted);text-align:center}
    .bs-note{margin:16px 0 0;font-size:12px;color:var(--bs-muted);line-height:1.5}
    @media(prefers-reduced-motion:reduce){*,*:before,*:after{scroll-behavior:auto!important;animation:none!important;transition:none!important}}
  `;
  class BatteryInsightCard extends HTMLElement {
    static getStubConfig(){const {type,...config}=normalize({});return config;}
    static getConfigElement(){return document.createElement(EDITOR);}
    constructor(){
      super();this.attachShadow({mode:'open'});this._cfg=normalize({});this._hass=null;this._dialog=null;this._filter='all';this._signature='';this._returnFocus=null;this._pendingFocus='';
      this._media=typeof matchMedia==='function'?matchMedia('(prefers-color-scheme: dark)'):null;
      this._appearance=()=>this._render();this._media?.addEventListener?.('change',this._appearance);
      // Temporarily intercept scroll gestures while this popup is visible.
      // Unlike changing body position/overflow, this preserves Home Assistant's dashboard scroll position.
      this._modalLockActive=false;this._modalTouchY=0;this._modalTouchX=0;
      this._onModalTouchStart=e=>{
        if(!this._dialog||e.touches?.length!==1)return;
        const t=e.touches[0];this._modalTouchY=t.clientY;this._modalTouchX=t.clientX;
      };
      this._onModalTouchMove=e=>{
        if(!this._dialog||e.touches?.length!==1)return;
        const t=e.touches[0],deltaY=this._modalTouchY-t.clientY,deltaX=this._modalTouchX-t.clientX;
        this._modalTouchY=t.clientY;this._modalTouchX=t.clientX;
        this._preventScrollLeak(e,deltaY,Math.abs(deltaX)>Math.abs(deltaY));
      };
      this._onModalWheel=e=>this._preventScrollLeak(e,e.deltaY);
      // Escape and Tab are handled at document level while the popup is open, so they keep working after a click on a non-focusable area.
      this._keysActive=false;this._onKey=e=>this._key(e);
      this.shadowRoot.addEventListener('click',e=>this._click(e));
    }
    connectedCallback(){this._render();}
    disconnectedCallback(){this._setModalScrollLock(false);this._setKeys(false);this._media?.removeEventListener?.('change',this._appearance);}
    _setKeys(enabled){
      if(this._keysActive===enabled)return;
      this._keysActive=enabled;
      if(enabled)document.addEventListener('keydown',this._onKey);else document.removeEventListener('keydown',this._onKey);
    }
    _key(e){
      if(!this._dialog)return;
      if(e.key==='Escape'){e.preventDefault();this._close();return;}
      if(e.key!=='Tab')return;
      const nodes=[...this.shadowRoot.querySelectorAll('.bs-modal button')];
      if(!nodes.length)return;
      const first=nodes[0],last=nodes[nodes.length-1],active=this.shadowRoot.activeElement;
      if(e.shiftKey&&(active===first||!nodes.includes(active))){e.preventDefault();last.focus({preventScroll:true});}
      else if(!e.shiftKey&&(active===last||!nodes.includes(active))){e.preventDefault();first.focus({preventScroll:true});}
    }
    _setModalScrollLock(enabled){
      if(this._modalLockActive===enabled)return;
      this._modalLockActive=enabled;
      if(enabled){
        document.addEventListener('touchstart',this._onModalTouchStart,{capture:true,passive:true});
        document.addEventListener('touchmove',this._onModalTouchMove,{capture:true,passive:false});
        document.addEventListener('wheel',this._onModalWheel,{capture:true,passive:false});
      }else{
        document.removeEventListener('touchstart',this._onModalTouchStart,true);
        document.removeEventListener('touchmove',this._onModalTouchMove,true);
        document.removeEventListener('wheel',this._onModalWheel,true);
      }
    }
    _preventScrollLeak(event,deltaY,horizontal=false){
      if(!this._dialog||!event.cancelable)return;
      const body=this.shadowRoot.querySelector('.bs-mbody');
      // Only the device list may scroll: the header, the backdrop and the dashboard behind stay still.
      if(!body||!event.composedPath().includes(body)){
        event.preventDefault();return;
      }
      const maxScroll=Math.max(0,body.scrollHeight-body.clientHeight);
      // Keep the popup scrollable but stop Safari from chaining overscroll to the dashboard.
      if(horizontal||maxScroll<=1||(deltaY<0&&body.scrollTop<=1)||(deltaY>0&&body.scrollTop>=maxScroll-1)){
        event.preventDefault();
      }
    }
    setConfig(cfg){this._cfg=normalize(cfg);this._render();}
    set hass(hass){this._hass=hass;this._render();}
    getCardSize(){return Math.max(3,Math.ceil(this._cfg.sections.filter(s=>s.visible&&(!this._cfg.hide_empty||s.entities.length)).length/2)+2);}
    _theme(){if(this._cfg.theme_mode!=='auto')return this._cfg.theme_mode;if(typeof this._hass?.themes?.darkMode==='boolean')return this._hass.themes.darkMode?'dark':'light';return this._media?.matches?'dark':'light';}
    _sections(){return this._cfg.sections.filter(s=>s.visible).map(s=>({...s,items:s.entities.map(id=>battery(this._hass,id))}));}
    _close(){const prior=this._returnFocus;this._dialog=null;this._filter='all';this._signature='';this._setKeys(false);this._render();
      const current=prior?.kind==='category'?[...this.shadowRoot.querySelectorAll('[data-category]')].find(x=>x.dataset.category===prior.id):this.shadowRoot.querySelector('[data-details]');
      current?.focus?.({preventScroll:true});this._returnFocus=null;}
    _open(dialog,returnFocus){this._returnFocus=returnFocus;this._dialog=dialog;this._filter='all';this._signature='';this._setKeys(true);this._render();this.shadowRoot.querySelector('[data-close]')?.focus({preventScroll:true});}
    _click(e){
      if(e.target.closest('[data-close]')||e.target.closest('[data-backdrop]')===e.target){this._close();return;}
      const cat=e.target.closest('[data-category]');if(cat){this._open(cat.dataset.category,{kind:'category',id:cat.dataset.category});return;}
      const filter=e.target.closest('[data-filter]');if(filter){this._filter=filter.dataset.filter;this._signature='';this._pendingFocus=`[data-filter="${filter.dataset.filter}"]`;this._render();return;}
      const details=e.target.closest('[data-details]');if(details){this._open('__all__',{kind:'details'});}
    }
    _entryHTML(b){
      const status=classify(b,this._cfg);
      const txt=b.kind==='percentage'?`${Number(b.value.toFixed(1))}%`:b.kind==='low'?'Bassa':b.kind==='normal'?'OK':'N/D';
      const detail=status==='critical'?'Batteria critica':status==='low'?'Batteria scarica':status==='normal'?'Batteria regolare':'Stato non disponibile';
      const ico=status==='critical'?'mdi:battery-alert':status==='low'?'mdi:battery-low':status==='normal'?'mdi:battery':'mdi:battery-unknown';
      return `<div class="bs-entry"><span class="bs-eico ${status}">${icon(ico)}</span><span class="bs-einfo"><span class="bs-entryname">${esc(b.name)}</span><span class="bs-entry-status ${status}">${esc(detail)}</span></span><span class="bs-pct ${status}">${esc(txt)}</span>${b.value!==null?`<div class="bs-track"><div class="bs-fill ${status}" style="width:${b.value}%"></div></div>`:''}</div>`;
    }
    _popup(sections){
      const selected=this._dialog==='__all__'?sections:sections.filter(s=>s.id===this._dialog);
      if(!selected.length)return '';
      const all=this._dialog==='__all__';
      const items=selected.flatMap(s=>s.items),stats=summary(items,this._cfg),title='Dettagli batterie',subtitle=all?'Tutti i dispositivi':selected[0].name;
      const keep=b=>this._filter==='all'||this._filter==='unavailable'&&classify(b,this._cfg)==='unavailable'||this._filter==='low'&&['low','critical'].includes(classify(b,this._cfg));
      const filters=[['all','Tutti',stats.total],['low','In allerta',stats.low],['unavailable','Non disponibili',stats.unavailable]];
      const groups=selected.map(s=>({s,rows:sortItems(s.items,this._cfg).filter(keep)})).filter(g=>g.rows.length);
      const list=groups.length?groups.map(g=>`${all?`<div class="bs-gh"><span>${esc(g.s.name)}</span><span>${g.rows.length}</span></div>`:''}<div class="bs-list">${g.rows.map(b=>this._entryHTML(b)).join('')}</div>`).join(''):'<div class="bs-msg">Nessun dispositivo per questo filtro</div>';
      return `<div class="bs-backdrop" data-backdrop="1"><div class="bs-modal" role="dialog" aria-modal="true" aria-labelledby="bs-mt">
        <div class="bs-mhead"><div class="bs-mtitles"><h2 class="bs-mtitle" id="bs-mt">${esc(title)}</h2><div class="bs-msub">${esc(subtitle)}</div></div><button class="bs-close" type="button" data-close="1" aria-label="Chiudi">${icon('mdi:close')}</button></div>
        <div class="bs-mbody"><div class="bs-stats"><div class="bs-stat"><b>${stats.total}</b><span>monitorati</span></div><div class="bs-stat low"><b>${stats.low}</b><span>in allerta</span></div><div class="bs-stat"><b>${stats.unavailable}</b><span>non disp.</span></div></div>
        <div class="bs-filters">${filters.map(([key,label,n])=>`<button type="button" class="bs-filter" data-filter="${key}" aria-pressed="${this._filter===key}">${label} (${n})</button>`).join('')}</div>
        ${list}
        <p class="bs-note">«N/D» indica che Home Assistant non riesce a leggere il valore dell’entità: non implica che la batteria sia scarica.</p></div></div></div>`;
    }
    _render(){
      if(!this.isConnected)return;
      const sections=this._sections(),shown=sections.filter(s=>!this._cfg.hide_empty||s.entities.length);
      const all=sections.flatMap(s=>s.items),stats=summary(all,this._cfg);
      const sig=JSON.stringify({cfg:this._cfg,theme:this._theme(),dialog:this._dialog,filter:this._filter,items:all.map(x=>[x.id,x.name,x.kind,x.value])});
      if(sig===this._signature)return;this._signature=sig;
      const previousScroll=this.shadowRoot.querySelector('.bs-mbody')?.scrollTop??0;
      this.setAttribute('data-theme',this._theme());
      // "Dispositivi personali" is deliberately excluded from the overall average.
      // It remains visible and still contributes to the alert count.
      // Binary sensors never contribute an invented percentage.
      const percentages=sections.filter(s=>s.id!=='smartphone').flatMap(s=>s.items)
        .filter(b=>b.kind==='percentage').map(b=>b.value);
      const mean=percentages.length ? Math.round(percentages.reduce((sum,value)=>sum+value,0)/percentages.length) : null;
      const alertClass=stats.critical?'critical':stats.low?'low':'';
      this.shadowRoot.innerHTML=`<style>${CARD_CSS}</style><div class="bs-container"><div class="bs-shell">
        <header class="bs-header"><div class="bs-eyebrow">${esc(this._cfg.eyebrow)}</div><div class="bs-title">${esc(this._cfg.title)}<b>.</b></div></header>
        <section class="bs-metrics" aria-label="Riepilogo batterie">
          <div class="bs-metric"><div class="bs-metric-label">Media batterie casa</div><div class="bs-metric-value">${mean===null?'—':mean+'%'}</div><div class="bs-metric-track"><div class="bs-metric-fill" style="width:${mean??0}%"></div></div><div class="bs-metric-detail">Esclusi dispositivi personali · ${percentages.length} sensori</div></div>
          <div class="bs-metric"><div class="bs-metric-label">Dispositivi in allerta</div><div class="bs-metric-value ${alertClass}">${stats.low}</div><div class="bs-metric-detail">Avviso batteria: ${this._cfg.low_threshold}%${this._cfg.show_unavailable&&stats.unavailable?` · ${stats.unavailable} N/D`:''}</div></div>
        </section>
        <div class="bs-heading">Sezioni dispositivi · ${stats.total} monitorati</div>
        ${shown.length?`<div class="bs-grid">${shown.map(s=>{
          const st=summary(s.items,this._cfg);
          const level=st.critical?'critical':st.low?'low':st.unavailable?'unavailable':st.total?'normal':'empty';
          const numeric=s.items.filter(item=>item.kind==='percentage');
          const minimum=numeric.length?Math.min(...numeric.map(item=>item.value)):null;
          const minState=minimum===null?'':minimum<=this._cfg.critical_threshold?'critical':minimum<=this._cfg.low_threshold?'low':'normal';
          const stateIcon=level==='critical'?'mdi:alert-circle-outline':level==='low'?'mdi:alert-outline':level==='normal'?'mdi:check':level==='unavailable'?'mdi:help-circle-outline':'mdi:minus';
          const countText=`${st.total} dispositiv${st.total===1?'o':'i'}`;
          const alertText=st.low?`${st.low} in allerta`:st.unavailable?`${st.unavailable} non disponibil${st.unavailable===1?'e':'i'}`:'';
          const short=`${countText}${alertText?' · '+alertText:''}`;
          const statusName=level==='normal'?'Batterie regolari':level==='low'?'Batterie in allerta':level==='critical'?'Batterie critiche':level==='unavailable'?'Stati non disponibili':'Nessun dispositivo';
          const minText=minimum===null?'Percentuale minima non disponibile':'Batteria minima: '+Number(minimum.toFixed(1))+'%';
          return `<button class="bs-tile" type="button" data-category="${esc(s.id)}" aria-label="${esc(s.name)}: ${esc(short)}. ${esc(minText)}. ${esc(statusName)}. Apri dettagli.">
            <div class="bs-tilehead"><span class="bs-tile-symbol">${icon(s.icon)}</span><span class="bs-name">${esc(s.name)}</span><span class="bs-tile-state ${level}" title="${esc(statusName)}">${icon(stateIcon)}</span></div>
            <div class="bs-tile-data"><span class="bs-sub">${esc(countText)}${alertText?`<em class="${st.critical?'critical':st.low?'low':''}">${esc(alertText)}</em>`:''}</span><span class="bs-min ${minState}" title="${esc(minText)}">${minimum===null?'—':Number(minimum.toFixed(1))+'%'}</span></div>
            <div class="bs-mini-track">${minimum!==null?`<div class="bs-mini-fill ${minState}" style="width:${minimum}%"></div>`:''}</div>
            </button>`;
        }).join('')}</div>`:'<div class="bs-empty">Nessuna sezione visibile: usa l’editor della card per aggiungerla.</div>'}
        <button class="bs-details" type="button" data-details="1" aria-haspopup="dialog" aria-expanded="${this._dialog==='__all__'}"><span class="bs-details-label">${icon('mdi:format-list-bulleted')} Dettagli e stato</span>${icon('mdi:chevron-right')}</button>
      </div></div>${this._dialog?this._popup(sections):''}`;
      const body=this.shadowRoot.querySelector('.bs-mbody');if(body)body.scrollTop=previousScroll;
      this._setModalScrollLock(Boolean(body));
      if(this._pendingFocus){this.shadowRoot.querySelector(this._pendingFocus)?.focus({preventScroll:true});this._pendingFocus='';}
    }
  }
  const EDIT_CSS=`
    :host{display:block;color:var(--primary-text-color,#18221c);font-family:var(--ha-font-family-body,Roboto,Arial,sans-serif);font-size:var(--ha-font-size-m,14px)}
    *,*:before,*:after{box-sizing:border-box}.bs-editor{display:block}.bs-tabs{display:flex;gap:5px;overflow-x:auto;padding-bottom:14px;border-bottom:1px solid var(--divider-color,#dfe5df)}
    .bs-tab{border:0;background:none;color:var(--secondary-text-color,#536359);border-radius:13px;padding:10px 13px;white-space:nowrap;font:inherit;cursor:pointer}.bs-tab.active{color:var(--primary-text-color,#17231c);background:var(--secondary-background-color,#f0f2ef);font-weight:650}
    .bs-heading{font-size:21px;font-weight:500;margin:25px 0 9px}.bs-desc{color:var(--secondary-text-color,#55665a);font-size:13px;line-height:1.5;margin-bottom:24px}
    .bs-field{display:block;margin:20px 0}.bs-label{font-size:14px;margin-bottom:10px}.bs-input{display:block;width:100%;background:var(--secondary-background-color,#f0f2ef);color:var(--primary-text-color,#18221c);border:0;border-bottom:1px solid var(--divider-color,#a5afa5);padding:14px 13px;min-height:50px;border-radius:11px 11px 0 0;font:inherit}
    ha-selector{display:block;width:100%;--mdc-theme-primary:var(--edera-emerald-color,#0E6B52)}.bs-fallback{display:none}.bs-no-native .bs-fallback{display:block}
    .bs-row{border-bottom:1px solid var(--divider-color,#e3e7e3);padding:13px 0;display:flex;align-items:center;justify-content:space-between;gap:15px}
    .bs-row label{flex:1}.bs-row input[type=checkbox]{width:18px;height:18px;accent-color:var(--edera-emerald-color,#0E6B52)}
    .bs-muted{font-size:12px;line-height:1.5;color:var(--secondary-text-color,#5e6c62)}
    .bs-panel{border:1px solid var(--divider-color,#e0e5de);border-radius:14px;padding:14px;margin:15px 0}
    .bs-tools{display:flex;gap:7px;flex-wrap:wrap;margin:12px 0}.bs-btn{background:var(--secondary-background-color,#eff2ee);border:1px solid var(--divider-color,#dbe2db);color:var(--primary-text-color,#18221c);padding:9px 12px;border-radius:12px;font:inherit;cursor:pointer}
    .bs-btn.danger{color:var(--error-color,#bd4b42)}.bs-btn:disabled{opacity:.4;cursor:not-allowed}.bs-btn.bs-remove-x{display:flex;align-items:center;justify-content:center;flex:none;width:36px;height:36px;padding:0;border:1px solid var(--divider-color,#dfe5df);border-radius:50%;background:var(--secondary-background-color,#eef1ef);color:var(--secondary-text-color,#57655c);line-height:0}.bs-remove-x .bs-icon{display:block;flex:none;width:18px;height:18px;--mdc-icon-size:18px}.bs-item{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:9px 0;border-bottom:1px solid var(--divider-color,#e0e5de)}
    .bs-itemtext{flex:1;min-width:0;overflow-wrap:anywhere}.bs-small{font-size:11px;color:var(--secondary-text-color,#55665a)}
    details{border:1px solid var(--divider-color,#e0e5de);border-radius:14px;margin:12px 0;overflow:hidden}summary{cursor:pointer;padding:16px 14px;font-weight:650;list-style:none;font-size:14px}summary::-webkit-details-marker{display:none}
    summary:after{content:'⌄';float:right;color:var(--secondary-text-color)}details[open] summary:after{content:'⌃'} .bs-detailbody{padding:1px 14px 16px}
    .bs-notice{padding:10px 12px;color:var(--error-color,#ad433f);font-size:12px;border-radius:9px;margin-top:8px}
    .bs-input:focus-visible,.bs-btn:focus-visible,.bs-tab:focus-visible{outline:2px solid var(--edera-emerald-color,#0E6B52);outline-offset:2px}
  `;
  class BatteryInsightCardEditor extends HTMLElement {
    constructor(){
      super();this.attachShadow({mode:'open'});this._cfg=normalize({});this._hass=null;this._tab='sezioni';this._nativeTried=false;this._openId=null;this._notice='';
      this.shadowRoot.addEventListener('click',e=>this._click(e));this.shadowRoot.addEventListener('change',e=>this._change(e));
      this.shadowRoot.addEventListener('toggle',e=>{if(e.target.matches('details[data-section]')&&e.target.open)this._openId=e.target.dataset.section;},true);
    }
    connectedCallback(){this._render();this._ensureNative();}
    set hass(hass){this._hass=hass;this.shadowRoot.querySelectorAll('ha-selector').forEach(e=>e.hass=hass);}
    setConfig(raw){const c=normalize(raw);if(JSON.stringify(this._cfg)===JSON.stringify(c)&&this.shadowRoot.querySelector('.bs-editor'))return;this._cfg=c;this._render();}
    async _ensureNative(){if(this._nativeTried)return;this._nativeTried=true;
      if(!customElements.get('ha-selector'))try{const h=await window.loadCardHelpers?.();await h?.importSelector?.();}catch(e){console.debug('[Battery Insight] Native selector unavailable',e);}this._render();}
    _emit(){this.dispatchEvent(new CustomEvent('config-changed',{detail:{config:JSON.parse(JSON.stringify(this._cfg))},bubbles:true,composed:true}));}
    _save(cfg){this._cfg=normalize(cfg);this._emit();this._render();}
    _changeSection(id,fn){this._save({...this._cfg,sections:this._cfg.sections.map(s=>s.id===id?fn(s):s)});}
    _field(key,label,type='text'){return `<div class="bs-field"><div class="bs-label">${esc(label)}</div><input class="bs-input" type="${type}" data-key="${esc(key)}" value="${esc(this._cfg[key])}" ${type==='number'?'min="0" max="100" step="1"':''}></div>`;}
    _check(key,label,help=''){return `<div class="bs-row"><label>${esc(label)}${help?`<div class="bs-muted">${esc(help)}</div>`:''}</label><input type="checkbox" data-check="${esc(key)}" ${this._cfg[key]?'checked':''}></div>`;}
    _section(s,index){
      const open=this._openId===s.id || this._openId===null&&index===0;
      return `<details data-section="${esc(s.id)}" ${open?'open':''}><summary>${esc(s.name)} <span class="bs-small">(${s.entities.length})</span></summary><div class="bs-detailbody">
        <div class="bs-row"><label>Mostra sezione</label><input type="checkbox" data-visible="${esc(s.id)}" ${s.visible?'checked':''}></div>
        <div class="bs-field"><div class="bs-label">Nome visualizzato</div><input class="bs-input" data-name="${esc(s.id)}" maxlength="70" value="${esc(s.name)}"></div>
        <div class="bs-field"><div class="bs-label">Icona MDI</div><div data-icon-slot="${esc(s.id)}"></div><div class="bs-fallback"><input class="bs-input" data-icon="${esc(s.id)}" value="${esc(s.icon)}" placeholder="mdi:battery"></div></div>
        <div class="bs-panel"><div class="bs-label">Entità batteria (${s.entities.length})</div>
          ${s.entities.map(id=>`<div class="bs-item"><div class="bs-itemtext">${esc(this._hass?.states?.[id]?.attributes?.friendly_name||id)}<div class="bs-small">${esc(id)}</div></div><button type="button" class="bs-btn bs-remove-x" data-remove="${esc(s.id)}" data-entity="${esc(id)}" aria-label="Rimuovi ${esc(id)}" title="Rimuovi ${esc(id)}">${icon('mdi:close')}</button></div>`).join('')}
          <div class="bs-field"><div class="bs-muted">Cerca e aggiungi un sensore batteria</div><div data-entity-slot="${esc(s.id)}"></div><div class="bs-fallback"><input class="bs-input" data-add="${esc(s.id)}" placeholder="sensor.nome_batteria"></div></div>
        </div>
        <div class="bs-tools"><button type="button" class="bs-btn" data-move="${esc(s.id)}" data-step="-1" ${index===0?'disabled':''}>↑ Su</button>
        <button type="button" class="bs-btn" data-move="${esc(s.id)}" data-step="1" ${index===this._cfg.sections.length-1?'disabled':''}>↓ Giù</button>
        ${PRESETS.some(([id])=>id===s.id)?'':`<button type="button" class="bs-btn danger" data-delete="${esc(s.id)}">Rimuovi sezione</button>`}</div></div></details>`;
    }
    _render(){
      if(!this.isConnected)return;
      const c=this._cfg,tabs=[['sezioni','Sezioni'],['riepilogo','Riepilogo'],['aspetto','Aspetto'],['avanzate','Avanzate']];
      let body='';
      if(this._tab==='sezioni')body=`<div class="bs-heading">Sezioni dispositivi</div><div class="bs-desc">Le otto sezioni predefinite possono essere rinominate e nascoste. Aggiungi sezioni personalizzate, scegli le icone MDI e assegna i sensori batteria.</div>
        ${c.sections.map((s,i)=>this._section(s,i)).join('')}
        <div class="bs-panel"><div class="bs-label">Nuova sezione personalizzata</div><input class="bs-input" data-new-name maxlength="70" placeholder="Es. Telecomandi"/><div class="bs-tools"><button type="button" class="bs-btn" data-new-section="1">+ Aggiungi sezione</button></div></div>`;
      if(this._tab==='riepilogo')body=`<div class="bs-heading">Monitoraggio batterie</div><div class="bs-desc">Scegli le percentuali di avviso e di batteria critica. L'avviso scatta già al valore impostato. I dispositivi personali non entrano nella media, ma restano inclusi negli avvisi.</div>${this._field('low_threshold','Avviso batteria (%)','number')}${this._field('critical_threshold','Batteria critica (%)','number')}<div class="bs-muted">Le percentuali non disponibili non vengono inventate né conteggiate come batterie regolari.</div>`;
      if(this._tab==='aspetto')body=`<div class="bs-heading">Aspetto Edera</div><div class="bs-desc">Stessa tipografia, spaziature e selezione del tema della Security Panel Card.</div>${this._field('eyebrow','Intestazione superiore')}${this._field('title','Titolo')}<div class="bs-field"><div class="bs-label">Tema</div><select class="bs-input" data-key="theme_mode"><option value="auto" ${c.theme_mode==='auto'?'selected':''}>Automatico (Home Assistant)</option><option value="light" ${c.theme_mode==='light'?'selected':''}>Light Edera</option><option value="dark" ${c.theme_mode==='dark'?'selected':''}>Dark Edera</option></select></div>`;
      if(this._tab==='avanzate')body=`<div class="bs-heading">Avanzate</div><div class="bs-desc">Personalizza le informazioni visibili. La card è di sola lettura e non esegue comandi sui dispositivi.</div>${this._check('hide_empty','Nascondi sezioni senza dispositivi')}${this._check('show_unavailable','Mostra nel riepilogo le entità non disponibili')}<div class="bs-panel bs-muted">Sono supportati sensori percentuali e binary_sensor con device_class battery. I sensori binari mostrano Bassa/OK, non percentuali inventate. Nessun servizio cloud o richiesta allo storico.</div>`;
      this.shadowRoot.innerHTML=`<style>${EDIT_CSS}</style><div class="bs-editor"><div class="bs-tabs">${tabs.map(([id,label])=>`<button type="button" class="bs-tab ${this._tab===id?'active':''}" data-tab="${id}">${label}</button>`).join('')}</div>${body}${this._notice?`<div class="bs-notice" role="alert">${esc(this._notice)}</div>`:''}</div>`;
      const native=!!customElements.get('ha-selector');this.shadowRoot.querySelector('.bs-editor').classList.toggle('bs-no-native',!native);
      if(!native)return;
      this.shadowRoot.querySelectorAll('[data-icon-slot]').forEach(slot=>{
        const id=slot.dataset.iconSlot,s=c.sections.find(x=>x.id===id);if(!s)return;
        const sel=document.createElement('ha-selector');sel.hass=this._hass;sel.selector={icon:{}};sel.value=s.icon;
        sel.addEventListener('value-changed',e=>{e.stopPropagation();const value=iconName(e.detail?.value,s.icon);this._openId=id;this._changeSection(id,x=>({...x,icon:value}));});slot.appendChild(sel);
      });
      this.shadowRoot.querySelectorAll('[data-entity-slot]').forEach(slot=>{
        const id=slot.dataset.entitySlot,sel=document.createElement('ha-selector');sel.hass=this._hass;sel.selector={entity:{domain:['sensor','binary_sensor']}};sel.value='';
        sel.addEventListener('value-changed',e=>{e.stopPropagation();this._addEntity(id,e.detail?.value);});slot.appendChild(sel);
      });
    }
    _addEntity(id,raw){const eid=entId(raw);if(!eid){this._notice='Seleziona una entità sensor o binary_sensor valida.';this._render();return;}
      if(this._cfg.sections.some(s=>s.entities.includes(eid))){this._notice='Questa entità è già presente in una sezione.';this._render();return;}
      const ent=this._hass?.states?.[eid];
      if(ent && !(ent.attributes?.device_class==='battery'||eid.startsWith('sensor.')&&ent.attributes?.unit_of_measurement==='%')){
        this._notice='Seleziona un sensore di batteria (device_class battery oppure unità %).';this._render();return;
      }
      this._notice='';this._openId=id;this._changeSection(id,s=>({...s,entities:[...s.entities,eid]}));
    }
    _click(e){
      const tab=e.target.closest('[data-tab]');if(tab){this._tab=tab.dataset.tab;this._notice='';this._render();return;}
      const add=e.target.closest('[data-new-section]');if(add){
        const name=this.shadowRoot.querySelector('[data-new-name]')?.value?.trim()||'';
        if(!name){this._notice='Inserisci un nome per la nuova sezione.';this._render();return;}
        if(this._cfg.sections.length>=LIMIT){this._notice='Limite massimo di sezioni raggiunto.';this._render();return;}
        let slug=name.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,45)||'sezione';if(!/^[a-z]/.test(slug))slug='sezione-'+slug;
        let id=slug,n=2;while(this._cfg.sections.some(s=>s.id===id))id=`${slug}-${n++}`;
        this._openId=id;this._notice='';this._save({...this._cfg,sections:[...this._cfg.sections,{id,name,icon:'mdi:battery',entities:[],visible:true}]});return;
      }
      const remove=e.target.closest('[data-remove]');if(remove){const id=remove.dataset.remove,eid=remove.dataset.entity;this._openId=id;this._notice='';this._changeSection(id,s=>({...s,entities:s.entities.filter(x=>x!==eid)}));return;}
      const del=e.target.closest('[data-delete]');if(del){const id=del.dataset.delete;if(PRESETS.some(([p])=>p===id))return;
        if(!window.confirm('Rimuovere questa sezione e le associazioni delle sue entità?'))return;
        this._openId=null;this._save({...this._cfg,sections:this._cfg.sections.filter(s=>s.id!==id)});return;
      }
      const move=e.target.closest('[data-move]');if(move){const list=[...this._cfg.sections],i=list.findIndex(x=>x.id===move.dataset.move),j=i+Number(move.dataset.step);if(i<0||j<0||j>=list.length)return;
        [list[i],list[j]]=[list[j],list[i]];this._openId=move.dataset.move;this._save({...this._cfg,sections:list});}
    }
    _change(e){const t=e.target;
      if(t.dataset.key){const key=t.dataset.key,value=t.type==='number'?num(t.value,this._cfg[key]):t.value;
        if(key==='low_threshold'&&value<=this._cfg.critical_threshold){this._notice='La soglia attenzione deve superare quella critica.';this._render();return;}
        if(key==='critical_threshold'&&value>=this._cfg.low_threshold){this._notice='La soglia critica deve essere inferiore alla soglia attenzione.';this._render();return;}
        this._notice='';this._save({...this._cfg,[key]:value});return;
      }
      if(t.dataset.check){this._notice='';this._save({...this._cfg,[t.dataset.check]:t.checked});return;}
      if(t.dataset.visible){this._openId=t.dataset.visible;this._changeSection(t.dataset.visible,s=>({...s,visible:t.checked}));return;}
      if(t.dataset.name){const name=t.value.trim();if(!name)return;this._openId=t.dataset.name;this._changeSection(t.dataset.name,s=>({...s,name}));return;}
      if(t.dataset.icon){this._openId=t.dataset.icon;this._changeSection(t.dataset.icon,section=>({...section,icon:iconName(t.value,section.icon)}));return;}
      if(t.dataset.add){this._addEntity(t.dataset.add,t.value);}
    }
  }
  if(!customElements.get(TAG))customElements.define(TAG,BatteryInsightCard);
  if(!customElements.get(EDITOR))customElements.define(EDITOR,BatteryInsightCardEditor);
  window.customCards=window.customCards||[];
  if(!window.customCards.some(x=>x.type===TAG))window.customCards.push({type:TAG,name:'Battery Insight Card',description:'Monitoraggio batterie in stile Edera, con sezioni configurabili.',preview:true});
})();