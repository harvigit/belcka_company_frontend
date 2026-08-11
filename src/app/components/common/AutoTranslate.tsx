'use client';

import { useEffect, useRef } from 'react';
import i18n from '@/utils/i18n';
import { translateStaticText } from '@/utils/translation';

const TRANSLATABLE_ATTRIBUTES = ['placeholder', 'aria-label', 'title', 'alt'];
const SKIP_TEXT_SELECTOR = [
  'script',
  'style',
  'noscript',
  'textarea',
  'input',
  '[contenteditable="true"]',
  '[data-no-translate]',
].join(',');
const SKIP_ATTRIBUTE_SELECTOR = [
  'script',
  'style',
  'noscript',
  '[contenteditable="true"]',
  '[data-no-translate]',
].join(',');

const shouldSkipTextElement = (element: Element | null) => {
  return Boolean(element?.closest(SKIP_TEXT_SELECTOR));
};

const shouldSkipAttributeElement = (element: Element | null) => {
  return Boolean(element?.closest(SKIP_ATTRIBUTE_SELECTOR));
};

const translateTextNode = (node: Text) => {
  if (!node.nodeValue || shouldSkipTextElement(node.parentElement)) return;

  const translatedValue = translateStaticText(node.nodeValue);
  if (translatedValue !== node.nodeValue) {
    node.nodeValue = translatedValue;
  }
};

const translateElementAttributes = (element: Element) => {
  if (shouldSkipAttributeElement(element)) return;

  TRANSLATABLE_ATTRIBUTES.forEach((attribute) => {
    const value = element.getAttribute(attribute);
    if (!value) return;

    const translatedValue = translateStaticText(value);
    if (translatedValue !== value) {
      element.setAttribute(attribute, translatedValue);
    }
  });
};

const translateNode = (node: Node) => {
  if (node.nodeType === Node.TEXT_NODE) {
    translateTextNode(node as Text);
    return;
  }

  if (node.nodeType !== Node.ELEMENT_NODE) return;

  const element = node as Element;
  if (shouldSkipTextElement(element) && shouldSkipAttributeElement(element)) return;

  translateElementAttributes(element);

  element.querySelectorAll('*').forEach((childElement) => {
    translateElementAttributes(childElement);
  });

  const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT, {
    acceptNode: (textNode) => {
      return shouldSkipTextElement(textNode.parentElement)
        ? NodeFilter.FILTER_REJECT
        : NodeFilter.FILTER_ACCEPT;
    },
  });

  const textNodes: Text[] = [];
  while (walker.nextNode()) {
    textNodes.push(walker.currentNode as Text);
  }

  textNodes.forEach(translateTextNode);
};

const AutoTranslate = () => {
  const observerRef = useRef<MutationObserver | null>(null);
  const frameRef = useRef<number | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;

    const scheduleTranslate = () => {
      if (frameRef.current !== null) return;

      frameRef.current = window.requestAnimationFrame(() => {
        frameRef.current = null;
        if (document.body) {
          translateNode(document.body);
        }
      });
    };

    observerRef.current = new MutationObserver((mutations) => {
      let shouldTranslate = false;

      for (const mutation of mutations) {
        if (mutation.type === 'characterData') {
          shouldTranslate = true;
          break;
        }

        if (mutation.type === 'attributes') {
          shouldTranslate = true;
          break;
        }

        if (mutation.addedNodes.length > 0) {
          shouldTranslate = true;
          break;
        }
      }

      if (shouldTranslate) {
        scheduleTranslate();
      }
    });

    observerRef.current.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: TRANSLATABLE_ATTRIBUTES,
    });

    i18n.on('languageChanged', scheduleTranslate);
    scheduleTranslate();

    return () => {
      i18n.off('languageChanged', scheduleTranslate);
      observerRef.current?.disconnect();

      if (frameRef.current !== null) {
        window.cancelAnimationFrame(frameRef.current);
      }
    };
  }, []);

  return null;
};

export default AutoTranslate;
