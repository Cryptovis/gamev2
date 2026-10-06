import { describe,expect,it } from 'vitest';
import { MICROSTATE_POINTS } from '../data/microstates';

describe('microstate cartography data',()=>{
 it('contains no zero-zero fallback coordinates',()=>{
  for(const [id,[lon,lat]] of Object.entries(MICROSTATE_POINTS)){
   expect(Math.abs(lon)+Math.abs(lat),id+' must have a real map position').toBeGreaterThan(0.01);
  }
 });

 it('keeps coordinates inside valid longitude/latitude ranges',()=>{
  for(const [id,[lon,lat]] of Object.entries(MICROSTATE_POINTS)){
   expect(lon,id).toBeGreaterThanOrEqual(-180);
   expect(lon,id).toBeLessThanOrEqual(180);
   expect(lat,id).toBeGreaterThanOrEqual(-90);
   expect(lat,id).toBeLessThanOrEqual(90);
  }
 });

 it('places Andorra in the Pyrenees instead of the Gulf of Guinea',()=>{
  const [lon,lat]=MICROSTATE_POINTS.AND;
  expect(lon).toBeGreaterThan(1);
  expect(lon).toBeLessThan(2);
  expect(lat).toBeGreaterThan(42);
  expect(lat).toBeLessThan(43);
 });
});
