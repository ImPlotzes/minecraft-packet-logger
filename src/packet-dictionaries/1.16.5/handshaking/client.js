module.exports = {
    // Handshake
    0x00: {
        name: "Handshake",
        fields: {
            protocol_version: "VarInt",
            server_address: "String",
            server_port: "Unsigned Short",
            next_state: "VarInt"
        }
    }
}