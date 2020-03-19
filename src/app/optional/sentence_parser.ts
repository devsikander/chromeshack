import { stripHtml, superTrim } from "../core/common";

const SentenceParser = {
    parseIntoLines(html) {
        let LINK_PLACEHOLDER = "%%link%%";
        let SPOILER_PLACEHOLDER = "%%spoiler%%";
        // Extract all the links, store them in links[] and replace the link with a %%link%% placeholder in the post
        let link_regex = new RegExp(/<a.*? href=("|')(.*?)([\n|\r]*?)("|').*?>(.*?)([\n|\r]*?)<\/a>/gim);
        let links = html.match(link_regex);
        html = html.replace(link_regex, LINK_PLACEHOLDER);
        // Extract all the spoilers, store them in spoilers[] and replace the spoilers with a %%spoiler%% placeholder in the post
        let spoiler_regex = new RegExp(
            /<span class="jt_spoiler" onclick="return doSpoiler\( event \);">(|.|\r|\n)*?<\/span>/i,
        );
        let spoilers = html.match(spoiler_regex);
        html = html.replace(spoiler_regex, SPOILER_PLACEHOLDER);
        // remove the rest of the html from the post
        let post = stripHtml(html);
        // match a sentence as:
        // 1. anything (non-greedy)
        // 2. one or more punctuation (unless it is a . followed by a number, letter, another . or a ]), or the end of the line
        let sentence_regex = new RegExp(/.+?(!|\.(?!\w|\.|\])|\?|$)+/gm);
        let link_replace_regex = new RegExp(LINK_PLACEHOLDER, "i");
        let spoiler_replace_regex = new RegExp(SPOILER_PLACEHOLDER, "i");
        let sentences = [];
        // Get sentences from paragraphs
        let matches = post.match(sentence_regex);
        for (let i = 0; i < matches.length; i++) {
            let match = matches[i];
            let tmp = superTrim(match);
            if (tmp.length > 0) {
                // replace placeholders with items
                // do spoilers first, because spoilers could contain links!
                while (tmp.indexOf(SPOILER_PLACEHOLDER) >= 0 && spoilers && spoilers.length > 0)
                    tmp = tmp.replace(spoiler_replace_regex, spoilers.shift());

                while (tmp.indexOf(LINK_PLACEHOLDER) >= 0 && links && links.length > 0)
                    tmp = tmp.replace(link_replace_regex, links.shift());

                sentences.push(tmp);
            }
        }

        return sentences;
    },
};

export default SentenceParser;
