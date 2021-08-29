const crypto = require("crypto");
const fetch = require("node-fetch");
const PacketSerializer = require("./PacketSerializer");


class EncryptionHandler {
    // Private fields
    #active = false;
    #cipher;
    #decipher;

    
    // Generate the Encryption Response packet (0x01; login) from the Encryption Request packet
    async sendEncryptionResponse(serverConnection, packetData, accessToken, selectedProfile) {
        const sharedSecret = crypto.randomBytes(16);


        // Now we need to authenticate on behalf of the client to Mojang

        // Create the server hash
        const hash = crypto.createHash("sha1");
        hash.update(packetData.server_id);
        hash.update(sharedSecret);
        hash.update(Buffer.from(packetData.public_key));

        // hexdigest the hash (using Minecraft's non-standard hexdigest method)
        const hashBuffer = hash.digest();
        let output = 0n;
        for(let i = 0; i < hashBuffer.byteLength; i++) {
            output <<= 8n;
            output |= BigInt(hashBuffer[i]);
        }
        output = BigInt.asIntN(hashBuffer.byteLength * 8, output).toString(16);

        // Authenticate with Mojang
        const response = await fetch("https://sessionserver.mojang.com/session/minecraft/join", {
            method: "POST",
            headers: {
                "content-type": "application/json"
            },
            body: JSON.stringify({
                accessToken: accessToken,
                selectedProfile: selectedProfile.id.replace(/-/g, ""),
                serverId: output
            })
        });

        // If all went well, then we should get 204 - No Content. If we don't
        // get that then we return 'false' to show that it failed.
        if(response.status != 204) {
            const responseBody = await response.text();
            console.log(response.status + " - " + response.statusText);
            console.log(responseBody);
            return false;
        }


        // Time to build the Encryption Response packet to send to the Minecraft server

        // The server sends their public key DER encoded so first we convert it to PEM
        const publicKey = "-----BEGIN PUBLIC KEY-----\n" + Buffer.from(packetData.public_key).toString("base64") + "\n-----END PUBLIC KEY-----";

        // Encrypt the shared secret with the server's public key (padded encryption)
        const encryptedSecret = crypto.publicEncrypt({
            key: publicKey,
            padding: crypto.constants.RSA_PKCS1_PADDING
        }, sharedSecret);

        // Encrypt the verify token with the server's public key as well
        const encryptedVerifyToken = crypto.publicEncrypt({
            key: publicKey,
            padding: crypto.constants.RSA_PKCS1_PADDING
        }, Buffer.from(packetData.verify_token));

        
        // Now build the packet
        const packet = [];
        packet.push(...PacketSerializer.toVarInt(0x01));
        packet.push(...PacketSerializer.toVarInt(encryptedSecret.byteLength));
        packet.push(...Array.from(encryptedSecret));
        packet.push(...PacketSerializer.toVarInt(encryptedVerifyToken.byteLength));
        packet.push(...Array.from(encryptedVerifyToken));

        // Prefix the packet with the length of the packet
        packet.unshift(...PacketSerializer.toVarInt(packet.length));


        // Send the packet to the server
        serverConnection.write(Buffer.from(packet));

        this.#active = true;

        // Create the AES cipher and decipher
        this.#cipher = crypto.createCipheriv("aes-128-cfb8", sharedSecret, sharedSecret);
        this.#decipher = crypto.createDecipheriv("aes-128-cfb8", sharedSecret, sharedSecret);

        // Disable padding
        this.#cipher.setAutoPadding(false);
        this.#decipher.setAutoPadding(false);

        // Return 'true' to indicate that all went well
        return true;
    }



    // Check if the encryption is active
    isActive() {
        return this.#active;
    }


    
    decrypt(data) {
        return this.#decipher.update(data);
    }



    encrypt(data) {
        return this.#cipher.update(data);
    }
}



module.exports = EncryptionHandler;