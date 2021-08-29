const net = require("net");
const Packet = require("./Packet");
const options = require("../../options");
const DataHandler = require("./DataHandler");
const EncryptionHandler = require("./EncryptionHandler");

class ProxyConnection {

    // Private fields
    #serverConnection = new net.Socket();
    #clientConnection;
    #mc_ip;
    #mc_port;
    #state = "handshaking";
    #clientAddress;
    #encryptionHandler;
    #accessToken;
    #selectedProfile
    #halfEncryptionFailed = false;
    #compressionLimit;


    constructor(clientConnection, mc_ip, mc_port, accessToken, selectedProfile) {
        // Init some private fields
        this.#clientConnection = clientConnection;
        this.#mc_ip = mc_ip;
        this.#mc_port = mc_port;
        this.#accessToken = accessToken;
        this.#selectedProfile = selectedProfile;
        this.#encryptionHandler = new EncryptionHandler();

        // Define the client address
        this.#clientAddress = clientConnection.remoteAddress + ":" + clientConnection.remotePort;
        console.log(this.#clientAddress + " |  \x1b[32mClient connected to the proxy.\x1b[0m");


        // Sometimes multiple MC packets are sent in 1 data packet,
        // and sometimes a single packet is split across multiple data packets.
        // The DataHandler handles all that (also packet compression)
        const clientDataHandler = new DataHandler();

        // When the DataHandler has fully read a packet it will emit a 'packet' event.
        // The listener function will get a Buffer with the bytes of the packet.
        clientDataHandler.on("packet", (packet) => {
            // Wrap the bytes in a Packet class
            packet = new Packet(packet, this.#state, "client");

            const packetJson = packet.toJSON();

            console.log(this.#clientAddress + " |  Packet from client;             (0x" + packet.getHexID() + "; " + packetJson.state + ") " + packetJson.name);
            
            // Check the state and apply some extra logic (like state changes)
            // depending on the packet.
            switch (this.#state) {
                case "handshaking":
                    // In the first packet the client sends, there's a 'Next State' field which
                    // will decide if the state should go to 'status' or 'login'.
                    if(packetJson.data.next_state == 1) {
                        this.#state = "status";
                    } else if(packetJson.data.next_state == 2) {
                        this.#state = "login";
                    }

                    // If the spoof Minecraft host option is turned on
                    // then edit the hostname before sending it to the Minecraft server
                    if(options.spoof_minecraft_host) {
                        packet.data.server_address = options.mc_server_ip;
                    }
                    break;
                
                case "status":
                    break;

                case "login":
                    // If we get a Encryption Response packet from the client
                    // then that means that all data after that is going to be
                    // encypted and that we failed to intercept the encryption stage.
                    if(packetJson.id == 0x01) {
                        this.#halfEncryptionFailed = true;
                    }
                    break;

                case "play":
                    break;
            }

            // Build the packet back into bytes
            let packetBuffer = packet.build();

            // Compress the packet if needed
            if(this.#compressionLimit >= 0) {
                packetBuffer = DataHandler.compressPacket(packetBuffer, this.#compressionLimit);
            }

            // Forward the packet to the Minecraft server
            this.#serverConnection.write(packetBuffer);
        });





        // ===================================================
        // Define the event handlers for the connection with the client
        //          Proxy <===> Client

        // DATA
        this.#clientConnection.on("data", async (data) => {
            // If the data is encrypted and the then immediately forward it
            if(this.#halfEncryptionFailed) {
                console.log(this.#clientAddress + " |  \x1b[90mGot encrypted data from the client\x1b[0m");
                this.#serverConnection.write(data);

                // We can't do anything with the data so we stop here
                return;
            }

            // Push the raw data to the DataHandler
            clientDataHandler.newData(data);
        });



        // CLOSE
        this.#clientConnection.on("close", () => {
            console.log(this.#clientAddress + " |  \x1b[31mConnection (proxy <===> client) has closed.\x1b[0m");

            // If the connection with MC server is still open then destroy that
            if(this.#serverConnection.readyState == "open") {
                console.log(this.#clientAddress + " |  \x1b[33mClosing connection (proxy <===> MC server)...\x1b[0m");
                this.#serverConnection.destroy();
            }
        });
        


        // ERROR
        this.#clientConnection.on("error", (error) => {
            console.log(this.#clientAddress + " |");
            console.log(this.#clientAddress + " |  \x1b[31m------------- CONNECTION ERROR -------------\x1b[0m");
            console.log(this.#clientAddress + " |  \x1b[31m" + error + "\x1b[0m");
            console.log(this.#clientAddress + " |  \x1b[31m------------ Proxy <===> Client ------------\x1b[0m");
            console.log(this.#clientAddress + " |");
        });


        // ===================================================
    }



    // Starts a connection with the Minecraft server
    async startServerConnection() {
        console.log(this.#clientAddress + " |  \x1b[33mCreating a connection to the Minecraft server...\x1b[0m");

        // Create the client to connect to the Minecraft server
        this.#serverConnection = new net.Socket();

        // Connect the proxy to the Minecraft server
        this.#serverConnection.connect(this.#mc_port, this.#mc_ip, () => {
            console.log(this.#clientAddress + " |  \x1b[32mConnected to the Minecraft server.\x1b[0m");
        });



        // Sometimes multiple MC packets are sent in 1 data packet,
        // and sometimes a single packet is split across multiple data packets.
        // The DataHandler handles all that (also packet compression)
        const serverDataHandler = new DataHandler();

        // When the DataHandler has fully read a packet it will emit a 'packet' event.
        // The listener function will get a Buffer with the bytes of the packet.
        serverDataHandler.on("packet", async (packet) => {
            // Wrap the bytes in a Packet class
            packet = new Packet(packet, this.#state, "server");

            const packetJson = packet.toJSON();

            console.log(this.#clientAddress + " |  Packet from Minecraft server;   (0x" + packet.getHexID() + "; " + packetJson.state + ") " + packetJson.name);


            // For if we later decide that we don't want to forward this packet to the client
            let forwardPacket = true;

            // Check what state we're at
            switch (this.#state) {
                case "handshaking":
                    // There aren't any packets from the server during the handshaking state
                    break;
                
                case "status":
                    break;

                case "login":
                    // If we get the Encryption Request packet then we
                    // don't forward that, so the proxy <===> client
                    // connection isn't encrypted and we can read the packets.
                    // Using the EncryptionHandler class we act as the client
                    // and make sure the proxy <===> server connection
                    // is encrypted as normal.
                    if(packetJson.id == 0x01) {
                        // Only try to intercept the encryption if we have the accessToken
                        if(this.#accessToken) {
                            // Send an Encryption Response packet back to the server
                            const success = await this.#encryptionHandler.sendEncryptionResponse(this.#serverConnection, packet.data, this.#accessToken, this.#selectedProfile);

                            // If we were successful then don't forward the packet.
                            // If it wasn't successful then we forward the packet and 
                            // we won't be able to read the encrypted packets.
                            if(success) {
                                console.log(this.#clientAddress + " |  \x1b[90mSent Encryption Response to Minecraft server\x1b[0m");
                                forwardPacket = false;
                            } else {
                                console.log(this.#clientAddress + " |  \x1b[30mCouldn't establish encryption with the server.\x1b[0m");
                                console.log(this.#clientAddress + " |  \x1b[30mAllowing the client and server to encrypt without this proxy in between...\x1b[0m");
                            }
                        }
                    }


                    // If the server sends a Login Success packet then we change the
                    // state to 'play'
                    if(packetJson.id == 0x02) {
                        this.#state = "play";
                    }


                    // If we get a Set Compression packet (depends on server)
                    // then turn packet compression on. We don't forward
                    // this packet so the packets between the proxy and client
                    // aren't compressed to make it easier to read.
                    if(packetJson.id == 0x03) {
                        serverDataHandler.setCompressionLimit(packet.data.threshold);
                        this.#compressionLimit = packet.data.threshold;
                        forwardPacket = false;
                    }
                    break;

                case "play":
                    break;
            }
            
            if(forwardPacket) {
                // Forward the packet to the client
                this.#clientConnection.write(packet.build());
            }
        });




        // ===================================================
        // Define the event handlers for the connection with the Minecraft server
        //          Proxy <===> MC Server


        // When we get data                    DATA
        this.#serverConnection.on("data", async (data) => {
            // If the data is encrypted then immediately forward it
            if(this.#halfEncryptionFailed) {
                console.log(this.#clientAddress + " |  \x1b[90mGot encrypted data from the Minecraft server\x1b[0m");
                this.#clientConnection.write(data);

                // We can't do anything with the data so we stop here
                return;
            }

            // If the EncryptionHandler is active then we first 
            // need to decrypt the data.
            if(this.#encryptionHandler.isActive()) {
                data = this.#encryptionHandler.decrypt(data);
            }

            // Push the raw data to the DataHandler
            serverDataHandler.newData(data);
        });




        // CLOSE
        this.#serverConnection.on("close", () => {
            console.log(this.#clientAddress + " |  \x1b[31mConnection (proxy <===> MC server) has closed.\x1b[0m");

            if(this.#clientConnection.readyState == "open") {
                console.log(this.#clientAddress + " |  \x1b[33mClosing connection (proxy <===> client)...\x1b[0m");
                this.#clientConnection.destroy();
            }
        });




        // ERROR
        this.#serverConnection.on("error", (error) => {
            console.log(this.#clientAddress + " |");
            console.log(this.#clientAddress + " |  \x1b[31m------------- CONNECTION ERROR -------------\x1b[0m");
            console.log(this.#clientAddress + " |  \x1b[31m" + error + "\x1b[0m");
            console.log(this.#clientAddress + " |  \x1b[31m----------- Proxy <===> MC server ----------\x1b[0m");
            console.log(this.#clientAddress + " |");
        });


        // ===================================================
    }
}


module.exports = ProxyConnection