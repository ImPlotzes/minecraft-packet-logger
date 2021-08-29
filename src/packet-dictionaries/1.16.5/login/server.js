module.exports = {
    // Disconnect (login)
    0x00: {
        name: "Disconnect (login)",
        fields: {
            reason: "Chat"
        }
    },

    // Encryption Request
    0x01: {
        name: "Encryption Request",
        fields: {
            server_id: "String",
            public_key_length: "VarInt",
            public_key: "Byte Array|previous", // After the '|' it defines how to get the length, in this case it says that the length is defined in the previous field
            verify_token_length: "VarInt",
            verify_token: "Byte Array|previous"
        }
    },

    // Login Success
    0x02: {
        name: "Login Success",
        fields: {
            uuid: "UUID",
            username: "String"
        }
    },

    // Set Compression
    0x03: {
        name: "Set Compression",
        fields: {
            threshold: "VarInt"
        }
    },

    // Login Plugin Request
    0x04: {
        name: "Login Plugin Request",
        fields: {
            message_id: "VarInt",
            channel: "Identifier",
            data: "Byte Array|remainder"
        }
    }
}