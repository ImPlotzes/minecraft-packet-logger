module.exports = {
    // ==========================================
    //     USE THIS PROXY AT YOUR OWN RISK!
    //    There might be unknown side effects
    //  that can result in unexpected behaviour
    // ==========================================



    // The meaning of packets changes per Minecraft version.
    // For this proxy to read them correctly it needs to know
    // what Minecraft version you're using. If this version isn't the
    // same as your Minecraft client then the proxy won't be able
    // to read the packets, and it might break.
    // 
    // Possible values (only one right now):
    //   1.16.5
    client_version: "1.16.5",




    // Change this to the Minecraft server you want to connect to.
    // Domains with SRV records are supported.
    mc_server_ip: "us.mineplex.com",




    // For this proxy to read and log the encrypted packets from
    // the Minecraft server it needs an 'accessToken' from the user
    // joining the server. With this setting enabled the proxy will
    // try to get your 'accessToken' and you'll be able to read the
    // encrypted packets.
    //
    // Your 'accessToken' will never be stored or send anywhere.
    decrypt_encrypted_packets: false,




    // At the start of each connection with a Minecraft server
    // your client sends the host name of the server you're joining.
    // This will be the IP that you fill in in your client.
    // Using this proxy the IP address you connect to will be different
    // from the actual IP of the server and the server will see this.
    // If this setting is turned on then the proxy will edit
    // the host name that the client sends to the Minecraft server to match
    // the actual IP address of the server. This will most likely
    // bypass no-proxy-connection filters in place on the server.
    spoof_minecraft_host: false
};
