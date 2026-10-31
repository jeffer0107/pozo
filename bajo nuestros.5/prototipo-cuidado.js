(() => {
 'use strict';
 const $=id=>document.getElementById(id);
 const fmt=new Intl.NumberFormat('es-AR');
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 // These curves are copied from the other prototype, not from a calibrated scientific model.
 let soilMode='natural';
 const plantLayer=document.querySelector('.soil-native-plants');
 for(let i=0;i<15;i++){const plant=document.createElement('i');plant.style.left=(4+i*6.2)+'%';const bloom=document.createElement('span');bloom.className='soil-flower';plant.append(bloom);plantLayer.append(plant);}
 function updateSoil(){
  const y=Number($('soil-year-slider').value);
  plantLayer.classList.toggle('is-restored',soilMode==='restored');
  const inf=soilMode==='natural'?Math.min(100,Math.round(5+y/60*28)):Math.min(95,Math.round(45+y/60*50));
  const veg=soilMode==='natural'?(y<40?Math.round(y/40*14):Math.round(14+(y-40)/20*24)):Math.min(92,Math.round(25+Math.pow(y/60,.65)*67));
  $('soil-year-out').textContent='Año '+y;
  $('soil-year-slider').setAttribute('aria-valuetext',y+' años en un escenario ilustrativo');
  $('soil-inf-val').textContent=inf+' %';$('soil-veg-val').textContent=veg+' %';
  $('soil-inf-bar').style.width=inf+'%';$('soil-veg-bar').style.width=veg+'%';
  $('soil-tech-note').textContent=soilMode==='natural'?'Escenario sin intervención: la recuperación del sitio se representa como lenta e irregular.':'Escenario con restauración: preparar el suelo y favorecer la vegetación nativa puede ayudar a recuperar el sitio.';
  plantLayer.style.setProperty('--plant-scale',String(.2+veg/100));
  [...plantLayer.children].forEach((plant,i)=>{plant.style.opacity=String(i<Math.ceil(veg/100*15)?1:.12);});
 }
 document.querySelectorAll('[data-soil]').forEach(button=>button.addEventListener('click',()=>{
  soilMode=button.dataset.soil;
  document.querySelectorAll('[data-soil]').forEach(other=>other.setAttribute('aria-pressed',String(other===button)));
  updateSoil();
 }));
 $('soil-year-slider').addEventListener('input',updateSoil);updateSoil();
})();
