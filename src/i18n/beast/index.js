import BEAST_DA, { BEAST_DA as namedDa } from "./da.js";
import BEAST_EN, { BEAST_EN as namedEn } from "./en.js";

export const DA_BEAST_LOCALE = namedDa ?? BEAST_DA ?? {};
export const EN_BEAST_LOCALE = namedEn ?? BEAST_EN ?? {};

export const BEAST_LOCALES = Object.freeze({
  da: DA_BEAST_LOCALE,
  en: EN_BEAST_LOCALE,
});

export { namedDa as BEAST_DA, namedEn as BEAST_EN };
export default BEAST_LOCALES;
