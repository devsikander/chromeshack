import * as browser from "webextension-polyfill";
import { Dispatch } from "react";

import { fetchSafe, matchFileFormat, isEmptyArr, FormDataToJSON } from "../../core/common";
import {
    imageFormats,
    videoFormats,
    UploaderAction,
    UploadSuccessPayload,
    UploadFailurePayload,
} from "../image-uploader/uploaderStore";

const imgurApiImageBaseUrl = "https://api.imgur.com/3/image";
const imgurApiAlbumBaseUrl = "https://api.imgur.com/3/album";
const imgurApiUploadUrl = "https://api.imgur.com/3/upload";
const imgurClientId = "Client-ID c045579f61fc802";

interface ImgurResolution {
    imageId?: string;
    albumId?: string;
}

type UploadData = string[] | File[];
type ImgurMediaItem = {
    mp4?: string;
    link?: string;
};
interface ImgurResponse {
    data: {
        images?: ImgurMediaItem[];
        mp4?: string;
        link?: string;
    };
}

// wrap fetchSafe() so we can silence transmission exceptions
const _fetch = async (url: string) =>
    // sanitized in common.js
    await fetchSafe({
        url,
        fetchOpts: { headers: { Authorization: imgurClientId } },
    }).catch((e) => console.log(e));

export const doResolveImgur = async ({ imageId, albumId }: ImgurResolution) => {
    try {
        const albumImageUrl = albumId && imageId && `${imgurApiAlbumBaseUrl}/${albumId}/image/${imageId}`;
        const albumUrl = albumId && `${imgurApiAlbumBaseUrl}/${albumId}`;
        // since a shortcode could be either an image or an album try both
        const imageUrl = imageId ? `${imgurApiImageBaseUrl}/${imageId}` : `${imgurApiImageBaseUrl}/${albumId}`;
        // try resolving as an album image
        const _albumImage: ImgurResponse = albumImageUrl && (await _fetch(albumImageUrl));
        if (_albumImage) return [_albumImage?.data?.mp4 || _albumImage?.data?.link];
        // next try resolving as a multi-image album
        const _album: ImgurResponse = albumUrl && (await _fetch(albumUrl));
        const _mediaItems = !isEmptyArr(_album?.data?.images) && _album.data.images;
        // finally try resolving as a standalone image
        const _image: ImgurResponse = imageUrl && (await _fetch(imageUrl));
        if (_image) return [_image?.data?.mp4 || _image?.data?.link];
        // if we get back an array of imgur items then return an array of links
        if (Array.isArray(_mediaItems)) {
            const result = [];
            for (const i of _mediaItems) result.push(i.mp4 || i.link);
            return result;
        }
        throw new Error(`Could not resolve Imgur using any available method: ${imageId} ${albumId}`);
    } catch (e) {
        console.log(e);
    }
};

const doImgurUpload = async (data: UploadData, dispatch: Dispatch<UploaderAction>) => {
    try {
        dispatch({ type: "UPLOAD_PENDING" });
        const response = [];
        for (const file of data) {
            const dataBody = new FormData();
            const fileFormat = file instanceof File ? matchFileFormat(file as File, imageFormats, videoFormats) : -1;
            // imgur demands a FormData with upload specific information
            if (typeof file === "string") dataBody.append("type", "url");
            else dataBody.append("type", "file");
            if (fileFormat === 0 || typeof file === "string") dataBody.append("image", file);
            else if (fileFormat === 1) dataBody.append("video", file);
            else throw Error(`Could not detect the file format for: ${file}`);
            const stringified = await FormDataToJSON(dataBody);
            const res: ImgurResponse = await browser.runtime.sendMessage({
                name: "corbPost",
                url: imgurApiUploadUrl,
                headers: { Authorization: imgurClientId },
                data: stringified,
            });
            // sanitized in fetchSafe()
            if (res?.data?.link) response.push(res.data.link);
        }
        return response;
    } catch (e) {
        if (e) console.log(e);
    }
};

const handleImgurSuccess = (payload: UploadSuccessPayload, dispatch: Dispatch<UploaderAction>) =>
    dispatch({ type: "UPLOAD_SUCCESS", payload });

const handleImgurFailure = (payload: UploadFailurePayload, dispatch: Dispatch<UploaderAction>) =>
    dispatch({ type: "UPLOAD_FAILURE", payload });

const handleImgurUpload = async (data: UploadData, dispatch: Dispatch<UploaderAction>) => {
    try {
        const links: string[] = await doImgurUpload(data, dispatch);
        if (!isEmptyArr(links)) handleImgurSuccess(links, dispatch);
        else handleImgurFailure({ code: 400, msg: "Server returned no media links!" }, dispatch);
    } catch (e) {
        if (e) console.log(e);
        handleImgurFailure({ code: 401, msg: e.message || `Something went wrong!` }, dispatch);
    }
};
export default handleImgurUpload;
