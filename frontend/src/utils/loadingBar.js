// Tiny shared counter for the top loading bar.
// Call start() when work begins and done() when it ends. The bar is "busy"
// while at least one piece of work is running (several API calls can overlap).

let count = 0;
const listeners = new Set();

const notify = () => {
  listeners.forEach((listener) => listener(count > 0));
};

export const loadingBar = {
  start: () => {
    count += 1;
    if (count === 1) notify();
  },
  done: () => {
    count = Math.max(0, count - 1);
    if (count === 0) notify();
  },
  subscribe: (listener) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
};
