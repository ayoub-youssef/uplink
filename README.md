# Uplink

Uplink is The Hub's MakeCode Arcade extension. It reports a run's named events,
in-game score and starting belt to The Hub without hardcoding any event names or
rewards in the game.

## 1. Create the events in The Hub

On the game's **Add Game** or **Edit Game** page, add a row for each thing the
game can do:

| Key | Label | Reward | Type | Cap |
| --- | --- | --- | --- | --- |
| `catch-cow` | Catch Cow | 100 | Scalable | 99 |
| `catch-bull` | Catch Bull | 1,000 | Fixed | 1 |

- **Fixed** rewards are exact bytes.
- **Scalable** rewards are points; each point is 1% of the player's belt unit,
  so 100 points = one belt unit.
- The cap is mandatory. The server clamps a reported count to it.
- Negative rewards are penalties.

The form computes the worst-case Gold payout and will not save a configuration
the site cannot store. The Daily Limit and Events controls are disabled until
the game carries the **Blockchain** tag.

## 2. Add the extension to the project

Add this repository as a MakeCode extension:

```text
https://github.com/ayoub-youssef/uplink
```

Then use the **Uplink** blocks:

- `start Uplink run` once when the game starts.
- `set the score to …` whenever the score changes.
- `record event [catch-cow]` where that event happens.
- `record event [catch-bull] by [1]` for multiple occurrences.
- `the belt` / `the belt tier` for belt-specific content.
- `is this a Data run` when the game needs to know whether Data is live.

The extension reports keys and counts only. The Hub looks up the reward and
caps the count server-side; a modified game cannot choose its payout.

## 3. Include the shared page bridge

The exported game page needs one script, **after** the MakeCode loader:

```html
<script src="https://the-hub-preview.pages.dev/game-bridge.js"></script>
```

The Hub frames the game with `hub_origin` and `hub_source`; the script reads
them, forwards the game's messages to the Hub and re-wraps the Hub's reply for
the simulator. Without those query parameters it does nothing.

The preview bridge URL is the one to use until The Hub's live release includes
the same file. Then switch this one line to
`https://thehub.nexus/game-bridge.js`.

## Notes

- The level is snapshotted when the run starts, so level-ups during a run do
  not change its payout.
- The daily limit is per game and per account, and can be unlimited.
- A guest run never earns.
- The game must be served from a public HTTPS MakeCode export for the Hub's
  Add Game check; `localhost` is accepted for local testing with the Hub's
  `?game=` override.
