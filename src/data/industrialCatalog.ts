import type {FacilityKind, IndustrialGood, Mineral} from '../domain/industrial';
import {REFERENCE_PRICES} from './commodityPrices';
export const GOODS:Record<IndustrialGood,{label:string;price:number;reserve:number;group:'natural'|'component'|'strategic'|'precious';unit:string}>={
 gold:{label:'Gold',price:REFERENCE_PRICES.gold,reserve:.05,group:'precious',unit:'tonnes'},
 silver:{label:'Silver',price:REFERENCE_PRICES.silver,reserve:.2,group:'precious',unit:'tonnes'},
 water:{label:'Fresh Water',price:REFERENCE_PRICES.water,reserve:25,group:'natural',unit:'reservoir units'},
 coal:{label:'Coal',price:REFERENCE_PRICES.coal,reserve:10,group:'natural',unit:'units'},
 copper:{label:'Copper',price:REFERENCE_PRICES.copper,reserve:8,group:'natural',unit:'units'},
 silicon:{label:'Silicon',price:REFERENCE_PRICES.silicon,reserve:8,group:'natural',unit:'units'},
 aluminum:{label:'Aluminum',price:REFERENCE_PRICES.aluminum,reserve:8,group:'natural',unit:'units'},
 rare_earths:{label:'Rare Earths',price:REFERENCE_PRICES.rare_earths,reserve:3,group:'natural',unit:'units'},
 rubber:{label:'Industrial Rubber',price:REFERENCE_PRICES.rubber,reserve:8,group:'natural',unit:'units'},
 armor_plate:{label:'Armor Plates',price:REFERENCE_PRICES.armor_plate,reserve:4,group:'component',unit:'sets'},
 engines:{label:'Engines',price:REFERENCE_PRICES.engines,reserve:3,group:'component',unit:'units'},
 electronics:{label:'Electronics',price:REFERENCE_PRICES.electronics,reserve:3,group:'component',unit:'modules'},
 steel:{label:'Steel',price:REFERENCE_PRICES.steel,reserve:12,group:'strategic',unit:'units'},
 fuel:{label:'Refined Fuel',price:REFERENCE_PRICES.fuel,reserve:15,group:'strategic',unit:'units'},
 tanks:{label:'Armored Vehicles',price:REFERENCE_PRICES.tanks,reserve:10,group:'strategic',unit:'vehicles'},
};
export const MINERALS:Mineral[]=['gold','silver','coal','copper','silicon','aluminum','rare_earths'];
export interface FacilityDefinition {label:string;cost:number;days:number;output?:IndustrialGood;yield:number;inputs:Partial<Record<IndustrialGood,number>>;power:number;upkeep:number;tech?:string;deposit?:Mineral;description:string}
export const FACILITIES:Record<FacilityKind,FacilityDefinition>={
 gold_mine:{label:'Gold Mine',cost:.8,days:45,output:'gold',yield:.004,inputs:{water:.1},power:.03,upkeep:.00005,tech:'ind-extraction',deposit:'gold',description:'Extract finite gold ore. Industrial metal is separate from the central-bank vault.'},
 silver_mine:{label:'Silver Mine',cost:.45,days:30,output:'silver',yield:.06,inputs:{water:.12},power:.025,upkeep:.00002,tech:'ind-extraction',deposit:'silver',description:'Extract silver for electronics and open-market exports.'},
 waterworks:{label:'Waterworks',cost:3,days:12,output:'water',yield:3,inputs:{},power:.02,upkeep:.002,tech:'energy-water',description:'Collect and treat renewable fresh water; output follows national water potential.'},
 coal_mine:{label:'Coal Mine',cost:4,days:18,output:'coal',yield:.5,inputs:{},power:.015,upkeep:.002,deposit:'coal',description:'Extract a finite national deposit.'},
 copper_mine:{label:'Copper Mine',cost:5,days:20,output:'copper',yield:.32,inputs:{},power:.018,upkeep:.003,deposit:'copper',description:'Supply copper for engines and electronics.'},
 silicon_mine:{label:'Silicon Quarry',cost:4,days:16,output:'silicon',yield:.4,inputs:{},power:.016,upkeep:.002,deposit:'silicon',description:'Process silica for semiconductor production.'},
 bauxite_mine:{label:'Aluminum Works',cost:6,days:24,output:'aluminum',yield:.3,inputs:{coal:.04},power:.05,upkeep:.004,deposit:'aluminum',description:'Mine bauxite and refine aluminum; consumes coal and power.'},
 rare_earth_mine:{label:'Rare Earth Mine',cost:8,days:30,output:'rare_earths',yield:.08,inputs:{water:.15},power:.025,upkeep:.004,tech:'ind-extraction',deposit:'rare_earths',description:'Advanced extraction for precision electronics.'},
 rubber_plant:{label:'Rubber Plant',cost:4,days:16,output:'rubber',yield:.35,inputs:{fuel:.04},power:.015,upkeep:.002,description:'Combine local feedstock with refined fuel.'},
 armor_mill:{label:'Armor Plate Mill',cost:9,days:28,output:'armor_plate',yield:.4,inputs:{steel:.15,coal:.04},power:.06,upkeep:.00002,tech:'ind-metallurgy',description:'Turn steel and coal into hardened armor plates.'},
 engine_works:{label:'Engine Works',cost:12,days:32,output:'engines',yield:.24,inputs:{steel:.25,copper:.08,aluminum:.15,rubber:.05},power:.055,upkeep:.00004,tech:'ind-engines',description:'Precision manufacturing for vehicle powertrains.'},
 electronics_works:{label:'Electronics Works',cost:11,days:30,output:'electronics',yield:.4,inputs:{copper:.12,silicon:.2,rare_earths:.02,gold:.00001,silver:.0001},power:.065,upkeep:.000025,tech:'ind-electronics',description:'Produce industrial control and defense electronics.'},
 civil_factory:{label:'Industrial Park',cost:10,days:25,yield:0,inputs:{},power:0,upkeep:.003,description:'Adds five national factories and one refinery on completion.'},
};
export const TANK_COMPONENTS:Partial<Record<IndustrialGood,number>>={armor_plate:2,engines:1,electronics:1};
