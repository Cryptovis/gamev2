import type { EquipmentType } from '../domain/game';

export interface EquipmentDefinition {
  id:EquipmentType;
  label:string;
  shortLabel:string;
  description:string;
  baseOutput:number;
  inputs:{steel:number;fuel:number;electricity:number;treasury:number};
  deployPack:number;
}

export const EQUIPMENT_CATALOG:Record<EquipmentType,EquipmentDefinition>={
  infantry_equipment:{id:'infantry_equipment',label:'Infantry Equipment',shortLabel:'INF EQ.',description:'Small arms, communications and personal combat equipment.',baseOutput:18,inputs:{steel:.012,fuel:0,electricity:.010,treasury:.00006},deployPack:5000},
  artillery:{id:'artillery',label:'Artillery Systems',shortLabel:'ARTILLERY',description:'Tube artillery, launchers and fire-support equipment.',baseOutput:1.4,inputs:{steel:.025,fuel:.003,electricity:.014,treasury:.0025},deployPack:20},
  armor:{id:'armor',label:'Armored Vehicles',shortLabel:'ARMOR',description:'Main battle tanks and armored fighting vehicles.',baseOutput:.55,inputs:{steel:.045,fuel:.015,electricity:.022,treasury:.0045},deployPack:10},
  fighters:{id:'fighters',label:'Combat Aircraft',shortLabel:'FIGHTERS',description:'Fighter aircraft, avionics and supporting airframes.',baseOutput:.22,inputs:{steel:.030,fuel:.020,electricity:.028,treasury:.006},deployPack:6},
  logistics:{id:'logistics',label:'Logistics Equipment',shortLabel:'LOGISTICS',description:'Trucks, transport equipment, engineering and field-support assets.',baseOutput:3.5,inputs:{steel:.018,fuel:.008,electricity:.014,treasury:.002},deployPack:80},
  naval:{id:'naval',label:'Naval Equipment',shortLabel:'NAVAL',description:'Naval hulls, systems and fleet-support equipment.',baseOutput:.08,inputs:{steel:.055,fuel:.018,electricity:.032,treasury:.008},deployPack:2},
};

export const EQUIPMENT_TYPES=Object.keys(EQUIPMENT_CATALOG) as EquipmentType[];
