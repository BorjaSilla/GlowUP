import re, json, sys, unicodedata
txt=open(sys.argv[1]).read().split('\n')
dom=open(sys.argv[2]).read()
imgs=[]
for i in re.findall(r'"(https://teikit.es/home/\d+-large_default/[^"]+\.jpg)"',dom):
    if i not in imgs: imgs.append(i)
cats_order=['LIMITED EDITION','ENTRANTES','ROLLS','POKE BOWLS','TARTARS','PACKS','MAKIS & NIGIRIS','POSTRES','BEBIDAS','MENÚS MEDIODÍA']
# skip the header nav (first 10 lines)
lines=[l.strip() for l in txt]
start=lines.index('LIMITED EDITION',2)
lines=lines[start:]
end=lines.index('TEIKIT') if 'TEIKIT' in lines else len(lines)
lines=lines[:end]
items=[]; cat=None; i=0; pieces=None; note=None
while i<len(lines):
    l=lines[i]
    if l in cats_order: cat=l; i+=1; continue
    if not l: i+=1; continue
    m=re.match(r'\((\d+) Piezas\)',l)
    if m: pieces=int(m.group(1)); i+=1; continue
    if l.startswith('Menús válidos'): note=l; i+=1; continue
    # item name then optional desc then AÑADIR, Precio, price
    name=l; j=i+1; desc=''
    if lines[j]!='AÑADIR': desc=lines[j]; j+=1
    assert lines[j]=='AÑADIR', (name, lines[j]); assert lines[j+1]=='Precio'
    price=float(re.sub(r'[^0-9,]','',lines[j+2]).replace(',','.'))
    items.append(dict(cat=cat,name=name,desc=desc,price=price,pieces=pieces))
    pieces=None; i=j+3
print(len(items), len(imgs), file=sys.stderr)
def slug(s):
    s=unicodedata.normalize('NFKD',s).encode('ascii','ignore').decode().lower()
    return re.sub(r'[^a-z0-9]+','-',s).strip('-')
# map image by order; verify by fuzzy name
def norm(s): return slug(s).replace('-','')
for it,img in zip(items,imgs):
    fn=img.rsplit('/',1)[1].rsplit('.',1)[0]
    a,b=norm(it['name']),norm(fn)
    ok = a[:5]==b[:5] or a in b or b in a
    if not ok: print('MISMATCH',it['name'],fn,file=sys.stderr)
    it['src']=img; it['id']=slug(it['name']); it['img']='img/menu/'+it['id']+'.webp'
json.dump(dict(note=note,categories=cats_order,items=items),open(sys.argv[3],'w'),ensure_ascii=False,indent=1)
