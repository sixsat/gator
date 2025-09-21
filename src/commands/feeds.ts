import { fetchFeed } from "src/lib/rss";
import {
  createFeed,
  getFeeds,
  createFeedFollow,
  getFeedByURL,
  getFeedFollowsForUser,
  deleteFeedFollow,
  getNextFeedToFetch,
  markFeedFetched,
} from "src/db/queries/feeds";
import { getUserById } from "src/db/queries/users";
import { Feed, User } from "src/db/schema";
import { parseDuration } from "src/lib/time";

export async function handlerAggregate(cmdName: string, ...args: string[]) {
  if (args.length !== 1) {
    throw new Error(`usage: ${cmdName} <time_between_reqs>`);
  }

  const timeArg = args[0];
  const timeBetweenRequests = parseDuration(timeArg);
  if (!timeBetweenRequests) {
    throw new Error(
      `invalid duration: ${timeArg} — use format 1h 30m 15s or 3500ms`
    );
  }

  console.log(`Collecting feeds every ${timeArg}...`);
  scrapeFeeds().catch(handleError);

  const interval = setInterval(() => {
    scrapeFeeds().catch(handleError);
  }, timeBetweenRequests);

  await new Promise<void>((resolve) => {
    process.on("SIGINT", () => {
      console.log("Shutting down feed aggregator...");
      clearInterval(interval);
      resolve();
    });
  });
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

async function scrapeFeeds() {
  const feed = await getNextFeedToFetch();
  if (!feed) {
    console.log(`No feeds to fetch.`);
    return;
  }

  console.log(`Found a feed to fetch!`);
  scrapeFeed(feed);
}

async function scrapeFeed(feed: Feed) {
  await markFeedFetched(feed.id);
  const feedData = await fetchFeed(feed.url);
  console.log(
    `Feed ${feed.name} collected, ${feedData.channel.item.length} posts found`
  );
}

function handleError(err: unknown) {
  console.error(
    `Error scraping feeds: ${err instanceof Error ? err.message : err}`
  );
}
