import {describe,expect,it} from 'vitest';
import catalog from '../src/lib/locales/en.json';
import {dictionaries,localize} from '../src/lib/localization';
import {languageScripts,responseLanguage} from '../src/lib/i18n';
import {seed} from '../src/lib/fixtures';
import {quickIntent} from '../src/lib/assistant/quick';

describe('bundled vernacular copy',()=>{
 for(const language of Object.keys(dictionaries))it(`${language} covers all catalog phrases and preserves placeholders`,()=>{
  for(const source of Object.keys(catalog)){
   const translated=dictionaries[language][source];expect(translated,source).toBeTruthy();
   expect((translated.match(/\{\d+\}/g)??[]).sort(),source).toEqual((source.match(/\{\d+\}/g)??[]).sort());
   expect(translated,source).not.toContain('\u2014');
  }
  expect(localize(language,'Orders')).toMatch(languageScripts[language]);
  expect(localize(language,'Review LP-8042 below, then confirm to mark them packed. Courier handover will remain pending.')).toContain('LP-8042');
  expect(localize(language,'Aarav Home Textiles')).toBe('Aarav Home Textiles');
 });
 it('detects regional scripts and preserves Marathi selection',()=>{
  expect(responseLanguage('आज किती ऑर्डर आहेत?','mr')).toBe('mr');
  for(const [language,text] of Object.entries({bn:'আজ কত অর্ডার?',ta:'இன்று எத்தனை ஆர்டர்கள்?',te:'ఈరోజు ఎన్ని ఆర్డర్లు?',gu:'આજે કેટલા ઓર્ડર?',kn:'ಇಂದು ಎಷ್ಟು ಆರ್ಡರ್?',ml:'ഇന്ന് എത്ര ഓർഡർ?',pa:'ਅੱਜ ਕਿੰਨੇ ਆਰਡਰ?'}))expect(responseLanguage(text,'en')).toBe(language);
 });
 it('answers common order questions in regional languages without preparing writes',()=>{
  const messages={bn:'আজ কত অর্ডার পাঠাতে হবে?',mr:'आज किती ऑर्डर पाठवायचे आहेत?',ta:'இன்று எத்தனை ஆர்டர்களை அனுப்ப வேண்டும்?',te:'ఈరోజు ఎన్ని ఆర్డర్లు పంపాలి?',gu:'આજે કેટલા ઓર્ડર મોકલવાના છે?',kn:'ಇಂದು ಎಷ್ಟು ಆರ್ಡರ್‌ಗಳನ್ನು ಕಳುಹಿಸಬೇಕು?',ml:'ഇന്ന് എത്ര ഓർഡറുകൾ അയയ്ക്കണം?',pa:'ਅੱਜ ਕਿੰਨੇ ਆਰਡਰ ਭੇਜਣੇ ਹਨ?'};
  for(const [language,message] of Object.entries(messages)){const state=seed(),intent=quickIntent(state,message);expect(intent,message).not.toBeNull();const result=intent!.run(state,'user',language);expect(result.text).toMatch(languageScripts[language]);expect(result.language).toBe(language);expect(result.records).toHaveLength(4);expect(state.actions).toHaveLength(0);}
 });
});
