import type { ParsedResponse } from "../../core/api";
import type { MediaOptions } from "../../core/useResolvedLinks";

export interface ResolvedResponse {
    postid: number;
    idx: number;
    response: ParsedResponse;
}

export interface ExpandoProps extends ResolvedResponse {
    options?: MediaOptions;
}

export interface FCWithMediaProps extends JSX.Element {
    props: {
        src?: string;
        slides?: JSX.Element[];
    };
}
