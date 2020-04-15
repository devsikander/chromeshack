import * as browser from "webextension-polyfill";

import { enabledContains } from "../core/settings";
import { processPostEvent } from "../core/events";

//
// A note to reviewers:
//
// This script causes hyperlinks to "Not Safe For Work" imagery (e.g. pornographic images) to open automatically in
// an incognito window when clicked, instead of a normal tab. In Firefox, doing so requires the
// "allowedIncognitoAccess" permission.
//

const NwsIncognito = {
    async install() {
        const is_enabled = await enabledContains("nws_incognito");
        if (is_enabled) processPostEvent.addHandler(NwsIncognito.hookToNwsPosts);
    },

    hookToNwsPosts(item) {
        const nwsLinks = [...item.querySelectorAll(".sel .fpmod_nws .postbody a, .op.fpmod_nws .postbody a")];
        for (const link of nwsLinks || []) {
            // avoid reapplying
            if (link.innerText.indexOf(" (Incognito)") > -1) return;

            //Clone the link to get rid of any handlers that were put on it before (like the inline image loader)
            //Of course, that relies on it being done before this.  So... yeah.
            const cloned = link.cloneNode(false);
            cloned.addEventListener("click", (e) => {
                e.preventDefault();
                // Note to reviewers: please refer to the top of this file for explanation
                browser.runtime.sendMessage({ name: "allowedIncognitoAccess" }).then((result) => {
                    if (!window.chrome && !result) {
                        alert(
                            'This feature will not work unless you enable "Run in Private Windows" in the Chrome Shack addon settings for Firefox!',
                        );
                    }
                    browser.runtime.sendMessage({
                        name: "launchIncognito",
                        value: e.target.href,
                    });
                });
                return false;
            });

            // remove expando buttons for Incognito mode
            const expando = link.querySelector("div.expando");
            if (expando) link.removeChild(expando);
            cloned.innerText = `${link.innerText} (Incognito)`;

            link.parentNode.replaceChild(cloned, link);
        }
    },
};
export default NwsIncognito;
