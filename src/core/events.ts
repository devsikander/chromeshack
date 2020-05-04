interface LiteEventInterface<T> {
    addHandler(handler: { (...args: any[]): void }): void;
    removeHandler(handler: { (...args: any[]): void }): void;
}

class LiteEvent<T> implements LiteEventInterface<T> {
    private handlers: { (...args: any[]): void }[] = [];

    addHandler(handler: { (...args: any[]): void }): void {
        this.handlers.push(handler);
    }

    removeHandler(handler: { (...args: any[]): void }): void {
        this.handlers = this.handlers.filter((h) => h !== handler);
    }

    raise(...args: any[]) {
        this.handlers.slice(0).forEach((h) => h(...args));
    }

    expose(): LiteEventInterface<T> {
        return this;
    }
}

export const fullPostsCompletedEvent = new LiteEvent<void>();
export const processPostEvent = new LiteEvent<any>();
export const processPostBoxEvent = new LiteEvent<any>();
export const processReplyEvent = new LiteEvent<any>();
export const processRefreshIntentEvent = new LiteEvent<any>();
export const processPostRefreshEvent = new LiteEvent<any>();
export const processEmptyTagsLoadedEvent = new LiteEvent<any>();
export const processTagDataLoadedEvent = new LiteEvent<any>();
