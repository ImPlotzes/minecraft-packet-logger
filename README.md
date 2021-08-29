![](https://img.shields.io/tokei/lines/github/ImPlotzes/minecraft-packet-logger?color=0076cc&label=Lines%20of%20code) ![](https://img.shields.io/github/repo-size/ImPlotzes/minecraft-packet-logger?label=Size) [![People online in my Discord server](https://img.shields.io/discord/838163335689666564?label=Online&logo=Discord "People online in my Discord server")](https://www.plotzes.ml/discord "People online in my Discord server")

# 🗂️ `minecraft-packet-logger`
 A small Node.js proxy to log the packets between your client and a server.
 
 **This proxy is fully based on protocol version 754 (Minecraft verion 1.16.5), it will likely break on other versions!** *(Maybe I'll add support for other versions if you ask nicely on [my Discord server](https://www.plotzes.ml/discord "my Discord server"), depends on my schedule)*

<br>

## How to use
**Notes**
- **You need to have [Node.js](https://nodejs.org/ "Node.js") and [`npm`](https://www.npmjs.com/get-npm "`npm`") installed to use this! (Installing Node.js will automatically install `npm` on Windows and MacOS)**
- **The proxy runs on port `25565` so make sure no other application is using that port!**

**Steps**
1. Download or clone this repository. *(You can do `Code` > `Download ZIP`)*
2. Edit the `options.js` file with the options you want.
3. Open the command terminal of your comptuer and navigate to the project folder.
4. Run the command `npm install` (or `npm i`). *(You only have to do this the first time you run this proxy)*
5. Start Minecraft.
6. Start the proxy by typing `npm start`.

If you want to stop the proxy press **CTRL + C**, then type **Y** (for yes) and press enter. You can also press **CTRL + C** again instead of typing **Y**.

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

<br>

## Security
Since 1.3.1, Minecraft uses encrypted connections for servers, unless the server is in offline/"cracked" mode. This proxy supports encrypted connections with the Minecraft servers. This does mean that the proxy needs an 'accessToken' from your account, to authenticate the secure connection with Mojang. Since you can't authenticate a user connecting to a Minecraft server twice, the connection between the proxy and your client can't be encrypted. This shouldn't matter though, unless you connect to this proxy through a remote connection.
If you want to read encrypted packets, then you need to turn on the `decrypt_encrypted_packets` option in `options.js` The program will automatically try to get your 'accessToken'. Getting the 'accessToken' can fail if you use a modded Minecraft launcher (modded clients should be fine, but modded launchers might not).
If you leave the option turned off, or the proxy can't get the 'accessToken', then it won't be able to read encrypted connections. All features will still work, like reading unencrypted packets. You're never forced to turn the feature on.

**Your 'accessToken' will never be stored or send anywhere.**
