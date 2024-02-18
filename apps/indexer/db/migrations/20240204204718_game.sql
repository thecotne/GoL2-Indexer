-- migrate:up
CREATE VIEW public.game_event AS (
  SELECT *
  FROM public.event e
  WHERE "eventName" in (
      'GameCreated',
      'GameEvolved',
      'CellRevived'
    )
  order by "blockIndex" desc,
    "transactionIndex" desc,
    "eventIndex" desc
);
CREATE VIEW public.game_revived_cells AS (
  SELECT "networkName",
    "contractAddress",
    "gameGeneration",
    ARRAY_AGG("revivedCellIndex") as "revivedCellIndexes",
    ARRAY_AGG("transactionOwner") as "revivedCellOwners"
  FROM public.event
  WHERE "eventName" = 'CellRevived'
  GROUP BY "networkName",
    "contractAddress",
    "gameGeneration"
);
CREATE VIEW public.game_state AS (
  SELECT e.*,
    r."revivedCellIndexes",
    r."revivedCellOwners"
  FROM public.event e
    LEFT JOIN public.game_revived_cells r ON e."gameId" = '0x7300100008000000000000000000000000'
    AND e."networkName" = r."networkName"
    AND e."contractAddress" = r."contractAddress"
    AND e."gameGeneration" = r."gameGeneration"
  WHERE "eventName" in ('GameCreated', 'GameEvolved')
  ORDER BY "blockIndex" desc,
    "transactionIndex" desc,
    "eventIndex" desc
);
CREATE VIEW public.game_current_generation AS (
  SELECT max("gameGeneration") as "gameGeneration",
    "networkName",
    "contractAddress",
    "gameId"
  FROM public.event
  GROUP BY "networkName",
    "contractAddress",
    "gameId"
);
CREATE VIEW public.game AS (
  SELECT e."networkName",
    e."contractAddress",
    e."gameId",
    e."transactionOwner" as "gameOwner",
    s."gameGeneration",
    s."gameState",
    s."gameOver",
    s."blockIndex",
    s."transactionIndex",
    s."eventIndex",
    s."revivedCellIndexes",
    s."revivedCellOwners"
  FROM public.event e
    JOIN public.game_current_generation g ON g."networkName" = e."networkName"
    AND g."contractAddress" = e."contractAddress"
    AND g."gameId" = e."gameId"
    JOIN public.game_state s ON s."networkName" = e."networkName"
    AND s."contractAddress" = e."contractAddress"
    AND s."gameId" = e."gameId"
    AND s."gameGeneration" = g."gameGeneration"
  WHERE e."eventName" = 'GameCreated'
  ORDER BY s."blockIndex" desc,
    s."transactionIndex" desc,
    s."eventIndex" desc
);
-- migrate:down
DROP VIEW public.game;
DROP VIEW public.game_current_generation;
DROP VIEW public.game_state;
DROP VIEW public.game_revived_cells;
DROP VIEW public.game_event;

