settingsLoadedEvent.addHandler(function()
{
    Collapse =
    {
        collapsed: getSetting("collapsed_threads"),

        toggle: function(item, id, is_root_post)
        {
            // only process for root posts
            if (is_root_post)
            {
                var root = document.getElementById("root_" + id);
                // root should never be null, but check anyway
                if (root)
                {
                    var postmeta = getDescendentByTagAndClassName(item, "div", "postmeta");

                    var close = getDescendentByTagAndClassName(postmeta, "a", "closepost");
                    var show = getDescendentByTagAndClassName(postmeta, "a", "showpost");
                    close.addEventListener("click", function() { Collapse.close(id); });
                    show.addEventListener("click", function() { Collapse.show(id); });

                    // this thread should be collapsed
                    if (objContains(id, Collapse.collapsed))
                    {
                        root.className += " collapsed";
                        show.className = "showpost";
                        close.className = "closepost hidden";
                    }

                }
            }
        },

        close: function(id)
        {
            browser.runtime.sendMessage({name: "collapseThread", "id": id});
        },

        show: function(id)
        {
            browser.runtime.sendMessage({name: "unCollapseThread", "id": id});
        }
    }

    processPostEvent.addHandler(Collapse.toggle);
});
