import { fetchFeed } from "src/rss";
import {
  createFeed,
  getFeeds,
  createFeedFollow,
  getFeedByURL,
  getFeedFollowsForUser,
  deleteFeedFollow,
} from "src/db/queries/feeds";
import { getUserById } from "src/db/queries/users";
import { Feed, User } from "src/db/schema";

export async function handlerAggregate(_: string) {
  const feedURL = "https://www.wagslane.dev/index.xml";
  const feedData = await fetchFeed(feedURL);
  const feedDataStr = JSON.stringify(feedData, null, 2);
  console.log(feedDataStr);
}

export async function handlerAddFeed(
  cmdName: string,
  user: User,
  ...args: string[]
) {
  if (args.length !== 2) {
    throw new Error(`usage: ${cmdName} <feed_name> <url>`);
  }

  const feedName = args[0];
  const url = args[1];
  const feed = await createFeed(feedName, url, user.id);
  if (!feed) {
    throw new Error("Failed to create feed");
  }

  await createFeedFollow(user.id, feed.id);
  console.log("Feed created successfully:");
  printFeed(feed, user);
}

export async function handlerListFeeds(_: string) {
  const feeds = await getFeeds();

  if (feeds.length === 0) {
    console.log("No feeds found.");
    return;
  }

  console.log(`Found %d feeds:\n`, feeds.length);
  for (let feed of feeds) {
    const user = await getUserById(feed.userId);
    if (!user) {
      throw new Error(`Failed to find user for feed ${feed.id}`);
    }

    printFeed(feed, user);
    console.log("=====================================");
  }
}

export async function handlerFollow(
  cmdName: string,
  user: User,
  ...args: string[]
) {
  if (args.length !== 1) {
    throw new Error(`usage: ${cmdName} <feed_url>`);
  }

  const feedURL = args[0];
  const feed = await getFeedByURL(feedURL);
  if (!feed) {
    throw new Error(`Feed not found: ${feedURL}`);
  }

  const feedFollow = await createFeedFollow(user.id, feed.id);
  console.log(`Feed follow created:`);
  printFeedFollow(feedFollow.userName, feedFollow.feedName);
}

export async function handlerListFeedFollows(_: string, user: User) {
  const feedFollows = await getFeedFollowsForUser(user.id);
  if (feedFollows.length === 0) {
    console.log(`No feed follows found for this user.`);
    return;
  }

  console.log(`Feed follows for user %s:`, user.id);
  for (let ff of feedFollows) {
    console.log(`* %s`, ff.feedname);
  }
}

export async function handlerUnfollow(
  cmdName: string,
  user: User,
  ...args: string[]
) {
  if (args.length !== 1) {
    throw new Error(`usage: ${cmdName} <feed_url>`);
  }

  const feedURL = args[0];
  let feed = await getFeedByURL(feedURL);
  if (!feed) {
    throw new Error(`Feed not found for url: ${feedURL}`);
  }

  const result = await deleteFeedFollow(feed.id, user.id);
  if (!result) {
    throw new Error(`Failed to unfollow feed: ${feedURL}`);
  }

  console.log(`%s unfollowed successfully!`, feed.name);
}

function printFeed(feed: Feed, user: User) {
  console.log(`* ID:            ${feed.id}`);
  console.log(`* Created:       ${feed.createdAt}`);
  console.log(`* Updated:       ${feed.updatedAt}`);
  console.log(`* name:          ${feed.name}`);
  console.log(`* URL:           ${feed.url}`);
  console.log(`* User:          ${user.name}`);
}

function printFeedFollow(username: string, feedname: string) {
  console.log(`* User:          ${username}`);
  console.log(`* Feed:          ${feedname}`);
}
