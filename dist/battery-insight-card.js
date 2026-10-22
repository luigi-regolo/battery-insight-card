/*
 * Battery Insight Card — development version 0.1.
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
      eyebrow:String(raw.eyebrow??'MONITORAGGIO DISPOSITIVI').slice(0,90),
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
    :host([data-theme=light]){--bs-bg:#fafbf9;--bs-tile:#f0f2ef;--bs-circle:#fff;--bs-line:#e0e5df;--bs-text:#18221c;--bs-muted:#56675c;--bs-accent:#0a7156;--bs-red:#ae4742;--bs-amber:#ad701c}
    :host([data-theme=dark]){--bs-bg:#101211;--bs-tile:#191c1a;--bs-circle:#282b29;--bs-line:#2b302c;--bs-text:#f5f7f4;--bs-muted:#bbc5bd;--bs-accent:#45b594;--bs-red:#f17878;--bs-amber:#efb45f}
    button{font:inherit;cursor:pointer;color:inherit;-webkit-tap-highlight-color:transparent}
    button:focus-visible{outline:2px solid var(--bs-accent);outline-offset:3px}
    .bs-icon{height:21px;width:21px;--mdc-icon-size:21px;flex:none;display:inline-flex;align-items:center;justify-content:center}
    .bs-shell{padding:18px;border:1px solid var(--bs-line);background:var(--bs-bg);border-radius:26px;min-width:0}
    .bs-header{margin:2px 4px 17px}.bs-eyebrow{font-size:10px;font-weight:750;letter-spacing:1.7px;color:var(--bs-muted);margin-bottom:7px;text-transform:uppercase}
    .bs-title{font-size:25px;line-height:1.14;font-weight:780;letter-spacing:-.7px;overflow-wrap:anywhere}
    .bs-title b{color:var(--bs-accent)}
    .bs-row{border-radius:24px;border:1px solid var(--bs-line);padding:12px;background:var(--bs-tile);margin-top:9px}
    .bs-metrics{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin-top:9px}
    .bs-metric{background:var(--bs-tile);border:1px solid var(--bs-line);border-radius:20px;padding:13px;min-width:0}
    .bs-metric-label{font-size:11px;color:var(--bs-muted);line-height:1.4}
    .bs-metric-value{font-size:25px;line-height:1.3;font-weight:750;margin:5px 0 4px;font-variant-numeric:tabular-nums}
    .bs-metric-value.low{color:var(--bs-red)}
    .bs-metric-detail{font-size:11px;color:var(--bs-muted);line-height:1.4}
    .bs-metric-track{height:5px;background:var(--bs-line);overflow:hidden;border-radius:99px;margin:8px 0 2px}
    .bs-metric-fill{height:100%;background:var(--bs-accent);border-radius:99px}

    .bs-intro{display:flex;align-items:center;flex-wrap:wrap;gap:11px}.bs-orb{width:43px;height:43px;flex:none;border-radius:50%;background:var(--bs-circle);display:grid;place-items:center}
    .bs-main{flex:1;min-width:0}.bs-name{font-size:14px;font-weight:650;line-height:1.3}.bs-sub{font-size:12px;color:var(--bs-muted);margin-top:3px;line-height:1.45}
    .bs-alert{display:flex;align-items:center;gap:6px;margin-left:auto;font-weight:700;font-size:12px;color:var(--bs-amber)}
    .bs-alert.is-ok{color:var(--bs-accent)}.bs-alert.is-critical{color:var(--bs-red)}
    .bs-heading{font-size:10px;font-weight:700;letter-spacing:1.3px;color:var(--bs-muted);margin:19px 4px 10px;text-transform:uppercase}
    .bs-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));grid-auto-rows:1fr;gap:12px}
    .bs-tile{display:flex;min-width:0;min-height:98px;flex-direction:column;gap:6px;text-align:left;align-items:stretch;padding:9px 10px;border:1px solid var(--bs-line);border-radius:24px;background:var(--bs-tile)}
    .bs-tilehead{display:flex;align-items:center;gap:9px;min-width:0}.bs-tile .bs-orb{width:41px;height:41px}.bs-tile .bs-icon{height:22px;width:22px;--mdc-icon-size:22px}
    .bs-tiletext{flex:1;min-width:0}.bs-tile .bs-name{font-size:13px;overflow-wrap:anywhere}.bs-tile .bs-sub{font-size:11.5px;overflow-wrap:anywhere}
    /* Security Panel geometry, compact visual states as in approved category grid. */
    .bs-grid{gap:10px}
    .bs-tile{min-height:156px;padding:11px 12px 12px;border-radius:24px;gap:8px}
    .bs-tilehead{justify-content:space-between;min-height:24px;align-items:center}
    .bs-tile .bs-icon{width:21px;height:21px;--mdc-icon-size:21px}
    .bs-tile-symbol{display:inline-flex;align-items:center;justify-content:center;width:43px;height:43px;border-radius:50%;background:var(--bs-circle);color:var(--bs-text);flex:none}
    .bs-tile-state{display:inline-flex;align-items:center;justify-content:center;min-height:30px;min-width:30px;color:var(--bs-muted)}
    .bs-tile-state.normal{color:var(--bs-accent)}
    .bs-tile-state.low{color:var(--bs-amber)}
    .bs-tile-state.critical{color:var(--bs-red)}
    .bs-tile-caption{display:flex;flex-direction:column;align-items:flex-start;min-width:0;gap:5px;margin-top:2px;line-height:1.35}
    .bs-tile .bs-name{display:block;width:100%;font-size:13px;font-weight:650;line-height:1.35;overflow-wrap:anywhere}
    .bs-tile .bs-sub{display:block;width:100%;font-size:12px;line-height:1.4;margin:0;color:var(--bs-muted);overflow-wrap:anywhere}
    .bs-tile .bs-sub.low{color:var(--bs-amber)}
    .bs-tile .bs-sub.critical{color:var(--bs-red)}
    .bs-min{font-size:11px;line-height:1.4;color:var(--bs-muted);margin-top:auto;padding-top:8px}
    .bs-min strong{font-size:11.5px;font-weight:650;color:var(--bs-text);font-variant-numeric:tabular-nums}
    .bs-min.low strong{color:var(--bs-amber)}
    .bs-min.critical strong{color:var(--bs-red)}
    .bs-mini-track{height:4px;width:100%;background:var(--bs-line);border-radius:50px;overflow:hidden;margin-top:6px}
    .bs-mini-fill{height:100%;background:var(--bs-accent);border-radius:50px}
    .bs-mini-fill.low{background:var(--bs-amber)}
    .bs-mini-fill.critical{background:var(--bs-red)}
    @container (max-width:360px){.bs-tile{padding:12px;min-height:148px}.bs-tile .bs-name{font-size:13px}}
    .bs-chevron{color:var(--bs-muted)}.bs-pill{margin-top:auto;display:inline-flex;align-items:center;gap:5px;width:fit-content;max-width:100%;min-width:0;padding:5px 9px;font-size:11px;font-weight:650;border-radius:999px;background:var(--bs-circle);color:var(--bs-text)}
    .bs-pill .bs-icon{height:14px;width:14px;--mdc-icon-size:14px}.bs-pill.low{color:var(--bs-amber)}.bs-pill.critical{color:var(--bs-red)}
    .bs-details{display:flex;align-items:center;justify-content:space-between;width:100%;min-width:0;gap:12px;min-height:42px;padding:10px 14px;margin-top:14px;border:1px solid var(--bs-accent);border-radius:16px;background:var(--bs-accent);color:#fff;text-align:left;font-weight:650;font-size:12px}.bs-details[aria-expanded="true"],.bs-details:hover{background:var(--bs-accent);color:#fff}.bs-details-label{display:inline-flex;align-items:center;gap:8px;min-width:0}.bs-details-label .bs-icon{display:inline-flex;align-items:center;justify-content:center}
    .bs-details .bs-icon{width:17px;height:17px;--mdc-icon-size:17px}
    .bs-empty{padding:16px;color:var(--bs-muted);font-size:12px;text-align:center}
    .bs-backdrop{position:fixed;inset:0;background:rgba(0,0,0,.60);display:flex;align-items:center;justify-content:center;padding:max(18px,env(safe-area-inset-top)) 18px max(18px,env(safe-area-inset-bottom));z-index:9999}
    .bs-dialog{background:var(--bs-bg);color:var(--bs-text);border:1px solid var(--bs-line);border-radius:26px;display:block;padding:20px;width:min(390px,100%);max-width:100%;min-width:0;max-height:min(82vh,720px);max-height:min(82dvh,720px);box-shadow:0 18px 60px #0005;overflow-y:auto;overflow-x:hidden;overscroll-behavior:contain;-webkit-overflow-scrolling:touch}
    .bs-dialog-head{display:flex;align-items:center;justify-content:space-between;gap:10px;min-height:38px;margin-bottom:10px;padding:0}
    .bs-dialog-head strong{display:block;font-size:17px;font-weight:600;line-height:1.3}.bs-dialog-titles{min-width:0;flex:1}.bs-dialog-titles span{display:block;margin-top:4px;font-size:12px;color:var(--bs-muted)}.bs-close{display:flex;align-items:center;justify-content:center;border:0;border-radius:50%;background:var(--bs-tile);width:36px;height:36px;flex:none;line-height:0;padding:0}.bs-close .bs-icon{display:block;width:18px;height:18px;--mdc-icon-size:18px;flex:none}
    .bs-dialog-body{padding:0;overflow:visible;min-height:0}
    .bs-stats{display:flex;flex-wrap:wrap;gap:9px;margin:0 0 18px}.bs-stat{border:1px solid var(--bs-line);border-radius:17px;padding:10px 13px;background:var(--bs-tile);font-size:12px;white-space:nowrap}
    .bs-stat b{font-size:15px;font-weight:750}.bs-filters{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:21px}.bs-popup-heading{font-size:13px;font-weight:650;line-height:1.4;margin:7px 0 12px}
    .bs-filter{border:1px solid var(--bs-line);border-radius:999px;padding:10px 15px;min-height:39px;background:var(--bs-tile);font-size:12px;line-height:1.2}.bs-filter.selected{background:var(--bs-accent);color:#fff;border-color:var(--bs-accent)}.bs-filter:focus-visible{outline:2px solid var(--bs-accent);outline-offset:2px}
    .bs-entry{padding:13px 14px;background:var(--bs-tile);border:1px solid var(--bs-line);border-radius:17px;margin-bottom:9px}.bs-entry:last-child{margin-bottom:0}
    .bs-entrytop{display:flex;align-items:center;justify-content:space-between;gap:12px}.bs-entryidentity{display:flex;align-items:center;gap:9px;min-width:0;flex:1}.bs-entryidentity .bs-icon{width:21px;height:21px;--mdc-icon-size:21px}.bs-entryname{font-size:13px;line-height:1.35;font-weight:650;min-width:0;overflow-wrap:anywhere}.bs-entry-status{margin:6px 0 0 30px;color:var(--bs-muted);font-size:11px}.bs-entry-status.low{color:var(--bs-amber)}.bs-entry-status.critical{color:var(--bs-red)}
    .bs-pct{font-weight:750;white-space:nowrap;font-size:14px}.bs-pct.low{color:var(--bs-amber)}.bs-pct.critical{color:var(--bs-red)}.bs-pct.unavailable{color:var(--bs-muted)}
    .bs-track{background:var(--bs-line);height:6px;border-radius:999px;overflow:hidden;margin-top:9px}.bs-fill{height:100%;background:var(--bs-accent);border-radius:999px}.bs-fill.low{background:var(--bs-amber)}.bs-fill.critical{background:var(--bs-red)}
    .bs-entityid{font-size:10px;color:var(--bs-muted);margin-top:3px;overflow-wrap:anywhere}
    @container (max-width:390px){.bs-grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:9px}.bs-tile{min-height:143px;padding:9px 9px 10px;gap:6px}.bs-tile-symbol{width:34px;height:34px}.bs-tile .bs-icon{width:19px;height:19px;--mdc-icon-size:19px}.bs-tile .bs-name{font-size:12px;line-height:1.3}.bs-tile .bs-sub{font-size:11px;line-height:1.3}.bs-tile .bs-min{font-size:10px;padding-top:6px}.bs-tile .bs-min strong{font-size:11px}}
    @container (max-width:360px){.bs-shell{padding:13px}.bs-title{font-size:23px}}
    :host{container-type:inline-size}
    @media(max-width:440px){.bs-shell{padding:13px}.bs-backdrop{padding:max(16px,env(safe-area-inset-top)) 16px max(16px,env(safe-area-inset-bottom))}.bs-dialog{width:min(390px,100%);max-height:min(82vh,720px);max-height:min(82dvh,720px);padding:18px}.bs-dialog-body{padding:0}.bs-dialog-head{padding:0;min-height:38px}}
    @media(prefers-reduced-motion:reduce){*,*:before,*:after{scroll-behavior:auto!important;animation:none!important;transition:none!important}}
  `;
  class BatteryInsightCard extends HTMLElement {
    static getStubConfig(){const {type,...config}=normalize({});return config;}
    static getConfigElement(){return document.createElement(EDITOR);}
    constructor(){
      super();this.attachShadow({mode:'open'});this._cfg=normalize({});this._hass=null;this._dialog=null;this._filter='all';this._signature='';this._returnFocus=null;
      this._media=typeof matchMedia==='function'?matchMedia('(prefers-color-scheme: dark)'):null;
      this._appearance=()=>this._render();this._media?.addEventListener?.('change',this._appearance);
      this.shadowRoot.addEventListener('click',e=>this._click(e));
      this.shadowRoot.addEventListener('keydown',e=>{if(e.key==='Escape'&&this._dialog)this._close();});
    }
    connectedCallback(){this._render();}
    disconnectedCallback(){this._media?.removeEventListener?.('change',this._appearance);}
    setConfig(cfg){this._cfg=normalize(cfg);this._render();}
    set hass(hass){this._hass=hass;this._render();}
    getCardSize(){return Math.max(3,Math.ceil(this._cfg.sections.filter(s=>s.visible&&(!this._cfg.hide_empty||s.entities.length)).length/2)+2);}
    _theme(){if(this._cfg.theme_mode!=='auto')return this._cfg.theme_mode;if(typeof this._hass?.themes?.darkMode==='boolean')return this._hass.themes.darkMode?'dark':'light';return this._media?.matches?'dark':'light';}
    _sections(){return this._cfg.sections.filter(s=>s.visible).map(s=>({...s,items:s.entities.map(id=>battery(this._hass,id))}));}
    _close(){const prior=this._returnFocus;this._dialog=null;this._filter='all';this._signature='';this._render();
      const current=prior?.kind==='category'?[...this.shadowRoot.querySelectorAll('[data-category]')].find(x=>x.dataset.category===prior.id):this.shadowRoot.querySelector('[data-details]');
      current?.focus?.();this._returnFocus=null;}
    _click(e){
      if(e.target.closest('[data-close]')||e.target.closest('[data-backdrop]')===e.target){this._close();return;}
      const cat=e.target.closest('[data-category]');if(cat){this._returnFocus={kind:'category',id:cat.dataset.category};this._dialog=cat.dataset.category;this._filter='all';this._signature='';this._render();this.shadowRoot.querySelector('[data-close]')?.focus();return;}
      const filter=e.target.closest('[data-filter]');if(filter){this._filter=filter.dataset.filter;this._signature='';this._render();return;}
      const details=e.target.closest('[data-details]');if(details){this._returnFocus={kind:'details'};this._dialog='__all__';this._filter='all';this._signature='';this._render();this.shadowRoot.querySelector('[data-close]')?.focus();}
    }
    _popup(sections){
      const selected=this._dialog==='__all__'?sections:sections.filter(s=>s.id===this._dialog);
      if(!selected.length)return '';
      const items=selected.flatMap(s=>s.items),stats=summary(items,this._cfg),title='Dettagli batterie',subtitle=this._dialog==='__all__'?'Tutti i dispositivi':selected[0].name;
      const entries=sortItems(items,this._cfg).filter(b=>this._filter==='all'||this._filter==='unavailable'&&classify(b,this._cfg)==='unavailable'||this._filter==='low'&&['low','critical'].includes(classify(b,this._cfg)));
      const filters=[['all','Tutti'],['low','In allerta'],['unavailable','Non disponibili']];
      return `<div class="bs-backdrop" data-backdrop="1"><div class="bs-dialog" role="dialog" aria-modal="true" aria-label="${esc(title)}">
        <div class="bs-dialog-head"><div class="bs-dialog-titles"><strong>${esc(title)}</strong><span>${esc(subtitle)}</span></div><button class="bs-close" type="button" data-close="1" aria-label="Chiudi">${icon('mdi:close')}</button></div>
        <div class="bs-dialog-body"><div class="bs-popup-heading">Riepilogo dispositivi</div><div class="bs-stats"><div class="bs-stat"><b>${stats.total}</b> monitorati</div><div class="bs-stat"><b>${stats.low}</b> in allerta</div><div class="bs-stat"><b>${stats.unavailable}</b> non disponibili</div></div>
        <div class="bs-popup-heading">Filtra dispositivi</div><div class="bs-filters">${filters.map(([key,label])=>`<button type="button" class="bs-filter ${this._filter===key?'selected':''}" data-filter="${key}" aria-pressed="${this._filter===key}">${label}</button>`).join('')}</div><div class="bs-popup-heading">Dispositivi</div>
        ${entries.length?entries.map(b=>{
          const status=classify(b,this._cfg);const txt=b.kind==='percentage'?`${Number(b.value.toFixed(1))}%`:b.kind==='low'?'Bassa':b.kind==='normal'?'OK':'N/D';
          const detail=status==='critical'?'Batteria critica':status==='low'?'Batteria scarica':status==='normal'?'Batteria regolare':'Stato non disponibile';
          return `<div class="bs-entry"><div class="bs-entrytop"><div class="bs-entryidentity">${icon('mdi:battery')}<span class="bs-entryname">${esc(b.name)}</span></div><span class="bs-pct ${status}">${esc(txt)}</span></div><div class="bs-entry-status ${status}">${esc(detail)}</div>
            ${b.value!==null?`<div class="bs-track"><div class="bs-fill ${status}" style="width:${b.value}%"></div></div>`:''}
            </div>`;
        }).join(''):'<div class="bs-empty">Nessun dispositivo per questo filtro</div>'}</div></div></div>`;
    }
    _render(){
      if(!this.isConnected)return;
      const sections=this._sections(),shown=sections.filter(s=>!this._cfg.hide_empty||s.entities.length);
      const all=sections.flatMap(s=>s.items),stats=summary(all,this._cfg);
      const sig=JSON.stringify({cfg:this._cfg,theme:this._theme(),dialog:this._dialog,filter:this._filter,items:all.map(x=>[x.id,x.name,x.kind,x.value])});
      if(sig===this._signature)return;this._signature=sig;
      const previousScroll=this.shadowRoot.querySelector('.bs-dialog')?.scrollTop??0;
      this.setAttribute('data-theme',this._theme());
      // "Dispositivi personali" is deliberately excluded from the overall average.
      // It remains visible and still contributes to the alert count.
      // Binary sensors never contribute an invented percentage.
      const percentages=sections.filter(s=>s.id!=='smartphone').flatMap(s=>s.items)
        .filter(b=>b.kind==='percentage').map(b=>b.value);
      const mean=percentages.length ? Math.round(percentages.reduce((sum,value)=>sum+value,0)/percentages.length) : null;
      this.shadowRoot.innerHTML=`<style>${CARD_CSS}</style><div class="bs-shell">
        <header class="bs-header"><div class="bs-eyebrow">${esc(this._cfg.eyebrow)}</div><div class="bs-title">${esc(this._cfg.title)}<b>.</b></div></header>
        <section class="bs-metrics" aria-label="Riepilogo batterie">
          <div class="bs-metric"><div class="bs-metric-label">Media batterie casa</div><div class="bs-metric-value">${mean===null?'—':mean+'%'}</div><div class="bs-metric-track"><div class="bs-metric-fill" style="width:${mean??0}%"></div></div><div class="bs-metric-detail">Esclusi dispositivi personali · ${percentages.length} sensori</div></div>
          <div class="bs-metric"><div class="bs-metric-label">Dispositivi in allerta</div><div class="bs-metric-value ${stats.low?'low':''}">${stats.low}</div><div class="bs-metric-detail">Avviso batteria: ${this._cfg.low_threshold}%${this._cfg.show_unavailable&&stats.unavailable?` · ${stats.unavailable} N/D`:''}</div></div>
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
          return `<button class="bs-tile" type="button" data-category="${esc(s.id)}" aria-label="${esc(s.name)}: ${esc(short)}. ${esc(statusName)}. Apri dettagli.">
            <div class="bs-tilehead"><span class="bs-tile-symbol">${icon(s.icon)}</span><span class="bs-tile-state ${level}" title="${esc(statusName)}">${icon(stateIcon)}</span></div>
            <div class="bs-tile-caption"><span class="bs-name">${esc(s.name)}</span><span class="bs-sub">${esc(countText)}</span>${alertText?`<span class="bs-sub ${st.critical?'critical':st.low?'low':''}">${esc(alertText)}</span>`:''}</div>
            <div class="bs-min ${minState}">${minimum===null?'Percentuale minima non disponibile':`Batteria minima: <strong>${Number(minimum.toFixed(1))}%</strong>`}
              ${minimum!==null?`<div class="bs-mini-track"><div class="bs-mini-fill ${minState}" style="width:${minimum}%"></div></div>`:''}</div>
            </button>`;
        }).join('')}</div>`:'<div class="bs-empty">Nessuna sezione visibile: usa l’editor della card per aggiungerla.</div>'}
        <button class="bs-details" type="button" data-details="1" aria-haspopup="dialog" aria-expanded="${this._dialog==='__all__'}"><span class="bs-details-label">${icon('mdi:format-list-bulleted')} Dettagli batterie</span>${icon('mdi:chevron-right')}</button>
      </div>${this._dialog?this._popup(sections):''}`;
      const dialog=this.shadowRoot.querySelector('.bs-dialog');if(dialog)dialog.scrollTop=previousScroll;
    }
  }
  const EDIT_CSS=`
    :host{display:block;color:var(--primary-text-color,#18221c);font-family:var(--ha-font-family-body,Roboto,Arial,sans-serif);font-size:var(--ha-font-size-m,14px)}
    *,*:before,*:after{box-sizing:border-box}.bs-editor{display:block}.bs-tabs{display:flex;gap:5px;overflow-x:auto;padding-bottom:14px;border-bottom:1px solid var(--divider-color,#dfe5df)}
    .bs-tab{border:0;background:none;color:var(--secondary-text-color,#536359);border-radius:13px;padding:10px 13px;white-space:nowrap;font:inherit;cursor:pointer}.bs-tab.active{color:var(--primary-text-color,#17231c);background:var(--secondary-background-color,#f0f2ef);font-weight:650}
    .bs-heading{font-size:21px;font-weight:500;margin:25px 0 9px}.bs-desc{color:var(--secondary-text-color,#55665a);font-size:13px;line-height:1.5;margin-bottom:24px}
    .bs-field{display:block;margin:20px 0}.bs-label{font-size:14px;margin-bottom:10px}.bs-input{display:block;width:100%;background:var(--secondary-background-color,#f0f2ef);color:var(--primary-text-color,#18221c);border:0;border-bottom:1px solid var(--divider-color,#a5afa5);padding:14px 13px;min-height:50px;border-radius:11px 11px 0 0;font:inherit}
    ha-selector{display:block;width:100%;--mdc-theme-primary:var(--primary-color,#0b7457)}.bs-fallback{display:none}.bs-no-native .bs-fallback{display:block}
    .bs-row{border-bottom:1px solid var(--divider-color,#e3e7e3);padding:13px 0;display:flex;align-items:center;justify-content:space-between;gap:15px}
    .bs-row label{flex:1}.bs-row input[type=checkbox]{width:18px;height:18px;accent-color:var(--primary-color,#0c7157)}
    .bs-muted{font-size:12px;line-height:1.5;color:var(--secondary-text-color,#5e6c62)}
    .bs-panel{border:1px solid var(--divider-color,#e0e5de);border-radius:14px;padding:14px;margin:15px 0}
    .bs-tools{display:flex;gap:7px;flex-wrap:wrap;margin:12px 0}.bs-btn{background:var(--secondary-background-color,#eff2ee);border:1px solid var(--divider-color,#dbe2db);color:var(--primary-text-color,#18221c);padding:9px 12px;border-radius:12px;font:inherit;cursor:pointer}
    .bs-btn.danger{color:var(--error-color,#bd4b42)}.bs-btn:disabled{opacity:.4;cursor:not-allowed}.bs-btn.bs-remove-x{display:flex;align-items:center;justify-content:center;flex:none;width:36px;height:36px;padding:0;border:1px solid var(--divider-color,#dfe5df);border-radius:50%;background:var(--secondary-background-color,#eef1ef);color:var(--secondary-text-color,#57655c);line-height:0}.bs-remove-x .bs-icon{display:block;flex:none;width:18px;height:18px;--mdc-icon-size:18px}.bs-item{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:9px 0;border-bottom:1px solid var(--divider-color,#e0e5de)}
    .bs-itemtext{flex:1;min-width:0;overflow-wrap:anywhere}.bs-small{font-size:11px;color:var(--secondary-text-color,#55665a)}
    details{border:1px solid var(--divider-color,#e0e5de);border-radius:14px;margin:12px 0;overflow:hidden}summary{cursor:pointer;padding:16px 14px;font-weight:650;list-style:none;font-size:14px}summary::-webkit-details-marker{display:none}
    summary:after{content:'⌄';float:right;color:var(--secondary-text-color)}details[open] summary:after{content:'⌃'} .bs-detailbody{padding:1px 14px 16px}
    .bs-notice{padding:10px 12px;color:var(--error-color,#ad433f);font-size:12px;border-radius:9px;margin-top:8px}
    .bs-input:focus-visible,.bs-btn:focus-visible,.bs-tab:focus-visible{outline:2px solid var(--primary-color,#0b7457);outline-offset:2px}
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