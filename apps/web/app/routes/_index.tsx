import type { MetaFunction } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { db } from "~/env.server";

export const meta: MetaFunction = () => {
  return [
    { title: "New Remix App" },
    { name: "description", content: "Welcome to Remix!" },
  ];
};

// event object
// {
//   "networkName": "SN_GOERLI",
//   "contractAddress": "0x5bd17bba6b3cb9740bcc0f20f93ecf443250c4f09d94e4ab32d3bdffc7ebba2",
//   "blockHash": "0x1bb6260dd10cef326f4d89ca224a6b0417f56c32fedfc91367bdb4c8d1a0599",
//   "blockIndex": 942318,
//   "transactionHash": "0xd3f38e72174f184f674b0c66b8456961093ad3f9fffde7e183f6ee4451e889",
//   "transactionIndex": 0,
//   "eventIndex": 0,
//   "eventName": "Upgraded",
//   "eventData": {
//     "implementation": "1918811272952760915684883876778035902426841049697495639193257066828996839392"
//   },
//   "createdAt": "2024-02-16T12:25:24.304Z",
//   "updatedAt": "2024-02-16T12:25:24.304Z",
//   "transferFrom": null,
//   "transferTo": null,
//   "transferAmount": null,
//   "transactionOwner": null,
//   "transactionStatus": "ACCEPTED_ON_L2",
//   "gameId": null,
//   "gameGeneration": null,
//   "gameState": null,
//   "revivedCellIndex": null,
//   "gameOver": null
// },

export async function loader() {
  const events = await db.selectFrom("event").selectAll().limit(50).execute();

  return json({
    events: events.map((event) => ({
      ...event,
      id: event.transactionHash + event.eventIndex,
    })),
  });
}

export default function Index() {
  const data = useLoaderData<typeof loader>();

  return (
    <div style={{ fontFamily: "system-ui, sans-serif", lineHeight: "1.8" }}>
      <pre>{JSON.stringify(data, null, 2)}</pre>
    </div>
  );
}
