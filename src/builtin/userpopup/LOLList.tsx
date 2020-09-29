import React from "react";

const LOLListItem = (props: { href: string; text: string }) => {
    const { href, text } = props || {};
    const handleClick = (e: React.MouseEvent<HTMLElement, MouseEvent>) => {
        e.preventDefault();
        if (href) window.open(href, "_blank", "noopener,noreferrer");
    };
    return (
        <div className="dropdown__item" onClick={handleClick}>
            <span>{text}</span>
        </div>
    );
};

const LOLList = (props: { username: string; isLoggedInUser: boolean }) => {
    const { username, isLoggedInUser } = props || {};

    return (
        <>
            <LOLListItem
                href={`https://www.shacknews.com/user/${username}/posts`}
                text={isLoggedInUser ? "Your posts" : `${username}'s Posts`}
            />
            <LOLListItem
                href={`https://www.shacknews.com/search?chatty=1&type=4&chatty_term=${username}&chatty_user=&chatty_author=&chatty_filter=all&result_sort=postdate_desc`}
                text={isLoggedInUser ? "Vanity Search" : `Search for "${username}"`}
            />
            <LOLListItem
                href={`https://www.shacknews.com/search?chatty=1&type=4&chatty_term=&chatty_user=&chatty_author=${username}&chatty_filter=all&result_sort=postdate_desc`}
                text={isLoggedInUser ? "Parent Author Search" : `${username}: Parent Author Search`}
            />

            <div className="dropdown__separator" />
            <LOLListItem
                href={`https://www.shacknews.com/tags-user?user=${username}#authored_by_tab`}
                text={isLoggedInUser ? "[lol] : Stuff You Wrote" : `[lol] : Stuff ${username} Wrote`}
            />
            <LOLListItem
                href={`https://www.shacknews.com/tags-user?user=${username}#lold_by_tab`}
                text={isLoggedInUser ? "[lol] : Stuff You Tagged" : `[lol] : Stuff ${username} Tagged`}
            />
            <LOLListItem
                href={`https://www.shacknews.com/tags-user?user=${username}#fan_club_tab`}
                text={isLoggedInUser ? "[lol] : Your Fan Train" : `[lol] : ${username}'s Fan Train`}
            />
            <LOLListItem
                href={`https://www.shacknews.com/tags-ever-funny?user=${username}`}
                text={isLoggedInUser ? "[lol] : Were You Ever Funny?" : `[lol] : Was ${username} Ever Funny?`}
            />
        </>
    );
};

export { LOLList };
