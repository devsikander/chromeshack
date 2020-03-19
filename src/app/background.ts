import * as browser from "webextension-polyfill";

import * as common from "./core/common";
import * as settings from "./core/settings";

interface Notification {
    error?: object;
    code?: string;
    messages?: [];
}

interface NotificationMessage {
    postId: number;
    subject: string;
    body: string;
}

const migrateSettings = async () => {
    let legacy_settings = settings.getSettingsLegacy();
    let last_version = await settings.getSetting("version", 0);
    let current_version = parseFloat(browser.runtime.getManifest().version);
    if (legacy_settings && legacy_settings["version"] <= 1.63) {
        // quick reload from default settings of nustorage
        await settings.resetSettings().then(settings.getSettings);
        // preserve previous convertible filters and notifications state
        let prevFilters = legacy_settings["user_filters"] || null;
        let prevNotifyUID = legacy_settings["notificationuid"] || null;
        let prevNotifyState = legacy_settings["notifications"] || null;
        if (prevFilters) await settings.setSetting("user_filters", prevFilters);
        if (prevNotifyUID && prevNotifyState) {
            await settings.setSetting("notificationuid", prevNotifyUID);
            await settings.setEnabled("enable_notifications");
        }
        window.localStorage.clear();
    }
    if (last_version !== current_version) browser.tabs.create({ url: "release_notes.html" });
    await settings.setSetting("version", current_version);
};

const addContextMenus = () => {
    // get rid of any old and busted context menus
    browser.contextMenus.removeAll();

    // add some basic context menus
    browser.contextMenus.create({
        title: "Show comment history",
        contexts: ["link"],
        onclick: showCommentHistoryClick,
        documentUrlPatterns: ["https://*.shacknews.com/*"],
        targetUrlPatterns: ["https://*.shacknews.com/profile/*"],
    });
};

const startNotifications = async () => {
    browser.notifications.onClicked.addListener(notificationClicked);
    await pollNotifications();
};

const pollNotifications = async () => {
    let notificationuid = await settings.getSetting("notificationuid");
    if ((await settings.getEnabled("enable_notifications")) && notificationuid) {
        return await common
            .fetchSafe({
                url: "https://winchatty.com/v2/notifications/waitForNotification",
                fetchOpts: {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/x-www-form-urlencoded",
                    },
                    body: `clientId=${notificationuid}`,
                },
            })
            .then(async (resp) => {
                let notifications: Notification = resp;
                if (!notifications.error) {
                    //console.log("notification response text: " + res.responseText);
                    if (notifications.messages) {
                        for (let i = 0; i < notifications.messages.length; i++) {
                            let n: NotificationMessage = notifications.messages[i];
                            browser.notifications.create("ChromeshackNotification" + n.postId.toString(), {
                                type: "basic",
                                title: n.subject,
                                message: n.body,
                                iconUrl: "images/icon.png",
                            });
                        }
                    }
                    //If everything was successful, poll again in 15 seconds.
                    setTimeout(pollNotifications, 15000);
                } else {
                    if (notifications.code === "ERR_UNKNOWN_CLIENT_ID") {
                        browser.notifications.create("ErrorChromeshackNotification", {
                            type: "basic",
                            title: "ChromeShack Error",
                            message:
                                "Notifications are no longer enabled for this client, please try enabling them again.",
                            iconUrl: "images/icon.png",
                        });
                        await settings.setSetting("notificationuid", "");
                        await settings.removeEnabled("enable_notifications");
                    } else if (notifications.code == "ERR_CLIENT_NOT_ASSOCIATED") {
                        browser.tabs.query(
                            {
                                url: "https://winchatty.com/v2/notifications/ui/login*",
                            },
                            (tabs) => {
                                // If they're not already logging in somewhere, they need to.  Otherwise we'll just leave it alone instead of bringing it to the front or anything annoying like that.
                                if (tabs.length === 0) {
                                    browser.tabs.create({
                                        url:
                                            "https://winchatty.com/v2/notifications/ui/login?clientId=" +
                                            notificationuid,
                                    });
                                }
                            },
                        );
                    }
                }
                setTimeout(pollNotifications, 60000);
            })
            .catch(async (err) => {
                console.log(err);
                setTimeout(pollNotifications, 60000);
            });
    } else if (!(await settings.getEnabled("enable_notifications"))) {
        // disable the detached guid
        await settings.setSetting("notificationuid", "");
        await settings.removeEnabled("enable_notifications");
    }
};

const notificationClicked = (notificationId) => {
    if (notificationId.indexOf("ChromeshackNotification") > -1) {
        let postId = notificationId.replace("ChromeshackNotification", "");
        let url = "https://www.shacknews.com/chatty?id=" + postId + "#item_" + postId;
        browser.tabs.create({ url: url });
        browser.notifications.clear(notificationId);
    }
};

const showCommentHistoryClick = (info, tab) => {
    let match = /\/profile\/(.+)$/.exec(info.linkUrl);
    if (match) {
        let search_url = "https://winchatty.com/search?author=" + escape(match[1]);
        browser.tabs.create({
            windowId: tab.windowId,
            index: tab.index + 1,
            url: search_url,
        });
    }
};

browser.runtime.onMessage.addListener(async (request, sender) => {
    if (request.name === "launchIncognito")
        // necessary for opening nsfw links in an incognito window
        return Promise.resolve(browser.windows.create({ url: request.value, incognito: true }));
    else if (request.name === "allowedIncognitoAccess")
        // necessary for knowing when to open nsfw media in an incognito window
        return Promise.resolve(browser.extension.isAllowedIncognitoAccess());
    else if (request.name === "chatViewFix") {
        // scroll-to-post fix for Chatty
        return browser.tabs
            .executeScript(null, {
                code: `window.monkeyPatchCVF === undefined`,
            })
            .then((res) => {
                if (res) browser.tabs.executeScript({ file: "patches/chatViewFix.js" });
            })
            .catch((err) => console.log(err.message ? err.message : err));
    } else if (request.name === "scrollByKeyFix") {
        // scroll-by-key fix for Chatty
        return browser.tabs.executeScript(null, { file: "patches/scrollByKeyFix.js" }).catch((err) => console.log(err));
    } else if (request.name === "corbFetch") {
        return common.fetchSafe({
            url: request.url,
            fetchOpts: request.fetchOpts,
            parseType: request.parseType,
        });
    } else if (request.name === "corbPost") {
        let _fd = await common.JSONToFormData(request.data);
        return new Promise((resolve, reject) => {
            return common
                .fetchSafe({
                    url: request.url,
                    fetchOpts: {
                        method: "POST",
                        headers: request.headers,
                        body: _fd,
                    },
                    parseType: request.parseType,
                })
                .then(resolve)
                .catch(reject);
        });
    }

    return Promise.resolve();
});

/*
    Workaround for Twitter API's lack of support for cross-domain JSON fetch.
    NOTE: we override only responses from "api.twitter.com" and sanitize the fetch result
        with a fetch() helper in common.js so only non-HTML containing JSON is ever used.
*/
const responseListener = (details) => {
    details.responseHeaders.push({
        name: "Access-Control-Allow-Headers",
        value: "*",
    });
    details.responseHeaders.push({
        name: "Access-Control-Allow-Methods",
        value: "GET",
    });
    return { responseHeaders: details.responseHeaders };
};
browser.webRequest.onHeadersReceived.removeListener(responseListener);
browser.webRequest.onHeadersReceived.addListener(responseListener, { urls: ["https://api.twitter.com/*"] }, [
    "blocking",
    "responseHeaders",
]);

addContextMenus();

(async () => {
    // attempt to update version settings
    await migrateSettings();
    await startNotifications();
})();
