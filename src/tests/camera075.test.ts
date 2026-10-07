import {describe,expect,it} from 'vitest';
import {boundPan,clampZoom,clampSensitivity,wheelZoomFactor,zoomAtPoint} from '../map/cameraControls';
describe('Map camera interaction',()=>{
 it('normalizes pixel, line and page devices and preserves small trackpad input',()=>{
  expect(wheelZoomFactor(16,0,.65)).toBe(wheelZoomFactor(1,1,.65));
  expect(wheelZoomFactor(10000,0,.65)).toBe(wheelZoomFactor(1,2,.65));
  expect(wheelZoomFactor(-2,0,.65)).toBeGreaterThan(1);
  expect(wheelZoomFactor(-2,0,.65)).toBeLessThan(wheelZoomFactor(-100,0,.65));
 });
 it('opposite wheel travel reverses the zoom and the same total travel is event-count independent',()=>{
  expect(wheelZoomFactor(-80,0,.65)*wheelZoomFactor(80,0,.65)).toBeCloseTo(1);
  expect(wheelZoomFactor(-2,0,.65)**40).toBeCloseTo(wheelZoomFactor(-80,0,.65));
 });
 it('changes sensitivity without allowing extreme jumps or invalid input',()=>{
  expect(wheelZoomFactor(-80,0,1.3)).toBeGreaterThan(wheelZoomFactor(-80,0,.3));
  expect(wheelZoomFactor(NaN,0,.65)).toBe(1);
  expect(clampSensitivity(Infinity)).toBe(.65);
  expect(clampSensitivity(100)).toBe(1.5);
 });
 it('keeps the geographic point under a flat-map cursor during zoom',()=>{
  const pan={x:150,y:-80},from=2,to=3,point:[number,number]=[400,260];
  const updated=zoomAtPoint(pan,from,to,point);
  expect((point[0]-600-pan.x)/from).toBeCloseTo((point[0]-600-updated.x)/to);
  expect((point[1]-350-pan.y)/from).toBeCloseTo((point[1]-350-updated.y)/to);
 });
 it('bounds zoom and panning to prevent a lost camera',()=>{
  expect(clampZoom(100,true)).toBe(12);expect(clampZoom(.1,true)).toBe(1);
  expect(clampZoom(100,false)).toBe(6);expect(clampZoom(.1,false)).toBe(.72);
  expect(boundPan({x:10000,y:-10000},1)).toEqual({x:80,y:-50});
 });
});
