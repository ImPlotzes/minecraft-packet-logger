const net = require("net");
const util = require("util");
const utils = require("./utils");
const options = require("../options");
const dns = require("dns");

// Wrap everything in an async Immediately Invoked Function Expression so 
// we can use async/await easily
(async () => {

    // Define proxy parameters
    const proxy_port = 25565;
    const proxy_host = utils.getIP();

    // If no IP was found then show that and stop the program
    if(!proxy_host) {
        console.log("\x1b[31mCan't find a usable IP address to host the proxy on!");
        console.log("Proxy won't/can't be started!\x1b[0m");
        process.exit(0);
    }


    // Declare the default Minecraft IP and port
    let mc_ip = options.mc_server_ip;
    let mc_port = 25565;

    // Try to get address and port from an SRV record, else just use the default port and provided address
    try {

        // Get an array of SRV records defined under the 'minecraft' service with the TCP protocol
        // If the server doesn't use SRV records then it'll thrown an error that we catch
        const srvRecords = await util.promisify(dns.resolveSrv)("_minecraft._tcp." + options.mc_server_ip);

        // Choose a random record from the ones retrieved (most of the time a server only returns one record)
        const record = srvRecords[Math.random() * (srvRecords.length - 1)];

        // Update the IP and port
        mc_ip = record.name;
        mc_port = record.port;

    } catch(e) {
        // 99% of the time it's a ENOTFOUND error so we can just continue and no need for error handling
        // If it's another error... then idk, we'll see
    }

    // Create the proxy server
    const proxy = net.createServer((clientConnection) => {
        console.log("");
        console.log("\x1b[42m\x1b[30m--------- BEGIN CONNECTION ---------\x1b[0m");

        // Define connection states
        let clientConnected = true;
        let serverConnected = false;

        // Define the client address
        const clientAddress = clientConnection.remoteAddress + ":" + clientConnection.remotePort;
        console.log(clientAddress + " |  \x1b[32mClient connected to the proxy.\x1b[0m");

        console.log(clientAddress + " |  \x1b[33mCreating a connection to the Minecraft server...\x1b[0m");

        // Create the client to connect to the Minecraft server
        const serverConnection = new net.Socket();

        // Create the connection between the proxy and Minecraft server
        serverConnection.connect(mc_port, mc_ip, () => {
            serverConnected = true;
            console.log(clientAddress + " |  \x1b[32mConnected to the Minecraft server.\x1b[0m");
        });



        // DATA
        
        // (Proxy <=== MC server) When we get data
        serverConnection.on("data", (data) => {
            // Forward the data to the client
            clientConnection.write(data);

            console.log(clientAddress + " |  Got data from the Minecraft server.");

            // TODO
            // Actually decode the packets and log them
        });

        // (Proxy <=== client) When we get data
        clientConnection.on("data", (data) => {
            // Forward the data to the Minecraft server
            serverConnection.write(data);

            console.log(clientAddress + " |  Got data from the client.");

            // TODO
            // Actually decode the packets and log them
        });



        // CLOSE

        // (Proxy <===> MC server) When the connection has closed
        serverConnection.on("close", () => {
            
            // Set the connection state of the server to false
            serverConnected = false;

            console.log(clientAddress + " |  \x1b[31mConnection (proxy <===> MC server) has closed.\x1b[0m");

            // If the client is still connected then close that connection as well.
            // If not then tell that everything is closed and the connection has ended
            if(clientConnected) {
                console.log(clientAddress + " |  \x1b[33mClosing connection (proxy <===> client)...\x1b[0m");
                clientConnection.destroy();
            } else {
                console.log(clientAddress + " |  \x1b[31mAll connections terminated.\x1b[0m");
                console.log("\x1b[41m\x1b[30m---------- END CONNECTION ----------\x1b[0m");
                console.log("");
            }
        });

        // (Proxy <===> Client) When the connection has closed
        clientConnection.on("close", () => {

            // Set the connection state of the client to false
            clientConnected = false;

            console.log(clientAddress + " |  \x1b[31mConnection (proxy <===> client) has closed.\x1b[0m");

            // If the server is still connected then close that connection as well.
            // If not then tell that everything is closed and the connection has ended
            if(serverConnected) {
                console.log(clientAddress + " |  \x1b[33mClosing connection (proxy <===> MC server)...\x1b[0m");
                serverConnection.destroy();
            } else {
                console.log(clientAddress + " |  \x1b[31mAll connections terminated.");
                console.log("\x1b[41m\x1b[30m---------- END CONNECTION ----------\x1b[0m");
                console.log("");
            }
        });



        // ERROR

        // (Proxy <===> MC server) When there is an error
        serverConnection.on("error", (error) => {
            console.log(clientAddress + " |");
            console.log(clientAddress + " |  \x1b[31m------------- CONNECTION ERROR -------------\x1b[0m");
            console.log(clientAddress + " |  \x1b[31m" + error + "\x1b[0m");
            console.log(clientAddress + " |  \x1b[31m----------- Proxy <===> MC server ----------\x1b[0m");
            console.log(clientAddress + " |");
        });

        // (Proxy <===> Client) When there is an error
        clientConnection.on("error", (error) => {
            console.log(clientAddress + " |");
            console.log(clientAddress + " |  \x1b[31m------------- CONNECTION ERROR -------------\x1b[0m");
            console.log(clientAddress + " |  \x1b[31m" + error + "\x1b[0m");
            console.log(clientAddress + " |  \x1b[31m------------ Proxy <===> Client ------------\x1b[0m");
            console.log(clientAddress + " |");
        });
    });


    // Log the error when there is one
    proxy.on("error", (error) => {
        console.log("\x1b[31m============= PROXY ERROR =============");
        console.log(error);
        console.log("=======================================\x1b[0m");
    });


    // Start the proxy
    proxy.listen(proxy_port, proxy_host, () => {
        console.log("\x1b[36m================= Proxy started =================");
        console.log("  Proxy:             " + proxy_host + ":" + proxy_port);
        console.log("  Minecraft Server:  " + options.mc_server_ip + " (" + mc_ip + ":" + mc_port + ")");
        console.log("");
        console.log("  Connect to \"" + proxy_host + "\" to log");
        console.log("  packets between you and \"" + options.mc_server_ip + "\"");
        console.log("=================================================\x1b[0m");
        console.log("");
    });


})();
