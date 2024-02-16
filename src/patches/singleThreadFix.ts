import { scrollToElement } from "../core/common/dom";
import { fullPostsCompletedEvent, processTagDataLoadedEvent } from "../core/events";
import { getEnabledBuiltin } from "../core/settings";

/*
 *  Fix visible fullpost position when opening a post in single-thread mode
 */
export const SingleThreadFix = {
  fix() {
    // only do fix when NOT on main Chatty
    if (document.querySelector("div#newcommentbutton")) return;
    const urlRgx = window.location.href.match(/id=(\d+)(?:#item_(\d+))?/);
    if (!urlRgx) return;

    const rootid = parseInt(urlRgx?.[1], 10);
    const postid = parseInt(urlRgx?.[2], 10);
    const post = document.getElementById(`item_${postid || rootid}`);
    if (post) {
      console.log("scrolling to single-thread:", post);
      scrollToElement(post, { toFit: true });
    }
  },
  apply() {
    // try to ensure the fix applies once the post is loaded
    setTimeout(() => SingleThreadFix.fix(), 250);
  },

  async install() {
    const isEnabled = await getEnabledBuiltin("single_thread_fix");
    if (!isEnabled) return;

    fullPostsCompletedEvent.addHandler(SingleThreadFix.apply);
  },
};
