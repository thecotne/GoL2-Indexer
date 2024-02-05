-- migrate:up
CREATE VIEW public.transfer_events AS (
  SELECT event."eventData"->>'from' AS "transferFrom",
    event."eventData"->>'to' AS "transferTo",
    (event."eventData"->>'value')::numeric AS "transferAmount",
    event."blockHash",
    event."blockIndex",
    event."transactionHash",
    event."transactionIndex",
    event."eventIndex",
    event."createdAt",
    event."updatedAt"
  FROM public.event
  WHERE event."eventName" = 'Transfer'
  ORDER BY "blockIndex" DESC,
    "transactionIndex" DESC,
    "eventIndex" DESC
);
CREATE VIEW public.balance_events AS (
  SELECT transfer_events."transferTo" AS "userId",
    transfer_events."transferAmount" AS "balance",
    transfer_events."blockHash",
    transfer_events."blockIndex",
    transfer_events."transactionHash",
    transfer_events."transactionIndex",
    transfer_events."eventIndex",
    transfer_events."createdAt",
    transfer_events."updatedAt"
  FROM public.transfer_events
  UNION ALL
  SELECT transfer_events."transferFrom" AS "userId",
    0 - transfer_events."transferAmount" AS "balance",
    transfer_events."blockHash",
    transfer_events."blockIndex",
    transfer_events."transactionHash",
    transfer_events."transactionIndex",
    transfer_events."eventIndex",
    transfer_events."createdAt",
    transfer_events."updatedAt"
  FROM public.transfer_events
);
CREATE VIEW public.balance AS (
  SELECT "userId",
    sum(balance) AS balance
  from balance_events
  GROUP BY "userId"
);
-- migrate:down
drop VIEW public.balance;
drop VIEW public.balance_events;
drop VIEW public.transfer_events;
