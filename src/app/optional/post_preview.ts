import { processPostBoxEvent } from "../core/events";
import { enabledContains } from "../core/settings";
import { safeInnerHTML, generatePreview } from "../core/common";

const PostPreview = {
    state: 0, // 0 = insert mode, 1 = preview mode

    previewTimer: null,

    async install() {
        return enabledContains("post_preview").then((res) => {
            if (res) processPostBoxEvent.addHandler(PostPreview.install);
        });
    },

    apply(item) {
        // script is already injected
        if (item.querySelector("#previewButton")) return;
        let postButton = item.querySelector("#frm_submit");
        let form_body = item.querySelector("#frm_body");
        if (!postButton || !form_body) return;
        let previewButton = document.createElement("button");
        previewButton.id = "previewButton";
        previewButton.setAttribute("type", "button");
        previewButton.textContent = "Preview";
        postButton.parentNode.insertBefore(previewButton, postButton.nextSibling);
        let previewArea = document.createElement("div");
        previewArea.id = "previewArea";
        previewArea.style.display = "none";
        form_body.parentNode.insertBefore(previewArea, form_body);
        processPostBoxEvent.addHandler((item) => PostPreview.installClickEvent(item));
    },

    replyToggleHandler(e) {
        if ((e.target && e.target.matches("div.closeform > a")) || e.target.matches("div.reply > a"))
            PostPreview.state = 0;
    },

    installClickEvent(item) {
        let previewButton = item.querySelector("#previewButton");
        let clickableTags = [...item.querySelectorAll("#shacktags_legend_table td > a")];
        document.removeEventListener("click", PostPreview.replyToggleHandler);
        document.addEventListener("click", PostPreview.replyToggleHandler);
        previewButton.addEventListener("click", PostPreview.togglePreview, true);
        // include interactive tags legend as well
        for (let t of clickableTags || []) {
            ((item) =>
                t.addEventListener(
                    "click",
                    () => {
                        if (PostPreview.state === 1) {
                            // only update preview if shown
                            PostPreview.updatePreview(item);
                        }
                    },
                    true,
                ))(item);
        }
    },

    togglePreview(item) {
        if (PostPreview.state == 0) {
            PostPreview.state = 1;
            PostPreview.enablePreview(item);
        } else {
            PostPreview.state = 0;
            PostPreview.disablePreview(item);
        }
    },

    enablePreview(item) {
        if (item instanceof MouseEvent) item = (<HTMLElement>item.target).closest("div.postbox");
        let form_body = item.querySelector("#frm_body");
        let preview_box = item.querySelector("#previewArea");
        if (!form_body || !preview_box) return;
        preview_box.style.display = "block";
        PostPreview.updatePreview(item);
        form_body.addEventListener("keyup", PostPreview.updatePreview, true);
        form_body.focus();
    },

    disablePreview(item) {
        if (item instanceof MouseEvent) item = (<HTMLElement>item.target).closest("div.postbox");
        let form_body = item.querySelector("#frm_body");
        let preview_box = item.querySelector("#previewArea");
        if (!form_body || !preview_box) return;
        preview_box.style.display = "none";
        form_body.removeEventListener("keyup", PostPreview.updatePreview, true);
        form_body.focus();
    },

    updatePreview(item) {
        if (PostPreview.previewTimer) clearTimeout(PostPreview.previewTimer);
        PostPreview.previewTimer = setTimeout(() => PostPreview.delayedPreview(item), 250);
    },

    delayedPreview(item) {
        if (item instanceof KeyboardEvent) item = (<HTMLElement>item.target).closest("div.postbox");
        let form_body = item.querySelector("#frm_body");
        let previewArea = item.querySelector("#previewArea");
        if (!form_body || !previewArea) return;
        safeInnerHTML(generatePreview(form_body.value), previewArea);
    },
};

export default PostPreview;
