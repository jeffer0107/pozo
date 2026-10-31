(() => {
 'use strict';
 const root=document.getElementById('well-data'),data=window.NEUQUEN_DEPARTMENTS;
 if(!root||!data)return;
 const $=id=>document.getElementById(id),fmt=new Intl.NumberFormat('es-AR');
 const state=$('dept-state'),list=$('dept-list'),reduced=matchMedia('(prefers-reduced-motion: reduce)');
 let selected='ALL',map=null,polygons=null,clusters=null,latest=[],initialized=false;
 const layerById=new Map(),markerCache=new Map();
 const departmentName=id=>id===-1?'Sin asignar':data.departments[id];
 const groups={
  active:{label:'Activos',color:'#34d399',states:['Extracción Efectiva','En Inyección Efectiva','Mantenimiento de Presión','Otras Situación Activo']},
  temporary:{label:'Transitorios',color:'#f1c56a',states:['Parado Transitoriamente','Abandono Temporario']},
  abandoned:{label:'Abandonados',color:'#bb96eb',states:['Abandonado']},
  pending:{label:'A abandonar',color:'#f08a74',states:['A Abandonar']},
  other:{label:'Otros estados / sin dato',color:'#91a3b2',states:[]}
 };
 const groupOf=row=>Object.keys(groups).find(key=>groups[key].states.includes(data.states[row[4]]))||'other';
 function node(tag,text,className){const el=document.createElement(tag);if(text!==undefined)el.textContent=text;if(className)el.className=className;return el;}
 const groupedOptions=node('optgroup');groupedOptions.label='Grupos de estados';
 Object.entries(groups).forEach(([key,group])=>{const opt=node('option',group.label);opt.value='group:'+key;groupedOptions.append(opt);});state.append(groupedOptions);
 const originalOptions=node('optgroup');originalOptions.label='Estados del archivo';
 data.states.forEach((name,index)=>{const opt=node('option',name);opt.value=String(index);originalOptions.append(opt);});state.append(originalOptions);
 function matchesState(row){return state.value===''||(state.value.startsWith('group:')?groupOf(row)===state.value.slice(6):row[4]===Number(state.value));}
 function color(row){return groups[groupOf(row)].color;}
 function filtered(){return data.wells.filter(matchesState);}
 function statistics(rows){
  const result=Array.from({length:data.departments.length+1},(_,index)=>({id:index===data.departments.length?-1:index,total:0,active:0,temporary:0,abandoned:0,pending:0,other:0}));
  rows.forEach(row=>{const stat=result[row[2]===-1?data.departments.length:row[2]];stat.total++;stat[groupOf(row)]++;});
  return result;
 }
 function style(feature){
  const id=data.departments.indexOf(feature.properties.departamento),active=String(id)===selected;
  return {color:active?'#f3c57c':'#86bbc9',weight:active?2.8:1.5,opacity:1,fillColor:active?'#d4a259':'#367187',fillOpacity:.3,dashArray:active?'':'4 4'};
 }
 function popup(row){
  const box=node('div',undefined,'dept-popup');box.append(node('h4',row[1]||'Pozo '+row[0]));
  const details=[['Departamento',departmentName(row[2])],['Empresa',data.companies[row[5]]],['Yacimiento',data.fields[row[6]]],['Formación',data.formations[row[7]]],['Recurso',data.resources[row[8]]],['Tipo',data.types[row[9]]],['Estado',data.states[row[4]]],['Profundidad',row[10]===null?'No informada':fmt.format(row[10])+' m']];
  details.forEach(([label,value])=>{const line=node('div');line.append(node('strong',label+': '),node('span',value));box.append(line);});return box;
 }
 function marker(row){
  if(markerCache.has(row[0]))return markerCache.get(row[0]);
  const icon=L.divIcon({className:'dept-dot',html:'<span style="background:'+color(row)+'"></span>',iconSize:[12,12],iconAnchor:[6,6]});
  const m=L.marker([row[3][1],row[3][0]],{icon,keyboard:true,statusGroup:groupOf(row),title:(row[1]||'Pozo '+row[0])+' · '+data.states[row[4]]});
  m.bindPopup(()=>popup(row),{maxWidth:300});markerCache.set(row[0],m);return m;
 }
 function renderMarkers(){
  if(!map)return;
  if(clusters)map.removeLayer(clusters);
  clusters=L.markerClusterGroup({maxClusterRadius:35,spiderfyOnMaxZoom:true,showCoverageOnHover:false,chunkedLoading:true,chunkInterval:80,chunkDelay:20,animate:!reduced.matches,
   iconCreateFunction:cluster=>{
    const counts={active:0,temporary:0,abandoned:0,pending:0,other:0},children=cluster.getAllChildMarkers();
    children.forEach(child=>counts[child.options.statusGroup]++);
    let start=0;const segments=[];
    Object.keys(groups).forEach(key=>{if(!counts[key])return;const end=start+counts[key]/children.length*100;segments.push(groups[key].color+' '+start.toFixed(3)+'% '+end.toFixed(3)+'%');start=end;});
    return L.divIcon({html:'<span class="dept-cluster-ring" style="background:conic-gradient('+segments.join(',')+')"><span>'+fmt.format(cluster.getChildCount())+'</span></span>',className:'dept-cluster',iconSize:[42,42]});
   }});
  clusters.addTo(map);
  clusters.addLayers(latest.filter(row=>row[3]).map(marker));
 }
 function refreshPolygons(){if(polygons)polygons.setStyle(style);}
 function renderList(stats){
  const scrollTop=list.scrollTop,max=Math.max(1,...stats.map(stat=>stat.total));list.replaceChildren();
  stats.sort((a,b)=>b.total-a.total||departmentName(a.id).localeCompare(departmentName(b.id),'es')).forEach(stat=>{
   if(stat.id===-1&&stat.total===0)return;
   const card=node('button',undefined,'dept-card');card.type='button';card.dataset.department=String(stat.id);card.setAttribute('aria-pressed',String(selected===String(stat.id)));
   const heading=node('span',undefined,'dept-card-heading');heading.append(node('strong',departmentName(stat.id)),node('b',fmt.format(stat.total)+' pozos'));
   const details=node('span',undefined,'dept-card-stats');
   ['active','temporary','abandoned','pending'].forEach(key=>{const item=node('span',groups[key].label+': '+fmt.format(stat[key]));item.style.color=groups[key].color;details.append(item);});
   if(stat.other)details.append(node('span','Otros: '+fmt.format(stat.other)));
   const track=node('span',undefined,'dept-card-track'),bar=node('i');bar.style.width=(stat.total/max*100)+'%';track.append(bar);track.setAttribute('aria-hidden','true');
   card.append(heading,details,track);card.addEventListener('click',()=>{selectDepartment(String(stat.id),true);list.querySelector('[data-department="'+stat.id+'"]').focus({preventScroll:true});});list.append(card);
  });list.scrollTop=scrollTop;
 }
 function update(){
  const rows=filtered();latest=rows.filter(row=>selected==='ALL'||row[2]===Number(selected));
  const located=latest.filter(row=>row[3]).length;
  const label=selected==='ALL'?'Todo Neuquén':departmentName(Number(selected));
  $('dept-map-status').textContent=label+' · '+fmt.format(latest.length)+' pozos'+(located!==latest.length?' ('+fmt.format(located)+' en el mapa)':'');
  $('dept-filter-note').textContent=state.value===''?'Todos los estados':state.value.startsWith('group:')?groups[state.value.slice(6)].label:data.states[Number(state.value)];
  renderList(statistics(rows));refreshPolygons();renderMarkers();
 }
 function selectDepartment(id,move){
  selected=id;update();
  if(!map||!move)return;
  const options={padding:[24,24],maxZoom:10,duration:reduced.matches?0:.8,animate:!reduced.matches};
  if(id==='ALL')map.flyToBounds(polygons.getBounds(),options);
  else if(id==='-1'){
   const coords=latest.filter(row=>row[3]).map(row=>[row[3][1],row[3][0]]);
   if(coords.length)map.flyToBounds(L.latLngBounds(coords),options);
  }else{const layer=layerById.get(Number(id));if(layer)map.flyToBounds(layer.getBounds(),options);}
 }
 function initialize(){
  if(initialized)return;initialized=true;
  if(!window.L||!L.markerClusterGroup){$('dept-map-message').hidden=false;$('dept-map-message').textContent='No se pudo iniciar el mapa. Los conteos del ranking siguen disponibles.';return;}
  map=L.map('dept-map',{scrollWheelZoom:false,zoomSnap:.25,minZoom:5,maxZoom:18});
  polygons=L.geoJSON(data.geojson,{style,onEachFeature:(feature,layer)=>{
   const name=feature.properties.departamento,id=data.departments.indexOf(name);layerById.set(id,layer);
   layer.bindTooltip(()=>{const count=filtered().filter(row=>row[2]===id).length;const el=node('div');el.append(node('strong',name),node('div',fmt.format(count)+' pozos'));return el;},{sticky:true});
   layer.on({click:()=>selectDepartment(String(id),true),mouseover:()=>layer.setStyle({weight:3,fillOpacity:.3}),mouseout:()=>layer.setStyle(style(feature))});
  }}).addTo(map);
  map.fitBounds(polygons.getBounds(),{padding:[14,14],animate:false});renderMarkers();
  if('ResizeObserver' in window)new ResizeObserver(()=>map.invalidateSize({pan:false})).observe($('dept-map'));
 }
 state.addEventListener('change',update);
 $('dept-reset').addEventListener('click',()=>{state.value='';selectDepartment('ALL',true);});
 update();
 if('IntersectionObserver' in window){const observer=new IntersectionObserver(entries=>{if(entries.some(entry=>entry.isIntersecting)){observer.disconnect();initialize();}},{rootMargin:'250px'});observer.observe(root);}else initialize();
})();
