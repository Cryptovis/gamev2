import { describe,expect,it } from 'vitest';
import { findCountryAtGeoPoint } from '../map/mapSelection';

describe('map surface selection',()=>{
 it('selects a country from a point inside its polygon',()=>{
  const features:any[]=[{type:'Feature',properties:{iso_a3:'AAA',name:'Alpha'},geometry:{type:'Polygon',coordinates:[[[0,0],[10,0],[10,10],[0,10],[0,0]]]}}];
  expect(findCountryAtGeoPoint(features,new Set(['AAA']),[5,5])).toBe('AAA');
  expect(findCountryAtGeoPoint(features,new Set(['AAA']),[20,20])).toBeNull();
 });
});
