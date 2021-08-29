module.exports = {
    // Login start
    0x00: {
        name: "Login Start",
        fields: {
            name: "String"
        }
    },

    // Encryption Response
    0x01: {
        name: "Encryption Response",
        fields: {
            shared_secret_length: "VarInt",
            shared_secret: "Byte Array|previous",
            verify_token_length: "VarInt",
            verify_token: "Byte Array|previous"
        }
    },

    // Login Plugin Response
    0x02: {
        name: "Login Plugin Response",
        fields: {
            message_id: "VarInt",
            successful: "Boolean",
            data: "Byte Array|remainder"
        }
    }
}