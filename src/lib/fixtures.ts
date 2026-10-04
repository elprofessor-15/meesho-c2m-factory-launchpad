import {State,Product,Order} from './types';
export function seed(date='2026-10-04'):State {
 const manufacturers=[{id:'m1',name:'Aarav Home Textiles',city:'Panipat, Haryana',owner:'Neha Sharma',stage:'Live pilot',joined:'2026-09-12'},{id:'m2',name:'Kaveri Cotton Works',city:'Karur, Tamil Nadu',owner:'Arun Kumar',stage:'Setup',joined:'2026-09-20'},{id:'m3',name:'Sahyadri Living',city:'Solapur, Maharashtra',owner:'Meera Patil',stage:'Live pilot',joined:'2026-08-15'},{id:'m4',name:'Gulmohar Furnishings',city:'Jaipur, Rajasthan',owner:'Ravi Saini',stage:'Needs attention',joined:'2026-09-02'}];
 const names=['Cotton cushion cover','Floral double bedsheet','Waffle kitchen towel','Printed table runner'];
 const products:Product[]=Array.from({length:16},(_,i)=>({id:`SKU-${101+i}`,manufacturerId:`m${Math.floor(i/4)+1}`,name:names[i%4],variant:['Terracotta · 16 × 16 in','Sage · Queen · 3 pieces','Natural · Set of 4','Sand · 6 seater'][i%4],category:['Cushion covers','Bedsheets','Kitchen towels','Table linen'][i%4],price:[29900,74900,34900,44900][i%4],cost:[11000,35000,14000,18000][i%4],packaging:1200,forward:4500,reverse:5500,fees:0,recoverable:.85,stock:[42,18,86,60][i%4],reserved:[12,8,6,5][i%4],inbound:i%4===1?30:0,arrival:3,capacity:120,lead:4,batch:20,cash:3000000,floor:4000,minMonthly:60,dispatch:40,version:1,image:`/products/${i%4}.svg`,description:['100% cotton, concealed zip, machine washable.','Breathable cotton with two pillow covers.','Absorbent cotton waffle weave.','Easy-care printed cotton table linen.'][i%4],status:i===3?'Draft':'Active',age:i%4===3?2:22}));
 const orders:Order[]=Array.from({length:48},(_,i)=>({id:`LP-${8041+i}`,sku:`SKU-${101+i%4}`,quantity:1+i%3,status:(['ready_to_ship','ready_to_ship','packed','shipped','delivered','cancelled'] as const)[i%6],due:new Date(Date.parse(date+'T00:00:00Z')+(i===12?-1:i%5-1)*86400000).toISOString().slice(0,10),customer:['Priya K.','Sanjay R.','Aditi M.','Rahul S.'][i%4],city:['Pune','Delhi','Bengaluru','Lucknow'][i%4],label:i%3!==0,version:1}));
 const observations=products.flatMap((p,idx)=>Array.from({length:90},(_,j)=>{
  const weeklyPattern=1+.18*Math.sin((j+idx*2)*2*Math.PI/7);
  const launchPattern=.78+.22*j/89;
  const visits=Math.max(12,Math.round((95+12*(idx%4))*weeklyPattern*launchPattern));
  const categoryConversion=[.062,.049,.071,.056][idx%4];
    const inStock=j%13!==0;
    const purchases=inStock?Math.min(visits,Math.max(1,Math.round(visits*categoryConversion*(1+.1*Math.sin(j/9+idx))))):0;
    const units=purchases+Math.round(purchases*(.12+((j+idx)%4)*.04));
    return{sku:p.id,day:j-90,visits,purchases,units,available:inStock,category:p.category,price:p.price,age:Math.min(90,j+1)};
 }));
 const payments=orders.filter(o=>o.status==='delivered'||o.status==='shipped').map((o,i)=>{const p=products.find(p=>p.id===o.sku)!; const gross=p.price*o.quantity;const adjustment=-4500*o.quantity;return{id:`PAY-${400+i}`,orderId:o.id,date:new Date(Date.parse(date+'T00:00:00Z')+(i%2?2:-3)*86400000).toISOString().slice(0,10),status:i%2?'Expected':'Settled',gross,adjustment,amount:gross+adjustment};});
 return {version:1,date,manufacturerId:'m1',manufacturers,products,orders,observations,payments,support:[{id:'REQ-1001',manufacturerId:'m1',type:'Packing setup',reason:'Review label placement for the bedsheet pilot.',language:'Hindi',window:date+' afternoon',contact:'Phone',related:'SKU-102',status:'Assigned',owner:'Ananya Rao',notes:'Sample packing checklist shared.',minutes:15,version:1}],onboarding:{business:'Aarav Home Textiles',language:'Hindi',products:'Home textiles',variants:'Cushion covers, bedsheets',owner:'Neha Sharma'},step:2,scenarios:[],actions:[],activity:[],usage:[],conversations:[],quota:{},activeUntil:0};
}
