const subscriptions = [
  "99 руб/мес",
  "199 руб/мес",
  "299 руб/мес",
  "499 руб/мес",
  "999 руб/мес",
  "1990 руб/мес",
  "4900 руб/мес",
];

/**
 * As bigger weight as much subscription's cost would be
 * @param {number} weight
 */
export const getSubscription = (weight: number = 0) => {
  const min = Math.min(weight, subscriptions.length - 1);
  const max = subscriptions.length - 1;
  const index = Math.floor(Math.random() * (max - min + 1) + min)
  return subscriptions[index];
}
