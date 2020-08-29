import {
    stripHtml,
    superTrim,
    insertStyle,
    getCookieValue,
    convertUrlToLink,
    generatePreview,
    scrollToElement,
    scrollParentToChild,
    elementIsVisible,
    elementFitsViewport,
    removeChildren,
    sanitizeToFragment,
    safeInnerHTML,
    FormDataToJSON,
    JSONToFormData,
    insertAtCaret,
    appendLinksToField,
    matchFileFormat,
    afterElem,
    elemMatches,
    locatePostRefs,
} from "./dom";
import type { PreviewReplacements, PostRefs } from "./dom";

export {
    stripHtml,
    superTrim,
    insertStyle,
    getCookieValue,
    convertUrlToLink,
    generatePreview,
    scrollToElement,
    scrollParentToChild,
    elementIsVisible,
    elementFitsViewport,
    removeChildren,
    sanitizeToFragment,
    safeInnerHTML,
    FormDataToJSON,
    JSONToFormData,
    insertAtCaret,
    appendLinksToField,
    matchFileFormat,
    afterElem,
    elemMatches,
    locatePostRefs,
};
export { PreviewReplacements, PostRefs };

import {
    xhrRequestLegacy,
    fetchSafeLegacy,
    fetchSafe,
    fetchBackground,
    postBackground,
    waitToFetchSafe,
    safeJSON,
    parseFetchResponse,
    parseShackRSS,
} from "./fetch";
import type { ParseType, FetchArgs, ShackRSSItem } from "./fetch";

export {
    xhrRequestLegacy,
    fetchSafeLegacy,
    fetchSafe,
    fetchBackground,
    postBackground,
    waitToFetchSafe,
    safeJSON,
    parseFetchResponse,
    parseShackRSS,
};
export { ParseType, FetchArgs, ShackRSSItem };

import {
    arrHas,
    arrEmpty,
    objHas,
    objContains,
    objContainsProperty,
    objEmpty,
    isHTML,
    isJSON,
    classNames,
    isVideo,
    isImage,
    isIframe,
    getLinkType,
    isUrlArr,
    isFileArr,
    getFileCount,
    packValidTypes,
} from "./common";
export {
    arrHas,
    arrEmpty,
    objHas,
    objContains,
    objContainsProperty,
    objEmpty,
    isHTML,
    isJSON,
    classNames,
    isVideo,
    isImage,
    isIframe,
    getLinkType,
    isUrlArr,
    isFileArr,
    getFileCount,
    packValidTypes,
};
