/**
 * Runs in <head> before the first paint. Pages are rendered in English on the
 * server; for a reader whose language will be Korean or Japanese (saved, or
 * from the browser — the same choice as getStoredLocale in ./index), it marks
 * <html data-locale-pending> so globals.css keeps the page hidden until
 * LocaleProvider has put their language in place, instead of showing English
 * and then switching every word on screen.
 */
export const LOCALE_BOOT_SCRIPT = `(function(){try{var l=null;try{l=localStorage.getItem("xiio_locale")}catch(e){}if(l!=="en"&&l!=="ko"&&l!=="ja"){l="en";var a=navigator.languages||[navigator.language];for(var i=0;i<a.length;i++){var c=String(a[i]||"").toLowerCase().split("-")[0];if(c==="en"||c==="ko"||c==="ja"){l=c;break}}}if(l!=="en"){var d=document.documentElement;d.setAttribute("data-locale-pending","");d.lang=l}}catch(e){}})();`;
