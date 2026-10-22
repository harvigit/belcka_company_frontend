import DOMPurify, {type DOMPurify as DOMPurifyInstance} from 'dompurify';

const SAFE_STYLE = /^(?!.*expression\s*\()(?!.*javascript:)(?!.*vbscript:)(?!.*-moz-binding).*$/i;

const STYLE_PROPERTIES = new Set([
    'color',
    'background-color',
    'font-size',
    'font-style',
    'text-align',
    'text-decoration',
    'width',
    'height',
    'margin-left',
    'margin-right',
    'border-spacing',
    'border-collapse',
    '--table-border-color',
    '--table-border-width',
    '--table-border-style',
    '--table-cell-padding',
]);

const ALLOWED_TAGS = [
    'address', 'article', 'aside', 'footer', 'header', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'hgroup', 'main', 'nav',
    'section', 'blockquote', 'dd', 'div', 'dl', 'dt', 'figcaption', 'figure', 'hr', 'li', 'menu', 'ol', 'p', 'pre',
    'ul', 'a', 'abbr', 'b', 'bdi', 'bdo', 'br', 'cite', 'code', 'data', 'dfn', 'em', 'i', 'kbd', 'mark', 'q', 'rb',
    'rp', 'rt', 'rtc', 'ruby', 's', 'samp', 'small', 'span', 'strong', 'sub', 'sup', 'time', 'u', 'var', 'wbr',
    'caption', 'col', 'colgroup', 'table', 'tbody', 'td', 'tfoot', 'th', 'thead', 'tr', 'img',
];

// Attributes allowed per tag; `style` is allowed on every tag and filtered separately.
const ALLOWED_ATTRIBUTES: Record<string, string[]> = {
    a: ['href', 'name', 'target', 'rel'],
    img: ['src', 'alt', 'title', 'width', 'height'],
    td: ['colspan', 'rowspan'],
    th: ['colspan', 'rowspan'],
    ol: ['start', 'type'],
    table: ['width', 'height'],
};

const ALL_ATTRIBUTES = ['style', ...new Set(Object.values(ALLOWED_ATTRIBUTES).flat())];

// URLs may be http(s), mailto, tel or relative. DOMPurify also allows data: URIs in img src.
const ALLOWED_URI_REGEXP = /^(?:(?:https?|mailto|tel):|[^a-z]|[a-z+.-]+(?:[^a-z+.\-:]|$))/i;

const filterStyle = (style: string): string =>
    style
        .split(';')
        .map((declaration) => {
            const separator = declaration.indexOf(':');
            if (separator === -1) return null;
            const property = declaration.slice(0, separator).trim().toLowerCase();
            const value = declaration.slice(separator + 1).trim();
            if (!value || !STYLE_PROPERTIES.has(property) || !SAFE_STYLE.test(value)) return null;
            return `${property}:${value}`;
        })
        .filter(Boolean)
        .join(';');

let purifier: DOMPurifyInstance | null = null;

const getPurifier = (): DOMPurifyInstance => {
    if (purifier) return purifier;

    purifier = DOMPurify(window);
    purifier.addHook('uponSanitizeAttribute', (node, data) => {
        const tag = node.nodeName.toLowerCase();
        const name = data.attrName;

        if (name === 'style') {
            const style = filterStyle(data.attrValue);
            if (style) data.attrValue = style;
            else data.keepAttr = false;
            return;
        }
        if (!ALLOWED_ATTRIBUTES[tag]?.includes(name)) {
            data.keepAttr = false;
        }
    });
    return purifier;
};

export const sanitizeDescriptionHtml = (html: string | null | undefined): string => {
    if (!html) return '';
    // DOMPurify needs a DOM; render nothing on the server rather than unsanitized HTML.
    if (typeof window === 'undefined') return '';

    return getPurifier().sanitize(html, {
        ALLOWED_TAGS,
        ALLOWED_ATTR: ALL_ATTRIBUTES,
        ALLOW_DATA_ATTR: false,
        ALLOW_ARIA_ATTR: false,
        ALLOWED_URI_REGEXP,
    });
};
