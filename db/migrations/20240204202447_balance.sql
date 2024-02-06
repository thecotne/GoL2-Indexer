-- migrate:up
CREATE VIEW public.balance AS (
  SELECT sum(balance) AS balance,
    "userId",
    "networkName",
    "contractAddress"
  from (
      SELECT sum("transferAmount") AS "balance",
        "transferTo" AS "userId",
        "networkName",
        "contractAddress"
      FROM public.event
      WHERE "eventName" = 'Transfer'
      GROUP BY "transferTo",
        "networkName",
        "contractAddress"
      UNION ALL
      SELECT sum(0 - "transferAmount") AS "balance",
        "transferFrom" AS "userId",
        "networkName",
        "contractAddress"
      FROM public.event
      WHERE "eventName" = 'Transfer'
      GROUP BY "transferFrom",
        "networkName",
        "contractAddress"
    )
  GROUP BY "userId",
    "networkName",
    "contractAddress"
);
-- migrate:down
drop VIEW public.balance;
