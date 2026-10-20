// Which stored values the desk may turn into links. Hits come from a public
// endpoint, so a value is only linked when it is a plain web address or a
// path on this site.

export const webHref = (v: string) => (/^https?:\/\/[^\s]+$/i.test(v) ? v : null);

export const pageHref = (v: string) => (/^\/(?![/\\])/.test(v) ? v : null);
