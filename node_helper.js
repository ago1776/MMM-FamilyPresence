const NodeHelper = require("node_helper");
const fs = require("fs");
const path = require("path");

module.exports = NodeHelper.create({
	socketNotificationReceived(notification, payload) {
		if (notification !== "FAMILYPRESENCE_START") return;
		const send = () => {
			fs.readFile(path.join(__dirname, "data.json"), "utf8", (err, raw) => {
				if (err) return;
				try {
					this.sendSocketNotification("FAMILYPRESENCE_DATA", JSON.parse(raw));
				} catch (_) { /* atomarer Austausch; nächster Tick */ }
			});
		};
		send();
		if (!this.timer) this.timer = setInterval(send, payload.interval || 60000);
	}
});
