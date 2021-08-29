const { networkInterfaces } = require("os");



// Get the IP address on which the proxy will be hosted
function getIP() {
    let ip = null;

    const networkObject = networkInterfaces();

    const connectionTypes = Object.keys(networkObject);

    // First, Go through the connection types (like Wi-Fi, ethernet, etc.)
    for(let i = 0; i < connectionTypes.length; i++) {
        
        // Go through the addresses of a connection type (because it can have multiple)
        const networkAddresses = networkObject[connectionTypes[i]];
        for(j = 0; j < networkAddresses.length; j++) {
            const address = networkAddresses[j];

            // If the IP is an IPv4 address and isn't internal then use that as the proxy host
            if(address.family == "IPv4" && !address.internal) {
                ip = address.address;
                break;
            }
        }
        if(ip) {
            break;
        }
    }
    
    // If no IP has been found it will return null
    // else it returns the IP
    return ip;
}



module.exports = {
    getIP: getIP
};

