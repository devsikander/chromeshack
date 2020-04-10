/*
 * This monkeypatches the Chatty's broken scroll-to-post functionality
 */

if (!document.getElementById("chatviewfix-wjs")) {
    function clickItem(b, f) {
        let d = window.frames.dom_iframe;
        let e = d.document.getElementById("item_" + f);
        if (uncap_thread(b)) {
            elem_position = $("#item_" + f).position();
            scrollToItem($("li#item_" + f).get(0));
        }
        sLastClickedItem = f;
        sLastClickedRoot = b;
        if (d.document.getElementById("items_complete") && e) {
            let c = find_element(e, "DIV", "fullpost");
            let a = import_node(document, c);
            show_item_fullpost(b, f, a);
            return false;
        } else {
            path_pieces = document.location.pathname.split("?");
            parent_url = path_pieces[0];
            navigate_page_no_history(d, "/frame_chatty.x?root=" + b + "&id=" + f + "&parent_url=" + parent_url);
            return false;
        }
    }

    function show_item_fullpost(f, h, b) {
        remove_old_fullpost(f, h, parent.document);
        let k = parent.document.getElementById("root_" + f);
        let e = parent.document.getElementById("item_" + h);
        push_front_element(e, b);
        scrollToItem(e);
        e.className = add_to_className(e.className, "sel");
        let c = find_element(e, "DIV", "oneline");
        c.className = add_to_className(c.className, "hidden");
    }

    function scrollToItem(b) {
        if (!elementIsVisible(b)) scrollToElement(b);
    }
    let chatViewFixElem = document.createElement("script");
    chatViewFixElem.id = "chatviewfix-wjs";
    chatViewFixElem.textContent = `${clickItem.toString()}${show_item_fullpost.toString()}${scrollToItem.toString()}${scrollToElement.toString()}${elementIsVisible.toString()}`;
    let bodyRef = document.getElementsByTagName("body")[0];
    bodyRef.appendChild(chatViewFixElem);
    undefined;
}
