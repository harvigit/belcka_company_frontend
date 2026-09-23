import sanitizeHtml from 'sanitize-html';

const SAFE_STYLE = /^(?!.*expression\s*\()(?!.*javascript:)(?!.*vbscript:)(?!.*-moz-binding).*$/i;

const STYLE_PROPERTIES = [
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
];

const allowedStyles = {
    '*': Object.fromEntries(STYLE_PROPERTIES.map((property) => [property, [SAFE_STYLE]])),
};

export const sanitizeDescriptionHtml = (html: string | null | undefined): string => {
    if (!html) return '';

    return sanitizeHtml(html, {
        allowedTags: sanitizeHtml.defaults.allowedTags.concat(['img', 'span', 'u', 's']),
        allowedAttributes: {
            '*': ['style'],
            a: ['href', 'name', 'target', 'rel', 'style'],
            img: ['src', 'alt', 'title', 'width', 'height'],
            td: ['colspan', 'rowspan', 'style'],
            th: ['colspan', 'rowspan', 'style'],
            ol: ['start', 'type', 'style'],
            table: ['style', 'width', 'height'],
        },
        allowedStyles,
        allowedSchemes: ['http', 'https', 'mailto', 'tel'],
        allowedSchemesByTag: {
            img: ['http', 'https', 'data'],
        },
    });
};
