# 🗂️ `minecraft-packet-logger`
> The data going through the proxy currently isn't being logged yet, you'll only see a message saying that data has gone through. I'm planning on adding the decoding and logging of the packets as soon as possible.

 A small Node.js proxy to log the packets between your client and a server.

<br>

## How to use
**Notes**
- **You need to have [Node.js](https://nodejs.org/ "Node.js") and [`npm`](https://www.npmjs.com/get-npm "`npm`") installed to use this! (Installing Node.js will automatically install `npm` on Windows and MacOS)**
- **The proxy runs on port `25565` so make sure no other application is using that port!**

**Steps**
1. Download or clone this repository. *(You can do `Code` > `Download ZIP`)*
2. Edit the `options.js` file with the options you want.
3. Open your command promt and navigate to the project folder.
4. Start the proxy by typing `npm start`.

<br>

## How it works
When you run `npm start` it will start the proxy. The proxy is just a server running on port `25565` (default Minecraft port) and when a client connects, it will start a client connection to the Minecraft server defined in `options.js`. Then whatever data the client sends to the proxy, it will send to the connection it has with the Minecraft server.

**When the client sends data to the proxy**
```
Client ====> Proxy ====> Minecraft server
```

**When the Minecraft server sends data to the proxy**
```
Client <==== Proxy <==== Minecraft server
```

All data goes throught the proxy which will allows the proxy to log all of it without affecting the connection. It acts as an intermediary between the client and Minecraft server.
