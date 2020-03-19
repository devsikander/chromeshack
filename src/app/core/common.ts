import { getSetting, setSetting } from "./settings";
import * as DOMPurify from "dompurify";

export const stripHtml = (html) => {
    // respect carriage returns
    let result = html.replace(/<br.*?>/gi, "\n");
    return result.replace(/(<([^>]+)>)/gi, "");
};

export const insertStyle = (css, containerName) => {
    let style = document.querySelector(`style#${containerName}`) || document.createElement("style");
    if (!style.id) {
        style.setAttribute("type", "text/css");
        style.setAttribute("id", containerName);
        style.appendChild(document.createTextNode(css));
        document.getElementsByTagName("head")[0].appendChild(style);
    } else if (style.id) style.innerHTML = css;
};

export const isEmpty = (obj) => {
    return obj === null || obj === undefined || (obj && Object.keys(obj).length === 0 && obj.constructor === Object);
};

export const objContains = (needle: string | number, haystack: object) => {
    // tests if an object (or nested object) contains a matching value (or prop)
    // since objects can contains Arrays test for them too
    if (isEmpty(haystack)) return false;

    for (let v of Object.keys(haystack).map((key) => haystack[key])) {
        if (v instanceof Object) {
            let _objResult = objContains(needle, v);
            if (_objResult) return _objResult;
        } else if (Array.isArray(v)) {
            let _arrResult = objContains(needle, { ...v });
            if (_arrResult) return _arrResult;
        } else if (v === needle) return v;
    }
    return false;
};

export const objContainsProperty = (key, obj) => Object.prototype.hasOwnProperty.call(obj, key);

export const objConditionalFilter = (disallowed, obj) => {
    return Object.keys(obj)
        .filter((k) => !disallowed.includes(k))
        .reduce((o, k) => {
            return { ...o, [k]: obj[k] };
        }, {});
};

export const superTrim = (string) => {
    return string.replace(/^\s+|\s+$/g, "");
};

export const xhrRequestLegacy = (url: string, optionsObj?: RequestInit) => {
    // promisified legacy XHR helper using XMLHttpRequest()
    return new Promise((resolve, reject) => {
        let xhr = new XMLHttpRequest();
        xhr.open(!isEmpty(optionsObj) ? optionsObj.method : "GET", url);
        if (!isEmpty(optionsObj) && optionsObj.headers)
            for (let key of Object.keys(optionsObj.headers)) xhr.setRequestHeader(key, optionsObj.headers[key]);

        xhr.onload = function() {
            if ((this.status >= 200 && this.status < 300) || xhr.statusText.toUpperCase().indexOf("OK") > -1)
                resolve(xhr.response);

            reject({ status: this.status, statusText: xhr.statusText });
        };
        xhr.onerror = function() {
            reject({ status: this.status, statusText: xhr.statusText });
        };
        xhr.send();
    });
};

export const fetchSafeLegacy = ({
    url,
    fetchOpts,
    parseType,
}: {
    url: string;
    fetchOpts?: object;
    parseType?: string;
}) => {
    // used for sanitizing legacy fetches (takes type: [(JSON) | HTML])
    return new Promise((resolve, reject) => {
        xhrRequestLegacy(url, fetchOpts)
            .then((res) => {
                let result = res && parseFetchResponse(res, parseType);
                if (result) resolve(result);
                return reject(res);
            })
            .catch((err) => reject(err));
    });
};

export const fetchSafe = ({
    url,
    fetchOpts,
    parseType,
}: {
    url: string;
    fetchOpts?: RequestInit;
    parseType?: object;
}) => {
    // used for sanitizing fetches
    // fetchOpts gets destructured in 'xhrRequest()'
    // modeObj gets destructured into override bools:
    //   instgrmBool: for embedded instagram graphQL parsing
    //   htmlBool: to force parsing as HTML fragment
    //   rssBool: to force parsing RSS to a sanitized JSON object
    // NOTE: HTML type gets sanitized to a document fragment
    return new Promise((resolve, reject) =>
        fetch(url, fetchOpts)
            .then(async (res) => {
                let result =
                    res && (res.ok || res.statusText === "OK") && parseFetchResponse((await res).text(), parseType);
                if (result) return resolve(result);
                return reject(res);
            })
            .catch((err) => reject(err)),
    );
};

export const parseFetchResponse = async (textPromise, parseType) => {
    const { chattyPics, instagram, html, chattyRSS } = parseType || {};
    const text = await textPromise;
    try {
        // sanitize Instagram graphQL cache to JSON
        if (instagram) {
            let metaMatch = /[\s\s]*?"og:description"\scontent="(?:(.*?) - )?[\s\S]+"/im.exec(text);
            let instgrmGQL = /:\{"PostPage":\[\{"graphql":([\s\S]+)\}\]\}/im.exec(text);
            if (instgrmGQL) {
                return {
                    metaViews: metaMatch && DOMPurify.sanitize(metaMatch[1]),
                    gqlData: instgrmGQL && JSON.parse(DOMPurify.sanitize(instgrmGQL[1])),
                };
            }
        }
        // sanitize ChattyPics response to array of links
        else if (chattyPics) {
            let _resFragment = sanitizeToFragment(text);
            let _resElemArr = _resFragment.querySelector("#allLinksDirect");
            let _resElemVal = _resFragment.querySelector("#link11");
            // return a list of links if applicable
            if (_resElemArr || _resElemVal) {
                return _resElemArr
                    ? _resElemArr.value.split("\n").filter((x) => x !== "")
                    : _resElemVal && [_resElemVal.value];
            }
        }
        // sanitize and return as Shacknews RSS article list
        else if (chattyRSS && text) return parseShackRSS(text);
        // explicitly sanitize (don't return fragment)
        else if (html && text) return DOMPurify.sanitize(text);
        // sanitize and return as DOM fragment
        else if (isHTML(text)) return sanitizeToFragment(text);
        // fallthrough: sanitize to JSON
        else if (isJSON(text)) {
            let parsed = safeJSON(text);
            if (parsed) return parsed;
        }
        // fallthrough: Gfycat (assume OK)
        else if (text.length === 0) return true;
    } catch (err) {
        if (err) console.log("Parse failed:", err);
        console.log("Parse failed!");
    }
    return null;
};

export const getCookieValue = (name, defaultValue) => {
    let ret = defaultValue || "";
    let cookies = document.cookie.split(";");
    for (let i = 0; i < cookies.length; i++) {
        let cookie = superTrim(cookies[i]).split("=");
        if (cookie[0] == name) {
            ret = cookie[1];
            break;
        }
    }
    return ret;
};

export const generatePreview = (postText) => {
    // simple replacements
    postText = postText.replace(/</g, "&lt;");
    postText = postText.replace(/>/g, "&gt;");
    postText = postText.replace(/\r\n|\n|\r/g, "<br>");
    const complexReplacements = {
        red: { from: ["r{", "}r"], to: ['<span class="jt_red">', "</span>"] },
        green: {
            from: ["g{", "}g"],
            to: ['<span class="jt_green">', "</span>"],
        },
        blue: { from: ["b{", "}b"], to: ['<span class="jt_blue">', "</span>"] },
        yellow: {
            from: ["y{", "}y"],
            to: ['<span class="jt_yellow">', "</span>"],
        },
        olive: {
            from: ["e\\[", "\\]e"],
            to: ['<span class="jt_olive">', "</span>"],
        },
        lime: {
            from: ["l\\[", "\\]l"],
            to: ['<span class="jt_lime">', "</span>"],
        },
        orange: {
            from: ["n\\[", "\\]n"],
            to: ['<span class="jt_orange">', "</span>"],
        },
        pink: {
            from: ["p\\[", "\\]p"],
            to: ['<span class="jt_pink">', "</span>"],
        },
        quote: {
            from: ["q\\[", "\\]q"],
            to: ['<span class="jt_quote">', "</span>"],
        },
        sample: {
            from: ["s\\[", "\\]s"],
            to: ['<span class="jt_sample">', "</span>"],
        },
        strike: {
            from: ["-\\[", "\\]-"],
            to: ['<span class="jt_strike">', "</span>"],
        },
        italic1: { from: ["i\\[", "\\]i"], to: ["<i>", "</i>"] },
        italic2: { from: ["\\/\\[", "\\]\\/"], to: ["<i>", "</i>"] },
        bold1: { from: ["b\\[", "\\]b"], to: ["<b>", "</b>"] },
        bold2: { from: ["\\*\\[", "\\]\\*"], to: ["<b>", "</b>"] },
        underline: { from: ["_\\[", "\\]_"], to: ["<u>", "</u>"] },
        spoiler: {
            from: ["o\\[", "\\]o"],
            to: ['<span class="jt_spoiler" onclick="return doSpoiler(event);">', "</span>"],
        },
        code: {
            from: ["\\/{{", "}}\\/"],
            to: ['<pre class="codeblock">', "</span>"],
        },
    };

    // replace matching pairs first
    for (const ix in complexReplacements) {
        let rgx = new RegExp(complexReplacements[ix].from[0] + "(.*?)" + complexReplacements[ix].from[1], "g");
        while (postText.match(rgx) !== null)
            postText = postText.replace(rgx, complexReplacements[ix].to[0] + "$1" + complexReplacements[ix].to[1]);
    }

    // replace orphaned opening shacktags, close them at the end of the post.
    // this still has (at least) one bug, the shack code does care about nested tag order:
    // b[g{bold and green}g]b <-- correct
    // b[g{bold and green]b}g <-- }g is not parsed by the shack code
    for (const ix in complexReplacements) {
        let rgx = new RegExp(complexReplacements[ix].from[0], "g");
        while (postText.match(rgx) !== null) {
            postText = postText.replace(rgx, complexReplacements[ix].to[0]);
            postText = postText + complexReplacements[ix].to[1];
        }
    }
    return convertUrlToLink(postText);
};

export const debounce = (cb, delay) => {
    // even simpler debounce to prevent bugginess
    let _debounce;
    return function() {
        // don't use an arrow function here (we need 'this')
        const _cxt = this;
        const _args = arguments;
        clearTimeout(_debounce);
        _debounce = setTimeout(() => {
            cb.apply(_cxt, _args);
        }, delay);
    };
};

export function scrollToElement(elem, toFitBool?) {
    // don't use an arrow function here (for injection purposes)
    if (elem && typeof jQuery === "function" && elem instanceof jQuery) elem = elem[0];
    else if (!elem) return false;
    if (toFitBool) jQuery("html, body").animate({ scrollTop: jQuery(elem).offset().top - 54 }, 0);
    else {
        jQuery("html, body").animate(
            {
                scrollTop: jQuery(elem).offset().top - jQuery(window).height() / 4,
            },
            0,
        );
    }
}

export function elementIsVisible(elem, partialBool) {
    // don't use an arrow function here (for injection purposes)
    // only check to ensure vertical visibility
    if (elem && typeof jQuery === "function" && elem instanceof jQuery) elem = elem[0];
    else if (!elem) return false;
    let rect = elem.getBoundingClientRect();
    let visibleHeight = window.innerHeight;
    if (partialBool) return rect.top <= visibleHeight && rect.top + rect.height >= 0;
    return rect.top >= 0 && rect.top + rect.height <= visibleHeight;
}

export const elementFitsViewport = (elem) => {
    if (elem && typeof jQuery === "function" && elem instanceof jQuery) elem = elem[0];
    else if (!elem) return false;
    let elemHeight = elem.getBoundingClientRect().height;
    let visibleHeight = window.innerHeight;
    return elemHeight < visibleHeight;
};

export const convertUrlToLink = (text) => {
    return text.replace(/(https?:\/\/[^ |^<]+)/g, '<a href="$1" target="_blank">$1</a>');
};

export const removeChildren = (elem) => {
    // https://stackoverflow.com/a/42658543
    while (elem.hasChildNodes()) elem.removeChild(elem.lastChild);
};

export const sanitizeToFragment = (html) => {
    return DOMPurify.sanitize(html, {
        RETURN_DOM_FRAGMENT: true,
        RETURN_DOM_IMPORT: true,
    });
};

export const safeInnerHTML = (text, targetNode) => {
    let sanitizedContent = sanitizeToFragment(text);
    let targetRange = document.createRange();
    targetRange.selectNodeContents(targetNode);
    targetRange.deleteContents();
    // replace innerHTML assign with sanitized insert
    targetRange.insertNode(sanitizedContent);
};

export const safeJSON = (text) => {
    if (isJSON(text)) {
        try {
            const obj = JSON.parse(text);
            const result = {};
            const iterate = (val) => {
                if (Array.isArray(val) && typeof val === "object") {
                    let _arr = [];
                    for (const subval of val) _arr.push(iterate(subval));
                    return _arr;
                } else if (val !== null && typeof val === "object") {
                    let _obj = {};
                    for (let key in val) _obj[key] = iterate(val[key]);

                    return _obj;
                } else {
                    if (val === null) return null;
                    if (typeof val === "boolean" && val) return true;
                    if (typeof val === "boolean" && !val) return false;
                    else return DOMPurify.sanitize(val);
                }
            };

            for (const key of Object.keys(obj)) {
                const val = obj[key];
                result[key] = iterate(val);
            }
            return result;
        } catch (e) {
            throw Error(e);
        }
    }
    return null;
};

export const parseShackRSS = (rssText) => {
    let result = [];
    if (rssText.startsWith('<?xml version="1.0" encoding="utf-8"?>')) {
        let items = rssText.match(/<item>([\s\S]+?)<\/item>/gim);
        for (let i of items || []) {
            let title = i.match(/<title><!\[CDATA\[(.+?)\]\]><\/title>/im);
            let link = i.match(/<link>(.+?)<\/link>/im);
            let date = i.match(/<pubDate>(.+?)<\/pubDate>/im);
            let content = i.match(/<description><!\[CDATA\[(.+?)\]\]><\/description>/im);
            let medialink = i.match(/<media:thumbnail url="(.+?)".*\/>/);
            result.push({
                title: title ? DOMPurify.sanitize(title[1]) : "",
                link: link ? DOMPurify.sanitize(link[1]) : "",
                date: date ? DOMPurify.sanitize(date[1]) : new Date().toISOString(),
                content: content ? DOMPurify.sanitize(content[1]) : "",
                medialink: medialink ? DOMPurify.sanitize(medialink[1]) : "",
            });
        }
    }
    // sanitize our resulting response
    if (!isEmpty(result)) return result;
    return null;
};

export const isHTML = (text) => {
    // https://stackoverflow.com/a/15458968
    if (!text || (text && isJSON(text))) return false;
    let doc = new DOMParser().parseFromString(text, "text/html");
    return Array.from(doc.body.childNodes).some((node) => node.nodeType === 1);
};

export const isJSON = (text) => {
    try {
        if (text && JSON.parse(text)) return true;
    } catch (err) {
        return false;
    }
};

export const FormDataToJSON = async (fd) => {
    const FileToObject = async (fileData) => {
        const reader = new FileReader();
        reader.readAsDataURL(fileData);
        return new Promise((resolve, reject) => {
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
        });
    };

    let _fd = [];
    for (let [k, v] of fd) {
        let _file = await FileToObject(v);
        _fd.push({ key: k, filename: v.name, data: _file });
    }
    return JSON.stringify(_fd);
};

export const JSONToFormData = (jsonStr) => {
    const Base64ToFile = (filename, baseStr) => {
        // https://stackoverflow.com/a/5100158
        let byteString;
        if (baseStr.split(",")[0].indexOf("base64") >= 0) byteString = atob(baseStr.split(",")[1]);
        else byteString = unescape(baseStr.split(",")[1]);

        // separate out the mime component
        let mimeString = baseStr
            .split(",")[0]
            .split(":")[1]
            .split(";")[0];
        // write the bytes of the string to a typed array
        let ia = new Uint8Array(byteString.length);
        for (let i = 0; i < byteString.length; i++) ia[i] = byteString.charCodeAt(i);

        return new File([ia], filename, { type: mimeString });
    };

    let _obj = JSON.parse(jsonStr);
    let _fd = new FormData();
    for (let key of Object.keys(_obj)) {
        let _file = Base64ToFile(_obj[key].filename, _obj[key].data);
        _fd.append(_obj[key].key, _file);
    }
    if (!_fd.entries().next().done) return _fd;
    return null;
};

export const collapseThread = (id) => {
    let MAX_LENGTH = 100;
    getSetting("collapsed_threads", []).then((collapsed) => {
        if (collapsed.indexOf(id) < 0) {
            collapsed.unshift(id);
            // remove a bunch if it gets too big
            if (collapsed.length > MAX_LENGTH * 1.25) collapsed.splice(MAX_LENGTH);
            setSetting("collapsed_threads", collapsed);
        }
    });
};

export const unCollapseThread = (id) => {
    getSetting("collapsed_threads", []).then((collapsed) => {
        let index = collapsed.indexOf(id);
        if (index >= 0) {
            collapsed.splice(index, 1);
            setSetting("collapsed_threads", collapsed);
        }
    });
};

export const locatePostRefs = (elem) => {
    if (elem) {
        let root = elem.closest(".root");
        let closestContainer = root.closest("li[id^='item_']");
        let post =
            closestContainer && !closestContainer.matches(".root > ul > li")
                ? closestContainer
                : root.querySelector("li li.sel");
        return { post, root: root.querySelector("ul > li") };
    }
    return null;
};

export const elementMatches = (elem, selector) => (elem && elem.nodeType !== 3 && elem.matches(selector) ? elem : null);

export const elementQuerySelector = (elem, selector) =>
    elem && elem.nodeType !== 3 ? elem.querySelector(selector) : null;

export const elementQuerySelectorAll = (elem, selector) =>
    elem && elem.nodeType !== 3 ? elem.querySelectorAll(selector) : null;

export const insertAtCaret = (field: HTMLInputElement, text: string) => {
    if (field.selectionStart || field.selectionStart === 0) {
        let startPos = field.selectionStart;
        let endPos = field.selectionEnd;
        field.value = field.value.substring(0, startPos) + text + field.value.substring(endPos, field.value.length);
        field.selectionStart = startPos + text.length;
        field.selectionEnd = startPos + text.length;
    } else field.value += text;
};
