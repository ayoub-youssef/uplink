/*
 * Uplink: the MakeCode Arcade extension for The Hub.
 *
 * Add this extension to a MakeCode Arcade project, then use the Uplink blocks
 * to start a run, record named events and set the score. The event
 * keys are created in the Hub's Add/Edit Game form; this side only reports
 * which keys happened and how many times.
 *
 * The exported page also needs the shared `game-bridge.js` script. The Hub
 * puts `hub_origin` and `hub_source` on the frame URL; that script does the
 * page-to-Hub postMessage half.
 */
namespace uplink {
    const CHANNEL = "hub"
    const PROTOCOL = "HUB1"

    let started = false
    let earning = false
    let session_received = false
    let score = 0
    let level = "N/A"
    let tier = 1
    let run_sent = false
    let exempt = false
    let sent_signature = ""

    // Event counts for this run. Keys are the names created in the Hub form;
    // the server clamps them to the caps and prices them.
    let event_keys: string[] = []
    let event_counts: number[] = []

    function find_event(key: string): number {
        for (let i = 0; i < event_keys.length; i++) {
            if (event_keys[i] == key) return i
        }
        return -1
    }

    function clean_key(key: string): string {
        let out = ""
        for (let i = 0; i < key.length; i++) {
            const code = key.charCodeAt(i)
            if (code >= 65 && code <= 90) out += String.fromCharCode(code + 32)
            else if ((code >= 97 && code <= 122) || (code >= 48 && code <= 57) || code == 45)
                out += key.charAt(i)
        }
        return out
    }

    function add_event(key: string, count: number) {
        key = clean_key(key)
        if (!key || count == 0) return
        let at = find_event(key)
        if (at < 0) {
            event_keys.push(key)
            event_counts.push(0)
            at = event_keys.length - 1
        }
        event_counts[at] += count
        if (event_counts[at] < 0) event_counts[at] = 0
    }

    function buffer_text(buffer: Buffer): string {
        let text = ""
        for (let i = 0; i < buffer.length; i++) {
            text += String.fromCharCode(buffer[i])
        }
        return text
    }

    function field(text: string, index: number): string {
        let current = 0
        let out = ""
        for (let i = 0; i < text.length; i++) {
            const code = text.charCodeAt(i)
            if (code == 124) {
                if (current == index) return out
                current += 1
                out = ""
            } else if (current == index) {
                out += String.fromCharCode(code)
            }
        }
        return current == index ? out : ""
    }

    function on_message(buffer: Buffer) {
        const text = buffer_text(buffer)
        if (field(text, 0) != PROTOCOL) return
        const action = field(text, 1)
        if (action == "SESSION") {
            earning = field(text, 2) == "1"
            level = field(text, 4)
            if (!level) level = "N/A"
            tier = parseInt(field(text, 5)) || 1
            session_received = true
        }
    }

    function json_events(): string {
        let out = "{"
        for (let i = 0; i < event_keys.length; i++) {
            if (i > 0) out += ","
            out += "\"" + event_keys[i] + "\":" + event_counts[i]
        }
        return out + "}"
    }

    function send(action: string) {
        const run = ",\"run\":{\"score\":" + score + ",\"events\":" + json_events() +
            ",\"exempt\":" + (exempt ? "true" : "false") + "}"
        control.simmessages.send(CHANNEL, Buffer.fromUTF8(
            "{\"v\":1,\"action\":\"" + action + "\"" +
            (action == "run" || action == "progress" ? run : "") + "}"))
    }

    function signature(): string {
        return score + "|" + json_events()
    }

    function report_progress() {
        if (run_sent) return
        const next = signature()
        if (next == sent_signature) return
        sent_signature = next
        send("progress")
    }

    function finish() {
        if (run_sent) return
        run_sent = true
        send("run")
    }

    /**
     * Starts the bridge for this run. Call once when the game starts.
     */
    //% block="start Uplink run"
    //% weight=100
    export function start() {
        if (started) return
        started = true
        control.simmessages.onReceived(CHANNEL, on_message)
        send("ready")
        game.onGameOver(function () {
            finish()
        })
        game.onUpdate(function () {
            report_progress()
        })
    }

    /**
     * Marks this run as exempt from the game's daily limit. Use it while the
     * player is still in a menu or otherwise has not really started; a run with
     * no gameplay should not spend one of their Data attempts. Exempt is false
     * by default, so a game that never calls this block counts normally.
     */
    //% block="set this run exempt from the daily limit to $value"
    //% value.defl=false
    //% weight=85
    export function setExempt(value: boolean) {
        exempt = value
    }

    /**
     * Sets the in-game score reported with the run.
     */
    //% block="set the score to $value"
    //% weight=90
    export function setScore(value: number) {
        score = Math.round(value)
    }

    /**
     * Records one occurrence of a named event.
     */
    //% block="record event $key"
    //% key.defl="event-key"
    //% weight=80
    export function recordEvent(key: string) {
        add_event(key, 1)
    }

    /**
     * Records several occurrences of a named event.
     */
    //% block="record event $key by $count"
    //% key.defl="event-key"
    //% count.defl=1
    //% weight=70
    export function recordEventBy(key: string, count: number) {
        add_event(key, Math.round(count))
    }

    /**
     * The belt name the run started with, e.g. "Gold".
     */
    //% block="the belt"
    //% weight=60
    export function belt(): string {
        return level
    }

    /**
     * The tier inside the belt the run started with.
     */
    //% block="the belt tier"
    //% weight=50
    export function beltTier(): number {
        return tier
    }

    /**
     * Whether this run can earn Data.
     */
    //% block="is this a Data run"
    //% weight=40
    export function isDataRun(): boolean {
        return session_received && earning
    }
}
