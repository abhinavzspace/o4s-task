import ipc from "node-ipc";

const args = process.argv.slice(2);

const ID = args[0];

ipc.config.id = ID;
ipc.config.retry = 1500;
ipc.config.maxRetries = 10;
ipc.config.silent = true;

const emit = (message) => {
  ipc.of.m.emit("app.message", {
    id: ipc.config.id,
    message,
  });
};

let m, c, x, lap;

ipc.connectToNet("m", "m", () => {
  ipc.of.m.on("connect", () => {
    console.log(`## ${ID} connected to m ##`, ipc.config.delay);
    emit({ name: "connected" });
  });

  ipc.of.m.on("app.message", (data) => {
    console.log(ID, data.message);
    switch (data.message.name) {
      case "LAP":
        m = ID === "r1" ? data.message.m1 : data.message.m2;
        c = ID === "r1" ? data.message.c1 : data.message.c2;
        x = 0;
        clearInterval(lap);
        lap = setInterval(() => {
          ++x;
          emit({ name: "POS", x, y: m * x + c });
        }, 50);
        break;

      default:
        break;
    }
  });

  ipc.of.m.on("disconnect", () => {
    console.log(`${ID}: disconnected from m`);
  });
  ipc.of.m.on("kill.connection", (data) => {
    console.log(`${ID}: m requested kill.connection`);
    clearInterval(lap);
    ipc.disconnect("m");
  });
});
