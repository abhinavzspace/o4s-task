import ipc from "node-ipc";

ipc.config.id = "m";
ipc.config.retry = 1500;
ipc.config.silent = true;

const MAX = 30;
const MAX_LAPS = 10;
let lapsCount = 0;
let startTimeR1;
let startTimeR2;
let x,
  y,
  receivedOneR = false, // to track if both r1 and r2 s positions have been received
  connectedOneR = false,
  laps = [],
  currR1Lap = [],
  currR2Lap = [];

function getRandomInt() {
  return Math.ceil(Math.random() * MAX);
}

const broadcastNewLap = () => {
  broadcast({
    name: "LAP",
    m1: getRandomInt(),
    c1: getRandomInt(),
    m2: getRandomInt(),
    c2: getRandomInt(),
  });
  lapsCount++;
  startTimeR1 = Date.now();
  startTimeR2 = Date.now();
};

const broadcast = (message) => {
  ipc.server.broadcast("app.message", {
    id: ipc.config.id,
    message,
  });
};

const logLap = (lap) => {
  console.log(
    "LapNumber: ",
    lap.lapNumber,
    "TimeToCompletion: ",
    lap.lapR1.length,
    "AverageLatencyR1: ",
    lap.averageLatencyR1,
    "AverageLatencyR2: ",
    lap.averageLatencyR2
  );
};

ipc.serveNet("m", () => {
  ipc.server.on("app.message", (data, socket) => {
    console.log("m: ", data.id, data.message);

    switch (data.message.name) {
      case "connected":
        if (connectedOneR) broadcastNewLap();
        else connectedOneR = true;
        break;
      case "POS":
        if (data.id === "r1") {
          currR1Lap.push({
            x: data.message.x,
            y: data.message.y,
            latency: Date.now() - startTimeR1,
          });
          startTimeR1 = Date.now();
        } else {
          currR2Lap.push({
            x: data.message.x,
            y: data.message.y,
            latency: Date.now() - startTimeR2,
          });
          startTimeR2 = Date.now();
        }

        if (receivedOneR === false) {
          x = data.message.x;
          y = data.message.y;
          receivedOneR = true;
        } else {
          if (Math.abs(data.message.y - y) >= 10) {
            let averageLatencyR1 =
              currR1Lap
                .map((element) => element.latency)
                .reduce((a, b) => a + b, 0) / currR1Lap.length;
            let averageLatencyR2 =
              currR2Lap
                .map((element) => element.latency)
                .reduce((a, b) => a + b, 0) / currR2Lap.length;

            let lap = {
              lapNumber: lapsCount,
              lapR1: currR1Lap,
              lapR2: currR2Lap,
              averageLatencyR1,
              averageLatencyR2,
            };

            logLap(lap);

            laps.push(lap);

            if (lapsCount >= MAX_LAPS) {
              let sortedLaps = laps.sort(
                (a, b) => a.lapR1.length - b.lapR1.length
              );
              console.log("sortedLaps lenght", sortedLaps.length);
              sortedLaps.forEach((lap) => {
                logLap(lap);
              });
              ipc.server.broadcast("kill.connection", {
                id: ipc.config.id,
              });
              ipc.server.stop();
              break;
            }

            broadcastNewLap();

            currR1Lap = [];
            currR2Lap = [];
          }
          receivedOneR = false;
        }
      default:
        break;
    }
  });
});

ipc.server.start();
