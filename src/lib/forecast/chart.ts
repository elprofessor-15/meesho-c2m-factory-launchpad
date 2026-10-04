import {Observation} from '../types';

export type ForecastChartPoint={
  day:number;
  actual?:number;
  median?:number;
  band?:[number,number];
};

type ForecastPoint={day:number;p10:number;p50:number;p90:number;c10:number;c50:number;c90:number};

export function forecastChartData(observations:Observation[],sku:string,series:ForecastPoint[],horizon:number,cumulative:boolean):ForecastChartPoint[]{
  const history=observations.filter(o=>o.sku===sku&&o.day<0).sort((a,b)=>a.day-b.day).slice(-14);
  let actualTotal=0;
  const actual=history.map(observation=>{
    actualTotal+=observation.units;
    return{day:observation.day,actual:cumulative?actualTotal:observation.units};
  });
  const forecast:ForecastChartPoint[]=cumulative?[{day:0,actual:actualTotal,median:actualTotal,band:[actualTotal,actualTotal] as [number,number]}]:[];
  forecast.push(...series.slice(0,horizon).map(point=>({
    day:point.day,
    median:cumulative?actualTotal+point.c50:point.p50,
    band:cumulative?[actualTotal+point.c10,actualTotal+point.c90] as [number,number]:[point.p10,point.p90] as [number,number],
  })));
  return[...actual,...forecast];
}