import { useCallback, useEffect, useState } from "react";
import { PostEventArgs } from "../../core";
import { arrHas, scrollToElement } from "../../core/common";
import {
    hpnpJumpToPostEvent,
    pendingPostsUpdateEvent,
    processNotifyEvent,
    processPostRefreshEvent,
} from "../../core/events";
import { NotifyEvent, NotifyResponse } from "../../core/notifications";
import type { PendingPost } from "./";

const isCollapsed = (elem: HTMLElement) => elem?.closest("div.root.collapsed");
const isPending = (elem: HTMLElement) => elem?.matches("a.refresh_pending") && elem?.closest("div.refresh a") === elem;

const usePendingPosts = () => {
    const [pendings, setPendings] = useState([] as PendingPost[]);
    const [pendingText, setPendingText] = useState("");
    const [pendingIdx, setPendingIdx] = useState(0);
    const indicator = "★ ";

    const handlePrevClick = useCallback(() => {
        if (!arrHas(pendings)) return;
        const newIdx = (pendingIdx - 1 + pendings.length) % pendings.length;
        const threadid = pendings[newIdx]?.threadId;
        const thread = pendings[newIdx]?.thread;
        setPendingIdx(newIdx);
        if (thread) {
            scrollToElement(thread);
            hpnpJumpToPostEvent.raise(threadid);
        }
    }, [pendings, pendingIdx]);
    const handleNextClick = useCallback(() => {
        if (!arrHas(pendings)) return;
        const newIdx = (pendingIdx + 1 + pendings.length) % pendings.length;
        const threadid = pendings[newIdx]?.threadId;
        const thread = pendings[newIdx]?.thread;
        setPendingIdx(newIdx);
        if (thread) {
            scrollToElement(thread);
            hpnpJumpToPostEvent.raise(threadid);
        }
    }, [pendings, pendingIdx]);

    const updateRefreshed = useCallback(
        ({ post }: PostEventArgs) => {
            // update the list of pending posts when one of them is refreshed
            const threadid = parseInt(post?.closest("div.root > ul > li[id^='item_']")?.id?.substr(5));
            const filtered = pendings.filter((p) => p.threadId !== threadid);
            const newIdx = filtered.length - 1 > 0 ? filtered.length - 1 : 0;
            const newPendings = arrHas(filtered) ? [...filtered] : [];
            setPendings(newPendings);
            // avoid going OOB if the stack shrinks
            setPendingIdx((i) => (i > newIdx ? newIdx : i));
            pendingPostsUpdateEvent.raise(newPendings);
        },
        [pendings],
    );
    const fetchPendings = useCallback(
        async (resp: NotifyResponse) => {
            const newPosts = arrHas(resp.events)
                ? [...resp.events.filter((x: NotifyEvent) => x.eventType === "newPost")]
                : [];
            // build new pendings on top of old ones as long as they're unique threads
            const reducedPosts = newPosts.reduce((acc, p) => {
                const postId = p.eventData?.postId;
                const threadId = p.eventData?.post?.threadId;
                const thread = document.querySelector(`li#item_${threadId}`) as HTMLElement;
                if (thread) acc.push({ postId, threadId, thread });
                return acc;
            }, [] as PendingPost[]);
            const reducedPendings = reducedPosts.reduce((acc, p) => {
                if (!acc.find((x) => x.threadId === p.threadId)) acc.push(p);
                return acc;
            }, pendings);
            setPendings([...reducedPendings]);
            pendingPostsUpdateEvent.raise(reducedPendings);
        },
        [pendings],
    );

    useEffect(() => {
        // update the window title and HPNP status text when our pending count changes
        const newText = pendings.length > 0 ? `${indicator}${pendings.length}` : "";
        setPendingText(newText);
        if (pendings.length > 0 && !document.title.startsWith(indicator))
            document.title = `${indicator}${document.title}`;
        else if (document.title.startsWith(indicator)) document.title.split(indicator)[1];
        // highlight the refresh button of unmarked threads that have pending posts
        for (const p of pendings || []) {
            const refreshBtn = p.thread?.querySelector("div.refresh a") as HTMLElement;
            if (!isCollapsed(refreshBtn) && !isPending(refreshBtn)) refreshBtn?.classList?.add("refresh_pending");
        }
    }, [pendings]);
    useEffect(() => {
        processNotifyEvent.addHandler(fetchPendings);
        processPostRefreshEvent.addHandler(updateRefreshed);
        return () => {
            processNotifyEvent.removeHandler(fetchPendings);
            processPostRefreshEvent.removeHandler(updateRefreshed);
        };
    }, [fetchPendings, updateRefreshed]);

    return { pendings, pendingText, handlePrevClick, handleNextClick };
};

export { usePendingPosts };
