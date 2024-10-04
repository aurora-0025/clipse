import ParcelWatcher from '@parcel/watcher';
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const watcher = require('@parcel/watcher') as typeof ParcelWatcher;
const subscriptions: ParcelWatcher.AsyncSubscription[] = [];


export const startWatcher = async (paths: string[]) => {
  if (paths.length === 0) {
    console.log("No paths to watch.");
    return;
  }

  const imageExtensionsGlob = "**/*.*(jpg|jpeg|png|gif|bmp|svg)";

  for (const watchPath of paths) {
    try {
      const sub = await watcher.subscribe(
        watchPath,
        async (err, events) => {
          if (err) {
            console.error(`Error watching path: ${watchPath}`, err);
            return;
          }
          for (const event of events) {
            console.log(event);
          }
        },
        {
          ignore: [`${!imageExtensionsGlob}`],
        },
      );
      subscriptions.push(sub);
    } catch (error) {
      console.error(`Failed to start watcher for path: ${watchPath}`, error);
    }
  }
};

export const stopAllWatchers = async () => {
    if (subscriptions.length == 0) {
        console.log("there are currently no watchers running");
        return;
    } else {
        for (const sub of subscriptions) {
            await sub.unsubscribe();
        }
        console.log("All watchers have been stopped.");
    }
}