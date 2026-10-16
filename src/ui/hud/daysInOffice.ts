import type {GameLanguage} from '../../domain/game';

/**
 * The tenure line under the campaign date in the top-right clock. Turkish puts the number first ("Görevde 45. Gün"), the other languages use a
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

/** The longest commander name the top-left capsule shows in full. Longer names end in an ellipsis; the full name stays in the tooltip. */
export const COMMANDER_NAME_LIMIT=20;
export function capCommanderName(name:string,limit=COMMANDER_NAME_LIMIT):string {
  const letters=Array.from(name.trim());
  return letters.length>limit?letters.slice(0,limit).join('').trimEnd()+'…':letters.join('');
}
