// A class to deserialize packet data.
// This just reads the fields. Interpreting what
// it means, and reading the correct types, is
// done in the Packet class.
class PacketDeserializer {
    // Private fields
    #data

    constructor(data) {
        this.#data = data;
    }



    // A VarInt is a way to store an int but the smaller numbers will take up less space.
    // Implementation from: https://wiki.vg/Protocol#VarInt_and_VarLong
    //
    // Minecraft VarInts work like this:
    //     The 7 least significant bits are used to encode the integer and
    //     the most significant bit indicates whether the next byte
    //     is also part of the VarInt.
    readVarInt() {
        const data = Array.from(this.#data);
        let numRead = 0;
        let result = 0;
        let read;
        do {
            read = data.shift();
            let value = (read & 0b01111111);
            result |= (value << (7 * numRead));

            numRead++;
            if (numRead > 5) {
                throw "VarInt is too big";
            }
        } while ((read & 0b10000000) != 0);
        this.#data = Buffer.from(data);
        return result;
    }



    // A String is prefixed by its length encoded in a VarInt.
    // The bytes of the String are UTF-8 encoded.
    readString() {
        const stringLength = this.readVarInt();
        const stringBuffer = Buffer.alloc(stringLength);

        const data = Array.from(this.#data);

        // Go through the original data and copy the string bytes into the just created buffer
        for(let i = 0; i < stringLength; i++) {
            stringBuffer[i] = data.shift();
        }

        this.#data = Buffer.from(data);
        return stringBuffer.toString("utf8");
    }



    // Simple 16-bit (2 bytes) unsigned big endian integer reading
    readUnsignedShort() {
        const value = this.#data.readUInt16BE();
        this.#data = this.#data.slice(2);
        return value;
    }



    // Simple 64-bit (8 bytes) signed big endian integer reading
    readLong() {
        const value = this.#data.readBigInt64BE();
        this.#data = this.#data.slice(8);
        return value;
    }



    // Reads the next X bytes
    readByteArray(length) {
        const data = Array.from(this.#data);
        const array = [];
        for(let i = 0; i < length; i++) {
            array.push(data.shift());
        }
        this.#data = Buffer.from(data);
        return array;
    }



    // Read the UUID (unsigned 128-bit integer; 2x 64-bit integers)
    readUUID() {
        const first64 = this.#data.readBigUInt64BE();
        this.#data = this.#data.slice(8);

        const last64 = this.#data.readBigUInt64BE();
        this.#data = this.#data.slice(8);

        let uuid = first64;
        uuid <<= 64n;
        uuid |= last64;

        return BigInt.asUintN(128, uuid).toString(16);
    }



    // Return the remaining bytes of the packet.
    // This will empty all the data.
    dumpBytes() {
        const bytes = this.#data;
        this.#data = Buffer.alloc(0);
        return Array.from(bytes);
    }



    // Returns the amount of bytes 
    // left to read.
    bytesLeft() {
        return this.#data.byteLength;
    }
}



module.exports = PacketDeserializer;