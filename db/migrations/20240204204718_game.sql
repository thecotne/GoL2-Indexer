-- migrate:up
CREATE VIEW public.game_events AS (
  SELECT event."blockHash",
    event."blockIndex",
    event."transactionHash",
    event."transactionIndex",
    event."eventData"->>'user_id' AS "transactionOwner",
    CASE
      event."blockIndex"
      WHEN NULL THEN 'PENDING'
      ELSE 'ACCEPTED_ON_L2'
    END as "transactionStatus",
    event."eventIndex",
    event."eventName",
    event."eventData",
    event."createdAt",
    event."updatedAt",
    CASE
      WHEN event."eventData" ? 'game_id' THEN event."eventData"->>'game_id'
      ELSE '0x7300100008000000000000000000000000'
    END as "gameId",
    CASE
      WHEN event."eventData" ? 'generation' THEN (event."eventData"->>'generation')::numeric
      ELSE 1
    END as "gameGeneration",
    (event."eventData"->>'state')::numeric AS "gameState",
    (event."eventData"->>'cell_index')::numeric AS "revivedCellIndex",
    (event."eventData"->>'state')::numeric = 0 as "gameOver"
  FROM public.event
  WHERE event."eventName" in (
      'GameCreated',
      'GameEvolved',
      'CellRevived'
    )
  order by event."blockIndex" desc,
    event."transactionIndex" desc,
    event."eventIndex" desc
);
CREATE VIEW public.game_state AS (
  SELECT e."gameId",
    e."gameGeneration",
    e."gameState",
    e."gameState" = 0 as "gameOver",
    (
      SELECT jsonb_agg(
          jsonb_build_object(
            'cell_index',
            rci."revivedCellIndex",
            'user_id',
            rci."transactionOwner"
          )
        )
      from public.game_events rci
      WHERE rci."gameId" = e."gameId"
        AND rci."gameGeneration" = e."gameGeneration"
        AND rci."eventName" = 'CellRevived'
    ) as "revivedCells"
  FROM public.game_events e
  WHERE "eventName" in ('GameCreated', 'GameEvolved')
  ORDER BY "blockIndex" DESC,
    "transactionIndex" DESC,
    "eventIndex" DESC
);
CREATE VIEW public.game AS (
  SELECT distinct on ("gameId") *
  FROM public.game_state
  ORDER BY "gameId",
    "gameGeneration" DESC
);
-- migrate:down
DROP VIEW public.game;
DROP VIEW public.game_state;
DROP VIEW public.game_events;
