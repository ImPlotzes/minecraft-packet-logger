const PacketDeserializer = require("./PacketDeserializer");
const PacketSerializer = require("./PacketSerializer");
const options = require("../../options");


class Packet {
    // Public fields
    data = {};

    // Private fields
    #data;
    #packetDeserializer;
    #state;
    #from;
    #id;
    #name = "Unknown packet";
    #fields;




    // Read the data (Buffer) of the packet
    constructor(data, state, from) {
        this.#data = data;
        this.#packetDeserializer = new PacketDeserializer(this.#data);
        this.#state = state;
        this.#from = from;


        // Read the first VarInt which is the packet length (length of bytes of the Packet ID + Data after this VarInt).
        // Currently no need to store this
        this.#packetDeserializer.readVarInt();

        // Read the packet ID
        this.#id = this.#packetDeserializer.readVarInt();

        // Get the corresponding dictionary
        let dictionary;
        try {
            dictionary = require("../packet-dictionaries/" + options.client_version + "/" + this.#state + "/" + from);
        } catch (e) {
            console.log("");
            console.log("\x1b[31mInvalid 'client_version' in 'options.js'. Use one of the supported versions!");
            console.log("The proxy will might not work, packets won't be defined. You'll just see their ID.");
            console.log("\x1b[91m../packet-dictionaries/" + options.client_version + "/" + this.#state + "/" + from + "\x1b[0m");
            return;
        }

        const packetDefinition = dictionary[this.#id];

        // If the packet hasn't been defined yet then stop here
        if(!packetDefinition) { 
            return;
        }

        this.#name = packetDefinition.name;
        this.#fields = packetDefinition.fields;

        // If the packet field haven't been defined yet then stop here
        if(!this.#fields) {
            return;
        }

        // Go through the fields and read them all
        const fieldNames = Object.keys(this.#fields);
        for(let i = 0; i < fieldNames.length; i++) {
            const fieldName = fieldNames[i];
            let fieldOptions = this.#fields[fieldName];

            // Some field types have specials settings.
            // (i.e. the length of a Byte Array can be defined
            // with a previous field or it's the rest of the packet)
            // Here we init the options for those special field types.
            let options = {};
            fieldOptions = fieldOptions.split(/\|/g);

            // If there are options then get them based on what type it is
            if(fieldOptions.length > 1) {
                switch (fieldOptions[0]) {
                    case "Byte Array":
                        // Check what option it is and act accordingly
                        switch (fieldOptions[1]) {
                            // This means that the length of the Byte Array was defined in the previous field
                            case "previous":
                                options.length = this.data[fieldNames[i - 1]];
                                break;

                            // This means that the Byte Array is the rest of the packet
                            case "remainder":
                                options.length = this.#packetDeserializer.bytesLeft();
                                break;
                        }
                        break;
                }
            }

            // Read the field based on the field type
            switch (fieldOptions[0]) {
                case "VarInt":
                    this.data[fieldName] = this.#packetDeserializer.readVarInt();
                    break;
        
                case "String":
                    this.data[fieldName] = this.#packetDeserializer.readString();
                    break;

                case "Unsigned Short":
                    this.data[fieldName] = this.#packetDeserializer.readUnsignedShort();
                    break;

                case "Long":
                    this.data[fieldName] = this.#packetDeserializer.readLong();
                    break;

                case "Chat":
                    this.data[fieldName] = this.#packetDeserializer.readString();
                    break;

                case "Byte Array":
                    this.data[fieldName] = this.#packetDeserializer.readByteArray(options.length);
                    break;

                case "UUID":
                    this.data[fieldName] = this.#packetDeserializer.readUUID();
                    break;

                case "Identifier":
                    this.data[fieldName] = this.#packetDeserializer.readString();
                    break;


                default:
                    // If the field type isn't any of the above then that means
                    // that I haven't implemented a reading algorithm for that type yet.
                    // So we set the field to null.
                    this.data[fieldName] = null;
                    break;
            }

            // If it couldn't read the field then stop reading the packet
            // since we don't know how many bytes to skip for the next field.
            if(this.data[fieldName] == null) {
                break;
            }
        }
    }



    // Return a JSON object describing the packet
    toJSON() {
        return {
            state: this.#state,
            from: this.#from,
            name: this.#name,
            id: this.#id,
            hex_id: "0x" + this.getHexID(),
            data: this.data
        };
    }




    // Return the ID as a 2 character hex string (i.e. 01, 4F, 0B, etc.)
    getHexID() {
        return ("00" + this.#id.toString(16)).slice(-2).toUpperCase();
    }




    // Build the packet into a Buffer
    build() {
        let binaryData = [];
        
        // Add the packet ID
        binaryData.push(...PacketSerializer.toVarInt(this.#id));

        // If there are defined fields (so if I've added them in the dictionaries)
        // then go through them and build the data.
        // Else just use the original data, edits made to the data fields
        // won't be reflected in the packet if that's the case.
        if(this.#fields) {
            // Go through the packet fields and encode them into the array
            const fieldNames = Object.keys(this.#fields);
            for(let i = 0; i < fieldNames.length; i++) {

                const fieldName = fieldNames[i];
                const fieldType = this.#fields[fieldName];

                const fieldValue = this.data[fieldName];

                switch (fieldType) {
                    case "VarInt":
                        binaryData.push(...PacketSerializer.toVarInt(fieldValue));
                        break;
                
                    case "String":
                        binaryData.push(...PacketSerializer.toStringBytes(fieldValue));
                        break;

                    case "Unsigned Short":
                        binaryData.push(...PacketSerializer.toUnsignedShort(fieldValue));
                        break;

                    case "Long":
                        binaryData.push(...PacketSerializer.toLong(fieldValue));
                        break;

                    case "Chat":
                        binaryData.push(...PacketSerializer.toStringBytes(fieldValue));
                        break;

                    // Still need to implement the writing of these arrays
                    //case "Byte Array|previous":
                        //break;

                    //case "Byte Array|all":
                        //break;

                    case "UUID":
                        binaryData.push(...PacketSerializer.toUUID(fieldValue));

                    case "Identifier":
                        binaryData.push(...PacketSerializer.toStringBytes(fieldValue));


                    default:
                        // None of the above, so a type I haven't added a writing
                        // algorithm for the field type. Return the original data.
                        return this.#data;
                }
            }

        // There are no defined fields, return the orignal data
        } else {
            return this.#data
        }

        // Get the packet length
        const packetLength = PacketSerializer.toVarInt(binaryData.length);

        // Prefix the array with the packet length
        binaryData.unshift(...packetLength);

        return Buffer.from(binaryData);
    }
}




module.exports = Packet;