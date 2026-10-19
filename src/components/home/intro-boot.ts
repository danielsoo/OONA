import { LAST_ACTIVE_KEY, VISIT_GAP_MS } from "@/lib/visit-clock";

/**
 * Runs in <head> before the first paint. Which visit gets the home's light
 * intro is decided in React (useIntroOnce in ./CreditsFirstHome), and React
 * only runs once the page's scripts have arrived and hydrated — by then the
 * home has been on screen for a moment, so the intro drops over a page the
 * visitor has already seen. This marks <html data-home-intro-pending> under
 * the same conditions, so globals.css holds the dark over the page from the
 * very first paint and CreditsLightIntro takes it over without a seam.
 *
 * Conditions must stay in step with useIntroOnce: a load that starts at "/",
 * no hash, not reduced motion, and a new visit per lib/visit-clock — with
 * "/?intro" always playing. The two checks useIntroOnce also makes are
 * already true here: this only runs on a fresh document (so the intro cannot
 * have played this load), and the document's own URL is where the load began.
 */
export const HOME_INTRO_BOOT_SCRIPT = `(function(){try{if(location.pathname!=="/")return;if(!/[?&]intro(=|&|$)/.test(location.search)){if(location.hash)return;try{if(matchMedia("(prefers-reduced-motion: reduce)").matches)return}catch(e){}var t=0;try{t=Number(localStorage.getItem(${JSON.stringify(
  LAST_ACTIVE_KEY
)}))}catch(e){}if(t>0&&isFinite(t)&&Date.now()-t<=${VISIT_GAP_MS})return}document.documentElement.setAttribute("data-home-intro-pending","")}catch(e){}})();`;
