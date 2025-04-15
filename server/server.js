import dotenv from "dotenv";
dotenv.config();
import express from "express"; 
import cors from "cors";
import http from "http";
import { setupWebSocket } from "./websocket.js"; 
import router from "./routes/index.js"; 


const app = express();
const server = http.createServer(app);

app.use(cors());
app.use(express.json());

app.use("/api", router); 


setupWebSocket(server);

app.get("/", (req, res) => {
    res.send("Server is running!");
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
