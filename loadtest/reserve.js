import http from "k6/http";
import { check, sleep } from "k6";

export const options = {
  vus: 100,
  iterations: 100
};

const API_URL = __ENV.API_URL || "http://localhost:4000";
const EVENT_ID = __ENV.EVENT_ID;
const SEAT_ID = __ENV.SEAT_ID;
const TOKEN = __ENV.AUTH_TOKEN;
const QUEUE_TOKEN = __ENV.QUEUE_TOKEN;

export default function () {
  const response = http.post(
    `${API_URL}/reserve`,
    JSON.stringify({ eventId: EVENT_ID, seatId: SEAT_ID, token: QUEUE_TOKEN }),
    {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${TOKEN}`
      }
    }
  );

  check(response, {
    "reserve returns success or conflict": (res) => [201, 409, 403, 429].includes(res.status)
  });
  sleep(1);
}
