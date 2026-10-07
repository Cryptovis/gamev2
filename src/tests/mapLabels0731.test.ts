import { describe,expect,it } from 'vitest';
import { labelFontSize, labelRevealThreshold, layoutScreenLabels, maxCountryLabels } from '../map/labelLayout';

describe('cartographic label layout 0.73.1',()=>{
 it('prevents overlapping country labels by priority',()=>{
  const placed=layoutScreenLabels([
   {id:'a',text:'LARGE COUNTRY',x:100,y:100,fontSize:12,priority:100},
   {id:'b',text:'SMALL STATE',x:104,y:101,fontSize:12,priority:10},
  ],{width:400,height:300},{padding:5});
  expect(placed.map(x=>x.id)).toEqual(['a']);
 });

 it('keeps forced selected labels and displaces lower-priority collisions',()=>{
  const placed=layoutScreenLabels([
   {id:'normal',text:'NORMAL',x:150,y:100,fontSize:12,priority:500},
   {id:'selected',text:'SELECTED',x:150,y:100,fontSize:14,priority:1,force:true},
  ],{width:400,height:300});
  expect(placed.some(x=>x.id==='selected')).toBe(true);
  expect(placed.some(x=>x.id==='normal')).toBe(false);
 });

 it('reveals progressively smaller countries as zoom increases',()=>{
  expect(labelRevealThreshold(1,false)).toBeGreaterThan(labelRevealThreshold(2,false));
  expect(labelRevealThreshold(1,true)).toBeGreaterThan(labelRevealThreshold(4,true));
  expect(maxCountryLabels(5,true)).toBeGreaterThan(maxCountryLabels(1,true));
 });

 it('keeps screen label font size bounded instead of geometry-scaled',()=>{
  expect(labelFontSize(100,1)).toBeGreaterThanOrEqual(10.5);
  expect(labelFontSize(100000,8)).toBeLessThanOrEqual(14.5);
 });
});
