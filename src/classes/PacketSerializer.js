class PacketSerializer {
    // Return the value as an array with the bytes of a VarInt
    // Implementation from: https://wiki.vg/Protocol#VarInt_and_VarLong
    static toVarInt(value) {
        const array = [];
        while (true) {
            if ((value & 0xFFFFFF80) == 0) {
                array.push(value);
                return array;
            }
    
            array.push(value & 0x7F | 0x80);
            value >>>= 7;
        }
    }



    // Return the string as an array with the bytes of a string
    static toStringBytes(string) {
        const buffer = Buffer.from(string);

        // Prefix the data with the length of the string
        const array = [...PacketSerializer.toVarInt(buffer.byteLength)];

        array.push(...Array.from(buffer));
        return array;
    }



    // Return an unsigned short (16-bit int) as an array with bytes
    static toUnsignedShort(value) {
        const buffer = Buffer.alloc(2);
        buffer.writeUInt16BE(value);
        return Array.from(buffer);
    }



    // Return a 64-bit signed big endian number as an array with 8 bytes
    static toLong(value) {
        const buffer = Buffer.alloc(8);
        buffer.writeBigInt64BE(value);
        return Array.from(buffer);
    }


    // Return an UUID; unsigned 128-bit integer
    static toUUID(value) {
        let bigInt = BigInt("0x" + value.replace(/-/g, ""));
        const buffer = Buffer.alloc(16);

        const first64 = BigInt.asUintN(64, bigInt);
        bigInt >>= 64n;
        const last64 = BigInt.asUintN(64, bigInt);
        
        buffer.writeBigUInt64BE(first64);
        buffer.writeBigUInt64BE(last64);

        return Array.from(buffer);
    }
}



module.exports = PacketSerializer;