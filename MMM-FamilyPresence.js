/* MagicMirror² Module: MMM-FamilyPresence
 * A single-row household presence display. Each person is an avatar with a short status
 * label ("home" / "away"). Presence comes from one of three sources per person:
 *   - network:      home flag from a presence data.json (e.g. your router's DHCP leases)
 *   - calendarNext: home while a matching calendar event runs; otherwise shows the next date
 *   - calendarAway: home by default; away only while a matching calendar event runs
 *
 * By Andreas Göpfert — MIT Licensed.
 */
Module.register("MMM-FamilyPresence", {
	defaults: {
		title: "Home",
		updateInterval: 60000,
		locale: null,
		labels: { home: "home", away: "away", unknown: "—" },
		// Example people — replace with your own. `source.key` matches persons.<key> in data.json.
		people: [
			{ name: "Alice", emoji: "👩", color: "#f43f5e", source: { type: "network", key: "alice" } },
			{ name: "Bob",   emoji: "🧑", color: "#3b82f6", source: { type: "network", key: "bob" } },
			{ name: "Kid",   emoji: "🧒", color: "#38bdf8", source: { type: "calendarNext", prefix: "kid" } },
			{ name: "Baby",  emoji: "👶", color: "#f9a8d4", source: { type: "calendarAway", prefix: "baby" } }
		]
	},

	getStyles() { return ["MMM-FamilyPresence.css"]; },

	start() {
		this.presence = null;
		this.events = [];
		this.sendSocketNotification("FAMILYPRESENCE_START", { interval: this.config.updateInterval });
	},

	socketNotificationReceived(notification, payload) {
		if (notification === "FAMILYPRESENCE_DATA") { this.presence = payload; this.updateDom(250); }
	},

	notificationReceived(notification, payload) {
		if (notification !== "CALENDAR_EVENTS") return;
		this.events = (payload || []).slice().sort((a, b) => Number(a.startDate) - Number(b.startDate));
		this.updateDom(250);
	},

	eventsFor(prefix) {
		const p = String(prefix || "").toLowerCase();
		return this.events.filter((e) => (e.title || "").trim().toLowerCase().startsWith(p));
	},

	resolve(person) {
		const L = this.config.labels, src = person.source || {};
		if (src.type === "network") {
			const d = this.presence && this.presence.persons ? this.presence.persons[src.key] : null;
			if (!d) return { state: "unknown", label: L.unknown };
			return { state: d.home ? "home" : "away", label: d.home ? L.home : L.away };
		}
		const now = Date.now();
		if (src.type === "calendarNext") {
			const ev = this.eventsFor(src.prefix);
			if (ev.find((e) => Number(e.startDate) <= now && Number(e.endDate) > now)) return { state: "home", label: L.home };
			const next = ev.find((e) => Number(e.startDate) > now);
			if (!next) return { state: "unknown", label: L.unknown };
			return { state: "away", label: this.shortDate(Number(next.startDate)) };
		}
		if (src.type === "calendarAway") {
			const cur = this.eventsFor(src.prefix).find((e) => Number(e.startDate) <= now && Number(e.endDate) > now);
			if (!cur) return { state: "home", label: L.home };
			const rest = (cur.title || "").replace(new RegExp("^\\s*" + src.prefix + "\\s*", "i"), "").trim();
			return { state: "away", label: rest || L.away };
		}
		return { state: "unknown", label: L.unknown };
	},

	getDom() {
		const root = document.createElement("section");
		root.className = "family-presence";
		root.innerHTML = `<header><span>${this.config.title}</span></header>`;
		const people = document.createElement("div");
		people.className = "fp-people";
		for (const person of this.config.people) {
			const r = this.resolve(person);
			const card = document.createElement("div");
			card.className = `fp-person fp-${r.state}`;
			card.style.setProperty("--person-color", person.color || "#9aa4ac");
			card.innerHTML =
				`<span class="fp-avatar">${person.emoji || "🙂"}<i></i></span>` +
				`<strong>${person.name}</strong>` +
				`<small>${r.label}</small>`;
			people.appendChild(card);
		}
		root.appendChild(people);
		return root;
	},

	shortDate(ts) {
		const d = new Date(ts);
		const wd = d.toLocaleDateString(this.config.locale || undefined, { weekday: "short" }).replace(".", "");
		return `${wd} ${d.getDate()}.${d.getMonth() + 1}.`;
	}
});
