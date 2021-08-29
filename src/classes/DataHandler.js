const zlib = require("zlib");
const EventEmitter = require("events");
const PacketDeserializer = require("./PacketDeserializer");
const PacketSerializer = require("./PacketSerializer");


class DataHandler extends EventEmitter {
    // Private fields
    #currentPacketBytesLeft = 0;
    #currentPacketBytes = [];
    #compressionThreshold = -1;


    // Read the new data
    newData(data) {
        // Go through the new data stream until empty
        while(data.byteLength > 0) {

            // If all the bytes of the current packet have 
            // been read, then we read the length of the next packet.
            // Else, it means that we're in the middle of reading a packet
            if(this.#currentPacketBytesLeft == 0) {
                // Read the length of the next packet (is in a VarInt format)
                // and set 'currentPacketBytesLeft' to that length
                const deserializer = new PacketDeserializer(data);

                this.#currentPacketBytesLeft = deserializer.readVarInt();

                this.#currentPacketBytes.push(...PacketSerializer.toVarInt(this.#currentPacketBytesLeft));
                data = Buffer.from(deserializer.dumpBytes());


            // We're in the middle of reading a packet
            } else {
                // Get the next byte and add it to the 'currentPacketBytes' array
                const currentByte = data[0];
                this.#currentPacketBytes.push(currentByte);
                data = data.slice(1);

                // Now that we've read 1 byte, we decrease the bytes left.
                this.#currentPacketBytesLeft--;

                // If this was the last byte then check compression and act accordingly
                if(this.#currentPacketBytesLeft <= 0) {

                    // If the compression threshold is non-negative then we 
                    // follow the compressed packet format, else we read it
                    // in the normal packet format.
                    if(this.#compressionThreshold >= 0) {
                        const packetDeserializer = new PacketDeserializer(this.#currentPacketBytes);

                        // Empty the bytes of the packet we've just read
                        this.#currentPacketBytes = [];

                        // Get rid of the packet length
                        packetDeserializer.readVarInt();

                        // Get the data length
                        const dataLength = packetDeserializer.readVarInt();

                        // If the data length is 0 then the packet is uncompressed
                        if(dataLength == 0) {
                            // Get the uncompressed packet bytes
                            const packetBytes = packetDeserializer.dumpBytes();

                            // Create the packet, prefixed by the packet length
                            const packet = [...PacketSerializer.toVarInt(packetBytes.length)];
                            packet.push(...packetBytes);

                            // Emit a packet event
                            this.emit("packet", Buffer.from(packet));


                        // Compression is set, and this packet is compressed
                        } else {
                            // Decompress the bytes
                            const packetBytes = Array.from(zlib.unzipSync(Buffer.from(packetDeserializer.dumpBytes())));

                            // Create the packet, prefixed by the packet length
                            const packet = [...PacketSerializer.toVarInt(dataLength)];

                            // Add the uncompressed packed data (using a loop
                            // to avoid the error "Maximum call stack size exceeded")
                            for(let i = 0; i < packetBytes.length; i++) {
                                packet.push(packetBytes[i]);
                            }

                            // Emit a packet event
                            this.emit("packet", Buffer.from(packet));
                        }



                    // Compression is turned off so we don't need to
                    // process the packet.
                    } else {
                        this.emit("packet", Buffer.from(this.#currentPacketBytes));
                        this.#currentPacketBytes = []; 
                    }
                }
            }
        }
    }



    // Set the compresion limit
    setCompressionLimit(limit) {
        this.#compressionThreshold = limit;
    }



    // Compress the packet if the length is over the threshold
    static compressPacket(data, threshold) {
        const deserializer = new PacketDeserializer(data);

        let dataLength = deserializer.readVarInt();

        // If the packet is equal or over the threshold then we need to compress it
        let packetIdAndData;
        if(dataLength >= threshold) {
            packetIdAndData = Array.from(zlib.deflateSync(Buffer.from(deserializer.dumpBytes())));
        } else {
            packetIdAndData = deserializer.dumpBytes();

            // Set the data length to 0 to show that it's uncompressed
            dataLength = 0;
        }
        
        // Create the packet
        const packet = [...PacketSerializer.toVarInt(dataLength)];
        packet.push(...packetIdAndData);
        packet.unshift(...PacketSerializer.toVarInt(packet.length));

        return Buffer.from(packet);
    }
}


module.exports = DataHandler