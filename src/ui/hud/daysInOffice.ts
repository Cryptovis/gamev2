import type {GameLanguage} from '../../domain/game';

/**
 * The tenure badge in the commander capsule. Turkish puts the number first ("Görevde 45. Gün"), the other languages use a
 * label and a colon, so each wording is written out whole instead of being built from a shared template.
 */
export function daysInOffice(language:GameLanguage,day:number):string {
  switch(language){
    case 'tr':return `Görevde ${day}. Gün`;
    case 'es':return `Días en el Cargo: ${day}`;
    case 'zh':return `执政天数: ${day}`;
    case 'ru':return `Дней в Должности: ${day}`;
    default:return `Days in Office: ${day}`;
  }
}
