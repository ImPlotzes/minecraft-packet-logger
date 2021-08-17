const net = require("net");
const utils = require("./utils");
const mcOptions = require("./MC-SERVER");

// Define proxy parameters
const proxy_port = 25565;
const proxy_host = utils.getIP();

// If no IP was found then show that and stop the program
if(!proxy_host) {
    console.log("Can't find a usable IP address to host the proxy on!");
    console.log("Proxy won't/can't be started!");
    process.exit(0);
}


// Define the Minecraft server
const mc_host = mcOptions.ip;
const mc_port = mcOptions.port;


// Create the proxy server
const proxy = net.createServer((clientConnection) => {
    console.log("");
    console.log("--------- BEGIN CONNECTION ---------");

    // Define connection states
    let clientConnected = true;
    let serverConnected = false;

    // Define the client address
    const clientAddress = clientConnection.remoteAddress + ":" + clientConnection.remotePort;
    console.log(clientAddress + " |  Client connected to the proxy.");

    console.log(clientAddress + " |  Creating a connection to the Minecraft server...");

    // Create the client to connect to the Minecraft server
    const serverConnection = new net.Socket();

    // Create the connection between the proxy and Minecraft server
    serverConnection.connect(mc_port, mc_host, () => {
        serverConnected = true;
        console.log(clientAddress + " |  Connected to the Minecraft server.");
    });



    // DATA
    
    // (Proxy <=== MC server) When we get data
    serverConnection.on("data", (data) => {
        // Forward the data to the client
        clientConnection.write(data);

        console.log(clientAddress + " |  Got data from the Minecraft server.");
    });

    // (Proxy <=== client) When we get data
    clientConnection.on("data", (data) => {
        // Forward the data to the Minecraft server
        serverConnection.write(data);

        console.log(clientAddress + " |  Got data from the client.");
    });



    // CLOSE

    // (Proxy <===> MC server) When the connection has closed
    serverConnection.on("close", () => {
        
        // Set the connection state of the server to false
        serverConnected = false;

        console.log(clientAddress + " |  Connection (proxy <===> MC server) has closed.");

        // If the client is still connected then close that connection as well.
        // If not then tell that everything is closed and the connection has ended
        if(clientConnected) {
            console.log(clientAddress + " |  Closing connection (proxy <===> client)...");
            clientConnection.destroy();
        } else {
            console.log(clientAddress + " |  All connections terminated.");
            console.log("---------- END CONNECTION ----------");
            console.log("");
        }
    });

    // (Proxy <===> Client) When the connection has closed
    clientConnection.on("close", () => {

        // Set the connection state of the client to false
        clientConnected = false;

        console.log(clientAddress + " |  Connection (proxy <===> client) has closed.");

        // If the server is still connected then close that connection as well.
        // If not then tell that everything is closed and the connection has ended
        if(serverConnected) {
            console.log(clientAddress + " |  Closing connection (proxy <===> MC server)...");
            serverConnection.destroy();
        } else {
            console.log(clientAddress + " |  All connections terminated.");
            console.log("END CONNECTION");
            console.log("");
        }
    });



    // ERROR

    // (Proxy <===> MC server) When there is an error
    serverConnection.on("error", (error) => {
        console.log("");
        console.log("ERROR");
        console.log(clientAddress + " |  ------------- CONNECTION ERROR -------------");
        console.log(clientAddress + " |  " + error.stack);
        console.log(clientAddress + " |  ----------- Proxy <===> MC server ----------");
    });

    // (Proxy <===> Client) When there is an error
    clientConnection.on("error", (error) => {
        console.log("");
        console.log("ERROR");
        console.log(clientAddress + " |  ------------- CONNECTION ERROR -------------");
        console.log(clientAddress + " |  " + error.stack);
        console.log(clientAddress + " |  ------------ Proxy <===> Client ------------");
    });
});


// Log the error when there is one
proxy.on("error", (error) => {
    console.log("============= PROXY ERROR =============");
    console.log(error);
    console.log("=======================================");
});


// Start the proxy
proxy.listen(proxy_port, proxy_host, () => {
    console.log("================= Proxy started =================");
    console.log("  Proxy:             " + proxy_host + ":" + proxy_port);
    console.log("  Minecraft Server:  " + mc_host + ":" + mc_port);
    console.log("");
    console.log("  Connect to \"" + proxy_host + "\" to log");
    console.log("  packets between you and \"" + mc_host + ":" + mc_port + "\"");
    console.log("=================================================");
    console.log("");
});