const net = require("net");
const dns = require("dns");
const util = require("util");
const psList = require('ps-list');
const { exec } = require("child_process");

const utils = require("./utils");
const options = require("../options");
const ProxyConnection = require("./classes/ProxyConnection");


// Wrap everything in an async immediately invoked function expression so 
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

        console.log("\x1b[90mMinecraft server has SRV records\x1b[0m");

        // Choose a random record from the ones retrieved (most of the time a server only returns one record)
        const record = srvRecords[Math.random() * (srvRecords.length - 1)];

        // Update the IP and port
        mc_ip = record.name;
        mc_port = record.port;

    } catch(e) {
        // 99% of the time it's an ENOTFOUND error so we can just continue and no need for error handling
        // If it's another error... then idk, we'll see
        if(e.code != "ENOTFOUND" && e.code != "ENODATA") {
            console.log(e);
        }
    }


    let accessToken;
    let selectedProfile;

    // If the user gave consent to get the 'accessToken' then try it
    if(options.decrypt_encrypted_packets) {

        
        // Get the PID of javaw.exe (Minecraft)
        const runningApps = await psList();
        let mcPID;
        for(let i = 0; i < runningApps.length; i++) {
            const app = runningApps[i];
            if(app.name == "javaw.exe") {
                mcPID = app.pid;
                break;
            }
        }

        // If we found it then get the launch parameters to get the accessToken.
        // Else say that Minecraft isn't running
        if(mcPID) {
            // Check what OS they're using
            if(process.platform == "win32") {
                
                // Get the launch parameters of Minecraft (which contains their UUID and accessToken) via a command
                const { stdout, stderr } = await util.promisify(exec)("wmic process where ProcessID=" + mcPID + " get commandLine /format:list");
                
                // If there was an error, report it
                if(stderr) {
                    console.log("\x1b[31mSomething went wrong trying to get the 'accessToken'.\x1b[0m");
                    console.log(stderr);
                    console.log("");
                    console.log("\x1b[91mThis proxy won't be able to read encrypted packets without the 'accessToken'.\x1b[0m");

                // There is no error
                } else {

                    // Get the useful information out of all the launch parameters
                    accessToken = stdout.match(/(?<=--accessToken ).*?(?= )/g) || [];
                    accessToken = accessToken[0];
                    selectedProfile = {
                        name: stdout.match(/(?<=--username ).*?(?= )/g) || [],
                        id: stdout.match(/(?<=--uuid ).*?(?= )/g) || []
                    };
                    selectedProfile = {
                        name: selectedProfile.name[0],
                        id: selectedProfile.id[0]
                    }

                    // If we got everything then say that it was successful
                    if(accessToken && selectedProfile.name && selectedProfile.id) {
                        console.log("\x1b[32mGot the 'accessToken' needed to read encrypted packets.");
                        console.log("");
                        console.log("User: \x1b[92m" + selectedProfile.name);
                        console.log("\x1b[32mUUID: \x1b[92m" + selectedProfile.id + "\x1b[0m");
                    } else {
                        console.log("\x1b[31mCouldn't get the 'accessToken'.");
                        console.log("Maybe you started Minecraft with a custom launcher...");
                        console.log("");
                        console.log("\x1b[91mThis proxy won't be able to read encrypted packets without the 'accessToken'.\x1b[0m");
                    }
                }

            // They're not using Windows
            } else {
                console.log("\x1b[31mCan't get the 'accessToken'.");
                console.log("Operating systems besides Windows aren't supported yet.");
                console.log("");
                console.log("\x1b[91mThis proxy won't be able to read encrypted packets without the 'accessToken'.\x1b[0m");
            }

        // Couldn't find a javaw.exe process running
        } else {
            console.log("\x1b[31mCan't get the 'accessToken' because Minecraft isn't running.");
            console.log("Start this proxy \x1b[91mAFTER \x1b[31mopening Minecraft.");
            console.log("");
            console.log("\x1b[91mThis proxy won't be able to read encrypted packets without the 'accessToken'.\x1b[0m");
        }

    // They didn't turn the option on
    } else {
        console.log("\x1b[90mDidn't get the 'accessToken' needed to read encrypted packets.");
        console.log("If you want to read encrypted packets then turn on the 'decrypt_encrypted_packets' setting in 'options.js'.\x1b[0m");
    }

    console.log("");


    // Create the proxy server
    const proxy = net.createServer(async (clientConnection) => {

        // A client connected to the server
        console.log("");
        console.log("\x1b[42m\x1b[30m--------- BEGIN CONNECTION ---------\x1b[0m");

        const connection = new ProxyConnection(clientConnection, mc_ip, mc_port, accessToken, selectedProfile);
        await connection.startServerConnection();
    });


    // Log the error when there is one
    proxy.on("error", (error) => {
        console.log("\x1b[31m============= PROXY ERROR =============");
        console.log(error);
        console.log("=======================================\x1b[0m");
    });


    // Start the proxy
    proxy.listen(proxy_port, proxy_host, async () => {

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
