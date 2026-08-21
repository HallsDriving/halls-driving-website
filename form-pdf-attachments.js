(() => {
  const enc = new TextEncoder();
  const ascii = s => enc.encode(s);
  const concat = parts => {
    const total = parts.reduce((n,p)=>n+p.length,0), out = new Uint8Array(total);
    let o=0; for (const p of parts){ out.set(p,o); o += p.length; } return out;
  };
  const esc = s => String(s ?? '').replace(/\\/g,'\\\\').replace(/\(/g,'\\(').replace(/\)/g,'\\)').replace(/[\r\n]+/g,' ');
  const clean = s => String(s ?? '').replace(/[^\x20-\x7E]/g,' ').trim();
  const fmtDate = s => {
    if (!s) return '';
    const m = String(s).match(/^(\d{4})-(\d{2})-(\d{2})$/);
    return m ? `${m[2]}/${m[3]}/${m[1]}` : s;
  };
  const text = (x,y,size,value,bold=false,color='0 0 0') => `${color} rg\nBT /${bold?'F2':'F1'} ${size} Tf ${x} ${y} Td (${esc(clean(value))}) Tj ET\n`;
  const line = (x1,y1,x2,y2,color='0.45 0.45 0.45',w=.8) => `${color} RG ${w} w ${x1} ${y1} m ${x2} ${y2} l S\n`;
  const box = (x,y,w,h,color='.83 .65 .17',fill='.99 .97 .89') => `${fill} rg ${x} ${y} ${w} ${h} re f\n${color} RG 1 w ${x} ${y} ${w} ${h} re S\n`;

  async function logoBytes(){
    try { const r=await fetch('assets/halls-driving-logo-pdf.jpg',{cache:'force-cache'}); if(r.ok) return new Uint8Array(await r.arrayBuffer()); } catch(e){}
    return null;
  }

  function jpegSize(bytes){
    if(!bytes) return null;
    let i=2;
    while(i < bytes.length-9){
      if(bytes[i] !== 0xFF){ i++; continue; }
      const marker=bytes[i+1];
      if([0xC0,0xC1,0xC2,0xC3,0xC5,0xC6,0xC7,0xC9,0xCA,0xCB,0xCD,0xCE,0xCF].includes(marker)){
        return {h:(bytes[i+5]<<8)+bytes[i+6], w:(bytes[i+7]<<8)+bytes[i+8]};
      }
      const len=(bytes[i+2]<<8)+bytes[i+3]; if(!len) break; i += 2 + len;
    }
    return null;
  }

  function pdfBytes(content, image){
    const parts=[ascii('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n')];
    const offsets=[0]; let pos=parts[0].length;
    const add=(id, chunks)=>{
      offsets[id]=pos;
      const arr=[ascii(`${id} 0 obj\n`), ...(Array.isArray(chunks)?chunks:[ascii(chunks)]), ascii('\nendobj\n')];
      for(const p of arr){parts.push(p);pos+=p.length;}
    };
    const imgSize=jpegSize(image);
    const hasImg=!!(image && imgSize);
    add(1,'<< /Type /Catalog /Pages 2 0 R >>');
    add(2,'<< /Type /Pages /Kids [3 0 R] /Count 1 >>');
    add(3,`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R /F2 5 0 R >>${hasImg?' /XObject << /Im1 6 0 R >>':''} >> /Contents ${hasImg?'7':'6'} 0 R >>`);
    add(4,'<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');
    add(5,'<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>');
    if(hasImg){
      add(6,[ascii(`<< /Type /XObject /Subtype /Image /Width ${imgSize.w} /Height ${imgSize.h} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${image.length} >>\nstream\n`),image,ascii('\nendstream')]);
    }
    const c=ascii(content);
    add(hasImg?7:6,[ascii(`<< /Length ${c.length} >>\nstream\n`),c,ascii('\nendstream')]);
    const xref=pos;
    const count=(hasImg?7:6)+1;
    parts.push(ascii(`xref\n0 ${count}\n0000000000 65535 f \n`));
    for(let i=1;i<count;i++) parts.push(ascii(String(offsets[i]).padStart(10,'0')+' 00000 n \n'));
    parts.push(ascii(`trailer\n<< /Size ${count} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`));
    return concat(parts);
  }

  async function makePdf(kind, fd){
    const logo=await logoBytes();
    let c='';
    if(logo){ c += 'q 92 0 0 92 45 660 cm /Im1 Do Q\n'; }
    c += text(155,735,22,"HALL'S DRIVING",true,'.83 .65 .17');
    c += text(155,714,11,'212 Wall St · Gadsden, AL 35904 · (256) 543-3738',true,'0 0 0');
    c += line(40,695,572,695,'.71 .16 .16',2);

    if(kind==='registration'){
      c += text(40,660,18,'DEFENSIVE DRIVING REGISTRATION FORM',true,'.71 .16 .16');
      const rows=[
        ['First Name',fd.get('firstName')],['Last Name',fd.get('lastName')],['Phone',fd.get('phone')],['Email',fd.get('email')],
        ['Preferred Contact',fd.get('preferredContactMethod')],['Requested Class Date',fmtDate(fd.get('classDate'))]
      ];
      let y=625;
      for(const [lab,val] of rows){ c+=text(50,y,10,lab,true); c+=text(220,y,10,val||''); c+=line(45,y-7,565,y-7); y-=38; }
      c += text(50,y,10,'Comments / Questions',true); y-=20;
      c += box(45,y-95,520,95); 
      const msg=clean(fd.get('comments')||'');
      const chunks=msg.match(/.{1,85}(?:\s|$)/g)||['']; let ty=y-20;
      for(const s of chunks.slice(0,4)){c+=text(58,ty,9,s.trim());ty-=18;}
      y-=125;
      c += text(50,y,10,'Office Use Only',true,'.71 .16 .16');
      c += text(50,y-28,10,'Registration confirmed: ____________________________');
      c += text(50,y-53,10,'Payment status: __________________________________');
      c += text(50,y-78,10,'Class assignment: ________________________________');
      c += text(50,55,8,'Completed online registration form generated at time of submission.');
    } else {
      c += text(40,660,18,'PARENT / STUDENT PHOTO & WEBSITE PERMISSION',true,'.71 .16 .16');
      const rows=[
        ['Student Name',fd.get('studentName')],['Parent / Guardian',fd.get('guardianName')],['Phone',fd.get('phone')],['Email',fd.get('email')],
        ['Permission',fd.get('photoPermission')],['Guardian Signature',fd.get('guardianSignature')],['Date',fmtDate(fd.get('date'))],['Student Signature',fd.get('studentSignature')]
      ];
      let y=620;
      for(const [lab,val] of rows){ c+=text(50,y,10,lab,true); c+=text(220,y,10,val||''); c+=line(45,y-7,565,y-7); y-=40; }
      c += box(45,185,520,105);
      c += text(58,268,10,'Permission Statement',true,'.71 .16 .16');
      c += text(58,245,9,"Hall's Driving may use the student's original photograph on the Hall's Driving website",false);
      c += text(58,228,9,'and related Hall\'s Driving promotional materials according to the permission selection above.',false);
      c += text(58,205,9,'The parent/legal guardian may contact Hall\'s Driving to request removal of the photograph.',false);
      c += text(50,55,8,'Completed online permission form generated at time of submission.');
    }
    return new Blob([pdfBytes(c,logo)],{type:'application/pdf'});
  }

  async function wire(formId, kind, fileField, filename, thankYou, storageKey){
    const form=document.getElementById(formId); if(!form) return;
    form.removeAttribute('data-basin-form');
    form.setAttribute('enctype','multipart/form-data');
    form.addEventListener('submit',async e=>{
      e.preventDefault();
      if(!form.reportValidity()) return;
      const btn=form.querySelector('[type="submit"]'); const old=btn?btn.textContent:'';
      if(btn){btn.disabled=true;btn.textContent='Sending...';}
      try{
        const fd=new FormData(form);
        const snapshot={}; fd.forEach((v,k)=>{if(typeof v==='string') snapshot[k]=v;});
        if(storageKey) sessionStorage.setItem(storageKey,JSON.stringify(snapshot));
        const pdf=await makePdf(kind,fd);
        fd.append(fileField,pdf,filename(snapshot));
        const r=await fetch(form.action,{method:'POST',body:fd,headers:{'Accept':'application/json'}});
        if(!r.ok) throw new Error('Submission failed');
        location.href=thankYou;
      }catch(err){
        console.error(err);
        alert("We couldn't send the form. Please check your connection and try again.");
        if(btn){btn.disabled=false;btn.textContent=old;}
      }
    });
  }

  document.addEventListener('DOMContentLoaded',()=>{
    wire('defensive-form','registration','completedRegistrationForm',d=>`Halls-Driving-Registration-${(d.lastName||d.firstName||'Form').replace(/[^A-Za-z0-9_-]+/g,'-')}.pdf`,'defensive-thank-you.html','halls-defensive-driving');
    const perm=document.querySelector('form[name="photo-permission-form"]');
    if(perm && !perm.id) perm.id='permission-form';
    wire('permission-form','permission','completedPermissionForm',d=>`Halls-Driving-Permission-${(d.studentName||'Form').replace(/[^A-Za-z0-9_-]+/g,'-')}.pdf`,'permission-thank-you.html','halls-permission-slip');
  });
})();
